"""
[V3] Redis pub/sub broadcaster — the scale-out alternative to main.py's
in-memory `_active_connections` dict, used when `Settings.redis_url` is
configured.

What this actually fixes: in a multi-instance deployment, the backend
process EXECUTING a run and the backend process a given dashboard
client's WebSocket happens to be connected to (behind a load balancer)
are not necessarily the same process. An in-memory dict only reaches
sockets connected to THIS process — a dashboard client on a different
instance would never see progress for a run executing elsewhere. Redis
pub/sub fixes this: every process PUBLISHES progress events to a shared
channel per run_id, and every process SUBSCRIBES on behalf of its own
locally-connected dashboard clients, so it doesn't matter which instance
is doing the work.

Scope boundary, stated directly: this fixes DASHBOARD event fan-out. It
does NOT solve routing a relay-mode job to an agent connected to a
DIFFERENT process instance — an agent's WebSocket is a real persistent
connection pinned to whichever process it dialed into, and Redis pub/sub
alone doesn't relocate that connection. A fully distributed relay-agent
registry would need either sticky load-balancer routing (route a given
agent_id's traffic to the same instance every time) or a message-queue-
based job handoff — genuinely out of scope for V3, flagged here rather
than silently unsupported.
"""

from __future__ import annotations

import asyncio
import json
from typing import AsyncIterator

import redis.asyncio as redis

from executor.attack_runner import RunProgressEvent


class RedisBroadcaster:
    """
    Publishes RunProgressEvents to `redteam:run:{run_id}` Redis channels,
    and lets a caller subscribe to one run's channel as an async iterator
    of events — used to replace main.py's _broadcast_progress/
    run_progress_stream when configured.
    """

    def __init__(self, redis_url: str) -> None:
        self._redis_url = redis_url
        self._client: redis.Redis | None = None

    def _get_client(self) -> redis.Redis:
        if self._client is None:
            self._client = redis.from_url(self._redis_url, decode_responses=True)
        return self._client

    @staticmethod
    def _channel(run_id: str) -> str:
        return f"redteam:run:{run_id}"

    async def publish(self, event: RunProgressEvent) -> None:
        client = self._get_client()
        await client.publish(self._channel(event.run_id), event.model_dump_json())

    async def replay_and_subscribe(self, run_id: str) -> AsyncIterator[RunProgressEvent]:
        """
        [V3] Also fixes event replay in the Redis-backed path (the
        Redis-equivalent of main.py's in-memory _event_buffers): recent
        events for this run are stored in a capped Redis LIST
        (`redteam:events:{run_id}`) alongside the pub/sub channel, replayed
        first, then live events are yielded as they publish.
        """
        client = self._get_client()
        buffered = await client.lrange(f"redteam:events:{run_id}", 0, -1)
        for raw in buffered:
            yield RunProgressEvent.model_validate_json(raw)

        pubsub = client.pubsub()
        await pubsub.subscribe(self._channel(run_id))
        try:
            async for message in pubsub.listen():
                if message["type"] != "message":
                    continue
                yield RunProgressEvent.model_validate_json(message["data"])
        finally:
            await pubsub.unsubscribe(self._channel(run_id))
            await pubsub.aclose()

    async def record_for_replay(self, event: RunProgressEvent, cap: int = 500, ttl_seconds: int = 3600) -> None:
        """Append to the capped replay list (call alongside publish() — see main.py's wiring)."""
        client = self._get_client()
        key = f"redteam:events:{event.run_id}"
        await client.rpush(key, event.model_dump_json())
        await client.ltrim(key, -cap, -1)
        await client.expire(key, ttl_seconds)

    async def aclose(self) -> None:
        if self._client is not None:
            await self._client.aclose()
