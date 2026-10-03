"""
[V3] Multi-provider registry for the attacker and judge LLM roles.

Two implementation strategies, matching how the provider landscape
actually looks:
  - OpenAI-compatible providers (Groq, OpenAI itself, Together, Fireworks,
    a local Ollama server, and most others) share one wire format
    (/chat/completions, choices[0].message.content). ONE generic client
    class (see generator/attack_generator.py's GroqAttackerClient,
    judge/llm_judge.py's new OpenAICompatibleJudgeClient) covers all of
    them — only base_url/api_key/model differ, which is exactly what this
    registry resolves per provider name.
  - Anthropic uses a genuinely different wire format (/v1/messages,
    x-api-key header, content[0].text response shape) and gets its own
    native client class (judge/llm_judge.py's AnthropicJudgeClient,
    generator/attack_generator.py's AnthropicAttackerClient).

Scope boundary, stated directly rather than silently unsupported: AWS
Bedrock and GCP Vertex both need SigV4/IAM or service-account auth via
their respective cloud SDKs (boto3, google-cloud-aiplatform) — a
meaningfully different integration shape than "swap the base_url" that
would pull in heavy cloud-SDK dependencies for a portfolio-scale tool.
They're documented here as the clear extension point (implement a client
satisfying AttackerClientProtocol/JudgeClientProtocol using the relevant
SDK, register it in the two factories below) rather than half-implemented.
"""

from __future__ import annotations

from config import Settings

# Default base_url per OpenAI-compatible provider. `openai_compatible_base_url`
# in Settings overrides any of these if the person is pointing at something
# not in this list (a self-hosted vLLM server, a corporate LLM gateway, etc).
_OPENAI_COMPATIBLE_BASE_URLS: dict[str, str] = {
    "groq": "https://api.groq.com/openai/v1",
    "openai": "https://api.openai.com/v1",
    "together": "https://api.together.xyz/v1",
    "fireworks": "https://api.fireworks.ai/inference/v1",
    "ollama": "http://localhost:11434/v1",
}


def _resolve_openai_compatible_api_key(settings: Settings, provider: str) -> str:
    if provider == "groq" and settings.groq_api_key:
        return settings.groq_api_key.get_secret_value()
    if provider == "openai" and settings.openai_api_key:
        return settings.openai_api_key.get_secret_value()
    if settings.llm_api_key:  # generic override, e.g. for together/fireworks/a custom gateway
        return settings.llm_api_key.get_secret_value()
    return ""  # ollama and similar local servers typically need no key at all


def build_attacker_client(settings: Settings):
    """Return an AttackerClientProtocol-conforming client per settings.attacker_provider."""
    from generator.attack_generator import AnthropicAttackerClient, GroqAttackerClient

    provider = settings.attacker_provider.lower()
    if provider == "anthropic":
        if not settings.anthropic_api_key:
            raise ValueError("attacker_provider='anthropic' requires ANTHROPIC_API_KEY to be set.")
        return AnthropicAttackerClient(
            api_key=settings.anthropic_api_key.get_secret_value(), model=settings.attacker_model
        )

    base_url = settings.attacker_base_url or _OPENAI_COMPATIBLE_BASE_URLS.get(provider)
    if base_url is None:
        raise ValueError(
            f"Unknown attacker_provider '{provider}' with no attacker_base_url override configured. "
            f"Known providers: anthropic, {', '.join(_OPENAI_COMPATIBLE_BASE_URLS)}, or set "
            f"ATTACKER_BASE_URL to point at any OpenAI-compatible endpoint."
        )
    return GroqAttackerClient(
        api_key=_resolve_openai_compatible_api_key(settings, provider),
        model=settings.attacker_model,
        base_url=base_url,
    )


def build_judge_client(settings: Settings):
    """Return a JudgeClientProtocol-conforming client per settings.judge_provider."""
    from judge.llm_judge import AnthropicJudgeClient, GeminiJudgeClient, OpenAICompatibleJudgeClient

    provider = settings.judge_provider.lower()
    if provider == "gemini":
        if not settings.gemini_api_key:
            raise ValueError("judge_provider='gemini' requires GEMINI_API_KEY to be set.")
        return GeminiJudgeClient(api_key=settings.gemini_api_key.get_secret_value(), model=settings.judge_model)

    if provider == "anthropic":
        if not settings.anthropic_api_key:
            raise ValueError("judge_provider='anthropic' requires ANTHROPIC_API_KEY to be set.")
        return AnthropicJudgeClient(
            api_key=settings.anthropic_api_key.get_secret_value(), model=settings.judge_model
        )

    base_url = settings.judge_base_url or _OPENAI_COMPATIBLE_BASE_URLS.get(provider)
    if base_url is None:
        raise ValueError(
            f"Unknown judge_provider '{provider}' with no judge_base_url override configured. "
            f"Known providers: gemini, anthropic, {', '.join(_OPENAI_COMPATIBLE_BASE_URLS)}, or set "
            f"JUDGE_BASE_URL to point at any OpenAI-compatible endpoint."
        )
    return OpenAICompatibleJudgeClient(
        api_key=_resolve_openai_compatible_api_key(settings, provider),
        model=settings.judge_model,
        base_url=base_url,
    )
