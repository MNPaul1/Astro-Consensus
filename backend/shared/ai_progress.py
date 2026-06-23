from __future__ import annotations

from datetime import datetime, timezone
from threading import Lock
from typing import Optional


_LOCK = Lock()
_STATE: dict[str, dict] = {}


def _timestamp() -> str:
    return datetime.now(timezone.utc).isoformat()


def start_request(request_id: str, stage: str) -> None:
    with _LOCK:
        _STATE[request_id] = {
            "request_id": request_id,
            "status": "running",
            "stage": stage,
            "active_model": None,
            "events": [
                {
                    "type": "stage",
                    "message": stage,
                    "timestamp": _timestamp(),
                }
            ],
            "updated_at": _timestamp(),
        }


def update_stage(request_id: str, stage: str) -> None:
    with _LOCK:
        state = _STATE.setdefault(request_id, {"request_id": request_id, "events": []})
        state["status"] = "running"
        state["stage"] = stage
        state["updated_at"] = _timestamp()
        state["events"].append(
            {"type": "stage", "message": stage, "timestamp": state["updated_at"]}
        )


def log_model_attempt(request_id: str, model: str) -> None:
    with _LOCK:
        state = _STATE.setdefault(request_id, {"request_id": request_id, "events": []})
        state["status"] = "running"
        state["active_model"] = model
        state["updated_at"] = _timestamp()
        state["events"].append(
            {
                "type": "attempt",
                "model": model,
                "message": f"Trying {model}",
                "timestamp": state["updated_at"],
            }
        )


def log_model_result(
    request_id: str,
    model: str,
    status: str,
    reason: Optional[str] = None,
) -> None:
    with _LOCK:
        state = _STATE.setdefault(request_id, {"request_id": request_id, "events": []})
        state["status"] = "running"
        state["active_model"] = model if status == "success" else None
        state["updated_at"] = _timestamp()
        message = (
            f"{model} succeeded"
            if status == "success"
            else f"{model} failed. Trying another model now."
        )
        state["events"].append(
            {
                "type": status,
                "model": model,
                "message": message,
                "reason": reason,
                "timestamp": state["updated_at"],
            }
        )


def finish_request(request_id: str, status: str, message: Optional[str] = None) -> None:
    with _LOCK:
        state = _STATE.setdefault(request_id, {"request_id": request_id, "events": []})
        state["status"] = status
        state["stage"] = message or state.get("stage")
        state["active_model"] = None
        state["updated_at"] = _timestamp()
        if message:
            state["events"].append(
                {
                    "type": status,
                    "message": message,
                    "timestamp": state["updated_at"],
                }
            )


def get_request_status(request_id: str) -> Optional[dict]:
    with _LOCK:
        state = _STATE.get(request_id)
        if not state:
            return None
        return {
            "request_id": state["request_id"],
            "status": state.get("status", "running"),
            "stage": state.get("stage"),
            "active_model": state.get("active_model"),
            "events": list(state.get("events", [])),
            "updated_at": state.get("updated_at"),
        }
