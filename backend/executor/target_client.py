"""
Concrete TargetClientProtocol implementation: sends a single-turn chat
message to any OpenAI-compatible /chat/completions endpoint.

"OpenAI-compatible" is the load-bearing design choice here (see original
brief) — this ONE client works against OpenAI itself, Groq, most
self-hosted inference servers (vLLM, text-generation-inference, Ollama's
OpenAI-compat mode), and any vendor that has adopted the de facto
standard request/response shape. We never need a target-specific adapter.

[V3] Two additional capabilities, both opt-in and duck-type-detected by
the attack classes that use them (never required by the other 7
categories, same "don't bloat the shared interface" reasoning as V1's
RagIndexerProtocol):
  - send_with_tools(): native OpenAI `tools`/`tool_choice` function-calling
    wire format, for ExcessiveAgencyAttack (attacks/excessive_agency.py)
    to exercise a target's REAL tool-calling code path instead of the V2
    text-marker approximation.
  - start_session()/send_turn()/end_session(): genuine multi-turn
    conversation state, for attacks that were previously approximating
    multi-turn via a single encoded prompt (jailbreak's payload-splitting,
    pii_extraction's simulated-prior-turn).
"""

from __future__ import annotations

import uuid

import httpx


class OpenAICompatibleTargetClient:
    """
    Satisfies attacks.base_attack.TargetClientProtocol, plus the [V3]
    ToolAwareTargetClientProtocol and ConversationalTargetClientProtocol
    defined locally in the attack modules that use them.
    """

    def __init__(
        self,
        base_url: str,
        api_key: str | None,
        model: str,
        timeout_seconds: float = 30.0,
        system_prompt: str | None = None,
    ) -> None:
        self._base_url = base_url.rstrip("/")
        self._model = model
        self._system_prompt = system_prompt
        headers = {"Content-Type": "application/json"}
        if api_key:
            headers["Authorization"] = f"Bearer {api_key}"
        self._client = httpx.AsyncClient(headers=headers, timeout=timeout_seconds)

        # [V3] session_id -> accumulated message history, for the
        # conversational protocol. In-memory only — a real deployment
        # testing a genuinely stateful target still needs THIS client to
        # remember the turns itself, since we're driving a stateless HTTP
        # endpoint by resending full history each turn (same approach any
        # OpenAI-compatible chat client uses; the target doesn't need to
        # be stateful on its own end, we simulate the statefulness here).
        self._sessions: dict[str, list[dict]] = {}

    async def send(self, prompt: str) -> str:
        messages = []
        if self._system_prompt:
            messages.append({"role": "system", "content": self._system_prompt})
        messages.append({"role": "user", "content": prompt})
        message = await self._complete(messages)
        return message.get("content") or ""

    async def _complete(self, messages: list[dict], tools: list[dict] | None = None) -> dict:
        payload: dict = {"model": self._model, "messages": messages, "stream": False}
        if tools:
            payload["tools"] = tools
            payload["tool_choice"] = "auto"
        response = await self._client.post(f"{self._base_url}/chat/completions", json=payload)
        response.raise_for_status()
        return response.json()["choices"][0]["message"]

    # --- [V3] Native tool-calling (ToolAwareTargetClientProtocol) ---

    async def send_with_tools(self, prompt: str, tools: list[dict]) -> tuple[str, list[dict]]:
        """
        Send prompt with a real OpenAI-format `tools` list. Returns
        (text_content, tool_calls) where tool_calls is the raw
        `message.tool_calls` array (empty list if the model didn't call
        anything) — [{"function": {"name": ..., "arguments": "...json..."}}, ...]
        per the OpenAI wire format every OpenAI-compatible provider mirrors.
        """
        messages = []
        if self._system_prompt:
            messages.append({"role": "system", "content": self._system_prompt})
        messages.append({"role": "user", "content": prompt})
        message = await self._complete(messages, tools=tools)
        return message.get("content") or "", message.get("tool_calls") or []

    # --- [V3] Genuine multi-turn (ConversationalTargetClientProtocol) ---

    async def start_session(self) -> str:
        session_id = f"session_{uuid.uuid4().hex[:12]}"
        history: list[dict] = []
        if self._system_prompt:
            history.append({"role": "system", "content": self._system_prompt})
        self._sessions[session_id] = history
        return session_id

    async def send_turn(self, session_id: str, message: str) -> str:
        history = self._sessions[session_id]
        history.append({"role": "user", "content": message})
        response_message = await self._complete(history)
        response_text = response_message.get("content") or ""
        history.append({"role": "assistant", "content": response_text})
        return response_text

    async def end_session(self, session_id: str) -> None:
        self._sessions.pop(session_id, None)

    async def aclose(self) -> None:
        await self._client.aclose()
