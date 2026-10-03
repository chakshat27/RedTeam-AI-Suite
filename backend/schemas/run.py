"""
Schemas representing a single execution of the red team suite (a "run"),
and comparisons between two runs (regression detection).

A RedTeamRun is the top-level container: one target, one or more
categories, N AttackCases generated/executed/judged, all rolled up.
Now includes user_id and user_name fields for multi-user SQLite persistence.
"""

from __future__ import annotations

import uuid
from datetime import datetime, timezone
from enum import Enum
from typing import Literal

from pydantic import BaseModel, Field

from schemas.attack import AttackCategory, AttackResult, Severity


class RunStatus(str, Enum):
    PENDING = "pending"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"


class RedTeamRun(BaseModel):
    run_id: str = Field(default_factory=lambda: f"run_{uuid.uuid4().hex[:12]}")
    target_endpoint: str = Field(
        description="Base URL of the OpenAI-compatible endpoint under test."
    )
    target_model: str = Field(
        description="Model name/identifier passed to the target endpoint, e.g. 'gpt-4o-mini' or a self-hosted model tag."
    )
    categories_run: list[AttackCategory] = Field(
        description="Which of the attack categories were included in this run."
    )
    cases_per_category: int = Field(
        ge=1,
        description="How many AttackCases were generated per category.",
    )
    status: RunStatus = Field(default=RunStatus.PENDING)
    results: list[AttackResult] = Field(
        default_factory=list,
        description="All AttackResults produced so far.",
    )
    started_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    completed_at: datetime | None = Field(
        default=None, description="Set when status transitions to COMPLETED or FAILED."
    )
    triggered_by: str = Field(
        default="manual",
        description="'manual' or 'ci'.",
    )
    error: str | None = Field(
        default=None,
        description="Human-readable error message when status=FAILED.",
    )
    execution_mode: Literal["local", "relay"] = Field(
        default="local",
        description="'local' or 'relay'.",
    )
    agent_id: str | None = Field(
        default=None,
        description="For execution_mode='relay': connected agent ID.",
    )
    user_id: str | None = Field(
        default=None,
        description="Unique user ID of the logged-in user who created this scan run.",
    )
    user_name: str | None = Field(
        default=None,
        description="Full name or email username of the logged-in user who created this scan run.",
    )


class CategorySummary(BaseModel):
    category: AttackCategory
    total_cases: int = Field(ge=0)
    successful_attacks: int = Field(ge=0)
    attack_success_rate: float = Field(
        ge=0.0,
        le=1.0,
    )
    highest_severity: Severity | None = Field(
        default=None
    )


class RunSummary(BaseModel):
    run_id: str
    target_endpoint: str
    target_model: str
    status: RunStatus
    overall_asr: float = Field(ge=0.0, le=1.0)
    category_summaries: list[CategorySummary]
    started_at: datetime
    completed_at: datetime | None = None
    user_id: str | None = None
    user_name: str | None = None


class DeltaType(str, Enum):
    NEW_VULNERABILITY = "new_vulnerability"
    FIXED = "fixed"
    UNCHANGED_VULNERABLE = "unchanged_vulnerable"
    UNCHANGED_SAFE = "unchanged_safe"
    NOT_COMPARABLE = "not_comparable"


class CaseDelta(BaseModel):
    attack_case_id: str
    category: AttackCategory
    delta_type: DeltaType
    baseline_success: bool | None = None
    current_success: bool | None = None


class RunComparison(BaseModel):
    baseline_run_id: str
    current_run_id: str
    deltas: list[CaseDelta]
    new_vulnerability_count: int = Field(ge=0)
    fixed_count: int = Field(ge=0)
    has_regression: bool
