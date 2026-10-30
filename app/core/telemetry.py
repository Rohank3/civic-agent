import logging
from typing import Any
from fastapi import WebSocket

logger = logging.getLogger(__name__)


class TelemetryManager:
    """Active WebSocket connections registry and real-time telemetry broadcast bus."""

    def __init__(self):
        self.active_connections: dict[str, list[WebSocket]] = {}
        self.case_pacing: dict[str, str] = {}
        self.case_skip_signals: dict[str, bool] = {}

    async def connect(self, case_id: str, websocket: WebSocket):
        await websocket.accept()
        if case_id not in self.active_connections:
            self.active_connections[case_id] = []
        self.active_connections[case_id].append(websocket)
        logger.info(f"WebSocket client connected to case {case_id}")

    def disconnect(self, case_id: str, websocket: WebSocket):
        if case_id in self.active_connections:
            if websocket in self.active_connections[case_id]:
                self.active_connections[case_id].remove(websocket)
            if not self.active_connections[case_id]:
                del self.active_connections[case_id]
        logger.info(f"WebSocket client disconnected from case {case_id}")

    async def broadcast(self, case_id: str, message: dict[str, Any]):
        if case_id in self.active_connections:
            for connection in list(self.active_connections[case_id]):
                try:
                    await connection.send_json(message)
                except Exception as e:
                    logger.debug(f"Failed to deliver websocket message: {e}")

    def set_pacing(self, case_id: str, mode: str):
        self.case_pacing[case_id] = mode

    def get_pacing(self, case_id: str) -> str:
        return self.case_pacing.get(case_id, "1x")

    def signal_skip(self, case_id: str):
        self.case_skip_signals[case_id] = True

    def check_and_clear_skip(self, case_id: str) -> bool:
        return self.case_skip_signals.pop(case_id, False)


telemetry_bus = TelemetryManager()
