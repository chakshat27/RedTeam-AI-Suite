import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api";
import { useAuth } from "../context/AuthContext";
import type { RunSummary, AttackCategory } from "../types";
import {
  Shield,
  ShieldAlert,
  ShieldCheck,
  Plus,
  Play,
  Activity,
  FileText,
  History,
  Zap,
  Cpu,
  BookOpen,
  HelpCircle,
  ArrowRight,
  Clock,
  Sparkles,
  Server,
  Cloud,
  Monitor,
  Code2,
  Bot,
  CheckCircle2,
  AlertTriangle,
  Lock,
} from "lucide-react";

interface Props {
  onStartNewScan: () => void;
  onViewReport: (runId: string) => void;
  onViewDashboard: (runId: string) => void;
  onOpenHelp: (category?: AttackCategory) => void;
  onOpenGuide: () => void;
}

const CATEGORY_NAMES: Record<string, string> = {
  prompt_injection: "Prompt Injection",
  jailbreak: "Jailbreak Framing",
  pii_extraction: "PII Extraction",
  off_topic: "Off-Topic Divert",
  guardrail_bypass: "Guardrail Bypass",
  indirect_injection: "Indirect Injection",
  hallucination: "Hallucination Push",
  prompt_leakage: "Prompt Leakage",
  excessive_agency: "Excessive Agency",
};

export default function HomeDashboard({
  onStartNewScan,
  onViewReport,
  onViewDashboard,
  onOpenHelp,
  onOpenGuide,
}: Props) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [runs, setRuns] = useState<RunSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .listRuns(10, user?.id)
      .then((data) => setRuns(data || []))
      .catch(() => setRuns([]))
      .finally(() => setLoading(false));
  }, [user?.id]);

  // Calculations & Analytics
  const completedRuns = runs.filter((r) => r.status === "completed");
  const totalScans = runs.length;
  const avgAsr =
    completedRuns.length > 0
      ? Math.round(
          (completedRuns.reduce((acc, r) => acc + (r.overall_asr || 0), 0) /
            completedRuns.length) *
            100
        )
      : 0;

  const totalProbesEvaluated = completedRuns.reduce(
    (acc, r) =>
      acc +
      (r.category_summaries?.reduce((sum, c) => sum + c.total_cases, 0) || 0),
    0
  );

  const lastCompletedRun = completedRuns[0];

  // Greeting
  const currentHour = new Date().getHours();
  const greeting =
    currentHour < 12
      ? "Good morning"
      : currentHour < 18
      ? "Good afternoon"
      : "Good evening";

  const displayName = user?.full_name || (user?.email ? user.email.split("@")[0] : "Security Auditor");

  return (
    <div className="home-dashboard" style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* ── Top Hero Greeting & Action Header ── */}
      <div
        style={{
          background: "linear-gradient(135deg, var(--surface) 0%, var(--surface-elevated) 100%)",
          border: "1px solid var(--border)",
          borderRadius: "var(--r-xl)",
          padding: "24px 28px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: 16,
          boxShadow: "0 4px 20px rgba(0, 0, 0, 0.08)",
          position: "relative",
          overflow: "hidden",
        }}
      >
        <div style={{ position: "relative", zIndex: 2 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 5,
                padding: "3px 10px",
                borderRadius: 20,
                background: "rgba(249, 115, 22, 0.12)",
                border: "1px solid rgba(249, 115, 22, 0.25)",
                color: "var(--accent)",
                fontSize: 11,
                fontWeight: 600,
                letterSpacing: "0.04em",
                textTransform: "uppercase",
              }}
            >
              <Sparkles size={12} /> RedTeam Ops Center
            </span>
            <span style={{ fontSize: 12, color: "var(--muted)" }}>• Engine v3.2</span>
          </div>

          <h1 style={{ margin: 0, fontSize: 24, fontWeight: 700, color: "var(--text)" }}>
            {greeting}, {displayName}
          </h1>
          <p style={{ margin: "4px 0 0", fontSize: 13, color: "var(--muted)", maxWidth: 580 }}>
            Automated adversarial stress testing, prompt injection auditing, and OWASP LLM security compliance for your AI models and agents.
          </p>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 10, position: "relative", zIndex: 2 }}>
          <button
            className="btn btn-secondary"
            onClick={onOpenGuide}
            style={{ gap: 6, padding: "9px 14px", fontSize: 13 }}
          >
            <BookOpen size={14} />
            <span>Guide</span>
          </button>

          <button
            className="btn btn-primary"
            onClick={onStartNewScan}
            style={{
              gap: 8,
              padding: "10px 18px",
              fontSize: 13,
              fontWeight: 600,
              boxShadow: "0 0 16px rgba(249, 115, 22, 0.35)",
            }}
          >
            <Plus size={15} strokeWidth={2.2} />
            <span>Launch New Scan</span>
          </button>
        </div>
      </div>

      {/* ── Live Operational Status Strip ── */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: 12,
        }}
      >
        <div
          style={{
            background: "var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: "var(--r-lg)",
            padding: "10px 14px",
            display: "flex",
            alignItems: "center",
            gap: 10,
          }}
        >
          <div
            style={{
              width: 8,
              height: 8,
              borderRadius: "50%",
              background: "#10b981",
              boxShadow: "0 0 8px #10b981",
            }}
          />
          <div style={{ display: "flex", flexDirection: "column" }}>
            <span style={{ fontSize: 11, color: "var(--muted)", fontWeight: 500 }}>Scanner Engine</span>
            <span style={{ fontSize: 12, color: "var(--text)", fontWeight: 600 }}>Active & Calibrated</span>
          </div>
        </div>

        <div
          style={{
            background: "var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: "var(--r-lg)",
            padding: "10px 14px",
            display: "flex",
            alignItems: "center",
            gap: 10,
          }}
        >
          <div style={{ color: "var(--accent)", display: "flex" }}>
            <Zap size={14} />
          </div>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <span style={{ fontSize: 11, color: "var(--muted)", fontWeight: 500 }}>Attack Taxonomy</span>
            <span style={{ fontSize: 12, color: "var(--text)", fontWeight: 600 }}>9 OWASP LLM Vectors</span>
          </div>
        </div>

        <div
          style={{
            background: "var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: "var(--r-lg)",
            padding: "10px 14px",
            display: "flex",
            alignItems: "center",
            gap: 10,
          }}
        >
          <div style={{ color: "#3b82f6", display: "flex" }}>
            <Server size={14} />
          </div>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <span style={{ fontSize: 11, color: "var(--muted)", fontWeight: 500 }}>Execution Target</span>
            <span style={{ fontSize: 12, color: "var(--text)", fontWeight: 600 }}>Cloud & Local Endpoints</span>
          </div>
        </div>

        <div
          style={{
            background: "var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: "var(--r-lg)",
            padding: "10px 14px",
            display: "flex",
            alignItems: "center",
            gap: 10,
          }}
        >
          <div style={{ color: "#10b981", display: "flex" }}>
            <Lock size={14} />
          </div>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <span style={{ fontSize: 11, color: "var(--muted)", fontWeight: 500 }}>Credentials Privacy</span>
            <span style={{ fontSize: 12, color: "var(--text)", fontWeight: 600 }}>In-Memory Zero Persistence</span>
          </div>
        </div>
      </div>

      {/* ── Key Performance Metrics ── */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
          gap: 14,
        }}
      >
        <div
          style={{
            background: "var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: "var(--r-xl)",
            padding: "18px 20px",
            display: "flex",
            flexDirection: "column",
            gap: 8,
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: 12, fontWeight: 500, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.04em" }}>
              Total Audits Run
            </span>
            <History size={16} className="text-muted" />
          </div>
          <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
            <span style={{ fontSize: 26, fontWeight: 700, color: "var(--text)" }}>{totalScans}</span>
            <span style={{ fontSize: 12, color: "var(--muted)" }}>scans total</span>
          </div>
          <span style={{ fontSize: 11.5, color: "var(--muted)" }}>
            {completedRuns.length} completed audits recorded
          </span>
        </div>

        <div
          style={{
            background: "var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: "var(--r-xl)",
            padding: "18px 20px",
            display: "flex",
            flexDirection: "column",
            gap: 8,
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: 12, fontWeight: 500, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.04em" }}>
              Average ASR
            </span>
            <ShieldAlert size={16} style={{ color: avgAsr > 30 ? "var(--critical)" : "var(--accent)" }} />
          </div>
          <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
            <span
              style={{
                fontSize: 26,
                fontWeight: 700,
                color: avgAsr > 40 ? "var(--critical)" : avgAsr > 20 ? "var(--accent)" : "#10b981",
              }}
            >
              {avgAsr}%
            </span>
            <span style={{ fontSize: 12, color: "var(--muted)" }}>bypass rate</span>
          </div>
          <span style={{ fontSize: 11.5, color: "var(--muted)" }}>
            {avgAsr === 0 ? "No vulnerabilities breached" : "Attack success rate across runs"}
          </span>
        </div>

        <div
          style={{
            background: "var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: "var(--r-xl)",
            padding: "18px 20px",
            display: "flex",
            flexDirection: "column",
            gap: 8,
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: 12, fontWeight: 500, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.04em" }}>
              Total Probes Fired
            </span>
            <Activity size={16} className="text-muted" />
          </div>
          <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
            <span style={{ fontSize: 26, fontWeight: 700, color: "var(--text)" }}>
              {totalProbesEvaluated}
            </span>
            <span style={{ fontSize: 12, color: "var(--muted)" }}>payloads</span>
          </div>
          <span style={{ fontSize: 11.5, color: "var(--muted)" }}>
            Multi-turn adversarial vectors audited
          </span>
        </div>

        <div
          style={{
            background: "var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: "var(--r-xl)",
            padding: "18px 20px",
            display: "flex",
            flexDirection: "column",
            gap: 8,
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: 12, fontWeight: 500, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.04em" }}>
              Latest Target Audited
            </span>
            <Cpu size={16} className="text-muted" />
          </div>
          <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
            <span
              style={{
                fontSize: 16,
                fontWeight: 700,
                color: "var(--accent)",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
              title={lastCompletedRun?.target_model || "None yet"}
            >
              {lastCompletedRun?.target_model || "No audits yet"}
            </span>
          </div>
          <span style={{ fontSize: 11.5, color: "var(--muted)" }}>
            {lastCompletedRun
              ? `Audited ${new Date(lastCompletedRun.started_at).toLocaleDateString()}`
              : "Ready for initial scan"}
          </span>
        </div>
      </div>

      {/* ── Main Two-Column Content Grid ── */}
      <div style={{ display: "grid", gridTemplateColumns: "1.6fr 1fr", gap: 20 }}>
        {/* ── Left: Recent Scans or Getting Started Onboarding ── */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {runs.length === 0 && !loading ? (
            /* Onboarding Walkthrough Card when 0 scans */
            <div
              style={{
                background: "var(--surface)",
                border: "1px solid var(--border)",
                borderRadius: "var(--r-xl)",
                padding: "24px 26px",
                display: "flex",
                flexDirection: "column",
                gap: 18,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: "50%",
                    background: "rgba(249, 115, 22, 0.15)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "var(--accent)",
                  }}
                >
                  <Shield size={18} strokeWidth={2.2} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: "var(--text)" }}>
                    Quick Start: 3 Steps to Audit Your AI Target
                  </h3>
                  <p style={{ margin: "2px 0 0", fontSize: 12.5, color: "var(--muted)" }}>
                    You haven't run any security scans yet. Follow these steps to audit your model:
                  </p>
                </div>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <div
                  style={{
                    background: "var(--bg-secondary)",
                    border: "1px solid var(--border)",
                    borderRadius: "var(--r-lg)",
                    padding: "12px 16px",
                    display: "flex",
                    alignItems: "flex-start",
                    gap: 12,
                  }}
                >
                  <div
                    style={{
                      width: 24,
                      height: 24,
                      borderRadius: "50%",
                      background: "var(--surface)",
                      border: "1px solid var(--border)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontWeight: 700,
                      fontSize: 12,
                      color: "var(--accent)",
                      flexShrink: 0,
                    }}
                  >
                    1
                  </div>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text)" }}>
                      Choose your AI Target & Endpoint
                    </div>
                    <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 2 }}>
                      Point to OpenAI cloud API, local Ollama (`http://localhost:11434/v1`), LM Studio, or your local backend app.
                    </div>
                  </div>
                </div>

                <div
                  style={{
                    background: "var(--bg-secondary)",
                    border: "1px solid var(--border)",
                    borderRadius: "var(--r-lg)",
                    padding: "12px 16px",
                    display: "flex",
                    alignItems: "flex-start",
                    gap: 12,
                  }}
                >
                  <div
                    style={{
                      width: 24,
                      height: 24,
                      borderRadius: "50%",
                      background: "var(--surface)",
                      border: "1px solid var(--border)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontWeight: 700,
                      fontSize: 12,
                      color: "var(--accent)",
                      flexShrink: 0,
                    }}
                  >
                    2
                  </div>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text)" }}>
                      Select Threat Vectors & Scan Intensity
                    </div>
                    <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 2 }}>
                      Pick from 9 OWASP LLM categories (Prompt Injection, Jailbreaks, PII Leaks, etc.) and set probe density.
                    </div>
                  </div>
                </div>

                <div
                  style={{
                    background: "var(--bg-secondary)",
                    border: "1px solid var(--border)",
                    borderRadius: "var(--r-lg)",
                    padding: "12px 16px",
                    display: "flex",
                    alignItems: "flex-start",
                    gap: 12,
                  }}
                >
                  <div
                    style={{
                      width: 24,
                      height: 24,
                      borderRadius: "50%",
                      background: "var(--surface)",
                      border: "1px solid var(--border)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontWeight: 700,
                      fontSize: 12,
                      color: "var(--accent)",
                      flexShrink: 0,
                    }}
                  >
                    3
                  </div>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text)" }}>
                      Launch Live Audit & Export Compliance PDF
                    </div>
                    <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 2 }}>
                      Stream attack payloads live in real time and download a full vulnerability certificate with remediation steps.
                    </div>
                  </div>
                </div>
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 4 }}>
                <button
                  className="btn btn-primary"
                  onClick={onStartNewScan}
                  style={{ gap: 8, padding: "10px 20px" }}
                >
                  <Play size={14} fill="currentColor" />
                  <span>Start Your First Security Audit</span>
                </button>
              </div>
            </div>
          ) : (
            /* Recent Scans List */
            <div
              style={{
                background: "var(--surface)",
                border: "1px solid var(--border)",
                borderRadius: "var(--r-xl)",
                padding: "20px 22px",
                display: "flex",
                flexDirection: "column",
                gap: 14,
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: "var(--text)" }}>
                    Recent Security Audits
                  </h3>
                  <p style={{ margin: "2px 0 0", fontSize: 12, color: "var(--muted)" }}>
                    Latest adversarial scans executed against your targets
                  </p>
                </div>

                <button
                  className="btn btn-ghost btn-sm"
                  onClick={() => navigate("/history")}
                  style={{ gap: 4, color: "var(--accent)", fontSize: 12 }}
                >
                  <span>View Full History</span>
                  <ArrowRight size={13} />
                </button>
              </div>

              {loading ? (
                <div style={{ padding: 30, textAlign: "center", color: "var(--muted)", fontSize: 13 }}>
                  Loading recent scans…
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {runs.slice(0, 5).map((run) => {
                    const asrPct = Math.round(run.overall_asr * 100);
                    const isPassed = asrPct === 0;
                    const isHighRisk = asrPct > 35;
                    const runProbes =
                      run.category_summaries?.reduce((s, c) => s + c.total_cases, 0) || 0;

                    return (
                      <div
                        key={run.run_id}
                        style={{
                          background: "var(--bg-secondary)",
                          border: "1px solid var(--border)",
                          borderRadius: "var(--r-lg)",
                          padding: "12px 16px",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          gap: 12,
                          transition: "border-color 0.15s ease",
                        }}
                      >
                        <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0, flex: 1 }}>
                          <div
                            style={{
                              width: 32,
                              height: 32,
                              borderRadius: 8,
                              background: isPassed
                                ? "rgba(16, 185, 129, 0.12)"
                                : isHighRisk
                                ? "rgba(239, 68, 68, 0.12)"
                                : "rgba(249, 115, 22, 0.12)",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              color: isPassed
                                ? "#10b981"
                                : isHighRisk
                                ? "var(--critical)"
                                : "var(--accent)",
                              flexShrink: 0,
                            }}
                          >
                            {isPassed ? (
                              <ShieldCheck size={16} />
                            ) : isHighRisk ? (
                              <ShieldAlert size={16} />
                            ) : (
                              <AlertTriangle size={16} />
                            )}
                          </div>

                          <div style={{ minWidth: 0, flex: 1 }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                              <span
                                style={{
                                  fontSize: 13,
                                  fontWeight: 600,
                                  color: "var(--text)",
                                  overflow: "hidden",
                                  textOverflow: "ellipsis",
                                  whiteSpace: "nowrap",
                                }}
                              >
                                {run.target_model || "target-app"}
                              </span>
                              <span
                                className={`badge ${
                                  run.status === "completed"
                                    ? isPassed
                                    : run.status === "running"
                                    ? "info"
                                    : "warn"
                                }`}
                                style={{ fontSize: 10.5 }}
                              >
                                {run.status}
                              </span>
                            </div>

                            <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 3 }}>
                              <span style={{ fontSize: 11, color: "var(--muted)", display: "flex", alignItems: "center", gap: 4 }}>
                                <Clock size={11} /> {new Date(run.started_at).toLocaleDateString()}
                              </span>
                              <span style={{ fontSize: 11, color: "var(--muted)" }}>•</span>
                              <span style={{ fontSize: 11, color: "var(--muted)" }}>
                                {runProbes} probes
                              </span>
                              <span style={{ fontSize: 11, color: "var(--muted)" }}>•</span>
                              <span
                                style={{
                                  fontSize: 11,
                                  fontWeight: 600,
                                  color: isPassed
                                    ? "#10b981"
                                    : isHighRisk
                                    ? "var(--critical)"
                                    : "var(--accent)",
                                }}
                              >
                                {asrPct}% ASR
                              </span>
                            </div>
                          </div>
                        </div>

                        <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
                          <button
                            className="btn btn-secondary btn-xs"
                            onClick={() => onViewDashboard(run.run_id)}
                            title="Open live telemetry dashboard"
                            style={{ gap: 4 }}
                          >
                            <Activity size={12} />
                            <span>Live</span>
                          </button>
                          {run.status === "completed" && (
                            <button
                              className="btn btn-ghost btn-xs"
                              onClick={() => onViewReport(run.run_id)}
                              title="View full vulnerability assessment report"
                              style={{ gap: 4, color: "var(--accent)" }}
                            >
                              <FileText size={12} />
                              <span>Report</span>
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── Right Column: Target Quick Presets & KB Shortcuts ── */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {/* Quick Target Presets Card */}
          <div
            style={{
              background: "var(--surface)",
              border: "1px solid var(--border)",
              borderRadius: "var(--r-xl)",
              padding: "20px",
              display: "flex",
              flexDirection: "column",
              gap: 12,
            }}
          >
            <div>
              <h3 style={{ margin: 0, fontSize: 14.5, fontWeight: 700, color: "var(--text)" }}>
                Target Architecture Presets
              </h3>
              <p style={{ margin: "2px 0 0", fontSize: 12, color: "var(--muted)" }}>
                Start a customized scan for your deployment type
              </p>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={onStartNewScan}
                style={{
                  justifyContent: "flex-start",
                  padding: "10px 12px",
                  gap: 10,
                  textAlign: "left",
                }}
              >
                <Cloud size={16} className="text-accent" />
                <div style={{ display: "flex", flexDirection: "column", minWidth: 0 }}>
                  <span style={{ fontSize: 12.5, fontWeight: 600, color: "var(--text)" }}>
                    Cloud API (OpenAI / Groq)
                  </span>
                  <span style={{ fontSize: 10.5, color: "var(--muted)" }}>
                    Test public endpoint with API key
                  </span>
                </div>
              </button>

              <button
                type="button"
                className="btn btn-secondary"
                onClick={onStartNewScan}
                style={{
                  justifyContent: "flex-start",
                  padding: "10px 12px",
                  gap: 10,
                  textAlign: "left",
                }}
              >
                <Monitor size={16} className="text-accent" />
                <div style={{ display: "flex", flexDirection: "column", minWidth: 0 }}>
                  <span style={{ fontSize: 12.5, fontWeight: 600, color: "var(--text)" }}>
                    Local LLM (Ollama / vLLM)
                  </span>
                  <span style={{ fontSize: 10.5, color: "var(--muted)" }}>
                    Direct localhost model audit
                  </span>
                </div>
              </button>

              <button
                type="button"
                className="btn btn-secondary"
                onClick={onStartNewScan}
                style={{
                  justifyContent: "flex-start",
                  padding: "10px 12px",
                  gap: 10,
                  textAlign: "left",
                }}
              >
                <Bot size={16} className="text-accent" />
                <div style={{ display: "flex", flexDirection: "column", minWidth: 0 }}>
                  <span style={{ fontSize: 12.5, fontWeight: 600, color: "var(--text)" }}>
                    Firewalled AI Agent (Relay)
                  </span>
                  <span style={{ fontSize: 10.5, color: "var(--muted)" }}>
                    Private network agent via WebSocket
                  </span>
                </div>
              </button>
            </div>
          </div>

          {/* Attack Knowledge Base Card */}
          <div
            style={{
              background: "var(--surface)",
              border: "1px solid var(--border)",
              borderRadius: "var(--r-xl)",
              padding: "20px",
              display: "flex",
              flexDirection: "column",
              gap: 12,
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <h3 style={{ margin: 0, fontSize: 14.5, fontWeight: 700, color: "var(--text)" }}>
                  Attack Vectors & Knowledge Base
                </h3>
                <p style={{ margin: "2px 0 0", fontSize: 12, color: "var(--muted)" }}>
                  Explore OWASP LLM 2025 definitions
                </p>
              </div>
              <HelpCircle size={15} className="text-muted" />
            </div>

            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {Object.entries(CATEGORY_NAMES).map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => onOpenHelp(key as AttackCategory)}
                  style={{
                    background: "var(--bg-secondary)",
                    border: "1px solid var(--border)",
                    borderRadius: 14,
                    padding: "4px 9px",
                    fontSize: 11,
                    fontWeight: 500,
                    color: "var(--text)",
                    cursor: "pointer",
                    transition: "all 0.15s ease",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = "var(--accent)";
                    e.currentTarget.style.color = "var(--accent)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = "var(--border)";
                    e.currentTarget.style.color = "var(--text)";
                  }}
                >
                  {label} ↗
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
