from contextlib import asynccontextmanager
from fastapi import Depends, FastAPI, HTTPException
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from app.core.runtime import Runtime
from .auth import authenticate, bearer, require
from .v1.endpoints import credentialing, prior_auth, services, webhooks


@asynccontextmanager
async def lifespan(app):
    app.state.rt = await Runtime.connect()
    try:
        yield
    finally:
        await app.state.rt.close()


app = FastAPI(lifespan=lifespan, docs_url=None, redoc_url=None, openapi_url=None)
for router in (prior_auth.router, credentialing.router, webhooks.router, services.router):
    app.include_router(router, prefix="/v1")


@app.get("/healthz", include_in_schema=False)
async def healthz():
    return {"status": "HEALTHY", "service": "bureaucracy-agent-core"}


@app.get("/openapi.json", include_in_schema=False)
async def schema(actor=Depends(require("staff"))):
    return app.openapi()


@app.exception_handler(RequestValidationError)
async def invalid_input(request, exc):
    return JSONResponse(status_code=422, content={"detail": "Invalid request"})


@app.middleware("http")
async def authorize_request(request, call_next):
    if request.url.path in ("/healthz", "/readyz"):
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
