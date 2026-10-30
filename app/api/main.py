from contextlib import asynccontextmanager
from fastapi import Depends, FastAPI, HTTPException, WebSocket, WebSocketDisconnect
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from app.core.runtime import Runtime
from .auth import authenticate, bearer, require
from .v1.endpoints import services, webhooks, schemes


@asynccontextmanager
async def lifespan(app):
    app.state.rt = await Runtime.connect()
    try:
        yield
    finally:
        await app.state.rt.close()


app = FastAPI(title="CivicAgent API", lifespan=lifespan, docs_url=None, redoc_url=None, openapi_url=None)

# Enable CORS for local frontend development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

for router in (schemes.router, services.router, webhooks.router):
    app.include_router(router, prefix="/v1")


@app.get("/healthz", include_in_schema=False)
async def healthz():
    return {"status": "HEALTHY", "service": "civicagent-core", "domain": "higher-education-scholarships"}


@app.get("/openapi.json", include_in_schema=False)
async def schema(actor=Depends(require("staff"))):
    return app.openapi()


@app.exception_handler(RequestValidationError)
async def invalid_input(request, exc):
    return JSONResponse(status_code=422, content={"detail": "Invalid request", "errors": exc.errors()})


@app.middleware("http")
async def authorize_request(request, call_next):
    # Public endpoints that do not require bearer token authorization
    public_paths = ("/healthz", "/readyz")
    if (
        request.url.path in public_paths
        or request.url.path.startswith("/v1/schemes")
        or request.method == "OPTIONS"
    ):
        response = await call_next(request)
        response.headers["Cache-Control"] = "no-store"
        return response

    try:
        request.state.principal = await authenticate(request, await bearer(request))
    except HTTPException as exc:
        response = JSONResponse({"detail": exc.detail}, status_code=exc.status_code, headers=exc.headers)
    else:
        response = await call_next(request)
    response.headers["Cache-Control"] = "no-store"
    return response


# Active WebSocket connections registry for real-time telemetry streaming
class TelemetryManager:
    def __init__(self):
        self.active_connections: dict[str, list[WebSocket]] = {}

    async def connect(self, case_id: str, websocket: WebSocket):
        await websocket.accept()
        if case_id not in self.active_connections:
            self.active_connections[case_id] = []
        self.active_connections[case_id].append(websocket)

    def disconnect(self, case_id: str, websocket: WebSocket):
        if case_id in self.active_connections:
            if websocket in self.active_connections[case_id]:
                self.active_connections[case_id].remove(websocket)
            if not self.active_connections[case_id]:
                del self.active_connections[case_id]

    async def broadcast(self, case_id: str, message: dict):
        if case_id in self.active_connections:
            for connection in list(self.active_connections[case_id]):
                try:
                    await connection.send_json(message)
                except Exception:
                    pass


telemetry_bus = TelemetryManager()


@app.websocket("/ws/telemetry/{case_id}")
async def telemetry_websocket(websocket: WebSocket, case_id: str):
    await telemetry_bus.connect(case_id, websocket)
    try:
        while True:
            data = await websocket.receive_text()
    except WebSocketDisconnect:
        telemetry_bus.disconnect(case_id, websocket)
