"""
Async rate limiter + a TargetClientProtocol-compatible wrapper.

Design: rate limiting is implemented as a DECORATOR around any
TargetClientProtocol-conforming client, not as logic baked into
BaseAttack or the runner. Because TargetClientProtocol (attacks/base_attack.py)
is a structural Protocol, RateLimitedTargetClient satisfies it automatically
just by having a matching `send()` method — no inheritance required. This
means rate limiting can be added or removed by whoever CONSTRUCTS the
attack objects, without either BaseAttack or AttackRunner needing to know
it exists.
"""

from __future__ import annotations

import asyncio
import time


class AsyncRateLimiter:
    """
    Simple leaky-bucket rate limiter: guarantees at most
    `max_requests_per_second` calls to acquire() resolve per second,
    across however many concurrent callers are waiting.

    Deliberately simple (not a full token-bucket-with-burst-allowance)
    because the goal here is ethical, predictable load on the target
    (0.10, 8.3) — not maximizing throughput. A single shared lock plus a
    "next allowed time" watermark is enough to guarantee the rate cap
    even when many coroutines (e.g. from asyncio.gather within a
    category, Phase 8.4) call acquire() at the same instant.
    """

    def __init__(self, max_requests_per_second: float) -> None:
        if max_requests_per_second <= 0:
            raise ValueError("max_requests_per_second must be positive")
        self._min_interval = 1.0 / max_requests_per_second
        self._lock = asyncio.Lock()
        self._next_allowed_time = 0.0

    async def acquire(self) -> None:
        """
        Block until it's this caller's turn under the configured rate cap.
        Safe to call concurrently — the lock serializes only the (very
        cheap) bookkeeping, not the actual work done after acquiring.
        """
        async with self._lock:
            now = time.monotonic()
            wait_time = max(0.0, self._next_allowed_time - now)
            # Reserve the next slot before releasing the lock, so two
            # concurrent callers can't both compute the same wait_time and
            # both proceed at once.
            self._next_allowed_time = max(now, self._next_allowed_time) + self._min_interval

        if wait_time > 0:
            await asyncio.sleep(wait_time)


class RateLimitedTargetClient:
    """
    Wraps any TargetClientProtocol-conforming client so every call to
    send() is throttled by a shared AsyncRateLimiter. "Shared" matters:
    construct ONE AsyncRateLimiter per target endpoint and pass it into
    every RateLimitedTargetClient wrapping calls to that endpoint (e.g.
    across all 8 attack category instances in a run), so the cap applies
    to the endpoint's TOTAL load, not per-category.
    """

    def __init__(self, wrapped_client: "object", rate_limiter: AsyncRateLimiter) -> None:
        self._wrapped_client = wrapped_client
        self._rate_limiter = rate_limiter

    async def send(self, prompt: str) -> str:
        await self._rate_limiter.acquire()
        return await self._wrapped_client.send(prompt)
