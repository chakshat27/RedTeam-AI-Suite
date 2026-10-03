"""
SQLite (via aiosqlite) persistence for RedTeamRun records.

Why SQLite for a portfolio-scale tool: zero external infra dependency
(no Postgres server to stand up), file-based so the whole run history
ships as one artifact, and aiosqlite keeps it async-consistent with the
rest of the FastAPI app (no blocking DB calls stalling the event loop).
At real scale (thousands of runs, millions of results) this would need
to move to Postgres — noted as a scaling limitation, not hidden.

Storage strategy: each RedTeamRun (including its full `results` list) is
serialized as one JSON blob per row. This denormalizes hard — no
relational query "give me all AttackResults across all runs for category
X" without loading full run JSON and filtering in Python. That trade-off
is deliberate at this scale: runs are read whole far more often than
results are queried across runs (dashboard shows one run at a time;
regression compares exactly two runs at a time), so a normalized results
table would add join complexity for a query pattern we don't actually have.
"""

from __future__ import annotations

import json
from pathlib import Path

import aiosqlite

from schemas.run import RedTeamRun, RunStatus, RunSummary, CategorySummary
from schemas.attack import AttackCategory, Severity

_SCHEMA = """
CREATE TABLE IF NOT EXISTS runs (
    run_id TEXT PRIMARY KEY,
    target_endpoint TEXT NOT NULL,
    status TEXT NOT NULL,
    started_at TEXT NOT NULL,
    completed_at TEXT,
    run_json TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_runs_started_at ON runs(started_at);
"""


class RunStore:
    """Async CRUD for RedTeamRun persistence."""

    def __init__(self, database_path: str) -> None:
        self._database_path = database_path
        Path(database_path).parent.mkdir(parents=True, exist_ok=True)

    async def init_schema(self) -> None:
        async with aiosqlite.connect(self._database_path) as db:
            await db.executescript(_SCHEMA)
            await db.commit()

    async def save_run(self, run: RedTeamRun) -> None:
        """Insert or update (UPSERT) a run. Called after every status transition so GET polling always sees fresh state."""
        async with aiosqlite.connect(self._database_path) as db:
            await db.execute(
                """
                INSERT INTO runs (run_id, target_endpoint, status, started_at, completed_at, run_json)
                VALUES (?, ?, ?, ?, ?, ?)
                ON CONFLICT(run_id) DO UPDATE SET
                    status=excluded.status,
                    completed_at=excluded.completed_at,
                    run_json=excluded.run_json
                """,
                (
                    run.run_id,
                    run.target_endpoint,
                    run.status.value,
                    run.started_at.isoformat(),
                    run.completed_at.isoformat() if run.completed_at else None,
                    run.model_dump_json(),
                ),
            )
            await db.commit()

    async def get_run(self, run_id: str) -> RedTeamRun | None:
        async with aiosqlite.connect(self._database_path) as db:
            cursor = await db.execute("SELECT run_json FROM runs WHERE run_id = ?", (run_id,))
            row = await cursor.fetchone()
            if row is None:
                return None
            return RedTeamRun.model_validate_json(row[0])

    async def list_runs(self, limit: int = 50) -> list[RunSummary]:
        """Return lightweight summaries (Phase 1's RunSummary), newest first — used by GET /runs."""
        async with aiosqlite.connect(self._database_path) as db:
            cursor = await db.execute(
                "SELECT run_json FROM runs ORDER BY started_at DESC LIMIT ?", (limit,)
            )
            rows = await cursor.fetchall()

        summaries = []
        for (run_json,) in rows:
            run = RedTeamRun.model_validate_json(run_json)
            summaries.append(_summarize_run(run))
        return summaries

    async def get_most_recent_completed_run(self, target_endpoint: str, exclude_run_id: str | None = None) -> RedTeamRun | None:
        """
        Find the most recent COMPLETED run against the same target, other
        than the given run — used by regression.py (Phase 10) to pick a
        default baseline for comparison when the caller doesn't specify one.
        """
        async with aiosqlite.connect(self._database_path) as db:
            cursor = await db.execute(
                """
                SELECT run_json FROM runs
                WHERE target_endpoint = ? AND status = ? AND run_id != ?
                ORDER BY started_at DESC LIMIT 1
                """,
                (target_endpoint, RunStatus.COMPLETED.value, exclude_run_id or ""),
            )
            row = await cursor.fetchone()
            return RedTeamRun.model_validate_json(row[0]) if row else None


def _summarize_run(run: RedTeamRun) -> RunSummary:
    by_category: dict[AttackCategory, list] = {}
    for result in run.results:
        by_category.setdefault(result.category, []).append(result)

    category_summaries = []
    for category, results in by_category.items():
        successes = [r for r in results if r.success]
        highest_severity = None
        if successes:
            # Local import avoids a circular import between storage and reporter
            from reporter.report_generator import _classify_result_severity

            best = max(successes, key=lambda r: r.judge_score)
            highest_severity = _classify_result_severity(category, best)

        category_summaries.append(
            CategorySummary(
                category=category,
                total_cases=len(results),
                successful_attacks=len(successes),
                attack_success_rate=len(successes) / len(results) if results else 0.0,
                highest_severity=highest_severity,
            )
        )

    overall_asr = sum(1 for r in run.results if r.success) / len(run.results) if run.results else 0.0

    return RunSummary(
        run_id=run.run_id,
        target_endpoint=run.target_endpoint,
        target_model=run.target_model,
        status=run.status,
        overall_asr=overall_asr,
        category_summaries=category_summaries,
        started_at=run.started_at,
        completed_at=run.completed_at,
    )
