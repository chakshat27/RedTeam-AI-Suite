"""
SQLite (via aiosqlite) persistence for User accounts in AI Red Team Suite.
"""

from __future__ import annotations

import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import TypedDict

import aiosqlite

_SCHEMA = """
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    salt TEXT NOT NULL,
    full_name TEXT NOT NULL,
    created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
"""

class UserDict(TypedDict):
    id: str
    email: str
    full_name: str
    created_at: str

class UserStore:
    """Async CRUD for User Persistence."""

    def __init__(self, database_path: str) -> None:
        self._database_path = database_path
        Path(database_path).parent.mkdir(parents=True, exist_ok=True)

    async def init_schema(self) -> None:
        async with aiosqlite.connect(self._database_path) as db:
            await db.executescript(_SCHEMA)
            await db.commit()

    async def create_user(self, email: str, password_hash: str, salt: str, full_name: str) -> UserDict:
        user_id = f"usr_{uuid.uuid4().hex[:12]}"
        created_at = datetime.now(timezone.utc).isoformat()
        clean_email = email.strip().lower()

        async with aiosqlite.connect(self._database_path) as db:
            await db.execute(
                """
                INSERT INTO users (id, email, password_hash, salt, full_name, created_at)
                VALUES (?, ?, ?, ?, ?, ?)
                """,
                (user_id, clean_email, password_hash, salt, full_name.strip(), created_at),
            )
            await db.commit()

        return {
            "id": user_id,
            "email": clean_email,
            "full_name": full_name.strip(),
            "created_at": created_at,
        }

    async def get_user_by_email(self, email: str) -> dict | None:
        clean_email = email.strip().lower()
        async with aiosqlite.connect(self._database_path) as db:
            db.row_factory = aiosqlite.Row
            cursor = await db.execute(
                "SELECT id, email, password_hash, salt, full_name, created_at FROM users WHERE email = ?",
                (clean_email,),
            )
            row = await cursor.fetchone()
            if row is None:
                return None
            return dict(row)

    async def get_user_by_id(self, user_id: str) -> UserDict | None:
        async with aiosqlite.connect(self._database_path) as db:
            db.row_factory = aiosqlite.Row
            cursor = await db.execute(
                "SELECT id, email, full_name, created_at FROM users WHERE id = ?",
                (user_id,),
            )
            row = await cursor.fetchone()
            if row is None:
                return None
            return {
                "id": row["id"],
                "email": row["email"],
                "full_name": row["full_name"],
                "created_at": row["created_at"],
            }
