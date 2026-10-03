"""
SQLite (via aiosqlite) persistence for RedTeamRun records, including user_id & user_name tracking.
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
    run_json TEXT NOT NULL,
    user_id TEXT,
    user_name TEXT
);
CREATE INDEX IF NOT EXISTS idx_runs_started_at ON runs(started_at);
CREATE INDEX IF NOT EXISTS idx_runs_user_id ON runs(user_id);
"""


class RunStore:
    """Async CRUD for RedTeamRun persistence in SQLite."""

    def __init__(self, database_path: str) -> None:
        self._database_path = database_path
        Path(database_path).parent.mkdir(parents=True, exist_ok=True)

    async def init_schema(self) -> None:
        async with aiosqlite.connect(self._database_path) as db:
            await db.executescript(_SCHEMA)
            # Add user_id / user_name columns if upgrading existing table
            try:
                await db.execute("ALTER TABLE runs ADD COLUMN user_id TEXT")
            except Exception:
                pass
            try:
                await db.execute("ALTER TABLE runs ADD COLUMN user_name TEXT")
            except Exception:
                pass
            await db.commit()

    async def save_run(self, run: RedTeamRun) -> None:
        """Insert or update (UPSERT) a run."""
        async with aiosqlite.connect(self._database_path) as db:
            await db.execute(
                """
                INSERT INTO runs (run_id, target_endpoint, status, started_at, completed_at, run_json, user_id, user_name)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT(run_id) DO UPDATE SET
                    status=excluded.status,
                    completed_at=excluded.completed_at,
                    run_json=excluded.run_json,
                    user_id=excluded.user_id,
                    user_name=excluded.user_name
                """,
                (
                    run.run_id,
                    run.target_endpoint,
                    run.status.value,
                    run.started_at.isoformat(),
                    run.completed_at.isoformat() if run.completed_at else None,
                    run.model_dump_json(),
                    run.user_id,
                    run.user_name,
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

    async def list_runs(self, limit: int = 50, user_id: str | None = None) -> list[RunSummary]:
        """Return lightweight summaries, newest first — optionally filtered by user_id."""
        async with aiosqlite.connect(self._database_path) as db:
            if user_id:
                cursor = await db.execute(
                    "SELECT run_json FROM runs WHERE user_id = ? ORDER BY started_at DESC LIMIT ?",
                    (user_id, limit),
                )
            else:
                cursor = await db.execute(
                    "SELECT run_json FROM runs ORDER BY started_at DESC LIMIT ?", (limit,)
                )
            rows = await cursor.fetchall()

        summaries = []
        for (run_json,) in rows:
            run = RedTeamRun.model_validate_json(run_json)
            summaries.append(_summarize_run(run))
        return summaries

    async def get_most_recent_completed_run(self, target_endpoint: str, exclude_run_id: str | None = None, user_id: str | None = None) -> RedTeamRun | None:
        async with aiosqlite.connect(self._database_path) as db:
            if user_id:
                cursor = await db.execute(
                    """
                    SELECT run_json FROM runs
                    WHERE target_endpoint = ? AND status = ? AND run_id != ? AND user_id = ?
                    ORDER BY started_at DESC LIMIT 1
                    """,
                    (target_endpoint, RunStatus.COMPLETED.value, exclude_run_id or "", user_id),
                )
            else:
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
        user_id=run.user_id,
        user_name=run.user_name,
    )
