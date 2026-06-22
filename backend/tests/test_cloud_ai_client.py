import pytest

from shared.ai_client import AIClientError, ask_ai, parse_model_priority


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

    def fake_request_model(model, messages, api_key):
        calls.append(model)
        if model == "openai/gpt-oss-120b":
            raise AIClientError("MODEL_RETRY::openai/gpt-oss-120b::tokens per minute exceeded")
        assert api_key == "test-key"
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

    def fake_request_model(model, _messages, _api_key):
        raise AIClientError(f"MODEL_RETRY::{model}::rate limit for {model}")

    monkeypatch.setattr("shared.ai_client.request_model", fake_request_model)

    with pytest.raises(AIClientError, match="All configured cloud models hit limits"):
        ask_ai("Hello")
