"""
[V3] Renders a VulnerabilityReport as a downloadable PDF — the "export to
PDF" polish item mentioned in the original brief's report-generator scope
but never built in V1/V2 (those only exposed the report as JSON via
GET /report/{run_id}).

Uses reportlab directly (no HTML->PDF conversion step) — a pure-Python
dependency with no system-level binary (unlike e.g. wkhtmltopdf), which
matters for keeping this deployable in the same lightweight containers
the rest of the backend already targets.
"""

from __future__ import annotations

import io

from reportlab.lib import colors
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import inch
from reportlab.platypus import (
    Paragraph,
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
)

from schemas.report import VulnerabilityReport
from schemas.attack import Severity

_SEVERITY_COLORS: dict[Severity, colors.Color] = {
    Severity.CRITICAL: colors.HexColor("#e5484d"),
    Severity.HIGH: colors.HexColor("#f0883e"),
    Severity.MEDIUM: colors.HexColor("#e3b341"),
    Severity.LOW: colors.HexColor("#58a6ff"),
    Severity.INFO: colors.HexColor("#6e7681"),
}

_SEVERITY_ORDER = [Severity.CRITICAL, Severity.HIGH, Severity.MEDIUM, Severity.LOW, Severity.INFO]


def render_report_pdf(report: VulnerabilityReport) -> bytes:
    """
    Build a PDF from a VulnerabilityReport and return its raw bytes,
    suitable for a FastAPI Response(media_type="application/pdf").
    """
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer, pagesize=letter, topMargin=0.6 * inch, bottomMargin=0.6 * inch, leftMargin=0.6 * inch, rightMargin=0.6 * inch
    )
    styles = getSampleStyleSheet()
    title_style = ParagraphStyle("ReportTitle", parent=styles["Title"], fontSize=20, spaceAfter=4)
    meta_style = ParagraphStyle("Meta", parent=styles["Normal"], textColor=colors.HexColor("#666666"), fontSize=9)
    body_style = ParagraphStyle("Body", parent=styles["Normal"], fontSize=10, leading=14)
    section_style = ParagraphStyle("Section", parent=styles["Heading2"], spaceBefore=16, spaceAfter=6)
    finding_title_style = ParagraphStyle("FindingTitle", parent=styles["Heading3"], spaceBefore=10, spaceAfter=2)
    mono_style = ParagraphStyle("Mono", parent=styles["Code"], fontSize=8, leading=11, backColor=colors.HexColor("#f5f5f5"))

    elements = []
    elements.append(Paragraph("AI Red Team Suite — Vulnerability Report", title_style))
    elements.append(Paragraph(f"Target: {report.target_endpoint}", meta_style))
    elements.append(Paragraph(f"Run ID: {report.run_id} &nbsp;&nbsp;|&nbsp;&nbsp; Generated: {report.generated_at}", meta_style))
    elements.append(Spacer(1, 12))

    elements.append(Paragraph("Executive Summary", section_style))
    elements.append(Paragraph(report.executive_summary, body_style))
    elements.append(Spacer(1, 8))

    summary_data = [
        ["Overall ASR", "Total Attacks Run", "Findings"],
        [
            f"{report.overall_asr * 100:.0f}%",
            str(report.total_attacks_run),
            str(sum(len(v) for v in report.findings_by_severity.values())),
        ],
    ]
    summary_table = Table(summary_data, colWidths=[2 * inch, 2 * inch, 2 * inch])
    summary_table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#1a1a1a")),
                ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
                ("FONTSIZE", (0, 0), (-1, -1), 10),
                ("ALIGN", (0, 0), (-1, -1), "CENTER"),
                ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#cccccc")),
                ("TOPPADDING", (0, 0), (-1, -1), 6),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
            ]
        )
    )
    elements.append(summary_table)
    elements.append(Spacer(1, 16))

    elements.append(Paragraph("Findings by Severity", section_style))
    any_findings = False
    for severity in _SEVERITY_ORDER:
        findings = report.findings_by_severity.get(severity, [])
        if not findings:
            continue
        any_findings = True
        for finding in findings:
            sev_color = _SEVERITY_COLORS.get(severity, colors.grey)
            badge_style = ParagraphStyle(
                "Badge", parent=styles["Normal"], fontSize=8, textColor=colors.white, backColor=sev_color, borderPadding=3
            )
            elements.append(Paragraph(f"<b>{severity.value.upper()}</b>", badge_style))
            elements.append(
                Paragraph(
                    f"{finding.category.value.replace('_', ' ').title()} "
                    f"<font color='#666666'>({finding.owasp_mapping.owasp_id}: {finding.owasp_mapping.title})</font>",
                    finding_title_style,
                )
            )
            elements.append(
                Paragraph(
                    f"ASR: {finding.attack_success_rate * 100:.0f}% "
                    f"({finding.affected_case_count} case(s) affected)",
                    meta_style,
                )
            )
            elements.append(Paragraph(f"<b>Recommendation:</b> {finding.recommendation}", body_style))
            elements.append(Spacer(1, 4))
            elements.append(Paragraph("<b>Example attack prompt:</b>", meta_style))
            elements.append(Paragraph(_escape(finding.example_prompt)[:800], mono_style))
            elements.append(Paragraph("<b>Target response:</b>", meta_style))
            elements.append(Paragraph(_escape(finding.example_response)[:800], mono_style))
            elements.append(Spacer(1, 12))

    if not any_findings:
        elements.append(Paragraph("No successful attacks were identified across the tested categories in this run.", body_style))

    doc.build(elements)
    return buffer.getvalue()


def _escape(text: str) -> str:
    """Minimal HTML-escaping for reportlab's Paragraph mini-markup (it interprets a few HTML-like tags)."""
    return text.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;").replace("\n", "<br/>")
