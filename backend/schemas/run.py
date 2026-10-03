"""
Schemas representing a single execution of the red team suite (a "run"),
and comparisons between two runs (regression detection, Phase 10).

A RedTeamRun is the top-level container: one target, one or more
categories, N AttackCases generated/executed/judged, all rolled up.
"""

from __future__ import annotations

import uuid
from datetime import datetime, timezone
from enum import Enum
from typing import Literal

from pydantic import BaseModel, Field

from schemas.attack import AttackCategory, AttackResult, Severity


class RunStatus(str, Enum):
    """
    Lifecycle state of a run. Needed because runs are long (5-30 min per
    the original brief) and execute as a FastAPI background task — the
    client polls GET /run/{run_id} and needs to know if it's still going,
    finished cleanly, or blew up.
    """

    PENDING = "pending"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"


class RedTeamRun(BaseModel):
    """
    Top-level record for one execution of the suite against one target.

    Design note: this holds `results: list[AttackResult]` directly rather
    than only foreign keys, because runs are read far more often than
    written (dashboard polling, report generation, regression diffing) and
    denormalizing avoids N+1 joins in run_store.py. SQLite storage (Phase
    storage) will serialize this list as JSON in one row — fine at this
    scale (dozens-hundreds of results per run, not millions).
    """

    run_id: str = Field(default_factory=lambda: f"run_{uuid.uuid4().hex[:12]}")
    target_endpoint: str = Field(
        description="Base URL of the OpenAI-compatible endpoint under test."
    )
    target_model: str = Field(
        description="Model name/identifier passed to the target endpoint, e.g. 'gpt-4o-mini' or a self-hosted model tag."
    )
    categories_run: list[AttackCategory] = Field(
        description="Which of the 8 categories were included in this run. A run need not cover all 8 — useful for fast targeted re-runs, e.g. CI gate only re-checking a category that previously regressed."
    )
    cases_per_category: int = Field(
        ge=1,
        description="How many AttackCases were generated per category. Directly controls run duration and statistical confidence in the ASR — more cases = tighter ASR estimate, given the non-determinism discussed in 0.1.",
    )
    status: RunStatus = Field(default=RunStatus.PENDING)
    results: list[AttackResult] = Field(
        default_factory=list,
        description="All AttackResults produced so far. Populated incrementally as attacks complete, which is what powers the live WebSocket dashboard (Phase 11).",
    )
    started_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    completed_at: datetime | None = Field(
        default=None, description="Set when status transitions to COMPLETED or FAILED."
    )
    triggered_by: str = Field(
        default="manual",
        description="'manual' (dashboard) or 'ci' (GitHub Actions gate) — lets the report/history UI distinguish ad hoc exploration runs from CI-gate runs.",
    )
    error: str | None = Field(
        default=None,
        description="Human-readable error message when status=FAILED, so UI polling GET /run/{run_id} can show users *why* the run died instead of just 'failed'.",
    )
    execution_mode: Literal["local", "relay"] = Field(
        default="local",
        description=(
            "[V2] 'local' (default, V1 behavior): the backend process itself builds the "
            "attacker/judge/target clients using ITS OWN Settings/.env and executes the run "
            "in-process — this is correct for a self-hosted single-user deployment, where the "
            "person running the backend IS the person whose API keys they are. "
            "'relay': the backend does NOT execute the run itself and never touches any API "
            "key — it queues the run and waits for a connected local agent (see "
            "agent/relay_agent.py) to claim it, execute it entirely on the agent's own machine "
            "using the agent's own local .env, and stream results back over the same "
            "WebSocket. This is the answer to 'a hosted dashboard shouldn't need the user's "
            "API key' — the control plane only ever sees run parameters and results, never "
            "credentials."
        ),
    )
    agent_id: str | None = Field(
        default=None,
        description="[V2] For execution_mode='relay': which connected agent this run was dispatched to. None for execution_mode='local'.",
    )


class CategorySummary(BaseModel):
    """Per-category rollup of ASR — the unit most dashboards/reports actually display."""

    category: AttackCategory
    total_cases: int = Field(ge=0)
    successful_attacks: int = Field(ge=0)
    attack_success_rate: float = Field(
        ge=0.0,
        le=1.0,
        description="successful_attacks / total_cases. The primary metric per 0.7 — computed, not stored redundantly elsewhere.",
    )
    highest_severity: Severity | None = Field(
        default=None, description="Worst severity observed in this category for this run, or None if total_cases == 0."
    )


class RunSummary(BaseModel):
    """
    Lightweight rollup of a RedTeamRun, safe to compute on demand for list
    views (GET /runs) without shipping every full AttackResult payload
    over the wire. Kept as its own model rather than reusing RedTeamRun
    with optional fields, so the two shapes can't accidentally drift into
    an ambiguous "which fields are actually populated" state.
    """

    run_id: str
    target_endpoint: str
    target_model: str
    status: RunStatus
    overall_asr: float = Field(ge=0.0, le=1.0, description="Aggregate ASR across all categories in this run.")
    category_summaries: list[CategorySummary]
    started_at: datetime
    completed_at: datetime | None = None


class DeltaType(str, Enum):
    """
    Classification of how a specific AttackCase's outcome changed between
    two runs. This is the vocabulary Phase 10's regression.py and the CI
    gate are built on.
    """

    NEW_VULNERABILITY = "new_vulnerability"  # failed(safe) -> succeeded(compromised)
    FIXED = "fixed"                           # succeeded -> failed(safe)
    UNCHANGED_VULNERABLE = "unchanged_vulnerable"  # succeeded -> succeeded
    UNCHANGED_SAFE = "unchanged_safe"         # failed -> failed
    NOT_COMPARABLE = "not_comparable"         # case only exists in one of the two runs


class CaseDelta(BaseModel):
    """One AttackCase's outcome comparison between a baseline and current run."""

    attack_case_id: str
    category: AttackCategory
    delta_type: DeltaType
    baseline_success: bool | None = Field(
        default=None, description="None if this case didn't exist / wasn't run in the baseline run."
    )
    current_success: bool | None = None


class RunComparison(BaseModel):
    """
    Output of comparing two RedTeamRuns (GET /compare/{run_id_a}/{run_id_b}).

    This is what the CI gate (ci/red_team_gate.py, Phase 10) inspects:
    if any CaseDelta has delta_type == NEW_VULNERABILITY at HIGH/CRITICAL
    severity, the gate exits non-zero and fails the build.
    """

    baseline_run_id: str
    current_run_id: str
    deltas: list[CaseDelta]
    new_vulnerability_count: int = Field(ge=0)
    fixed_count: int = Field(ge=0)
    has_regression: bool = Field(
        description="True if new_vulnerability_count > 0. Convenience flag so the CI gate doesn't need to recount."
    )
