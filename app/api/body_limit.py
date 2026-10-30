from starlette.responses import JSONResponse


class RequestBodyLimit:
    """Bound bytes before FastAPI's JSON decoder and dependency resolution."""
    def __init__(self, app, max_bytes=16 * 1024 * 1024):
        self.app = app
        self.max_bytes = max_bytes

    async def __call__(self, scope, receive, send):
        if scope["type"] != "http":
            return await self.app(scope, receive, send)
        for key, value in scope["headers"]:
            if key.lower() == b"content-length":
                if not value.isdigit() or len(value) > 12 or int(value) > self.max_bytes:
                    return await self.reject(scope, receive, send)

        body = bytearray()
        while True:
            message = await receive()
            if message["type"] == "http.disconnect":
                return
            chunk = message.get("body", b"")
            if len(body) + len(chunk) > self.max_bytes:
                return await self.reject(scope, receive, send)
            body.extend(chunk)
            if not message.get("more_body"):
                break

        delivered = False
        async def replay():
            nonlocal delivered
            if delivered:
                return await receive()
            delivered = True
            return {"type": "http.request", "body": bytes(body), "more_body": False}
        await self.app(scope, replay, send)

    @staticmethod
    async def reject(scope, receive, send):
        response = JSONResponse({"detail": "Request too large"}, status_code=413,
                                headers={"Cache-Control": "no-store"})
        await response(scope, receive, send)
