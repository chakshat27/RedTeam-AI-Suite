import type { VulnerabilityReport, Severity } from "../types";

interface Props {
  report: VulnerabilityReport;
}

const SEVERITY_ORDER: Severity[] = ["critical", "high", "medium", "low", "info"];

const CAT_ICONS: Record<string, string> = {
  prompt_injection: "💉",
  jailbreak: "🔓",
  pii_extraction: "👤",
  off_topic: "🎯",
  guardrail_bypass: "🚧",
  indirect_injection: "📦",
  hallucination: "🌀",
  prompt_leakage: "📝",
  excessive_agency: "🤖",
};

function formatCat(name: string) {
  return name.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export default function SeverityHeatmap({ report }: Props) {
  // Build category → severity lookup
  const categorySeverity = new Map<string, Severity>();
  for (const severity of SEVERITY_ORDER) {
    for (const finding of report.findings_by_severity[severity] ?? []) {
      categorySeverity.set(finding.category, severity);
    }
  }

  const allCategoriesInReport = new Set<string>();
  for (const findings of Object.values(report.findings_by_severity)) {
    for (const f of findings) allCategoriesInReport.add(f.category);
  }

  if (allCategoriesInReport.size === 0) {
    return (
      <div
        style={{
          background: "var(--surface)",
          border: "1px solid var(--border)",
          borderRadius: 14,
          padding: "20px",
        }}
      >
        <div className="section-label" style={{ marginBottom: 8 }}>
          Severity Heatmap
        </div>
        <p style={{ fontSize: 13, color: "var(--safe)", margin: 0 }}>
          ✓ No vulnerabilities found across all tested categories.
        </p>
      </div>
    );
  }

  return (
    <div
      style={{
        background: "var(--surface)",
        border: "1px solid var(--border)",
        borderRadius: 16,
        padding: 20,
      }}
    >
      <div className="section-label" style={{ marginBottom: 14 }}>
        Severity Heatmap
      </div>
      <div className="heatmap-grid">
        {Array.from(allCategoriesInReport).map((cat) => {
          const severity = categorySeverity.get(cat) ?? "info";
          const color = `var(--${severity})`;
          return (
            <div
              key={cat}
              className="heatmap-cell"
              style={{ borderLeft: `3px solid ${color}` }}
            >
              <div className="cat-name">{formatCat(cat)}</div>
              <div className="asr" style={{ color }}>
                {severity.toUpperCase()}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
