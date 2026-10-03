"""
Regression detection: compare two RedTeamRuns and classify how each
AttackCase's outcome changed (Phase 1's DeltaType/CaseDelta/RunComparison
schemas). This is what powers GET /compare/{a}/{b} and the CI gate
(ci/red_team_gate.py).

[V2] Matching strategy, in priority order:
  1. (category, template_variant_id) when both results have a
     template_variant_id set (i.e. both are template-sourced cases from
     the same YAML variant). This is the fix for V1's documented
     limitation below — variant_id is the YAML key (e.g. 'classic_ignore')
     and is genuinely stable across runs, unlike AttackCase.id which is a
     fresh UUID every generate_cases() call.
  2. (category, prompt) text match as a fallback, for results where
     template_variant_id is None on either side — this is exactly V1's
     original matching strategy, kept as the fallback specifically for
     attacker-LLM-generated cases, which still have no stable identity
     across runs (their text varies each generation — that limitation is
     real and is NOT solved by variant_id, since attacker-LLM cases never
     get a variant_id in the first place). Documented, not hidden.
"""

from __future__ import annotations

from schemas.attack import AttackResult
from schemas.run import CaseDelta, DeltaType, RunComparison
from schemas.run import RedTeamRun


def _identity_key(result: AttackResult) -> tuple:
    """
    The composite key used to match a result across runs. Prefers the
    stable (category, template_variant_id) identity when available;
    falls back to (category, prompt) text — see module docstring.
    """
    if result.template_variant_id is not None:
        return ("variant", result.category, result.template_variant_id)
    return ("text", result.category, result.prompt)


def _match_cases(baseline: RedTeamRun, current: RedTeamRun) -> dict[str, tuple[AttackResult | None, AttackResult | None]]:
    """Build a matching between baseline and current results using _identity_key."""
    baseline_by_key = {_identity_key(r): r for r in baseline.results}
    current_by_key = {_identity_key(r): r for r in current.results}

    all_keys = set(baseline_by_key) | set(current_by_key)
    matched: dict[str, tuple[AttackResult | None, AttackResult | None]] = {}
    for key in all_keys:
        b = baseline_by_key.get(key)
        c = current_by_key.get(key)
        # Use current's case id if available, else baseline's, as the dict key
        # (arbitrary but stable choice for the returned mapping's keys).
        result_key = (c or b).attack_case_id  # type: ignore[union-attr]
        matched[result_key] = (b, c)
    return matched


def compare_runs(baseline: RedTeamRun, current: RedTeamRun) -> RunComparison:
    """
    Compare `current` against `baseline` and classify every matched (or
    unmatched) case per Phase 1's DeltaType vocabulary.
    """
    matched = _match_cases(baseline, current)
    deltas: list[CaseDelta] = []

    for case_id, (baseline_result, current_result) in matched.items():
        if baseline_result is None or current_result is None:
            deltas.append(
                CaseDelta(
                    attack_case_id=case_id,
                    category=(current_result or baseline_result).category,  # type: ignore[union-attr]
                    delta_type=DeltaType.NOT_COMPARABLE,
                    baseline_success=baseline_result.success if baseline_result else None,
                    current_success=current_result.success if current_result else None,
                )
            )
            continue

        if not baseline_result.success and current_result.success:
            delta_type = DeltaType.NEW_VULNERABILITY
        elif baseline_result.success and not current_result.success:
            delta_type = DeltaType.FIXED
        elif baseline_result.success and current_result.success:
            delta_type = DeltaType.UNCHANGED_VULNERABLE
        else:
            delta_type = DeltaType.UNCHANGED_SAFE

        deltas.append(
            CaseDelta(
                attack_case_id=case_id,
                category=current_result.category,
                delta_type=delta_type,
                baseline_success=baseline_result.success,
                current_success=current_result.success,
            )
        )

    new_vuln_count = sum(1 for d in deltas if d.delta_type == DeltaType.NEW_VULNERABILITY)
    fixed_count = sum(1 for d in deltas if d.delta_type == DeltaType.FIXED)

    return RunComparison(
        baseline_run_id=baseline.run_id,
        current_run_id=current.run_id,
        deltas=deltas,
        new_vulnerability_count=new_vuln_count,
        fixed_count=fixed_count,
        has_regression=new_vuln_count > 0,
    )
