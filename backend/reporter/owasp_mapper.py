"""
Static OWASP LLM Top 10 (2025) -> AttackCategory mapping. Reference data,
not generated per-run — see schemas/report.py's OWASPFinding docstring.
Mirrors the scoping table established in 0.2 (Phase 0).
"""

from __future__ import annotations

from schemas.attack import AttackCategory
from schemas.report import OWASPFinding

_OWASP_FINDINGS: dict[str, OWASPFinding] = {
    "LLM01": OWASPFinding(
        owasp_id="LLM01",
        title="Prompt Injection",
        our_attack_categories=[AttackCategory.PROMPT_INJECTION, AttackCategory.INDIRECT_INJECTION],
    ),
    "LLM02": OWASPFinding(
        owasp_id="LLM02",
        title="Sensitive Information Disclosure",
        our_attack_categories=[AttackCategory.PII_EXTRACTION, AttackCategory.PROMPT_LEAKAGE],
    ),
    "LLM07": OWASPFinding(
        owasp_id="LLM07",
        title="System Prompt Leakage",
        our_attack_categories=[AttackCategory.PROMPT_LEAKAGE],
    ),
    "LLM08": OWASPFinding(
        owasp_id="LLM08",
        title="Vector and Embedding Weaknesses",
        our_attack_categories=[AttackCategory.INDIRECT_INJECTION],
    ),
    "LLM09": OWASPFinding(
        owasp_id="LLM09",
        title="Misinformation",
        our_attack_categories=[AttackCategory.HALLUCINATION],
    ),
    "LLM06": OWASPFinding(
        owasp_id="LLM06",
        title="Excessive Agency",
        our_attack_categories=[AttackCategory.EXCESSIVE_AGENCY],
    ),
    # Jailbreak, off_topic, and guardrail_bypass are behavioral/output-safety
    # categories that don't map cleanly to a single LLM Top 10 entry on
    # their own — they most often manifest AS one of the above (e.g. a
    # jailbreak that succeeds via injection is really an LLM01 finding).
    # We tag them under LLM01 by default (the injection/manipulation root
    # cause, per 0.3) but this is a judgment call worth defending directly
    # if asked in an interview — see report_generator.py's fallback logic.
}

# Which OWASP entry to fall back to for categories without a direct 1:1 mapping.
_FALLBACK_OWASP_ID = "LLM01"


def map_category_to_owasp(category: AttackCategory) -> OWASPFinding:
    """
    Return the OWASPFinding for a given attack category. Categories that
    map to more than one OWASP entry (e.g. prompt_injection is BOTH LLM01
    and arguably touches others) resolve to their primary/most-specific
    entry here — this function returns exactly one finding per category
    for report simplicity, even though schemas/report.py's OWASPFinding
    itself supports many-to-many in principle.
    """
    for finding in _OWASP_FINDINGS.values():
        if category in finding.our_attack_categories:
            return finding
    return _OWASP_FINDINGS[_FALLBACK_OWASP_ID]
