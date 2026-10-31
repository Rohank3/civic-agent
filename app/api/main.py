from contextlib import asynccontextmanager
from fastapi import Depends, FastAPI, HTTPException, WebSocket, WebSocketDisconnect
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, HTMLResponse
from app.core.runtime import Runtime
from app.core.telemetry import telemetry_bus
from .auth import authenticate, bearer, require
from .v1.endpoints import services, webhooks, schemes, citizen


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

for router in (schemes.router, services.router, webhooks.router, citizen.router):
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


@app.get("/portal/scholarship", response_class=HTMLResponse)
async def local_scholarship_portal():
    """Authentic local multi-step scholarship portal with modal obstacles for offline evaluation."""
    from tests.test_bureaucracy_agent import LEGACY_PORTAL_HTML
    return HTMLResponse(content=LEGACY_PORTAL_HTML.decode("utf-8"))


@app.middleware("http")
async def authorize_request(request, call_next):
    # Public endpoints that do not require bearer token authorization
    public_paths = ("/healthz", "/readyz", "/portal/scholarship", "/v1/services/execute-live")
    is_live_service_call = (
        request.url.path == "/v1/services/execute-live"
        or (request.url.path.startswith("/v1/services/") and (request.url.path.endswith("/signature") or request.url.path.endswith("/control")))
    )
    if (
        request.url.path in public_paths
        or request.url.path.startswith("/portal")
        or request.url.path.startswith("/v1/schemes")
        or request.url.path.startswith("/v1/auth")
        or request.url.path.startswith("/v1/citizen")
        or is_live_service_call
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


import json

@app.websocket("/ws/telemetry/{case_id}")
async def telemetry_websocket(websocket: WebSocket, case_id: str):
    await telemetry_bus.connect(case_id, websocket)
    try:
        while True:
            text = await websocket.receive_text()
            try:
                cmd = json.loads(text)
                action = cmd.get("action")
                if action == "set_pacing":
                    mode = cmd.get("mode", "1x")
                    telemetry_bus.set_pacing(case_id, mode)
                    await websocket.send_json({"type": "ack", "action": "set_pacing", "mode": mode})
                elif action == "pause":
                    telemetry_bus.pause(case_id)
                    await websocket.send_json({"type": "ack", "action": "pause"})
                elif action == "resume":
                    telemetry_bus.resume(case_id)
                    await websocket.send_json({"type": "ack", "action": "resume"})
                elif action == "step":
                    telemetry_bus.signal_step(case_id)
                    await websocket.send_json({"type": "ack", "action": "step"})
                elif action == "skip_to_next":
                    telemetry_bus.signal_skip(case_id)
                    await websocket.send_json({"type": "ack", "action": "skip_to_next"})
                elif action == "ping":
                    await websocket.send_json({"type": "pong", "case_id": case_id})
            except Exception:
                pass
    except WebSocketDisconnect:
        telemetry_bus.disconnect(case_id, websocket)
