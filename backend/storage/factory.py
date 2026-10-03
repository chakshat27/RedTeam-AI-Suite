"""
[V3] Chooses the run-store backend from Settings, so main.py's lifespan
hook stays backend-agnostic — it calls get_run_store(settings) once and
uses whatever comes back identically either way (both RunStore and
PostgresRunStore expose the same save_run/get_run/list_runs/
get_most_recent_completed_run/init_schema methods).
"""

from __future__ import annotations

from typing import Union

from config import Settings
from storage.run_store import RunStore

try:
    from storage.postgres_run_store import PostgresRunStore
except ImportError:  # asyncpg not installed — fine, only needed if database_url is actually set
    PostgresRunStore = None  # type: ignore[assignment,misc]


def get_run_store(settings: Settings) -> Union[RunStore, "PostgresRunStore"]:
    if settings.database_url:
        if PostgresRunStore is None:
            raise RuntimeError(
                "Settings.database_url is set but asyncpg is not installed. "
                "Run `pip install asyncpg` (see requirements.txt's [postgres] extra)."
            )
        return PostgresRunStore(settings.database_url)
    return RunStore(settings.database_path)
