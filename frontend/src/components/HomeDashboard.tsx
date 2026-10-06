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
  Cpu,
  BookOpen,
  HelpCircle,
  ArrowRight,
  Clock,
  Sparkles,
  Cloud,
  Monitor,
  Bot,
  AlertTriangle,
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
  const authMode = sessionStorage.getItem("rts_auth_mode");
  const greeting = authMode === "signup" ? "Welcome" : "Welcome back";

  const displayName =
    user?.full_name || (user?.email ? user.email.split("@")[0] : "Security Auditor");

  return (
    <div
      className="home-dashboard"
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 14,
        maxHeight: "calc(100vh - 100px)",
      }}
    >
      {/* ── Top Hero Greeting & Action Header ── */}
      <div
        style={{
          background: "linear-gradient(135deg, var(--surface) 0%, var(--surface-elevated) 100%)",
          border: "1px solid var(--border)",
          borderRadius: "var(--r-xl)",
          padding: "16px 22px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: 12,
          boxShadow: "0 2px 12px rgba(0, 0, 0, 0.06)",
        }}
      >
        <div>
          <h1 style={{ margin: 0, fontSize: 21, fontWeight: 700, color: "var(--text)" }}>
            {greeting}, {displayName}
          </h1>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <button
            className="btn btn-secondary btn-sm"
            onClick={onOpenGuide}
            style={{ gap: 6, padding: "8px 12px", fontSize: 12.5 }}
          >
            <BookOpen size={13} />
            <span>Guide</span>
          </button>

          <button
            className="btn btn-primary btn-sm"
            onClick={onStartNewScan}
            style={{
              gap: 6,
              padding: "8px 16px",
              fontSize: 12.5,
              fontWeight: 600,
              boxShadow: "0 0 12px rgba(249, 115, 22, 0.3)",
            }}
          >
            <Plus size={14} strokeWidth={2.2} />
            <span>Launch New Scan</span>
          </button>
        </div>
      </div>

      {/* ── Key Performance Metrics (Compact 4-Card Strip) ── */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: 12,
        }}
      >
        <div
          style={{
            background: "var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: "var(--r-lg)",
            padding: "12px 16px",
            display: "flex",
            flexDirection: "column",
            gap: 4,
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: 11, fontWeight: 600, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.04em" }}>
              Total Audits Run
            </span>
            <History size={14} className="text-muted" />
          </div>
          <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
            <span style={{ fontSize: 22, fontWeight: 700, color: "var(--text)" }}>{totalScans}</span>
            <span style={{ fontSize: 11.5, color: "var(--muted)" }}>scans</span>
          </div>
        </div>

        <div
          style={{
            background: "var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: "var(--r-lg)",
            padding: "12px 16px",
            display: "flex",
            flexDirection: "column",
            gap: 4,
          }}
          title="Attack Success Rate (ASR) measures the percentage of adversarial probes that successfully bypassed target guardrails. Lower is safer."
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: 11, fontWeight: 600, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.04em" }}>
              Vulnerability Bypass Rate (ASR)
            </span>
            <ShieldAlert size={14} style={{ color: avgAsr > 30 ? "var(--critical)" : "var(--accent)" }} />
          </div>
          <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
            <span
              style={{
                fontSize: 22,
                fontWeight: 700,
                color: avgAsr > 40 ? "var(--critical)" : avgAsr > 20 ? "var(--accent)" : "#10b981",
              }}
            >
              {avgAsr}%
            </span>
            <span style={{ fontSize: 11.5, color: "var(--muted)" }}>
              {avgAsr === 0 ? "secure" : "exploited"}
            </span>
          </div>
        </div>

        <div
          style={{
            background: "var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: "var(--r-lg)",
            padding: "12px 16px",
            display: "flex",
            flexDirection: "column",
            gap: 4,
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: 11, fontWeight: 600, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.04em" }}>
              Probes Evaluated
            </span>
            <Activity size={14} className="text-muted" />
          </div>
          <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
            <span style={{ fontSize: 22, fontWeight: 700, color: "var(--text)" }}>
              {totalProbesEvaluated}
            </span>
            <span style={{ fontSize: 11.5, color: "var(--muted)" }}>payloads</span>
          </div>
        </div>

        <div
          style={{
            background: "var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: "var(--r-lg)",
            padding: "12px 16px",
            display: "flex",
            flexDirection: "column",
            gap: 4,
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: 11, fontWeight: 600, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.04em" }}>
              Latest Target
            </span>
            <Cpu size={14} className="text-muted" />
          </div>
          <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
            <span
              style={{
                fontSize: 14.5,
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
        </div>
      </div>

      {/* ── Main Two-Column Content Grid ── */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1.55fr 1fr",
          gap: 14,
          flex: 1,
          minHeight: 0,
        }}
      >
        {/* ── Left Column: Recent Scans or Getting Started Onboarding ── */}
        <div style={{ display: "flex", flexDirection: "column", minHeight: 0 }}>
          {runs.length === 0 && !loading ? (
            /* Onboarding Walkthrough Card when 0 scans */
            <div
              style={{
                background: "var(--surface)",
                border: "1px solid var(--border)",
                borderRadius: "var(--r-xl)",
                padding: "20px 22px",
                display: "flex",
                flexDirection: "column",
                gap: 12,
                height: "100%",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: "50%",
                    background: "rgba(249, 115, 22, 0.15)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "var(--accent)",
                  }}
                >
                  <Shield size={16} strokeWidth={2.2} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: 14.5, fontWeight: 700, color: "var(--text)" }}>
                    Quick Start: 3 Steps to Audit Your AI Target
                  </h3>
                  <p style={{ margin: "1px 0 0", fontSize: 11.5, color: "var(--muted)" }}>
                    No security scans run yet. Follow these 3 simple steps:
                  </p>
                </div>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 8, flex: 1, justifyContent: "center" }}>
                <div
                  style={{
                    background: "var(--bg-secondary)",
                    border: "1px solid var(--border)",
                    borderRadius: "var(--r-md)",
                    padding: "9px 13px",
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                  }}
                >
                  <div
                    style={{
                      width: 20,
                      height: 20,
                      borderRadius: "50%",
                      background: "var(--surface)",
                      border: "1px solid var(--border)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontWeight: 700,
                      fontSize: 11,
                      color: "var(--accent)",
                      flexShrink: 0,
                    }}
                  >
                    1
                  </div>
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text)" }}>
                      Choose AI Target & Endpoint
                    </div>
                    <div style={{ fontSize: 11, color: "var(--muted)" }}>
                      Point to OpenAI API, local Ollama (`:11434`), LM Studio, or local backend app.
                    </div>
                  </div>
                </div>

                <div
                  style={{
                    background: "var(--bg-secondary)",
                    border: "1px solid var(--border)",
                    borderRadius: "var(--r-md)",
                    padding: "9px 13px",
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                  }}
                >
                  <div
                    style={{
                      width: 20,
                      height: 20,
                      borderRadius: "50%",
                      background: "var(--surface)",
                      border: "1px solid var(--border)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontWeight: 700,
                      fontSize: 11,
                      color: "var(--accent)",
                      flexShrink: 0,
                    }}
                  >
                    2
                  </div>
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text)" }}>
                      Select Threat Vectors & Intensity
                    </div>
                    <div style={{ fontSize: 11, color: "var(--muted)" }}>
                      Pick from 9 OWASP LLM categories (Prompt Injection, Jailbreaks, PII Leaks, etc.).
                    </div>
                  </div>
                </div>

                <div
                  style={{
                    background: "var(--bg-secondary)",
                    border: "1px solid var(--border)",
                    borderRadius: "var(--r-md)",
                    padding: "9px 13px",
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                  }}
                >
                  <div
                    style={{
                      width: 20,
                      height: 20,
                      borderRadius: "50%",
                      background: "var(--surface)",
                      border: "1px solid var(--border)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontWeight: 700,
                      fontSize: 11,
                      color: "var(--accent)",
                      flexShrink: 0,
                    }}
                  >
                    3
                  </div>
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text)" }}>
                      Launch Live Audit & Export Compliance PDF
                    </div>
                    <div style={{ fontSize: 11, color: "var(--muted)" }}>
                      Stream live attack payloads and generate a downloadable security assessment PDF.
                    </div>
                  </div>
                </div>
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 2 }}>
                <button
                  className="btn btn-primary btn-sm"
                  onClick={onStartNewScan}
                  style={{ gap: 6, padding: "8px 16px", fontSize: 12.5 }}
                >
                  <Play size={13} fill="currentColor" />
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
                padding: "16px 18px",
                display: "flex",
                flexDirection: "column",
                gap: 10,
                height: "100%",
                minHeight: 0,
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: "var(--text)" }}>
                    Recent Security Audits
                  </h3>
                  <p style={{ margin: "1px 0 0", fontSize: 11.5, color: "var(--muted)" }}>
                    Latest adversarial scans executed against your targets
                  </p>
                </div>

                <button
                  className="btn btn-ghost btn-xs"
                  onClick={() => navigate("/history")}
                  style={{ gap: 4, color: "var(--accent)", fontSize: 11.5 }}
                >
                  <span>Full History</span>
                  <ArrowRight size={12} />
                </button>
              </div>

              {loading ? (
                <div style={{ padding: 24, textAlign: "center", color: "var(--muted)", fontSize: 12 }}>
                  Loading recent scans…
                </div>
              ) : (
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: 8,
                    overflowY: "auto",
                    flex: 1,
                    paddingRight: 2,
                  }}
                >
                  {runs.slice(0, 4).map((run) => {
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
                          borderRadius: "var(--r-md)",
                          padding: "9px 13px",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          gap: 10,
                        }}
                      >
                        <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0, flex: 1 }}>
                          <div
                            style={{
                              width: 28,
                              height: 28,
                              borderRadius: 6,
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
                              <ShieldCheck size={14} />
                            ) : isHighRisk ? (
                              <ShieldAlert size={14} />
                            ) : (
                              <AlertTriangle size={14} />
                            )}
                          </div>

                          <div style={{ minWidth: 0, flex: 1 }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                              <span
                                style={{
                                  fontSize: 12.5,
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
                                style={{ fontSize: 9.5, padding: "1px 6px" }}
                              >
                                {run.status}
                              </span>
                            </div>

                            <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 2 }}>
                              <span style={{ fontSize: 10.5, color: "var(--muted)", display: "flex", alignItems: "center", gap: 3 }}>
                                <Clock size={10} /> {new Date(run.started_at).toLocaleDateString()}
                              </span>
                              <span style={{ fontSize: 10.5, color: "var(--muted)" }}>•</span>
                              <span style={{ fontSize: 10.5, color: "var(--muted)" }}>
                                {runProbes} probes
                              </span>
                              <span style={{ fontSize: 10.5, color: "var(--muted)" }}>•</span>
                              <span
                                style={{
                                  fontSize: 10.5,
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

                        <div style={{ display: "flex", alignItems: "center", gap: 5, flexShrink: 0 }}>
                          <button
                            className="btn btn-secondary btn-xs"
                            onClick={() => onViewDashboard(run.run_id)}
                            title="Open live telemetry dashboard"
                            style={{ gap: 3, padding: "3px 8px", fontSize: 11 }}
                          >
                            <Activity size={11} />
                            <span>Live</span>
                          </button>
                          {run.status === "completed" && (
                            <button
                              className="btn btn-ghost btn-xs"
                              onClick={() => onViewReport(run.run_id)}
                              title="View full vulnerability assessment report"
                              style={{ gap: 3, padding: "3px 8px", fontSize: 11, color: "var(--accent)" }}
                            >
                              <FileText size={11} />
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
        <div style={{ display: "flex", flexDirection: "column", gap: 12, minHeight: 0 }}>
          {/* Quick Target Presets Card */}
          <div
            style={{
              background: "var(--surface)",
              border: "1px solid var(--border)",
              borderRadius: "var(--r-xl)",
              padding: "16px",
              display: "flex",
              flexDirection: "column",
              gap: 8,
            }}
          >
            <div>
              <h3 style={{ margin: 0, fontSize: 13.5, fontWeight: 700, color: "var(--text)" }}>
                Target Architecture Presets
              </h3>
              <p style={{ margin: "1px 0 0", fontSize: 11, color: "var(--muted)" }}>
                Quick start for your deployment environment
              </p>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={onStartNewScan}
                style={{
                  justifyContent: "flex-start",
                  padding: "8px 10px",
                  gap: 8,
                  textAlign: "left",
                }}
              >
                <Cloud size={14} className="text-accent" />
                <div style={{ display: "flex", flexDirection: "column", minWidth: 0 }}>
                  <span style={{ fontSize: 11.5, fontWeight: 600, color: "var(--text)" }}>
                    Cloud API (OpenAI / Groq)
                  </span>
                  <span style={{ fontSize: 10, color: "var(--muted)" }}>
                    Public OpenAI-compatible endpoint
                  </span>
                </div>
              </button>

              <button
                type="button"
                className="btn btn-secondary"
                onClick={onStartNewScan}
                style={{
                  justifyContent: "flex-start",
                  padding: "8px 10px",
                  gap: 8,
                  textAlign: "left",
                }}
              >
                <Monitor size={14} className="text-accent" />
                <div style={{ display: "flex", flexDirection: "column", minWidth: 0 }}>
                  <span style={{ fontSize: 11.5, fontWeight: 600, color: "var(--text)" }}>
                    Local LLM (Ollama / vLLM)
                  </span>
                  <span style={{ fontSize: 10, color: "var(--muted)" }}>
                    Direct localhost model audit (`:11434`)
                  </span>
                </div>
              </button>

              <button
                type="button"
                className="btn btn-secondary"
                onClick={onStartNewScan}
                style={{
                  justifyContent: "flex-start",
                  padding: "8px 10px",
                  gap: 8,
                  textAlign: "left",
                }}
              >
                <Bot size={14} className="text-accent" />
                <div style={{ display: "flex", flexDirection: "column", minWidth: 0 }}>
                  <span style={{ fontSize: 11.5, fontWeight: 600, color: "var(--text)" }}>
                    Firewalled AI Agent (Relay)
                  </span>
                  <span style={{ fontSize: 10, color: "var(--muted)" }}>
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
              padding: "16px",
              display: "flex",
              flexDirection: "column",
              gap: 8,
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <h3 style={{ margin: 0, fontSize: 13.5, fontWeight: 700, color: "var(--text)" }}>
                  Attack Vectors & Knowledge Base
                </h3>
                <p style={{ margin: "1px 0 0", fontSize: 11, color: "var(--muted)" }}>
                  OWASP LLM 2025 definitions & mitigations
                </p>
              </div>
              <HelpCircle size={14} className="text-muted" />
            </div>

            <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
              {Object.entries(CATEGORY_NAMES).map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => onOpenHelp(key as AttackCategory)}
                  style={{
                    background: "var(--bg-secondary)",
                    border: "1px solid var(--border)",
                    borderRadius: 12,
                    padding: "3px 8px",
                    fontSize: 10.5,
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
