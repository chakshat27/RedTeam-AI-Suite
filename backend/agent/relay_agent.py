#!/usr/bin/env python3
"""
[V2] Local relay agent — this is the answer to "don't make people give a
hosted dashboard their API key."

Run this script on YOUR OWN machine, next to a normal `.env` containing
your real GROQ_API_KEY / GEMINI_API_KEY (same file build_attacks_by_category
already reads via config.Settings — nothing new to configure there). It
connects OUT to a control-plane backend (which could be a shared/hosted
instance run by someone else, or just localhost) over one persistent
WebSocket, registers itself under an agent_id, and waits.

When a user creates a run in "relay" mode targeting your agent_id, the
control plane sends this script only run PARAMETERS (target endpoint,
categories, case counts) over that socket — never a key. This script then
builds real attacker/judge/target clients using ITS OWN local Settings
(exactly the same build_attacks_by_category() function main.py uses for
"local" mode — imported directly, not reimplemented, so relay and local
execution can never silently drift apart in behavior), runs the attack
suite entirely on your machine, and streams results back over the same
socket. Your API key never leaves this process.

Usage:
    python agent/relay_agent.py --agent-id my-laptop --control-plane ws://localhost:8000

Requires the `websockets` package (pip install websockets) in addition to
the normal backend requirements.txt, since this script is itself a
WebSocket CLIENT (main.py only ever plays the WebSocket SERVER role).
"""

from __future__ import annotations

import argparse
import asyncio
import json
import sys
from pathlib import Path

_ROOT = Path(__file__).resolve().parent.parent
if str(_ROOT) not in sys.path:
    sys.path.insert(0, str(_ROOT))

import websockets

from config import get_settings
from executor.attack_runner import AttackRunner, ProgressEventType, RunProgressEvent
from schemas.run import RedTeamRun, RunStatus


async def _run_job(websocket, run: RedTeamRun, custom_cases_raw: list[dict], target_api_key: str | None) -> None:
    """Execute one relay-mode job locally and stream results back over websocket."""
    # Imported here (not at module top) so a bare `python -c "import
    # agent.relay_agent"` doesn't require fastapi just to inspect this
    # file — main.py IS a FastAPI app, but importing it doesn't start a
    # server, it just defines `app` and the helper functions we need.
    from main import build_attacks_by_category, CustomCaseInput

    settings = get_settings()  # the AGENT's own local Settings/.env — real keys live here only

    # [V3] Fallback: if the control plane omitted target_api_key (because
    # the dashboard user checked "use agent's own target key"), resolve it
    # from THIS agent's own local .env instead — closing V2's disclosed
    # gap where a typed-in target key still crossed the control plane
    # once per run. If the agent has no local target key configured
    # either, target_api_key stays None and the target client simply
    # sends no Authorization header, same as any unauthenticated target.
    if target_api_key is None and settings.target_api_key:
        target_api_key = settings.target_api_key.get_secret_value()

    custom_cases = [CustomCaseInput.model_validate(cc) for cc in custom_cases_raw] if custom_cases_raw else None

    try:
        attacks_by_category = build_attacks_by_category(
            settings,
            run.categories_run,
            run.target_endpoint,
            run.target_model,
            target_api_key=target_api_key,
            custom_cases=custom_cases,
            rag_indexer=None,
        )
    except Exception as exc:  # noqa: BLE001 - configuration errors get reported back as run_failed, not a crashed agent
        await websocket.send(json.dumps({"type": "run_failed", "run_id": run.run_id, "error": f"{type(exc).__name__}: {exc}"}))
        return

    async def on_progress(event: RunProgressEvent) -> None:
        await websocket.send(json.dumps({"type": "progress", "event": json.loads(event.model_dump_json())}))
        if event.event_type in (ProgressEventType.CATEGORY_COMPLETED, ProgressEventType.RUN_COMPLETED):
            # Push a full snapshot at boundaries — mirrors main.py's local-
            # mode on-category-boundary persistence (see _execute_run_in_background),
            # so the control plane's GET /run/{run_id} shows incremental
            # progress during a relay run too, not just at the very end.
            await websocket.send(json.dumps({"type": "results_update", "run": json.loads(run.model_dump_json())}))

    runner = AttackRunner(run, attacks_by_category, progress_callback=on_progress)
    try:
        await runner.run()
    except Exception as exc:  # noqa: BLE001 - the runner already marks run.status FAILED internally; still report explicitly
        await websocket.send(json.dumps({"type": "run_failed", "run_id": run.run_id, "error": f"{type(exc).__name__}: {exc}"}))
        return

    await websocket.send(json.dumps({"type": "run_complete", "run": json.loads(run.model_dump_json())}))


async def main(agent_id: str, control_plane_url: str, backend_token: str | None = None) -> None:
    connect_url = f"{control_plane_url.rstrip('/')}/agent/connect"
    if backend_token:
        # [V3] Matches main.py's _check_ws_token: a query-string token, not
        # a header, since that's what the server-side WS auth check reads.
        connect_url += f"?token={backend_token}"
    print(f"[relay-agent:{agent_id}] Connecting to {control_plane_url}/agent/connect ...")

    async with websockets.connect(connect_url) as websocket:
        await websocket.send(json.dumps({"type": "register", "agent_id": agent_id}))
        print(f"[relay-agent:{agent_id}] Registered. Waiting for jobs — your API keys stay on this machine.")

        async for raw in websocket:
            msg = json.loads(raw)
            if msg.get("type") != "execute_run":
                continue

            run = RedTeamRun.model_validate(msg["run"])
            print(f"[relay-agent:{agent_id}] Received job: run_id={run.run_id} target={run.target_endpoint} "
                  f"categories={[c.value for c in run.categories_run]}")

            await _run_job(
                websocket,
                run,
                custom_cases_raw=msg.get("custom_cases") or [],
                target_api_key=msg.get("target_api_key"),
            )
            print(f"[relay-agent:{agent_id}] Job {run.run_id} finished with status={run.status.value}.")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="AI Red Team Suite — local relay agent")
    parser.add_argument("--agent-id", required=True, help="Identifier this agent registers under (chosen by you, e.g. your machine name).")
    parser.add_argument("--control-plane", default="ws://localhost:8000", help="Base ws:// or wss:// URL of the control-plane backend.")
    parser.add_argument("--backend-token", default=None, help="[V3] Bearer token, if the control plane has Settings.backend_api_key configured.")
    args = parser.parse_args()

    try:
        asyncio.run(main(args.agent_id, args.control_plane, args.backend_token))
    except KeyboardInterrupt:
        print("\nStopped.")
