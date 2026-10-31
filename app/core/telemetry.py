import asyncio
from collections import OrderedDict
import json
import logging
from typing import Any, TypeVar
from fastapi import WebSocket

logger = logging.getLogger(__name__)

KT = TypeVar("KT")
VT = TypeVar("VT")


class BoundedDict(OrderedDict[KT, VT]):
    """Thread-safe bounded LRU dictionary that evicts oldest entries to prevent memory leaks from large payloads."""

    def __init__(self, maxsize: int = 100, *args: Any, **kwargs: Any):
        super().__init__(*args, **kwargs)
        self.maxsize = max(1, maxsize)

    def __setitem__(self, key: KT, value: VT) -> None:
        if key in self:
            self.move_to_end(key)
        super().__setitem__(key, value)
        while len(self) > self.maxsize:
            self.popitem(last=False)

    def __getitem__(self, key: KT) -> VT:
        val = super().__getitem__(key)
        self.move_to_end(key)
        return val

    def get(self, key: KT, default: Any = None) -> Any:
        if key in self:
            self.move_to_end(key)
            return super().__getitem__(key)
        return default


class TelemetryManager:
    """Active WebSocket connections registry and real-time telemetry broadcast bus."""

    def __init__(self, max_cached_cases: int = 100):
        self.max_cached_cases = max_cached_cases
        self.active_connections: dict[str, set[WebSocket]] = {}
        self.case_pacing: dict[str, str] = {}
        self.case_skip_signals: dict[str, bool] = {}
        self.case_paused: dict[str, bool] = {}
        self.case_step_signals: dict[str, bool] = {}
        self.case_signature_events: dict[str, asyncio.Event] = {}
        self.case_signatures: dict[str, str] = {}
        self.case_status: BoundedDict[str, dict[str, Any]] = BoundedDict(maxsize=max_cached_cases)
        self.case_latest_screenshot: BoundedDict[str, str] = BoundedDict(maxsize=max_cached_cases)

    async def connect(self, case_id: str, websocket: WebSocket) -> None:
        await websocket.accept()
        if case_id not in self.active_connections:
            self.active_connections[case_id] = set()
        self.active_connections[case_id].add(websocket)
        logger.info(f"WebSocket client connected to case {case_id}")

        # Send latest screenshot and status immediately if available
        screenshot = self.case_latest_screenshot.get(case_id)
        if screenshot:
            status_entry = self.case_status.get(case_id, {})
            try:
                await websocket.send_text(json.dumps({
                    "type": "telemetry",
                    "case_id": case_id,
                    "screenshot": screenshot,
                    "stage": status_entry.get("stage", "RUNNING"),
                    "action": "FRAME_SYNC",
                    "details": "Synchronized latest live browser frame."
                }))
            except Exception as e:
                logger.debug(f"Failed to deliver initial frame to websocket for case {case_id}: {e}")
                self.disconnect(case_id, websocket)

    def disconnect(self, case_id: str, websocket: WebSocket) -> None:
        if case_id in self.active_connections:
            self.active_connections[case_id].discard(websocket)
            if not self.active_connections[case_id]:
                del self.active_connections[case_id]
        logger.info(f"WebSocket client disconnected from case {case_id}")

    async def broadcast(self, case_id: str, message: dict[str, Any]) -> None:
        """Concurrent non-blocking broadcast with single-pass serialization and dead-socket eviction."""
        screenshot = message.get("screenshot")
        if screenshot:
            self.case_latest_screenshot[case_id] = screenshot

        stage = message.get("stage")
        if stage is not None:
            existing_status = self.case_status.get(case_id)
            if existing_status is None:
                self.case_status[case_id] = {
                    "stage": stage,
                    "action": message.get("action"),
                    "step": message.get("step")
                }
            else:
                existing_status["stage"] = stage
                if "action" in message:
                    existing_status["action"] = message.get("action")
                if "step" in message:
                    existing_status["step"] = message.get("step")
                self.case_status.move_to_end(case_id)

        sockets = self.active_connections.get(case_id)
        if not sockets:
            return

        # Pre-serialize message to JSON text once for all connected clients
        try:
            payload_text = json.dumps(message)
        except Exception as e:
            logger.error(f"Failed to serialize telemetry message for case {case_id}: {e}")
            return

        dead_sockets: list[WebSocket] = []
        socket_list = list(sockets)

        if len(socket_list) == 1:
            ws = socket_list[0]
            try:
                await ws.send_text(payload_text)
            except Exception as err:
                logger.debug(f"Failed to deliver websocket message to client for case {case_id}: {err}")
                dead_sockets.append(ws)
        else:
            async def _safe_send(ws: WebSocket) -> None:
                try:
                    await ws.send_text(payload_text)
                except Exception as err:
                    logger.debug(f"Failed to deliver websocket message to client for case {case_id}: {err}")
                    dead_sockets.append(ws)

            await asyncio.gather(*[_safe_send(ws) for ws in socket_list], return_exceptions=True)

        if dead_sockets and case_id in self.active_connections:
            for dead_ws in dead_sockets:
                self.active_connections[case_id].discard(dead_ws)
            if not self.active_connections[case_id]:
                del self.active_connections[case_id]

    def set_pacing(self, case_id: str, mode: str) -> None:
        self.case_pacing[case_id] = mode

    def get_pacing(self, case_id: str) -> str:
        return self.case_pacing.get(case_id, "1x")

    def pause(self, case_id: str) -> None:
        self.case_paused[case_id] = True
        logger.info(f"Execution paused for case {case_id}")

    def resume(self, case_id: str) -> None:
        self.case_paused[case_id] = False
        logger.info(f"Execution resumed for case {case_id}")

    def is_paused(self, case_id: str) -> bool:
        return self.case_paused.get(case_id, False)

    def signal_step(self, case_id: str) -> None:
        self.case_step_signals[case_id] = True

    def check_and_clear_step(self, case_id: str) -> bool:
        return self.case_step_signals.pop(case_id, False)

    def signal_skip(self, case_id: str) -> None:
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

    def cleanup_transient_controls(self, case_id: str) -> None:
        """Evict transient control events, signals, and pacing after session completes."""
        self.case_pacing.pop(case_id, None)
        self.case_skip_signals.pop(case_id, None)
        self.case_paused.pop(case_id, None)
        self.case_step_signals.pop(case_id, None)
        self.case_signature_events.pop(case_id, None)
        self.case_signatures.pop(case_id, None)

    def cleanup_case(self, case_id: str) -> None:
        """Purge all case state upon session completion."""
        self.active_connections.pop(case_id, None)
        self.cleanup_transient_controls(case_id)
        self.case_status.pop(case_id, None)
        self.case_latest_screenshot.pop(case_id, None)


telemetry_bus = TelemetryManager()
