"""
The attack harness: BaseAttack and the three collaborator interfaces it
depends on (attacker LLM client, target client, judge client).

Design note on the Protocols below: BaseAttack depends on *abstractions*
(TargetClientProtocol, AttackerClientProtocol, JudgeClientProtocol), not
on concrete SDK classes (no importing an OpenAI/Groq/Gemini client here).
This is dependency inversion — it means:
  1. This file is fully unit-testable right now with trivial fakes, even
     though the real generator/executor/judge modules (Phase 3+) don't
     exist yet.
  2. Swapping the target from "raw httpx call" to "LangChain wrapped
     endpoint" later never touches this file.
Concrete implementations of these protocols live in generator/, executor/,
and judge/ in later phases — this file only defines the shape they must
satisfy.
"""

from __future__ import annotations

import asyncio
import time
from abc import ABC, abstractmethod
from typing import Awaitable, Callable, Protocol

from schemas.attack import AttackCase, AttackCategory, AttackResult


class AttackerClientProtocol(Protocol):
    """
    Shape required of whatever generates adversarial prompts (Phase 2/3's
    generator/attack_generator.py implements this against Groq/Gemini).
    Kept as a Protocol (structural typing) rather than an ABC subclass
    requirement, so any object with a matching `generate` method works —
    no forced inheritance on the client side.
    """

    async def generate(
        self, category: AttackCategory, n: int, context: dict
    ) -> list[dict]:
        """Return n raw prompt specs (dicts with at least 'prompt' and 'expected_failure_mode') for the given category."""
        ...


class TargetClientProtocol(Protocol):
    """Shape required of whatever sends a prompt to the target endpoint under test (executor/attack_runner.py, Phase 8)."""

    async def send(self, prompt: str) -> str:
        """Send prompt to the target LLM endpoint, return its raw text response."""
        ...


class JudgeClientProtocol(Protocol):
    """Shape required of whatever scores a (prompt, response) pair (judge/llm_judge.py, Phase 6+)."""

    async def score(
        self, category: AttackCategory, prompt: str, response: str, expected_failure_mode: str
    ) -> dict:
        """Return a dict with at least 'score' (0-5 int), 'success' (bool), and 'reasoning' (str)."""
        ...


class BaseAttack(ABC):
    """
    Abstract base for all 8 attack categories.

    Subclasses (prompt_injection.py, jailbreak.py, etc.) implement the
    three abstract methods with category-specific prompt-crafting and
    success rubrics. This class provides the concrete `run()` orchestration
    that ties generate -> execute -> judge together with per-case error
    isolation, so the runner (Phase 8) never has to know category-specific
    details.
    """

    category: AttackCategory  # set by each subclass as a class attribute

    def __init__(
        self,
        attacker_client: AttackerClientProtocol,
        target_client: TargetClientProtocol,
        judge_client: JudgeClientProtocol,
        custom_cases: list[AttackCase] | None = None,
    ) -> None:
        # Injected dependencies rather than constructed internally — makes
        # every attack trivially testable with fake clients, and means the
        # SAME attack class works against any target/attacker/judge combo
        # without modification (three-LLM architecture from 0.5 is a
        # runtime configuration, not something baked into attack logic).
        self._attacker_client = attacker_client
        self._target_client = target_client
        self._judge_client = judge_client
        self._custom_cases = custom_cases or []

    @abstractmethod
    async def generate_cases(self, n: int) -> list[AttackCase]:
        """
        Produce n AttackCase objects for this category.

        Concrete subclasses decide HOW: some categories (prompt_injection,
        jailbreak) will mostly template-fill known patterns; others may
        lean more heavily on the attacker LLM for creative variation. That
        decision is category-specific and lives in the subclass, not here.
        """
        raise NotImplementedError

    @abstractmethod
    async def judge(self, case: AttackCase, target_response: str) -> AttackResult:
        """
        Score a single (case, response) pair and return a fully-populated
        AttackResult. Subclasses own the category-specific rubric (what
        "success" means differs per category, per 1.2) but typically
        delegate the actual LLM call to self._judge_client.score(...).
        """
        raise NotImplementedError

    async def execute(self, case: AttackCase) -> tuple[str, int]:
        """
        Send one case's prompt to the target and return (response_text,
        latency_ms). Concrete default implementation (not abstract) because
        execution mechanics are the SAME across all 8 categories — it's
        just "send this string to the target client." Category-specific
        subclasses only override this if they need non-standard delivery
        (e.g. indirect_injection in Phase 5 overrides this to route the
        payload through document ingestion rather than direct chat input).
        """
        start = time.perf_counter()
        response_text = await self._target_client.send(case.prompt)
        latency_ms = int((time.perf_counter() - start) * 1000)
        return response_text, latency_ms

    async def _run_one_case(
        self,
        case: AttackCase,
        on_result: "Callable[[AttackCase, AttackResult], Awaitable[None]] | None" = None,
    ) -> AttackResult:
        """
        Execute -> judge for exactly one case, with error isolation.

        Extracted as its own method (Phase 8) specifically so `run()` can
        drive many of these concurrently via asyncio.gather. This method
        NEVER raises — every exception is caught and converted into an
        AttackResult with `.error` set — which is what makes it safe to
        gather() many of these at once without one failing case cancelling
        its siblings (see 8.4).
        """
        try:
            response_text, latency_ms = await self.execute(case)
        except Exception as exc:  # noqa: BLE001 - deliberately broad: target endpoints are arbitrary third-party systems
            result = AttackResult(
                attack_case_id=case.id,
                category=case.category,
                prompt=case.prompt,
                template_variant_id=case.metadata.get("variant_id"),
                target_response="",
                judge_score=0,
                success=False,
                judge_reasoning="Target execution failed before a response was received; not judged.",
                judge_model="n/a",
                latency_ms=0,
                error=f"{type(exc).__name__}: {exc}",
            )
            if on_result is not None:
                await on_result(case, result)
            return result

        try:
            result = await self.judge(case, response_text)
            # judge() legitimately doesn't know execute()'s timing (that's
            # a harness-level concern, not a judging concern) — the
            # harness reconciles it here rather than making every
            # subclass thread latency_ms through its judge() logic.
            result.latency_ms = latency_ms
        except Exception as exc:  # noqa: BLE001 - judge LLM call is also an external, arbitrary-failure-mode service
            result = AttackResult(
                attack_case_id=case.id,
                category=case.category,
                prompt=case.prompt,
                template_variant_id=case.metadata.get("variant_id"),
                target_response=response_text,
                judge_score=0,
                success=False,
                judge_reasoning="Judge scoring failed after a target response was received.",
                judge_model="n/a",
                latency_ms=latency_ms,
                error=f"{type(exc).__name__}: {exc}",
            )
            if on_result is not None:
                await on_result(case, result)
            return result

        if on_result is not None:
            await on_result(case, result)
        return result

    async def run(
        self,
        n_cases: int,
        on_result: "Callable[[AttackCase, AttackResult], Awaitable[None]] | None" = None,
    ) -> list[AttackResult]:
        """
        Full harness lifecycle for this category: generate -> (execute ->
        judge) for all n_cases IN PARALLEL via asyncio.gather -> return
        all results.

        Parallel within a category, per 8.1 — there's no correctness
        dependency between cases, so running them concurrently is free
        speedup. Cross-category sequencing is NOT this method's concern;
        that's owned by executor/attack_runner.py (Phase 8), which calls
        run() once per category, one category at a time.

        `on_result`, if provided, fires after each individual case
        resolves (success OR error) — this is the hook attack_runner.py
        uses to stream live per-case progress events (e.g. over the
        Phase 11 WebSocket) without BaseAttack needing to know anything
        about WebSockets, FastAPI, or event schemas. Kept as a plain
        optional async callback to preserve the dependency-inversion
        principle from 2.x — this file still only depends on abstractions
        it defines itself.
        """
        cases = await self.generate_cases(n_cases)
        # Mix in custom cases
        cases.extend(self._custom_cases)
        results = await asyncio.gather(*(self._run_one_case(case, on_result) for case in cases))
        return list(results)
