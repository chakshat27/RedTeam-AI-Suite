"""
AttackRunner: orchestrates a full RedTeamRun across multiple attack
categories — sequential across categories, parallel within each (8.1) —
and emits progress events suitable for streaming over a WebSocket
(Phase 11 wires this up; this module has no FastAPI/WebSocket dependency
itself, only a plain async callback).
"""

from __future__ import annotations

from datetime import datetime, timezone
from enum import Enum
from typing import Awaitable, Callable

from pydantic import BaseModel

from attacks.base_attack import BaseAttack
from schemas.attack import AttackCase, AttackCategory, AttackResult
from schemas.run import RedTeamRun, RunStatus


class ProgressEventType(str, Enum):
    RUN_STARTED = "run_started"
    CATEGORY_STARTED = "category_started"
    CASE_COMPLETED = "case_completed"
    CATEGORY_COMPLETED = "category_completed"
    RUN_COMPLETED = "run_completed"


class RunProgressEvent(BaseModel):
    """
    A single progress update. Kept separate from the persisted schemas in
    schemas/run.py deliberately — this is an ephemeral, in-flight signal
    for live dashboards, not something we store; RedTeamRun (Phase 1) is
    the durable record. Conflating the two would mean every progress tick
    needs a full valid RedTeamRun-shaped payload, which is unnecessary
    overhead for something fired dozens of times per run.
    """

    event_type: ProgressEventType
    run_id: str
    category: AttackCategory | None = None
    case_id: str | None = None
    success: bool | None = None
    message: str = ""
    timestamp: datetime = datetime.now(timezone.utc)


ProgressCallback = Callable[[RunProgressEvent], Awaitable[None]]


class AttackRunner:
    """
    Drives a RedTeamRun to completion: for each category in
    run.categories_run (in order), runs that category's cases in
    parallel (BaseAttack.run()'s asyncio.gather, Phase 8.4), accumulates
    results into the RedTeamRun, and emits progress events throughout.
    """

    def __init__(
        self,
        run: RedTeamRun,
        attacks_by_category: dict[AttackCategory, BaseAttack],
        progress_callback: ProgressCallback | None = None,
    ) -> None:
        # attacks_by_category holds already-fully-constructed BaseAttack
        # instances — meaning any rate limiting (executor/rate_limiter.py)
        # was already applied by whoever built these, by wrapping their
        # target_client before passing it to the attack's constructor.
        # AttackRunner deliberately has zero knowledge of rate limiting —
        # that's a target_client concern, not an orchestration concern
        # (see rate_limiter.py's module docstring).
        self._run = run
        self._attacks_by_category = attacks_by_category
        self._progress_callback = progress_callback

    async def _emit(self, event: RunProgressEvent) -> None:
        if self._progress_callback is not None:
            await self._progress_callback(event)

    async def run(self) -> RedTeamRun:
        """
        Execute the full run and return the completed RedTeamRun (also
        mutated in place, so callers holding a reference see live
        updates as categories complete — useful for Phase 11's
        GET /run/{run_id} polling against the same in-memory/stored object).
        """
        self._run.status = RunStatus.RUNNING
        await self._emit(
            RunProgressEvent(
                event_type=ProgressEventType.RUN_STARTED,
                run_id=self._run.run_id,
                message=f"Starting run against {self._run.target_endpoint} across {len(self._run.categories_run)} categories.",
            )
        )

        try:
            # Sequential across categories — see 8.1 for why (explainability
            # + bounded peak concurrency against a shared target resource).
            for category in self._run.categories_run:
                attack = self._attacks_by_category.get(category)
                if attack is None:
                    # A category was requested but no attack instance was
                    # provided for it — a configuration error, not a target
                    # failure. Fail loudly rather than silently skipping a
                    # requested category, which would produce a misleadingly
                    # incomplete report.
                    raise ValueError(f"No attack instance registered for requested category: {category}")

                await self._emit(
                    RunProgressEvent(
                        event_type=ProgressEventType.CATEGORY_STARTED,
                        run_id=self._run.run_id,
                        category=category,
                        message=f"Running {self._run.cases_per_category} cases for {category.value}.",
                    )
                )

                async def on_case_result(case: AttackCase, result: AttackResult, _category: AttackCategory = category) -> None:
                    await self._emit(
                        RunProgressEvent(
                            event_type=ProgressEventType.CASE_COMPLETED,
                            run_id=self._run.run_id,
                            category=_category,
                            case_id=case.id,
                            success=result.success,
                            message=(
                                f"Case {case.id} {'SUCCEEDED (vulnerability)' if result.success else 'failed (target resisted)'}"
                                if result.error is None
                                else f"Case {case.id} errored: {result.error}"
                            ),
                        )
                    )

                # Cases within this category run in parallel via
                # BaseAttack.run()'s internal asyncio.gather (8.4);
                # categories themselves stay strictly sequential because
                # this loop awaits each attack.run() fully before moving on.
                category_results = await attack.run(self._run.cases_per_category, on_result=on_case_result)
                self._run.results.extend(category_results)

                category_success_count = sum(1 for r in category_results if r.success)
                await self._emit(
                    RunProgressEvent(
                        event_type=ProgressEventType.CATEGORY_COMPLETED,
                        run_id=self._run.run_id,
                        category=category,
                        message=f"{category.value} complete: {category_success_count}/{len(category_results)} attacks succeeded.",
                    )
                )

            self._run.status = RunStatus.COMPLETED

        except Exception:
            # Run-level failure (e.g. the ValueError above, or something
            # unrecoverable) — mark the run FAILED rather than leaving it
            # stuck in RUNNING forever, which would hang any UI polling
            # GET /run/{run_id} (Phase 11).
            self._run.status = RunStatus.FAILED
            raise
        finally:
            self._run.completed_at = datetime.now(timezone.utc)
            await self._emit(
                RunProgressEvent(
                    event_type=ProgressEventType.RUN_COMPLETED,
                    run_id=self._run.run_id,
                    message=f"Run finished with status={self._run.status.value}. Total results: {len(self._run.results)}.",
                )
            )

        return self._run
