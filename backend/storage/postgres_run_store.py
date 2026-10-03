"""
[V3] Postgres (via asyncpg) persistence for RedTeamRun records — the
scale-out alternative to storage/run_store.py's SQLite implementation,
used when `Settings.database_url` is set to a `postgres://`/`postgresql://`
URL. Same public interface (save_run/get_run/list_runs/
get_most_recent_completed_run/init_schema) as RunStore, so
storage/factory.py can hand either one to main.py interchangeably — main.py
never needs to know which backend it's talking to.

Same storage strategy as the SQLite version (one JSON blob column per run,
not a normalized results table) for the same reason: this suite's actual
query pattern is "read one run whole" or "compare exactly two runs," not
cross-run relational queries over individual AttackResults.
"""

from __future__ import annotations

import asyncpg

from schemas.run import RedTeamRun, RunStatus, RunSummary
from storage.run_store import _summarize_run  # shared aggregation logic — no need to duplicate it

_SCHEMA = """
CREATE TABLE IF NOT EXISTS runs (
    run_id TEXT PRIMARY KEY,
    target_endpoint TEXT NOT NULL,
    status TEXT NOT NULL,
    started_at TIMESTAMPTZ NOT NULL,
    completed_at TIMESTAMPTZ,
    run_json JSONB NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_runs_started_at ON runs(started_at DESC);
"""


class PostgresRunStore:
    """Async CRUD for RedTeamRun persistence, backed by a Postgres connection pool."""

    def __init__(self, database_url: str) -> None:
        self._database_url = database_url
        self._pool: asyncpg.Pool | None = None

    async def _get_pool(self) -> asyncpg.Pool:
        if self._pool is None:
            self._pool = await asyncpg.create_pool(self._database_url, min_size=1, max_size=10)
        return self._pool

    async def init_schema(self) -> None:
        pool = await self._get_pool()
        async with pool.acquire() as conn:
            await conn.execute(_SCHEMA)

    async def save_run(self, run: RedTeamRun) -> None:
        pool = await self._get_pool()
        async with pool.acquire() as conn:
            await conn.execute(
                """
                INSERT INTO runs (run_id, target_endpoint, status, started_at, completed_at, run_json)
                VALUES ($1, $2, $3, $4, $5, $6)
                ON CONFLICT (run_id) DO UPDATE SET
                    status = EXCLUDED.status,
                    completed_at = EXCLUDED.completed_at,
                    run_json = EXCLUDED.run_json
                """,
                run.run_id,
                run.target_endpoint,
                run.status.value,
                run.started_at,
                run.completed_at,
                run.model_dump_json(),
            )

    async def get_run(self, run_id: str) -> RedTeamRun | None:
        pool = await self._get_pool()
        async with pool.acquire() as conn:
            row = await conn.fetchrow("SELECT run_json FROM runs WHERE run_id = $1", run_id)
            if row is None:
                return None
            return RedTeamRun.model_validate_json(row["run_json"])

    async def list_runs(self, limit: int = 50) -> list[RunSummary]:
        pool = await self._get_pool()
        async with pool.acquire() as conn:
            rows = await conn.fetch(
                "SELECT run_json FROM runs ORDER BY started_at DESC LIMIT $1", limit
            )
        return [_summarize_run(RedTeamRun.model_validate_json(row["run_json"])) for row in rows]

    async def get_most_recent_completed_run(
        self, target_endpoint: str, exclude_run_id: str | None = None
    ) -> RedTeamRun | None:
        pool = await self._get_pool()
        async with pool.acquire() as conn:
            row = await conn.fetchrow(
                """
                SELECT run_json FROM runs
                WHERE target_endpoint = $1 AND status = $2 AND run_id != $3
                ORDER BY started_at DESC LIMIT 1
                """,
                target_endpoint,
                RunStatus.COMPLETED.value,
                exclude_run_id or "",
            )
            return RedTeamRun.model_validate_json(row["run_json"]) if row else None

    async def aclose(self) -> None:
        if self._pool is not None:
            await self._pool.close()
