from contextlib import asynccontextmanager
import json
import logging
import os
from pathlib import Path

from dotenv import load_dotenv
load_dotenv()

from fastapi import Depends, FastAPI, HTTPException, WebSocket, WebSocketDisconnect
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse, JSONResponse
from fastapi.staticfiles import StaticFiles

from app.api.auth import authenticate, bearer, require
from app.api.v1.endpoints import citizen, schemes, services, webhooks
from app.core.runtime import Runtime
from app.core.telemetry import telemetry_bus

logger = logging.getLogger(__name__)

# Precomputed fast path lookup structures for zero-overhead middleware routing
PUBLIC_EXACT_PATHS: frozenset[str] = frozenset({
    "/healthz",
    "/readyz",
    "/portal/scholarship",
    "/v1/services/execute-live",
})

PUBLIC_PATH_PREFIXES: tuple[str, ...] = (
    "/portal",
    "/v1/schemes",
    "/v1/auth",
    "/v1/citizen",
)

SERVICES_PREFIX: str = "/v1/services/"
SERVICES_PUBLIC_SUFFIXES: tuple[str, ...] = ("/signature", "/control")


@asynccontextmanager
async def lifespan(app: FastAPI):
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
@app.get("/portal/scholarship/{scheme_id}", response_class=HTMLResponse)
async def local_scholarship_portal(scheme_id: str | None = None):
    """Authentic local multi-step scholarship portal with modal obstacles dynamically rendered per scheme."""
    from app.api.portal_html import get_portal_html_for_scheme
    return HTMLResponse(content=get_portal_html_for_scheme(scheme_id))


@app.middleware("http")
async def authorize_request(request, call_next):
    if request.method == "OPTIONS":
        response = await call_next(request)
        response.headers["Cache-Control"] = "no-store"
        return response

    path: str = request.url.path
    if (
        path in PUBLIC_EXACT_PATHS
        or path.startswith(PUBLIC_PATH_PREFIXES)
        or (path.startswith(SERVICES_PREFIX) and path.endswith(SERVICES_PUBLIC_SUFFIXES))
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
            except json.JSONDecodeError:
                pass
            except Exception as e:
                logger.debug(f"Websocket command error for {case_id}: {e}")
    except (WebSocketDisconnect, Exception) as exc:
        logger.debug(f"WebSocket closed for case {case_id}: {exc}")
    finally:
        telemetry_bus.disconnect(case_id, websocket)


# Mount built frontend dist folder if present (e.g. single-container containerized deployment)
dist_path = Path(__file__).resolve().parent.parent.parent / "dist"
if not dist_path.exists():
    dist_path = Path(__file__).resolve().parent.parent.parent.parent / "frontend" / "dist"

if dist_path.exists():
    app.mount("/", StaticFiles(directory=str(dist_path), html=True), name="frontend")
