import { useEffect, useRef, useState } from "react";
import type { RedTeamRun, RunProgressEvent } from "../types";
import { api } from "../api";
import { CheckCircle2, AlertCircle, Loader2, Terminal } from "lucide-react";

interface Props {
  runId: string;
  onViewReport: () => void;
}

function formatCat(cat?: string | null) {
  if (!cat) return "";
  return cat.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export default function RunDashboard({ runId, onViewReport }: Props) {
  const [run, setRun] = useState<RedTeamRun | null>(null);
  const [events, setEvents] = useState<RunProgressEvent[]>([]);
  const [showLog, setShowLog] = useState(true);
  const logEndRef = useRef<HTMLDivElement>(null);

  // Poll for run state
  useEffect(() => {
    let cancelled = false;
    async function poll() {
      try {
        const data = await api.getRun(runId);
        if (!cancelled) setRun(data);
        if (!cancelled && data.status !== "completed" && data.status !== "failed") {
          setTimeout(poll, 2000);
        }
      } catch {
        if (!cancelled) setTimeout(poll, 3000);
      }
    }
    poll();
    return () => { cancelled = true; };
  }, [runId]);

  // WebSocket for live events
  useEffect(() => {
    const ws = new WebSocket(api.streamUrl(runId));
    ws.onmessage = (msg) => {
      const event: RunProgressEvent = JSON.parse(msg.data);
      setEvents((prev) => [...prev, event]);
    };
    return () => ws.close();
  }, [runId]);

  // Auto-scroll log
  useEffect(() => {
    if (showLog) {
      logEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [events, showLog]);

  // Build category progress map (merge WS events + REST results)
  const categoryProgress = new Map<string, { done: number; success: number; total: number }>();

  for (const e of events) {
    if (e.event_type === "case_completed" && e.category) {
      const entry = categoryProgress.get(e.category) ?? { done: 0, success: 0, total: run?.cases_per_category ?? 5 };
      entry.done += 1;
      if (e.success) entry.success += 1;
      categoryProgress.set(e.category, entry);
    }
  }

  for (const r of run?.results ?? []) {
    const entry = categoryProgress.get(r.category) ?? { done: 0, success: 0, total: run?.cases_per_category ?? 5 };
    entry.done = Math.max(entry.done, 1);
    if (r.success) entry.success = Math.max(entry.success, 1);
    categoryProgress.set(r.category, entry);
  }

  if (run?.status === "completed") {
    const resultMap = new Map<string, { done: number; success: number; total: number }>();
    for (const r of run.results ?? []) {
      const entry = resultMap.get(r.category) ?? { done: 0, success: 0, total: run.cases_per_category };
      entry.done += 1;
      if (r.success) entry.success += 1;
      resultMap.set(r.category, entry);
    }
    for (const [k, v] of resultMap) {
      const ev = categoryProgress.get(k);
      categoryProgress.set(k, {
        done: Math.max(ev?.done ?? 0, v.done),
        success: Math.max(ev?.success ?? 0, v.success),
        total: v.total,
      });
    }
  }

  const status = run?.status ?? "connecting";
  const isComplete = status === "completed";
  const isFailed = status === "failed";
  const isRunning = status === "running" || status === "pending" || status === "connecting";

  const expectedTotalCases = (run?.categories_run.length ?? 0) * (run?.cases_per_category ?? 5);
  let completedCount = 0;
  let vulnDetectedCount = 0;

  categoryProgress.forEach((val) => {
    completedCount += val.done;
    vulnDetectedCount += val.success;
  });

  if (isComplete) {
    completedCount = (run?.results ?? []).length;
    vulnDetectedCount = (run?.results ?? []).filter((r) => r.success).length;
  }

  const progressPercent = expectedTotalCases > 0 
    ? Math.min(100, Math.round((completedCount / expectedTotalCases) * 100))
    : isComplete ? 100 : 0;

  const totalCases = (run?.results ?? []).length || expectedTotalCases;
  const overallAsr = totalCases > 0 ? ((vulnDetectedCount / totalCases) * 100).toFixed(0) : "0";

  function renderMeaningfulLog(e: RunProgressEvent) {
    const catLabel = formatCat(e.category);

    if (e.event_type === "run_started") {
      return (
        <span style={{ color: "var(--low)" }}>
          🚀 <strong>[SCAN STARTED]</strong> Target LLM Endpoint: <code>{run?.target_endpoint || e.message}</code> ({run?.categories_run.length || 0} categories)
        </span>
      );
    }

    if (e.event_type === "category_started") {
      return (
        <span style={{ color: "var(--medium)" }}>
          ⚡ <strong>[TESTING CATEGORY]</strong> Initiating adversarial probes for <strong>{catLabel}</strong>...
        </span>
      );
    }

    if (e.event_type === "case_completed") {
      if (e.success) {
        return (
          <span style={{ color: "var(--critical)", fontWeight: 600 }}>
            🔴 <strong>[VULNERABILITY FOUND]</strong> Category: <strong>{catLabel}</strong> — Probe #{e.case_id || '1'} bypassed safety guardrails!
          </span>
        );
      }
      return (
        <span style={{ color: "var(--safe)" }}>
          🛡️ <strong>[PROBE DEFENDED]</strong> Category: <strong>{catLabel}</strong> — Target AI successfully resisted attack probe #{e.case_id || '1'}.
        </span>
      );
    }

    if (e.event_type === "category_completed") {
      return (
        <span style={{ color: "var(--safe)", fontWeight: 600 }}>
          ✅ <strong>[CATEGORY FINISHED]</strong> Completed all test cases for <strong>{catLabel}</strong>.
        </span>
      );
    }

    if (e.event_type === "run_completed") {
      return (
        <span style={{ color: "var(--safe)", fontWeight: 700 }}>
          🏁 <strong>[SCAN FINISHED]</strong> Security audit completed. Generated audit report.
        </span>
      );
    }

    return <span>{e.message}</span>;
  }

  return (
    <div>
      {/* ── Page header ── */}
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          marginBottom: 24,
          gap: 16,
          flexWrap: "wrap",
        }}
      >
        <div>
          <h1 className="page-title">Run Dashboard</h1>
          {run && (
            <p className="page-subtitle">
              {run.target_endpoint} · {run.categories_run.length} categories ·{" "}
              {run.cases_per_category} cases each
              {run.execution_mode === "relay" && (
                <> · <span className="badge low">relay: {run.agent_id}</span></>
              )}
            </p>
          )}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div
            className={`status-dot ${
              isComplete ? "completed" : isFailed ? "failed" : "running"
            }`}
          />
          <span className={`badge ${status}`} style={{ textTransform: "capitalize" }}>
            {status}
          </span>
        </div>
      </div>

      {/* ── Live Scan Progress Bar ── */}
      <div
        style={{
          background: "var(--surface)",
          border: "1px solid var(--border)",
          borderRadius: 16,
          padding: "18px 22px",
          marginBottom: 20,
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text)", display: "flex", alignItems: "center", gap: 8 }}>
            {isRunning ? (
              <Loader2 size={16} strokeWidth={2.2} className="animate-spin" style={{ color: "var(--accent)" }} />
            ) : isComplete ? (
              <CheckCircle2 size={16} strokeWidth={2.2} style={{ color: "var(--safe)" }} />
            ) : (
              <AlertCircle size={16} strokeWidth={2.2} style={{ color: "var(--critical)" }} />
            )}
            <span>
              {isRunning
                ? `Running Audit Probes: ${completedCount} / ${expectedTotalCases || '—'} Completed`
                : isComplete
                ? `Scan Finished — Evaluated ${completedCount} Probes`
                : `Scan Failed`}
            </span>
          </div>

          <div style={{ fontSize: 14, fontWeight: 700, color: isComplete ? "var(--safe)" : "var(--accent)" }}>
            {progressPercent}%
          </div>
        </div>

        {/* Outer bar */}
        <div style={{ width: "100%", height: 8, borderRadius: 99, background: "var(--bg-secondary)", overflow: "hidden" }}>
          <div
            style={{
              width: `${progressPercent}%`,
              height: "100%",
              background: isComplete ? "var(--safe)" : "var(--gradient-orange)",
              transition: "width 0.4s ease",
            }}
          />
        </div>
      </div>

      {/* ── Summary stats row (when complete) ── */}
      {isComplete && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
            gap: 14,
            marginBottom: 24,
          }}
        >
          {[
            { label: "Total Probes", value: totalCases },
            { label: "Vulnerabilities", value: vulnDetectedCount, accent: vulnDetectedCount > 0 ? "var(--critical)" : "var(--safe)" },
            {
              label: "Attack Success Rate",
              value: `${overallAsr}%`,
              accent: Number(overallAsr) > 30 ? "var(--critical)" : Number(overallAsr) > 10 ? "var(--medium)" : "var(--safe)",
            },
            {
              label: "Categories Run",
              value: run?.categories_run.length ?? 0,
            },
          ].map((stat) => (
            <div key={stat.label} className="card card-sm">
              <div
                style={{
                  fontSize: 26,
                  fontWeight: 600,
                  letterSpacing: "-0.02em",
                  color: stat.accent ?? "var(--text)",
                  fontFamily: '"Instrument Serif", serif',
                }}
              >
                {stat.value}
              </div>
              <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 3 }}>
                {stat.label}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Category tiles grid ── */}
      {run && run.categories_run.length > 0 && (
        <div
          style={{
            background: "var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: 18,
            padding: 20,
            marginBottom: 20,
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 16,
            }}
          >
            <span className="card-title">Category Progress</span>
            {isRunning && (
              <Loader2
                size={15}
                strokeWidth={2}
                style={{ color: "var(--accent)", animation: "spin 1s linear infinite" }}
              />
            )}
            {isComplete && <CheckCircle2 size={16} strokeWidth={2} style={{ color: "var(--safe)" }} />}
            {isFailed && <AlertCircle size={16} strokeWidth={2} style={{ color: "var(--critical)" }} />}
          </div>

          <div className="cat-grid">
            {run.categories_run.map((cat) => {
              const progress = categoryProgress.get(cat);
              const total = run.cases_per_category;
              const done = progress?.done ?? 0;
              const success = progress?.success ?? 0;
              const complete = done >= total;
              const hasVuln = success > 0;

              return (
                <div
                  key={cat}
                  className={`cat-tile ${hasVuln ? "vuln" : complete ? "done" : isRunning ? "running" : ""}`}
                >
                  <div className="cat-tile-name">{formatCat(cat)}</div>
                  <div className="cat-tile-progress">
                    {done}/{total}
                  </div>
                  {hasVuln && (
                    <div style={{ fontSize: 10, color: "var(--critical)", fontWeight: 700, marginTop: 4 }}>
                      🚨 {success} Vuln{success > 1 ? "s" : ""}
                    </div>
                  )}
                  {complete && !hasVuln && (
                    <div style={{ fontSize: 10, color: "var(--safe)", fontWeight: 600, marginTop: 4 }}>
                      ✓ Defended
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Live Log Feed ── */}
      <div
        style={{
          background: "var(--surface)",
          border: "1px solid var(--border)",
          borderRadius: 14,
          overflow: "hidden",
          marginBottom: 20,
        }}
      >
        <button
          style={{
            width: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "12px 16px",
            background: "none",
            border: "none",
            color: "var(--text)",
            cursor: "pointer",
            fontSize: 13,
            fontFamily: "inherit",
            fontWeight: 600,
          }}
          onClick={() => setShowLog(!showLog)}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Terminal size={15} style={{ color: "var(--accent)" }} />
            <span>Live Security Audit Log ({events.length} events)</span>
          </div>
          <span style={{ color: "var(--muted)", fontSize: 11 }}>
            {showLog ? "▲ Hide Log" : "▼ Expand Log"}
          </span>
        </button>

        {showLog && (
          <div className="progress-log" style={{ borderRadius: 0, border: "none", borderTop: "1px solid var(--border)", padding: "14px 16px" }}>
            {events.length === 0 && (
              <div className="progress-line" style={{ color: "var(--muted)" }}>
                ⏳ Connecting to live event stream... Waiting for attack probes to execute.
              </div>
            )}
            {events.map((e, i) => (
              <div
                key={i}
                className={`progress-line ${
                  e.success ? "success" : e.event_type === "category_completed" ? "safe" : ""
                }`}
                style={{ padding: "3px 0", lineHeight: 1.6 }}
              >
                <span style={{ opacity: 0.6, fontSize: 11, marginRight: 8, fontFamily: "monospace" }}>
                  [{new Date(e.timestamp).toLocaleTimeString()}]
                </span>
                {renderMeaningfulLog(e)}
              </div>
            ))}
            <div ref={logEndRef} />
          </div>
        )}
      </div>

      {/* ── Actions ── */}
      {isComplete && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 14,
            padding: "20px 24px",
            background: "var(--accent-subtle)",
            border: "1px solid var(--border-strong)",
            borderRadius: 16,
          }}
        >
          <CheckCircle2 size={22} strokeWidth={2} style={{ color: "var(--safe)" }} />
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 600, fontSize: 14, color: "var(--text)" }}>Scan Complete</div>
            <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 2 }}>
              {vulnDetectedCount} vulnerabilit{vulnDetectedCount !== 1 ? "ies" : "y"} detected across {totalCases} test cases.
            </div>
          </div>
          <button
            className="btn btn-primary"
            onClick={onViewReport}
          >
            View Full Report →
          </button>
        </div>
      )}

      {isFailed && (
        <div className="error-banner">
          <AlertCircle size={15} />
          {run?.error ?? "Run failed. Check backend logs for details."}
        </div>
      )}
    </div>
  );
}
