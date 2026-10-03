"""
Schemas for the human-facing output of a run: the VulnerabilityReport.

Everything upstream (AttackCase, AttackResult, RedTeamRun) is
engineering-facing data. This layer is the translation into something a
security team, engineering manager, or interviewer can read without
knowing what a "judge LLM" is.
"""

from __future__ import annotations

from pydantic import BaseModel, Field

from schemas.attack import AttackCategory, Severity


class OWASPFinding(BaseModel):
    """
    Static mapping metadata: which OWASP LLM Top 10 entry does a given
    attack category correspond to. This is reference data (owasp_mapper.py,
    Phase 9 owns the canonical list), not something generated per-run —
    it's attached to a Finding to give it that shared-vocabulary label
    discussed in 0.2.
    """

    owasp_id: str = Field(description="e.g. 'LLM01'")
    title: str = Field(description="e.g. 'Prompt Injection'")
    our_attack_categories: list[AttackCategory] = Field(
        description="Which of our 8 categories map to this OWASP entry. Many-to-many: e.g. LLM01 maps to both prompt_injection and indirect_injection."
    )


class Finding(BaseModel):
    """
    One reportable vulnerability finding — typically an aggregation over
    multiple AttackResults in the same category that succeeded, distilled
    down to the single clearest representative example rather than
    dumping every raw result into the report.
    """

    category: AttackCategory
    owasp_mapping: OWASPFinding
    severity: Severity
    attack_success_rate: float = Field(ge=0.0, le=1.0)
    example_prompt: str = Field(
        description="The clearest/most illustrative successful attack prompt for this finding — not necessarily the highest-scoring, but the most legible one for a reader."
    )
    example_response: str = Field(
        description="The target's response to example_prompt. Kept verbatim for evidence, per 0.10 — but callers rendering this into a PUBLIC readme/report should redact per the responsible-disclosure note, since raw harmful completions shouldn't be casually published."
    )
    recommendation: str = Field(
        description="Concrete, actionable mitigation text, e.g. 'Add explicit instruction-hierarchy reinforcement in system prompt; consider output filtering for category X.'"
    )
    affected_case_count: int = Field(ge=0, description="How many distinct AttackCases contributed to this finding.")


class VulnerabilityReport(BaseModel):
    """
    The final deliverable for a run: GET /report/{run_id}.

    Structured explicitly to support the two audiences from the original
    brief — non-technical skim (executive_summary) and full technical
    detail (findings_by_severity) — in one object, rather than two
    separate endpoints, since they're generated together from the same
    run and should never drift out of sync with each other.
    """

    run_id: str
    target_endpoint: str
    executive_summary: str = Field(
        description="3-sentence, non-technical summary. E.g. 'This system was tested against 8 categories of adversarial attack. 2 critical vulnerabilities were found, primarily around indirect prompt injection via retrieved documents. Immediate remediation is recommended for the indirect injection findings before production deployment.'"
    )
    findings_by_severity: dict[Severity, list[Finding]] = Field(
        description="Findings grouped by severity bucket, CRITICAL first by convention when rendered (dict insertion order is not guaranteed to be display order — the report_generator, not this schema, owns display ordering)."
    )
    overall_asr: float = Field(ge=0.0, le=1.0)
    total_attacks_run: int = Field(ge=0)
    generated_at: str = Field(description="ISO-8601 timestamp string of report generation, kept as str (not datetime) since this is a rendering artifact, not data we query on.")
