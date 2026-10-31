import asyncio
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
        self.case_paused: dict[str, bool] = {}
        self.case_step_signals: dict[str, bool] = {}
        self.case_signature_events: dict[str, asyncio.Event] = {}
        self.case_signatures: dict[str, str] = {}
        self.case_status: dict[str, dict[str, Any]] = {}
        self.case_latest_screenshot: dict[str, str] = {}

    async def connect(self, case_id: str, websocket: WebSocket):
        await websocket.accept()
        if case_id not in self.active_connections:
            self.active_connections[case_id] = []
        self.active_connections[case_id].append(websocket)
        logger.info(f"WebSocket client connected to case {case_id}")

        # Send latest screenshot and status immediately if available
        if case_id in self.case_latest_screenshot:
            try:
                await websocket.send_json({
                    "type": "telemetry",
                    "case_id": case_id,
                    "screenshot": self.case_latest_screenshot[case_id],
                    "stage": self.case_status.get(case_id, {}).get("stage", "RUNNING"),
                    "action": "FRAME_SYNC",
                    "details": "Synchronized latest live browser frame."
                })
            except Exception:
                pass

    def disconnect(self, case_id: str, websocket: WebSocket):
        if case_id in self.active_connections:
            if websocket in self.active_connections[case_id]:
                self.active_connections[case_id].remove(websocket)
            if not self.active_connections[case_id]:
                del self.active_connections[case_id]
        logger.info(f"WebSocket client disconnected from case {case_id}")

    async def broadcast(self, case_id: str, message: dict[str, Any]):
        if "screenshot" in message and message["screenshot"]:
            self.case_latest_screenshot[case_id] = message["screenshot"]
        if "stage" in message:
            if case_id not in self.case_status:
                self.case_status[case_id] = {}
            self.case_status[case_id].update({
                "stage": message["stage"],
                "action": message.get("action"),
                "step": message.get("step")
            })

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

    def pause(self, case_id: str):
        self.case_paused[case_id] = True
        logger.info(f"Execution paused for case {case_id}")

    def resume(self, case_id: str):
        self.case_paused[case_id] = False
        logger.info(f"Execution resumed for case {case_id}")

    def is_paused(self, case_id: str) -> bool:
        return self.case_paused.get(case_id, False)

    def signal_step(self, case_id: str):
        self.case_step_signals[case_id] = True

    def check_and_clear_step(self, case_id: str) -> bool:
        return self.case_step_signals.pop(case_id, False)

    def signal_skip(self, case_id: str):
        self.case_skip_signals[case_id] = True

    def check_and_clear_skip(self, case_id: str) -> bool:
        return self.case_skip_signals.pop(case_id, False)

    def register_signature_wait(self, case_id: str) -> asyncio.Event:
        event = asyncio.Event()
        self.case_signature_events[case_id] = event
        return event

    def authorize_signature(self, case_id: str, signature_data: str) -> bool:
        self.case_signatures[case_id] = signature_data
        event = self.case_signature_events.get(case_id)
        if event:
            event.set()
            return True
        return False

    def get_signature(self, case_id: str) -> str | None:
        return self.case_signatures.get(case_id)


telemetry_bus = TelemetryManager()
