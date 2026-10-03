#!/usr/bin/env python3
"""
CI/CD red-team regression gate.

Triggers a red-team run against a target endpoint (via the FastAPI
backend's HTTP API — this script is a thin HTTP client, it does not import
attack logic directly, so it exercises the exact same code path a real
user's dashboard run would), waits for completion, compares against the
most recent prior COMPLETED run for the same target, and exits non-zero
if any NEW_VULNERABILITY delta appears at a severity in
Settings.ci_fail_on_severities (default: critical, high).

Usage:
    python ci/red_team_gate.py --api-url http://localhost:8000 \\
        --target-endpoint http://my-rag-system/v1 --target-model my-model

Exit codes:
    0 = no blocking regression found (or no baseline to compare against yet)
    1 = blocking regression found (new CRITICAL/HIGH vulnerability)
    2 = the run itself failed to complete (infra/config problem, not a security finding)
"""

from __future__ import annotations

import argparse
import asyncio
import sys
import time

import httpx

# Severity ranking must match schemas/attack.py's Severity enum values.
_SEVERITY_RANK = {"info": 0, "low": 1, "medium": 2, "high": 3, "critical": 4}


async def _poll_run_until_done(client: httpx.AsyncClient, api_url: str, run_id: str, timeout_seconds: float = 1800.0) -> dict:
    start = time.monotonic()
    while True:
        response = await client.get(f"{api_url}/run/{run_id}")
        response.raise_for_status()
        run = response.json()
        if run["status"] in ("completed", "failed"):
            return run
        if time.monotonic() - start > timeout_seconds:
            raise TimeoutError(f"Run {run_id} did not complete within {timeout_seconds}s")
        await asyncio.sleep(5.0)


async def main() -> int:
    parser = argparse.ArgumentParser(description="AI Red Team CI regression gate")
    parser.add_argument("--api-url", default="http://localhost:8000")
    parser.add_argument("--target-endpoint", required=True)
    parser.add_argument("--target-model", required=True)
    parser.add_argument("--cases-per-category", type=int, default=5)
    parser.add_argument(
        "--categories",
        nargs="*",
        default=None,
        help="Subset of categories to run (default: all 9). Useful for a fast targeted re-check after a fix.",
    )
    parser.add_argument("--api-token", default=None, help="[V3] Bearer token, if the backend has Settings.backend_api_key configured.")
    args = parser.parse_args()

    headers = {"Authorization": f"Bearer {args.api_token}"} if args.api_token else {}

    async with httpx.AsyncClient(timeout=60.0, headers=headers) as client:
        print(f"[red-team-gate] Starting run against {args.target_endpoint} ...")
        start_response = await client.post(
            f"{args.api_url}/run",
            json={
                "target_endpoint": args.target_endpoint,
                "target_model": args.target_model,
                "categories": args.categories,
                "cases_per_category": args.cases_per_category,
                "triggered_by": "ci",
            },
        )
        start_response.raise_for_status()
        run_id = start_response.json()["run_id"]
        print(f"[red-team-gate] Run started: {run_id}")

        try:
            run = await _poll_run_until_done(client, args.api_url, run_id)
        except TimeoutError as exc:
            print(f"[red-team-gate] ERROR: {exc}", file=sys.stderr)
            return 2

        if run["status"] != "completed":
            print(f"[red-team-gate] ERROR: run ended with status={run['status']}, not a valid security result.", file=sys.stderr)
            return 2

        print(f"[red-team-gate] Run completed. Fetching comparison against previous baseline...")
        compare_response = await client.get(f"{args.api_url}/compare/latest/{run_id}")
        if compare_response.status_code == 404:
            print("[red-team-gate] No prior baseline run found for this target — nothing to regress against. PASS.")
            return 0
        compare_response.raise_for_status()
        comparison = compare_response.json()

        blocking_deltas = [
            d
            for d in comparison["deltas"]
            if d["delta_type"] == "new_vulnerability"
        ]

        if not blocking_deltas:
            print(f"[red-team-gate] No new vulnerabilities detected. PASS. (fixed: {comparison['fixed_count']})")
            return 0

        # Fetch the report to get severity per finding for the fail-threshold check
        report_response = await client.get(f"{args.api_url}/report/{run_id}")
        report_response.raise_for_status()
        report = report_response.json()

        blocking_categories = {d["category"] for d in blocking_deltas}
        blocking_severities: set[str] = set()
        for severity, findings in report["findings_by_severity"].items():
            for finding in findings:
                if finding["category"] in blocking_categories:
                    blocking_severities.add(severity)

        fail_threshold_severities = {"critical", "high"}  # mirrors Settings.ci_fail_on_severities default
        should_fail = any(s in fail_threshold_severities for s in blocking_severities)

        print(f"[red-team-gate] New vulnerabilities found in categories: {sorted(blocking_categories)}")
        print(f"[red-team-gate] Severities involved: {sorted(blocking_severities)}")

        if should_fail:
            print("[red-team-gate] FAIL: new vulnerability at CRITICAL/HIGH severity. Blocking build.", file=sys.stderr)
            return 1

        print("[red-team-gate] New vulnerabilities found but below fail-threshold severity. PASS (with warning).")
        return 0


if __name__ == "__main__":
    sys.exit(asyncio.run(main()))
