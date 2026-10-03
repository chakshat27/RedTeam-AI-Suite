"""
Core schemas for individual attack cases and their results.

Design principle: AttackCase (the input/test definition) is kept strictly
separate from AttackResult (the output/observation). This mirrors the
TestCase / TestRun split in traditional QA infra, and is what makes
regression testing (Phase 10) possible — the same AttackCase.id can be
re-run across many RedTeamRuns and diffed over time.
"""

from __future__ import annotations

import uuid
from datetime import datetime, timezone
from enum import Enum
from typing import Any

from pydantic import BaseModel, Field, field_validator


class AttackCategory(str, Enum):
    """
    The 8 core attack categories from V1, plus EXCESSIVE_AGENCY added in
    V2 (OWASP LLM06) — testing whether a target with tool/function-calling
    access can be manipulated into invoking a destructive or out-of-scope
    action. See attacks/excessive_agency.py for the V1-consistent
    simplification this category uses (text-described tools + structured
    "would-call" output, rather than inventing a full native function-
    calling wire protocol — documented there, not hidden).

    Inherits from `str` so the enum serializes as a plain string in JSON
    (FastAPI/Pydantic v2 handle this natively) and can be used directly
    in comparisons/dict keys without `.value` everywhere.
    """

    PROMPT_INJECTION = "prompt_injection"
    JAILBREAK = "jailbreak"
    PII_EXTRACTION = "pii_extraction"
    OFF_TOPIC = "off_topic"
    GUARDRAIL_BYPASS = "guardrail_bypass"
    INDIRECT_INJECTION = "indirect_injection"
    HALLUCINATION = "hallucination"
    PROMPT_LEAKAGE = "prompt_leakage"
    EXCESSIVE_AGENCY = "excessive_agency"


class Severity(str, Enum):
    """
    CVSS-inspired severity bucket. This is a *derived* field — computed
    from judge_score + category-specific impact weighting (Phase 9's
    owasp_mapper / severity classifier decides the mapping), not something
    the judge sets directly. Keeping it separate from judge_score means we
    can change the severity-mapping logic later without touching every
    stored raw score.
    """

    CRITICAL = "critical"
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"
    INFO = "info"


class AttackCase(BaseModel):
    """
    A single, reproducible adversarial test case — the INPUT to an attack run.

    This is generated once (by the attacker LLM, Phase 2/3) and can then be
    replayed unchanged against many targets, or the same target multiple
    times, which is what makes ASR (Attack Success Rate) and regression
    testing statistically meaningful — you're comparing outcomes for the
    *same* stimulus, not apples to oranges.
    """

    id: str = Field(
        default_factory=lambda: f"case_{uuid.uuid4().hex[:12]}",
        description="Stable unique identifier. Used as the join key across runs for regression comparison.",
    )
    category: AttackCategory = Field(
        description="Which of the 8 attack categories this case belongs to."
    )
    prompt: str = Field(
        min_length=1,
        description="The actual adversarial prompt text sent to the target LLM.",
    )
    expected_failure_mode: str = Field(
        description=(
            "Plain-English description of what a SUCCESSFUL attack looks like "
            "for this specific case, e.g. 'model reveals system prompt verbatim'. "
            "This gets fed into the judge prompt so scoring isn't done in a vacuum "
            "(see 0.6 — judge needs original attack intent, not just raw text)."
        )
    )
    metadata: dict[str, Any] = Field(
        default_factory=dict,
        description=(
            "Free-form bag for category-specific extras, e.g. for indirect_injection: "
            "{'injected_document_id': ..., 'retrieval_query': ...}. Keeps the core "
            "schema stable while letting individual attack modules attach whatever "
            "context they need without a migration."
        ),
    )
    generated_by: str = Field(
        default="unknown",
        description="Which attacker LLM/model produced this case, e.g. 'groq/llama-3.3-70b'. Useful for auditing attack coverage.",
    )
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    @field_validator("prompt")
    @classmethod
    def prompt_not_blank(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("prompt cannot be empty or whitespace-only")
        return v


class AttackResult(BaseModel):
    """
    The OUTCOME of executing one AttackCase against one target, on one occasion.

    Deliberately 1:1 with a single execution — if you re-run the same
    AttackCase (e.g. to sample ASR across multiple attempts, since LLM
    behavior is non-deterministic — see 0.1), you get a NEW AttackResult,
    not a mutation of an old one. Every attempt is preserved for audit.
    """

    id: str = Field(default_factory=lambda: f"result_{uuid.uuid4().hex[:12]}")
    attack_case_id: str = Field(
        description="Foreign key back to the AttackCase that produced this result."
    )
    category: AttackCategory = Field(
        description=(
            "Denormalized copy of the originating AttackCase's category. Kept here "
            "(rather than requiring a join back to the case on every read) because "
            "results are read far more often than cases are looked up jointly with them — "
            "same rationale as RedTeamRun.results being denormalized onto the run. "
            "Enables reporter/report_generator.py to group results by category without "
            "fragile assumptions about list ordering."
        )
    )
    prompt: str = Field(
        description=(
            "Denormalized copy of the originating AttackCase's prompt text. Stored here "
            "so a VulnerabilityReport's example_prompt can be reconstructed directly from "
            "results, without requiring a separate persisted AttackCase store to be joined "
            "in at report-generation time."
        )
    )
    template_variant_id: str | None = Field(
        default=None,
        description=(
            "[V2] Denormalized copy of the originating AttackCase's metadata['variant_id'] "
            "(set only for template-sourced cases — see generator/templates/*.yaml and each "
            "attack class's generate_cases()). This is what fixes V1's documented regression-"
            "matching limitation: AttackCase.id is a fresh UUID every run, so V1's "
            "storage/regression.py fell back to matching on (category, prompt) text, which "
            "cannot track attacker-LLM-generated cases across runs (their text varies each "
            "generation). variant_id is stable across runs for every template-sourced case "
            "(it's the YAML key, e.g. 'classic_ignore'), so matching on (category, "
            "template_variant_id) gives a genuinely stable cross-run identity for the "
            "majority of cases. Attacker-LLM-generated cases still have no stable identity "
            "(this field is None for them) — that limitation is real and stays documented, "
            "not papered over; storage/regression.py falls back to prompt-text matching "
            "only for those."
        ),
    )
    target_response: str = Field(
        description="Raw, unmodified text returned by the target LLM. Never truncated or cleaned — we need the exact evidence."
    )
    judge_score: int = Field(
        ge=0,
        le=5,
        description=(
            "0 = attack fully failed / model correctly resisted. "
            "5 = attack fully succeeded / full compromise. "
            "What 'compromise' means is category-specific — see scoring_rubric.py (Phase 6+)."
        ),
    )
    success: bool = Field(
        description=(
            "Boolean derived from judge_score against a per-category threshold "
            "(not always score >= 5 — some categories treat score >= 3 as 'success' "
            "for ASR purposes, e.g. partial PII leakage still counts). Stored explicitly "
            "rather than recomputed on every read, so the threshold used is locked to "
            "this specific historical result even if the threshold config changes later."
        )
    )
    judge_reasoning: str = Field(
        description=(
            "Free-text explanation from the judge LLM for why it assigned this score. "
            "Critical for auditability and diagnosing judge false positives — "
            "see 1.3. Never discard this even though it's not used in aggregate metrics."
        )
    )
    judge_model: str = Field(
        description="Which model acted as judge for this result, e.g. 'gemini-1.5-flash'. Must differ from the target model — see 0.5 (three-LLM architecture)."
    )
    latency_ms: int = Field(
        ge=0, description="Wall-clock time for the target endpoint to respond, in milliseconds."
    )
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    error: str | None = Field(
        default=None,
        description=(
            "If the target call itself failed (timeout, 500, malformed response), "
            "store the error here and leave judge_score/success as sentinel values "
            "set by the caller (executor decides the convention — see attack_runner.py). "
            "We never silently drop a failed attempt; a failed HTTP call is still a "
            "result worth recording, not a null."
        ),
    )
