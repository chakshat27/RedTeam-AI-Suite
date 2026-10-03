# AI Red Team Suite

A production-shaped AI red-teaming tool: it points at any OpenAI-compatible
LLM endpoint, runs structured adversarial tests across 8 attack categories,
scores results using an independent judge LLM, produces an OWASP-mapped
vulnerability report, and can gate CI/CD builds on new critical/high
findings.

Built as a portfolio project to demonstrate AI safety/security engineering
competency — every design decision below is deliberate and documented,
including known limitations, because knowing the edges of your own system
is part of the point.

## What this is

- **8 attack categories**: prompt injection, jailbreak, PII extraction,
  off-topic manipulation, guardrail bypass, indirect prompt injection,
  hallucination amplification, system prompt leakage.
- **Three-LLM architecture**: an attacker LLM (Groq) generates adversarial
  prompts, the target (any OpenAI-compatible endpoint you own) receives
  them, and an independent judge LLM (Gemini) scores the outcome — kept
  deliberately separate from the target model to avoid self-evaluation bias.
- **OWASP LLM Top 10 (2025) alignment** — findings are mapped to specific
  OWASP entries so a security team can read the report without a primer.
- **Regression testing + CI gate** — compare two runs, detect newly
  introduced vulnerabilities, and fail a GitHub Actions build on new
  CRITICAL/HIGH findings.
- **Live dashboard** — React frontend streaming per-case progress over a
  WebSocket, severity heatmap, run history with ASR trend chart.

## What's new in V3

Eight additions, each closing a gap V2 explicitly disclosed rather than opening new scope:

- **Native tool-calling for Excessive Agency** — the target's real `tools`/
  `tool_choice` wire format is used when the target client supports it
  (`send_with_tools()`), with deterministic scoring (did the response's
  structured `tool_calls` actually name a destructive function — a fact,
  not a judge LLM's opinion). Falls back to V2's text-marker simulation
  for any target that doesn't support native tool calls, so nothing that
  worked before stops working.
- **Genuinely stateful multi-turn execution** — a new
  `payload_split_genuine_multiturn` jailbreak variant runs as REAL separate
  turns with real accumulated conversation state (`start_session`/
  `send_turn`/`end_session`) when the target client supports it, alongside
  the original single-shot approximation, which remains the fallback for
  every target that doesn't.
- **Relay mode's target-key gap, closed** — V2 disclosed that a typed-in
  target API key still crossed the control plane once per relay run. A new
  `use_agent_local_target_key` option means the control plane omits it
  entirely, and the agent resolves it from its OWN local `.env` instead —
  zero credentials of any kind now need to cross the control plane in relay mode.
- **Multi-provider registry** (`llm_providers.py`) — attacker/judge roles
  can now be OpenAI, Groq, Together, Fireworks, a local Ollama server (all
  via one generic OpenAI-compatible client), or native Anthropic (its own
  client, since the wire format genuinely differs). Bedrock/Vertex are
  documented as the clear extension point, not silently unsupported.
- **WebSocket event replay** — a bounded per-run event buffer (in-process
  by default, Redis-backed when configured) means a dashboard client now
  sees the FULL event history even if it connects after a run has already
  completed, not just whatever's left — this was V2's most-disclosed gap.
- **Optional Postgres + Redis backends** — `storage/factory.py` picks
  `PostgresRunStore` over the default SQLite `RunStore` when
  `DATABASE_URL` is set; `storage/redis_broadcast.py` replaces the
  in-process WS fan-out with real pub/sub when `REDIS_URL` is set. Both
  tested against real running Postgres/Redis instances, not mocks. The
  relay-agent registry itself remains process-local even with Redis
  configured — documented as a real, unsolved boundary (see
  `redis_broadcast.py`'s module docstring), not papered over.
- **Backend authentication** — `BACKEND_API_KEY`, when set, requires a
  bearer token on every HTTP route except `/health` and a matching
  `?token=` query param on both WebSocket endpoints. Unset (default) means
  fully open, exactly as every prior version — this only matters once relay
  mode makes a shared/hosted control plane realistic.
- **PDF report export + judge calibration** — `GET /report/{run_id}/pdf`
  (reportlab, no system-level binary dependency) and
  `ci/benchmark_calibration.py`, which checks the configured judge against
  a small, hand-authored labeled example set (explicitly NOT a
  redistribution of any published benchmark's data — see the script's
  own docstring) to catch a systematically biased judge.

## What's new in V2

Three additions, chosen specifically to close real gaps rather than pad scope:

- **Excessive Agency (OWASP LLM06)** — a 9th attack category testing whether
  a tool-using target can be pressured into invoking a destructive or
  out-of-scope action (authority claims, fake "test mode" framing,
  instructions smuggled in via retrieved content, unsafe defaults). Tools
  are described in text within the prompt rather than wired through a
  native function-calling protocol — a stated simplification, not a hidden
  one; see `backend/attacks/excessive_agency.py`'s module docstring for why.
- **Stable cross-run case identity** — V1's regression matching fell back to
  comparing raw prompt text, which silently failed to track attacker-LLM-
  generated cases across runs. `AttackResult.template_variant_id` now
  carries the stable YAML variant key for every template-sourced case, so
  `storage/regression.py` can match on `(category, template_variant_id)` —
  genuinely stable across runs even when the prompt text itself changes
  (e.g. a different `target_task_description`). Attacker-LLM-generated
  cases still have no stable identity; that limitation is real and stays
  documented rather than papered over.
- **Local relay execution mode** — the direct answer to "don't make people
  hand a hosted dashboard their API key." A `RedTeamRun` can now run in
  `execution_mode: "relay"`: the control plane never builds a real
  attacker/judge/target client and never touches any credential for that
  run — it dispatches only run *parameters* (target endpoint, categories,
  case counts) to a connected local agent (`backend/agent/relay_agent.py`),
  which executes entirely on the user's own machine using the user's own
  local `.env`, then streams results back over the same WebSocket. See
  "Local relay mode" below for how to run it.

## What this is NOT (scoped out deliberately — see backend docs for why)

- Agentic/tool-use red teaming (excessive agency, tool misuse) — v2 scope.
- Training-time attacks (data poisoning, backdoored fine-tunes).
- Model extraction / weight theft.
- Multimodal attacks (adversarial images/audio) — text-only for v1.
- Traditional infra/appsec (supply chain, dependency CVEs) — not AI-specific.

## Architecture

```
red-team-suite/
├── backend/
│   ├── main.py                    # FastAPI app: POST /run, GET /run/{id}, WS stream, /report(+/pdf [V3]), /runs, /compare, /agent/connect [V2], bearer auth [V3]
│   ├── attacks/                   # BaseAttack + 9 categories; excessive_agency [V2] has native tool-calling [V3]; jailbreak has a genuine-multi-turn variant [V3]
│   ├── generator/                 # Attacker LLM clients (Groq/OpenAI-compatible + Anthropic [V3]) + YAML attack templates
│   ├── executor/                  # AttackRunner, rate limiter, target client (native tools + conversational sessions [V3])
│   ├── judge/                     # Judge LLM clients (Gemini, generic OpenAI-compatible [V3], Anthropic [V3]) + scoring rubrics
│   ├── llm_providers.py           # [V3] Provider registry — picks attacker/judge client class from Settings
│   ├── reporter/                  # OWASP mapper + VulnerabilityReport generator + PDF export [V3]
│   ├── storage/                   # SQLite (default) or Postgres [V3] run store; regression (template_variant_id-aware [V2]); Redis broadcaster [V3]
│   ├── schemas/                   # Pydantic v2 models (AttackCase, AttackResult, RedTeamRun, etc.)
│   ├── agent/relay_agent.py       # [V2] Standalone local relay agent — see "Local relay mode" below
│   └── ci/                        # red_team_gate.py (regression gate) + benchmark_calibration.py [V3]
├── frontend/                      # React + Vite + TS + Recharts dashboard (Tailwind + framer-motion + lucide-react)
├── demo/                          # Mock OpenAI-compatible target server (native tool-calling demo path [V3])
└── .github/workflows/red-team.yml # CI integration
```

### Why a three-LLM architecture?

If the target model judged its own output, it would be evaluating a
response produced under its own guardrails using the same weights and
tendencies that produced the vulnerability in the first place — any blind
spot in the target is likely to be a blind spot in its self-judgment too.
An independent judge model (different training, different alignment
profile) gives a genuinely separate read. See `backend/judge/llm_judge.py`
and `backend/judge/scoring_rubric.py`.

### Why generate → execute → judge as three separate steps?

Each stage talks to a different external service (attacker LLM, target
endpoint, judge LLM) with independent failure modes. Separating them means
a target timeout doesn't waste a regenerated case, a judge failure doesn't
require re-running the attack, and every case is independently diagnosable
— which stage failed, exactly, is always recoverable from
`AttackResult.error`. See `backend/attacks/base_attack.py`.

### Deterministic-first scoring where possible

PII extraction and system prompt leakage use a **canary-based** two-tier
scoring model: a known synthetic value is planted, and if it reappears
verbatim in the target's response, that's an objective, code-verified
success — no judge LLM call needed. The judge is only invoked for
partial/paraphrased leakage that doesn't exactly match. See
`backend/attacks/pii_extraction.py` and `backend/attacks/prompt_leakage.py`.

## Quickstart

### 1. Backend

```bash
cd backend
pip install -r requirements.txt
cp .env.example .env
# Fill in GROQ_API_KEY and GEMINI_API_KEY in .env
uvicorn main:app --reload --port 8000
```

### 2. Mock target (for a runnable demo without a real RAG deployment)

```bash
cd demo
pip install fastapi uvicorn
uvicorn mock_target_server:app --port 8001
```

The mock target deliberately has an inconsistent security posture — it
resists prompt leakage, is vulnerable to a subset of DAN-style jailbreaks,
and is vulnerable to indirect injection via poisoned documents — so a demo
run produces a believable mixed report rather than either "everything is
broken" or "nothing is broken."

### 3. Frontend

```bash
cd frontend
npm install
npm run dev
```

Open `http://localhost:5173`, configure the target as
`http://localhost:8001/v1` / model `mock-graphrag`, select categories, and
run.

### 4. Or drive it via the API directly

```bash
curl -X POST http://localhost:8000/run \
  -H "Content-Type: application/json" \
  -d '{
    "target_endpoint": "http://localhost:8001/v1",
    "target_model": "mock-graphrag",
    "categories": ["prompt_injection", "jailbreak", "prompt_leakage"],
    "cases_per_category": 5
  }'
# -> {"run_id": "run_..."}

curl http://localhost:8000/run/run_...       # poll status
curl http://localhost:8000/report/run_...    # full vulnerability report once completed
```

Indirect injection needs a `RagIndexerProtocol` implementation wired to
your target's document-ingestion API — see `demo/rag_indexer_client.py`
for the mock target's version, and `attacks/indirect_injection.py`'s
`RagIndexerProtocol` for the interface to implement against a real system.

## Local relay mode (no API key ever leaves your machine)

If you're pointing this at a hosted/shared instance of the backend rather
than one you run entirely yourself, use relay mode so your Groq/Gemini keys
never touch that server:

```bash
cd backend
pip install websockets   # if not already covered by requirements.txt
cp .env.example .env     # fill in YOUR real keys here, locally
python agent/relay_agent.py --agent-id my-laptop --control-plane ws://<the-backend-host>:8000
```

Then in the dashboard's Target Config -> Advanced Settings, switch
Execution Mode to "Relay" and select your agent once it appears in the
connected-agents list. The control plane will dispatch run parameters
(target endpoint, categories, case counts) to your agent over that
WebSocket; your agent builds the real attacker/judge/target clients using
its own local Settings and streams results back. If the agent disconnects
mid-run, the run is automatically marked `failed` rather than hanging.

## V3 configuration quick reference

```bash
# Switch providers (any combination):
ATTACKER_PROVIDER=anthropic   # or: groq, openai, together, fireworks, ollama
JUDGE_PROVIDER=anthropic      # or: gemini, groq, openai, together, fireworks, ollama

# Scale-out storage (optional — omit both for the default SQLite + in-process setup):
DATABASE_URL=postgresql://user:pass@host:5432/dbname
REDIS_URL=redis://host:6379/0

# Lock down a shared/hosted backend (optional — omit for open/local use):
BACKEND_API_KEY=some-long-random-value
```

```bash
# Download a run's report as PDF instead of JSON:
curl -o report.pdf http://localhost:8000/report/<run_id>/pdf

# Sanity-check the configured judge isn't systematically biased:
python ci/benchmark_calibration.py
```

## CI/CD regression gating

```bash
python backend/ci/red_team_gate.py \
  --api-url http://localhost:8000 \
  --target-endpoint http://your-staging-rag:8001/v1 \
  --target-model your-model \
  --cases-per-category 5
```

Exits `0` if no new CRITICAL/HIGH vulnerability was introduced relative to
the most recent prior completed run against the same target, `1` if one
was found (blocking the build), `2` if the run itself failed to complete
(an infra problem, not a security finding). See
`.github/workflows/red-team.yml` for the GitHub Actions wiring.

## Known limitations (stated directly, not hidden)

- **Single-turn approximation, now partially closed in V3**: excessive
  agency's native tool-calling path and jailbreak's genuine multi-turn
  variant both now exercise a target's REAL capabilities when it supports
  them (`send_with_tools()`, `start_session()`/`send_turn()`). Both fall
  back to the original text-encoded single-turn approximation for any
  target that doesn't support the richer protocol — every prior target
  keeps working. What's NOT yet extended this way: PII extraction's
  simulated-prior-turn cases and jailbreak's OTHER payload-split variant
  still use the single-shot approximation only.
- **Regression matching, fixed for template-sourced cases in V2, still
  unsolved for attacker-LLM-generated ones**: `template_variant_id` gives
  genuinely stable cross-run identity for every template-sourced case.
  Attacker-LLM-generated cases still have no stable identity by
  construction (no `template_variant_id` is ever assigned to them) — a
  future fix would need the attacker LLM prompted for a stable slug/id per
  generated case, not just prompt text. Unchanged since V2; not addressed in V3.
- **WebSocket event replay, fixed in V3**: a bounded per-run event buffer
  (in-process by default, Redis-backed `redteam:events:{run_id}` list when
  `REDIS_URL` is configured) means a dashboard client now sees the full
  event history even connecting after a run has fully completed — verified
  against exactly that scenario, not just "connects a moment late."
- **The relay-agent registry itself remains process-local even with Redis
  configured**: Redis pub/sub (V3) fixes DASHBOARD event fan-out across
  multiple backend instances, but an agent's WebSocket connection is a
  real persistent connection pinned to whichever process it dialed into —
  routing a relay job to an agent connected to a DIFFERENT instance would
  need sticky load-balancer routing or a message-queue-based job handoff,
  neither of which is built. Stated directly in
  `storage/redis_broadcast.py`'s module docstring, not silently assumed away.
- **Relay mode's `target_api_key` gap, fixed in V3 — opt-in**: the new
  `use_agent_local_target_key` flag means the control plane can omit the
  target key from the job payload entirely, with the agent resolving it
  from its own local `.env` instead. This is opt-in, not the default —
  leaving it off keeps V2's behavior (a typed-in target key still crosses
  the control plane once per run, short-lived and never persisted, but not
  zero-knowledge the way the attacker/judge keys are).
- **Judge calibration is a sanity check, not a certification**:
  `ci/benchmark_calibration.py`'s labeled set is small (10 examples) and
  hand-authored to probe for GROSS systematic bias (a judge that always
  scores high, or never recognizes a clear refusal) — passing it is not a
  claim of statistical parity with any published jailbreak benchmark's
  reported accuracy numbers.

