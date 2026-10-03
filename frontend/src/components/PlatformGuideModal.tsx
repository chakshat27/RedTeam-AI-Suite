import React, { useState } from "react";
import {
  X,
  BookOpen,
  ShieldCheck,
  Terminal,
  Key,
  Cpu,
  Server,
  Lock,
  ChevronRight,
  CheckCircle2,
} from "lucide-react";

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

type GuideTab = "quickstart" | "local_target" | "privacy_keys" | "relay_mode";

export default function PlatformGuideModal({ isOpen, onClose }: Props) {
  const [activeTab, setActiveTab] = useState<GuideTab>("quickstart");

  if (!isOpen) return null;

  return (
    <div className="help-modal-overlay" onClick={onClose}>
      <div
        className="help-modal-container glass"
        style={{ maxWidth: 960, height: "85vh", maxHeight: 720 }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="help-modal-header">
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div className="help-modal-icon">
              <BookOpen size={18} />
            </div>
            <div>
              <h2 className="help-modal-title">Platform User Guide & Documentation</h2>
              <p className="help-modal-subtitle">
                Learn how to run scans locally, integrate custom AI agents, and manage credentials
              </p>
            </div>
          </div>
          <button className="help-modal-close" onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="help-modal-body">
          {/* Sidebar */}
          <div className="help-modal-sidebar">
            <div className="help-category-list" style={{ padding: 12 }}>
              {[
                { id: "quickstart" as GuideTab, label: "Quickstart Guide", icon: <Terminal size={15} /> },
                { id: "local_target" as GuideTab, label: "Local Agent Testing", icon: <Server size={15} /> },
                { id: "privacy_keys" as GuideTab, label: "API Key Security", icon: <Key size={15} /> },
                { id: "relay_mode" as GuideTab, label: "Zero-Trust Relay Mode", icon: <Lock size={15} /> },
              ].map((tab) => (
                <button
                  key={tab.id}
                  className={`help-category-item ${activeTab === tab.id ? "active" : ""}`}
                  onClick={() => setActiveTab(tab.id)}
                  style={{ gap: 10, padding: "12px 14px" }}
                >
                  <span style={{ color: activeTab === tab.id ? "var(--low)" : "var(--muted)" }}>
                    {tab.icon}
                  </span>
                  <div style={{ flex: 1, textAlign: "left", fontSize: 13, fontWeight: 500 }}>
                    {tab.label}
                  </div>
                  <ChevronRight size={14} className="help-category-chevron" />
                </button>
              ))}
            </div>

            <div style={{ padding: 16, marginTop: "auto", borderTop: "1px solid var(--border)", fontSize: 11, color: "var(--muted)", lineHeight: 1.5 }}>
              <ShieldCheck size={14} color="var(--safe)" style={{ marginBottom: 4 }} />
              <div>100% Local Execution. Your data and target endpoints remain strictly on your machine.</div>
            </div>
          </div>

          {/* Content area */}
          <div className="help-modal-detail" style={{ padding: 28 }}>
            {activeTab === "quickstart" && (
              <div>
                <h3 className="help-detail-title" style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <Terminal size={18} color="var(--low)" />
                  How to Run a Red-Team Scan
                </h3>
                <p className="help-section-text" style={{ marginTop: 8 }}>
                  AI Red Team Suite automatically probes your AI application for safety vulnerabilities using multi-turn adversarial prompts scored by an impartial judge.
                </p>

                <div className="help-detail-section" style={{ marginTop: 20 }}>
                  <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                    <div style={{ display: "flex", gap: 12 }}>
                      <div style={{ width: 26, height: 26, borderRadius: "50%", background: "var(--accent-subtle)", border: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 12, flexShrink: 0 }}>1</div>
                      <div>
                        <strong style={{ color: "var(--text)", fontSize: 14 }}>Configure Target Endpoint</strong>
                        <p style={{ fontSize: 12, color: "var(--text-secondary)", margin: "4px 0 0", lineHeight: 1.5 }}>
                          Point the scanner at any OpenAI-compatible API endpoint (e.g., <code>http://localhost:8001/v1</code> or your local agent server).
                        </p>
                      </div>
                    </div>

                    <div style={{ display: "flex", gap: 12 }}>
                      <div style={{ width: 26, height: 26, borderRadius: "50%", background: "var(--accent-subtle)", border: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 12, flexShrink: 0 }}>2</div>
                      <div>
                        <strong style={{ color: "var(--text)", fontSize: 14 }}>Select Attack Scope & Intensity</strong>
                        <p style={{ fontSize: 12, color: "var(--text-secondary)", margin: "4px 0 0", lineHeight: 1.5 }}>
                          Choose from 9 vulnerability categories (Prompt Injection, Jailbreaks, PII Extraction, etc.) and pick a test intensity level (Standard, Deep, Audit).
                        </p>
                      </div>
                    </div>

                    <div style={{ display: "flex", gap: 12 }}>
                      <div style={{ width: 26, height: 26, borderRadius: "50%", background: "var(--accent-subtle)", border: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 12, flexShrink: 0 }}>3</div>
                      <div>
                        <strong style={{ color: "var(--text)", fontSize: 14 }}>Monitor Real-Time Dashboard</strong>
                        <p style={{ fontSize: 12, color: "var(--text-secondary)", margin: "4px 0 0", lineHeight: 1.5 }}>
                          Watch execution telemetry in real-time as probes are dispatched and scored with instant status feedback.
                        </p>
                      </div>
                    </div>

                    <div style={{ display: "flex", gap: 12 }}>
                      <div style={{ width: 26, height: 26, borderRadius: "50%", background: "var(--accent-subtle)", border: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 12, flexShrink: 0 }}>4</div>
                      <div>
                        <strong style={{ color: "var(--text)", fontSize: 14 }}>Analyze OWASP Mapped Vulnerability Report</strong>
                        <p style={{ fontSize: 12, color: "var(--text-secondary)", margin: "4px 0 0", lineHeight: 1.5 }}>
                          Inspect evidence, judge reasoning, and affected cases, or export an executive PDF report.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === "local_target" && (
              <div>
                <h3 className="help-detail-title" style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <Server size={18} color="var(--low)" />
                  Testing Local AI Projects & Custom Agents
                </h3>
                <p className="help-section-text" style={{ marginTop: 8 }}>
                  You can test any local AI application, LangChain pipeline, LlamaIndex bot, or custom FastAPI agent running on your computer.
                </p>

                <div className="help-detail-section" style={{ marginTop: 16 }}>
                  <h4 className="help-section-label">Target Endpoint Interface Requirement</h4>
                  <p className="help-section-text">
                    The target system simply needs to expose an OpenAI-compatible <code>/chat/completions</code> endpoint.
                  </p>
                  <div className="code-block" style={{ marginTop: 8, fontSize: 12 }}>
                    POST http://localhost:8001/v1/chat/completions{"\n"}
                    Content-Type: application/json{"\n\n"}
                    &#123; "messages": [&#123; "role": "user", "content": "attack prompt..." &#125;] &#125;
                  </div>
                </div>

                <div className="help-detail-section" style={{ marginTop: 16 }}>
                  <h4 className="help-section-label">Built-In Demo Target Server</h4>
                  <p className="help-section-text">
                    A mock target server is included for instant testing. You can run it locally with:
                  </p>
                  <div className="code-block" style={{ marginTop: 8, fontSize: 12 }}>
                    python -m uvicorn demo.mock_target_server:app --port 8001 --host 127.0.0.1
                  </div>
                </div>
              </div>
            )}

            {activeTab === "privacy_keys" && (
              <div>
                <h3 className="help-detail-title" style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <Key size={18} color="var(--low)" />
                  API Key Security & Zero-Persistence
                </h3>
                <p className="help-section-text" style={{ marginTop: 8 }}>
                  We design for maximum privacy and secret safety.
                </p>

                <div style={{ marginTop: 16, display: "flex", flexDirection: "column", gap: 12 }}>
                  <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 12, padding: 14 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, fontWeight: 600, fontSize: 13 }}>
                      <CheckCircle2 size={16} color="var(--safe)" />
                      In-Memory Only Handling
                    </div>
                    <p style={{ fontSize: 12, color: "var(--text-secondary)", margin: "6px 0 0", lineHeight: 1.5 }}>
                      Target API keys entered in the UI are processed strictly in-memory during the scan execution. They are <strong>never saved to disk or written to the SQLite database</strong>.
                    </p>
                  </div>

                  <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 12, padding: 14 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, fontWeight: 600, fontSize: 13 }}>
                      <CheckCircle2 size={16} color="var(--safe)" />
                      Environment File Fallback
                    </div>
                    <p style={{ fontSize: 12, color: "var(--text-secondary)", margin: "6px 0 0", lineHeight: 1.5 }}>
                      Instead of typing keys in the browser, you can store your <code>GROQ_API_KEY</code> and <code>GEMINI_API_KEY</code> directly in your local <code>backend/.env</code> file.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {activeTab === "relay_mode" && (
              <div>
                <h3 className="help-detail-title" style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <Lock size={18} color="var(--low)" />
                  Zero-Trust Relay Agent Mode
                </h3>
                <p className="help-section-text" style={{ marginTop: 8 }}>
                  For maximum security environments where target API keys must never travel over HTTP even to a local backend process.
                </p>

                <div className="help-detail-section" style={{ marginTop: 16 }}>
                  <h4 className="help-section-label">How Relay Mode Works</h4>
                  <p className="help-section-text">
                    You run <code>agent/relay_agent.py</code> on your own workstation. The local agent holds your credentials in its own local <code>.env</code> file. The control plane dispatches attack prompts to your agent, which executes them locally and returns the response.
                  </p>
                  <div className="code-block" style={{ marginTop: 10, fontSize: 12 }}>
                    python agent/relay_agent.py --agent-id my-workstation
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="help-modal-footer">
          <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "var(--muted)" }}>
            <Cpu size={14} />
            <span>AI Red Team Suite · Local First Architecture</span>
          </div>
          <button className="btn btn-secondary btn-sm" onClick={onClose}>
            Close Guide
          </button>
        </div>
      </div>
    </div>
  );
}
