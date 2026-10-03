"""
Centralized settings, loaded from environment variables / a .env file via
pydantic-settings.

Why externalise config instead of hardcoding: the original brief requires
"All attack configs externalised (YAML config files, not hardcoded)" for
attack *content* (templates, rubrics) — this file is a step below that:
it's runtime/secrets config (API keys, model names, DB path), which is a
different concern from attack templates. Rule of thumb we'll follow
throughout the build:

  - Settings (this file): things that differ per environment/deployer
    (API keys, DB URL, rate limits) -> env vars via pydantic-settings.
  - Attack templates/rubrics (generator/templates/*.yaml,
    judge/scoring_rubric.py): things that define WHAT we test ->
    version-controlled YAML, reviewed like code.

Keeping these two kinds of config in separate mechanisms is itself an
interview-relevant point: secrets must never live in a YAML file that
gets committed to git.
"""

from __future__ import annotations

from functools import lru_cache

from pydantic import Field, SecretStr
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """
    All runtime configuration for the red-team-suite backend.

    pydantic-settings reads values from (in priority order): explicit
    kwargs -> environment variables -> a `.env` file -> field defaults.
    This means local dev uses a `.env` file, CI/CD injects real secrets as
    env vars (GitHub Actions secrets), and nothing sensitive is ever
    committed.
    """

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",  # unrelated env vars on the host shouldn't crash startup
    )

    # --- Attacker LLM (generates adversarial prompts) ---
    attacker_provider: str = Field(
        default="groq", description="Which provider hosts the attacker model: groq, openai, together, fireworks, ollama, or anthropic."
    )
    attacker_model: str = Field(default="llama-3.3-70b-versatile")
    attacker_base_url: str | None = Field(
        default=None, description="[V3] Override the attacker provider's default base_url — for a self-hosted OpenAI-compatible endpoint not in the built-in registry."
    )
    groq_api_key: SecretStr | None = Field(default=None)

    # --- Judge LLM (scores attack results — MUST differ from target, see 0.5) ---
    judge_provider: str = Field(default="gemini", description="gemini, anthropic, or any OpenAI-compatible provider name (groq, openai, together, fireworks, ollama).")
    judge_model: str = Field(default="gemini-flash-latest")
    judge_base_url: str | None = Field(
        default=None, description="[V3] Override the judge provider's default base_url."
    )
    gemini_api_key: SecretStr | None = Field(default=None)

    # --- [V3] Additional provider credentials for the multi-provider registry (llm_providers.py) ---
    openai_api_key: SecretStr | None = Field(default=None)
    anthropic_api_key: SecretStr | None = Field(default=None)
    llm_api_key: SecretStr | None = Field(
        default=None,
        description="[V3] Generic API key override for an OpenAI-compatible provider not covered by groq_api_key/openai_api_key (e.g. Together, Fireworks, a corporate gateway).",
    )

    # --- [V3] Backend authentication ---
    backend_api_key: SecretStr | None = Field(
        default=None,
        description=(
            "[V3] If set, every HTTP endpoint except /health requires "
            "Authorization: Bearer <this value>, and both WebSocket endpoints "
            "require a matching ?token=<this value> query parameter (browsers "
            "can't set custom headers on the WS handshake, so a query param is "
            "the standard workaround). Left unset (default) means the backend "
            "is open — correct for local single-user self-hosting, the same "
            "default posture this suite has always had. Setting this becomes "
            "necessary the moment relay mode (V2) makes a shared/hosted "
            "control plane a realistic deployment target — see README."
        ),
    )

    # --- Target execution ---
    target_api_key: SecretStr | None = Field(
        default=None, description="Optional target API key fallback loaded from environment or .env."
    )
    target_request_timeout_seconds: float = Field(
        default=30.0, description="Per-request timeout when calling the target endpoint."
    )
    max_requests_per_second: float = Field(
        default=2.0,
        description="Rate limit applied to the target endpoint per 0.10 (ethical rate limiting) — default is deliberately conservative.",
    )

    # --- Storage ---
    database_path: str = Field(default="./data/red_team.db", description="SQLite file path for run_store.py (aiosqlite). Used only when database_url is not set.")
    database_url: str | None = Field(
        default=None,
        description="[V3] If set to a postgres://... or postgresql://... URL, storage/factory.py returns PostgresRunStore instead of the default SQLite RunStore. Leave unset for the default self-hosted/portfolio-scale setup.",
    )
    redis_url: str | None = Field(
        default=None,
        description="[V3] If set (e.g. redis://localhost:6379/0), main.py uses storage/redis_broadcast.py's RedisBroadcaster for dashboard WS fan-out instead of the default in-process dict — needed only for a multi-instance deployment. Leave unset for the default single-process setup.",
    )

    # --- Regression / CI gate thresholds ---
    ci_fail_on_severities: list[str] = Field(
        default_factory=lambda: ["critical", "high"],
        description="If a CI-triggered run produces a NEW_VULNERABILITY finding at any of these severities, ci/red_team_gate.py exits non-zero.",
    )

    # --- App ---
    log_level: str = Field(default="INFO")
    api_host: str = Field(default="0.0.0.0")
    api_port: int = Field(default=8000)


@lru_cache
def get_settings() -> Settings:
    """
    Cached settings accessor. `lru_cache` means Settings() is constructed
    once per process, not re-parsed from env on every call — standard
    FastAPI dependency-injection pattern (`Depends(get_settings)` in
    routes later in Phase 11).
    """
    return Settings()
