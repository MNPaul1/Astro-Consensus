import pytest

from shared.ai_client import (
    AIClientError,
    AIRequestConfig,
    ask_ai,
    parse_model_priority,
    use_request_ai_config,
)


def test_parse_model_priority_uses_default_when_env_missing(monkeypatch):
    monkeypatch.delenv("GROQ_MODEL_PRIORITY", raising=False)
    models = parse_model_priority()
    assert models[0] == "openai/gpt-oss-120b"
    assert models[-1] == "openai/gpt-oss-20b"


def test_ask_ai_falls_back_to_next_model_on_limit(monkeypatch):
    calls = []

    monkeypatch.setenv("GROQ_API_KEY", "test-key")
    monkeypatch.delenv("GROQ_MODEL", raising=False)
    monkeypatch.setenv(
        "GROQ_MODEL_PRIORITY",
        "openai/gpt-oss-120b,llama-3.3-70b-versatile",
    )
    monkeypatch.setattr("shared.ai_client.load_local_env", lambda: None)

    def fake_request_model(config, model, messages):
        calls.append(model)
        if model == "openai/gpt-oss-120b":
            raise AIClientError("MODEL_RETRY::openai/gpt-oss-120b::tokens per minute exceeded")
        assert config.api_key == "test-key"
        assert messages[-1]["content"] == "Hello"
        return "Recovered response"

    monkeypatch.setattr("shared.ai_client.request_model", fake_request_model)

    result = ask_ai("Hello")

    assert result == "Recovered response"
    assert calls == ["openai/gpt-oss-120b", "llama-3.3-70b-versatile"]


def test_ask_ai_raises_after_all_models_fail(monkeypatch):
    monkeypatch.setenv("GROQ_API_KEY", "test-key")
    monkeypatch.delenv("GROQ_MODEL", raising=False)
    monkeypatch.setenv("GROQ_MODEL_PRIORITY", "model-a,model-b")
    monkeypatch.setattr("shared.ai_client.load_local_env", lambda: None)

    def fake_request_model(_config, model, _messages):
        raise AIClientError(f"MODEL_RETRY::{model}::rate limit for {model}")

    monkeypatch.setattr("shared.ai_client.request_model", fake_request_model)

    with pytest.raises(AIClientError, match="All configured cloud models hit limits"):
        ask_ai("Hello")


def test_ask_ai_uses_request_override_when_present(monkeypatch):
    calls = []
    override = AIRequestConfig(
        api_url="https://example.com/v1/chat/completions",
        api_key="user-key",
        model_order=["user-model"],
        source_label="User model (user-model)",
    )

    monkeypatch.setattr("shared.ai_client.load_local_env", lambda: None)

    def fake_request_model(config, model, messages):
        calls.append((config.api_url, config.api_key, model, messages[-1]["content"]))
        return "User model response"

    monkeypatch.setattr("shared.ai_client.request_model", fake_request_model)

    with use_request_ai_config(override):
        result = ask_ai("Hello")

    assert result == "User model response"
    assert calls == [("https://example.com/v1/chat/completions", "user-key", "user-model", "Hello")]
