import os
from pathlib import Path
import re
from contextlib import contextmanager
from contextvars import ContextVar
from dataclasses import dataclass
from typing import Optional

import requests
from dotenv import load_dotenv
from shared.ai_progress import log_model_attempt, log_model_result, update_stage


GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions"
MODEL_PRIORITY = [
    "openai/gpt-oss-120b",
    "llama-3.3-70b-versatile",
    "qwen/qwen3.6-27b",
    "qwen/qwen3-32b",
    "openai/gpt-oss-20b",
]
DEFAULT_MAX_COMPLETION_TOKENS = 1800
ENV_PATH = Path(__file__).resolve().parent.parent / ".env"
LAST_USED_MODEL = None
REQUEST_AI_CONFIG: ContextVar[Optional["AIRequestConfig"]] = ContextVar(
    "request_ai_config",
    default=None,
)


@dataclass(frozen=True)
class AIRequestConfig:
    api_url: str
    api_key: str
    model_order: list[str]
    max_completion_tokens: int = DEFAULT_MAX_COMPLETION_TOKENS
    reasoning_effort: str = "low"
    source_label: str = "Default cloud"


class AIClientError(RuntimeError):
    pass


def get_last_used_model() -> Optional[str]:
    return LAST_USED_MODEL


def load_local_env() -> None:
    load_dotenv(ENV_PATH, override=False)


@contextmanager
def use_request_ai_config(config: Optional["AIRequestConfig"]):
    token = REQUEST_AI_CONFIG.set(config)
    try:
        yield
    finally:
        REQUEST_AI_CONFIG.reset(token)


def parse_model_priority() -> list[str]:
    configured = os.getenv("GROQ_MODEL_PRIORITY", "").strip()
    if not configured:
        return MODEL_PRIORITY[:]

    models = [value.strip() for value in configured.split(",") if value.strip()]
    return models or MODEL_PRIORITY[:]


def clean_model_response(text: str) -> str:
    cleaned = text.strip()
    cleaned = re.sub(r"<think>.*?</think>", "", cleaned, flags=re.DOTALL | re.IGNORECASE)
    cleaned = re.sub(r"</?draft>", "", cleaned, flags=re.IGNORECASE)
    cleaned = re.sub(r"^\s*Draft:\s*", "", cleaned, flags=re.IGNORECASE)
    cleaned = re.sub(
        r"^\s*(thinking|reasoning)\s*:.*?$",
        "",
        cleaned,
        flags=re.IGNORECASE | re.MULTILINE,
    )
    cleaned = re.sub(r"\n{3,}", "\n\n", cleaned)
    return cleaned.strip()


def build_messages(prompt: str, system_prompt: Optional[str]) -> list[dict[str, str]]:
    messages = []
    if system_prompt:
        messages.append({"role": "system", "content": system_prompt})
    messages.append({"role": "user", "content": prompt})
    return messages


def build_payload(model: str, messages: list[dict[str, str]]) -> dict:
    configured_max_tokens = int(
        os.getenv("GROQ_MAX_TOKENS", str(DEFAULT_MAX_COMPLETION_TOKENS))
    )
    payload = {
        "model": model,
        "messages": messages,
        "temperature": 0.25,
        "max_completion_tokens": configured_max_tokens,
        "stream": False,
    }
    if model.startswith("openai/gpt-oss"):
        payload["reasoning_effort"] = os.getenv("GROQ_REASONING_EFFORT", "low")
    return payload


def build_payload_for_config(
    model: str,
    messages: list[dict[str, str]],
    config: "AIRequestConfig",
) -> dict:
    payload = {
        "model": model,
        "messages": messages,
        "temperature": 0.25,
        "max_completion_tokens": config.max_completion_tokens,
        "stream": False,
    }
    if model.startswith("openai/gpt-oss"):
        payload["reasoning_effort"] = config.reasoning_effort
    return payload


def default_ai_config() -> "AIRequestConfig":
    load_local_env()
    api_key = os.getenv("GROQ_API_KEY")
    if not api_key:
        raise AIClientError(
            "GROQ_API_KEY is not set. Add it to backend/.env and restart the backend."
        )

    explicit_model = os.getenv("GROQ_MODEL", "").strip()
    fallback_models = parse_model_priority()
    model_order = []
    if explicit_model:
        model_order.append(explicit_model)
    model_order.extend(model for model in fallback_models if model != explicit_model)

    return AIRequestConfig(
        api_url=GROQ_API_URL,
        api_key=api_key,
        model_order=model_order,
        max_completion_tokens=int(
            os.getenv("GROQ_MAX_TOKENS", str(DEFAULT_MAX_COMPLETION_TOKENS))
        ),
        reasoning_effort=os.getenv("GROQ_REASONING_EFFORT", "low"),
        source_label="Default cloud",
    )


def current_ai_config() -> "AIRequestConfig":
    override = REQUEST_AI_CONFIG.get()
    if override is not None:
        return override
    return default_ai_config()


def is_retryable_limit_error(status: object, message: Optional[str]) -> bool:
    normalized = (message or "").lower()
    return status in {429, 498, 499, 529} or any(
        phrase in normalized
        for phrase in (
            "rate limit",
            "tokens per minute",
            "request too large for model",
            "capacity",
            "overloaded",
            "quota",
            "limit reached",
        )
    )


def request_model(
    config: "AIRequestConfig",
    model: str,
    messages: list[dict[str, str]],
) -> str:
    payload = build_payload_for_config(model, messages, config)

    try:
        response = requests.post(
            config.api_url,
            json=payload,
            headers={
                "Authorization": f"Bearer {config.api_key}",
                "Content-Type": "application/json",
            },
            timeout=60,
        )
        response.raise_for_status()
    except requests.HTTPError as exc:
        error = None
        try:
            error = exc.response.json().get("error")
        except (requests.JSONDecodeError, AttributeError, ValueError):
            pass

        if isinstance(error, dict):
            message = error.get("message")
        elif isinstance(error, str):
            message = error
        else:
            message = None

        status = exc.response.status_code if exc.response is not None else "unknown"
        if is_retryable_limit_error(status, message):
            raise AIClientError(
                f"MODEL_RETRY::{model}::{message or f'AI request failed with status {status}.'}"
            ) from exc
        raise AIClientError(message or f"AI request failed with status {status}.") from exc
    except requests.RequestException as exc:
        raise AIClientError(
            f"Could not reach the configured AI endpoint for {config.source_label}."
        ) from exc

    try:
        data = response.json()
    except requests.JSONDecodeError as exc:
        raise AIClientError("The configured AI endpoint returned invalid JSON.") from exc

    try:
        choice = data["choices"][0]
        text = choice["message"]["content"]
    except (KeyError, IndexError, TypeError) as exc:
        raise AIClientError("The configured AI endpoint returned an unexpected response format.") from exc

    if choice.get("finish_reason") == "length":
        raise AIClientError(
            "The model response reached its token limit. Increase GROQ_MAX_TOKENS."
        )

    text = clean_model_response(text or "")

    if not text or not text.strip():
        raise AIClientError(f"The cloud model {model} returned an empty response.")

    return text.strip()


def ask_ai(
    prompt: str,
    system_prompt: Optional[str] = None,
    request_id: Optional[str] = None,
    stage: Optional[str] = None,
) -> str:
    global LAST_USED_MODEL
    config = current_ai_config()
    messages = build_messages(prompt, system_prompt)
    model_order = config.model_order[:]

    if request_id and stage:
        update_stage(request_id, stage)
    print(
        f"[AI] Source: {config.source_label} | Model order for this request: "
        f"{', '.join(model_order)}"
    )

    retry_messages = []
    for model in model_order:
        try:
            if request_id:
                log_model_attempt(request_id, model)
            print(f"[AI] Trying model: {model}")
            response = request_model(config, model, messages)
            LAST_USED_MODEL = model
            if request_id:
                log_model_result(request_id, model, "success")
            print(f"[AI] Model succeeded: {model}")
            return response
        except AIClientError as exc:
            message = str(exc)
            if message.startswith("MODEL_RETRY::"):
                retry_reason = message.split("::", 2)[-1]
                retry_messages.append(retry_reason)
                if request_id:
                    log_model_result(request_id, model, "failed", retry_reason)
                print(f"[AI] Model failed: {model} | reason: {retry_reason}")
                continue
            if request_id:
                log_model_result(request_id, model, "failed", message)
            print(f"[AI] Model failed permanently: {model} | reason: {message}")
            raise

    attempted = ", ".join(model_order)
    details = (
        retry_messages[-1]
        if retry_messages
        else "All configured models were unavailable."
    )
    print(
        "[AI] All configured models failed "
        f"| attempted: {attempted} | last error: {details}"
    )
    raise AIClientError(
        f"All configured cloud models hit limits or capacity constraints. Attempted: {attempted}. Last error: {details}"
    )
