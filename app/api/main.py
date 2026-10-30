from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from app.core.runtime import Runtime
from .v1.endpoints import credentialing, prior_auth, webhooks


@asynccontextmanager
async def lifespan(app):
    app.state.rt = await Runtime.connect()
    try:
        yield
    finally:
        await app.state.rt.close()


app = FastAPI(lifespan=lifespan)
for router in (prior_auth.router, credentialing.router, webhooks.router):
    app.include_router(router, prefix="/v1")


@app.exception_handler(RequestValidationError)
async def invalid_input(request, exc):
    return JSONResponse(status_code=422, content={"detail": "Invalid request"})


@app.middleware("http")
async def prevent_caching(request, call_next):
    response = await call_next(request)
    response.headers["Cache-Control"] = "no-store"
    return response
