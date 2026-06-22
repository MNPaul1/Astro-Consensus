import os
from pathlib import Path
from typing import Optional

import requests
from dotenv import load_dotenv


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


class AIClientError(RuntimeError):
    pass


def get_last_used_model() -> Optional[str]:
    return LAST_USED_MODEL


def load_local_env() -> None:
    load_dotenv(ENV_PATH, override=False)


def parse_model_priority() -> list[str]:
    configured = os.getenv("GROQ_MODEL_PRIORITY", "").strip()
    if not configured:
        return MODEL_PRIORITY[:]

    models = [value.strip() for value in configured.split(",") if value.strip()]
    return models or MODEL_PRIORITY[:]


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
    model: str,
    messages: list[dict[str, str]],
    api_key: str,
) -> str:
    payload = build_payload(model, messages)

    try:
        response = requests.post(
            GROQ_API_URL,
            json=payload,
            headers={
                "Authorization": f"Bearer {api_key}",
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
                f"MODEL_RETRY::{model}::{message or f'Groq request failed with status {status}.'}"
            ) from exc
        raise AIClientError(message or f"Groq request failed with status {status}.") from exc
    except requests.RequestException as exc:
        raise AIClientError("Could not reach Groq. Check the backend network connection.") from exc

    try:
        data = response.json()
    except requests.JSONDecodeError as exc:
        raise AIClientError("Groq returned invalid JSON.") from exc

    try:
        choice = data["choices"][0]
        text = choice["message"]["content"]
    except (KeyError, IndexError, TypeError) as exc:
        raise AIClientError("Groq returned an unexpected response format.") from exc

    if choice.get("finish_reason") == "length":
        raise AIClientError(
            "The model response reached its token limit. Increase GROQ_MAX_TOKENS."
        )

    if not text or not text.strip():
        raise AIClientError(f"The cloud model {model} returned an empty response.")

    return text.strip()


def ask_ai(prompt: str, system_prompt: Optional[str] = None) -> str:
    global LAST_USED_MODEL
    load_local_env()
    api_key = os.getenv("GROQ_API_KEY")
    if not api_key:
        raise AIClientError(
            "GROQ_API_KEY is not set. Add it to backend/.env and restart the backend."
        )

    messages = build_messages(prompt, system_prompt)

    explicit_model = os.getenv("GROQ_MODEL", "").strip()
    fallback_models = parse_model_priority()
    model_order = []
    if explicit_model:
        model_order.append(explicit_model)
    model_order.extend(model for model in fallback_models if model != explicit_model)

    retry_messages = []
    for model in model_order:
        try:
            response = request_model(model, messages, api_key)
            LAST_USED_MODEL = model
            return response
        except AIClientError as exc:
            message = str(exc)
            if message.startswith("MODEL_RETRY::"):
                retry_messages.append(message.split("::", 2)[-1])
                continue
            raise

    attempted = ", ".join(model_order)
    details = (
        retry_messages[-1]
        if retry_messages
        else "All configured cloud models were unavailable."
    )
    raise AIClientError(
        f"All configured cloud models hit limits or capacity constraints. Attempted: {attempted}. Last error: {details}"
    )
