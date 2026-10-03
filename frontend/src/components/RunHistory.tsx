import { useEffect, useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import type { RunSummary, RunComparison } from "../types";
import { api } from "../api";
import { useAuth } from "../context/AuthContext";
import { GitCompare, Activity, FileText } from "lucide-react";

interface Props {
  onViewReport: (runId: string) => void;
  onViewDashboard: (runId: string) => void;
}

export default function RunHistory({ onViewReport, onViewDashboard }: Props) {
  const { user } = useAuth();
  const [runs, setRuns] = useState<RunSummary[]>([]);
  const [comparison, setComparison] = useState<RunComparison | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .listRuns(50, user?.id)
      .then(setRuns)
      .finally(() => setLoading(false));
  }, [user?.id]);

  async function handleCompareLatestTwo() {
    const completed = runs.filter((r) => r.status === "completed");
    if (completed.length < 2) return;
    const [current, baseline] = completed;
    const result = await api.compareRuns(baseline.run_id, current.run_id);
    setComparison(result);
  }

  const chartData = [...runs]
    .filter((r) => r.status === "completed")
    .reverse()
    .map((r) => ({
      name: new Date(r.started_at).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      }),
      ASR: Math.round(r.overall_asr * 100),
    }));

  const completedRuns = runs.filter((r) => r.status === "completed");

  return (
    <div>
      {/* ── Page header ── */}
      <div style={{ marginBottom: 28 }}>
        <h1 className="page-title">Run History</h1>
        <p className="page-subtitle">
          Track safety posture over time and compare successive scans.
        </p>
      </div>

      {/* ── Trend chart ── */}
      {chartData.length > 1 && (
        <div
          style={{
            background: "var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: 18,
            padding: 20,
            marginBottom: 20,
          }}
        >
          <div className="card-header" style={{ marginBottom: 16 }}>
            <span className="card-title">Attack Success Rate Trend</span>
            <span
              style={{ fontSize: 12, color: "var(--muted)" }}
            >
              {chartData.length} completed runs
            </span>
          </div>
          <div style={{ height: 200 }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={chartData}
                margin={{ top: 4, right: 4, left: -20, bottom: 0 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="var(--border)"
                  vertical={false}
                />
                <XAxis
                  dataKey="name"
                  stroke="var(--muted)"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  stroke="var(--muted)"
                  fontSize={11}
                  unit="%"
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip
                  contentStyle={{
                    background: "var(--bg-secondary)",
                    border: "1px solid var(--border)",
                    borderRadius: 8,
                    fontSize: 12,
                    color: "var(--text)",
                  }}
                  cursor={{ stroke: "var(--border)", strokeWidth: 1 }}
                  formatter={(v: number) => [`${v}%`, "ASR"]}
                />
                <Line
                  type="monotone"
                  dataKey="ASR"
                  stroke="var(--low)"
                  strokeWidth={2}
                  dot={{ fill: "var(--low)", r: 3, strokeWidth: 0 }}
                  activeDot={{ r: 5, strokeWidth: 0 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* ── Runs table ── */}
      <div
        style={{
          background: "var(--surface)",
          border: "1px solid var(--border)",
          borderRadius: 18,
          overflow: "hidden",
          marginBottom: 16,
        }}
      >
        <div
          style={{
            padding: "16px 20px",
            borderBottom: "1px solid var(--border)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <span className="card-title">All Runs</span>
          {completedRuns.length >= 2 && (
            <button
              className="btn btn-secondary btn-sm"
              onClick={handleCompareLatestTwo}
              style={{ marginTop: 0 }}
            >
              <GitCompare size={13} />
              Compare latest two
            </button>
          )}
        </div>

        {loading && (
          <div className="empty-state" style={{ padding: "32px 20px" }}>
            <div className="empty-state-title text-muted">Loading…</div>
          </div>
        )}

        {!loading && runs.length === 0 && (
          <div className="empty-state" style={{ padding: "48px 20px" }}>
            <div className="empty-state-icon">📋</div>
            <div className="empty-state-title">No runs yet</div>
            <div className="empty-state-desc">
              Configure a target and run your first scan to see results here.
            </div>
          </div>
        )}

        {runs.length > 0 && (
          <table>
            <thead>
              <tr>
                <th>Run ID</th>
                <th>Target</th>
                <th>Status</th>
                <th>ASR</th>
                <th>Started</th>
                <th style={{ textAlign: "right" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {runs.map((r) => (
                <tr key={r.run_id}>
                  <td>
                    <span
                      style={{
                        fontFamily: "monospace",
                        fontSize: 11,
                        color: "var(--muted)",
                      }}
                    >
                      {r.run_id.slice(0, 14)}…
                    </span>
                  </td>
                  <td style={{ fontWeight: 500, fontSize: 13 }}>
                    {r.target_model}
                  </td>
                  <td>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 6,
                      }}
                    >
                      <div
                        className={`status-dot ${
                          r.status === "completed"
                            ? "completed"
                            : r.status === "failed"
                            ? "failed"
                            : "running"
                        }`}
                      />
                      <span
                        className={`badge ${r.status}`}
                      >
                        {r.status}
                      </span>
                    </div>
                  </td>
                  <td>
                    <span
                      style={{
                        fontWeight: 600,
                        color:
                          r.overall_asr > 0.3
                            ? "var(--critical)"
                            : r.overall_asr > 0.1
                            ? "var(--medium)"
                            : "var(--safe)",
                        fontSize: 13,
                      }}
                    >
                      {(r.overall_asr * 100).toFixed(0)}%
                    </span>
                  </td>
                  <td style={{ color: "var(--muted)", fontSize: 12 }}>
                    {new Date(r.started_at).toLocaleString("en-US", {
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </td>
                  <td>
                    <div
                      style={{
                        display: "flex",
                        gap: 6,
                        justifyContent: "flex-end",
                      }}
                    >
                      {r.status === "completed" && (
                        <>
                          <button
                            className="btn btn-secondary btn-sm"
                            style={{ marginTop: 0 }}
                            onClick={() => onViewDashboard(r.run_id)}
                            title="View dashboard"
                          >
                            <Activity size={12} />
                          </button>
                          <button
                            className="btn btn-secondary btn-sm"
                            style={{ marginTop: 0 }}
                            onClick={() => onViewReport(r.run_id)}
                            title="View report"
                          >
                            <FileText size={12} />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* ── Regression comparison ── */}
      {comparison && (
        <div
          style={{
            background: "var(--surface)",
            border: `1px solid ${comparison.has_regression ? "rgba(255,93,93,0.3)" : "rgba(74,222,128,0.3)"}`,
            borderRadius: 18,
            overflow: "hidden",
          }}
        >
          <div
            style={{
              padding: "16px 20px",
              borderBottom: "1px solid var(--border)",
              display: "flex",
              alignItems: "center",
              gap: 10,
            }}
          >
            <span className="card-title">Regression Analysis</span>
            <span
              className={`badge ${comparison.has_regression ? "critical" : "safe"}`}
            >
              {comparison.has_regression ? "Regression Detected" : "No Regression"}
            </span>
            <span
              style={{
                marginLeft: "auto",
                fontSize: 12,
                color: "var(--muted)",
              }}
            >
              {comparison.new_vulnerability_count} new ·{" "}
              {comparison.fixed_count} fixed
            </span>
          </div>
          <table>
            <thead>
              <tr>
                <th>Category</th>
                <th>Change</th>
                <th>Baseline</th>
                <th>Current</th>
              </tr>
            </thead>
            <tbody>
              {comparison.deltas
                .filter((d) => d.delta_type !== "unchanged_safe")
                .map((d) => (
                  <tr key={d.attack_case_id}>
                    <td style={{ fontWeight: 500 }}>{d.category}</td>
                    <td>
                      <span
                        className={`badge ${
                          d.delta_type === "new_vulnerability"
                            ? "critical"
                            : d.delta_type === "fixed"
                            ? "safe"
                            : "info"
                        }`}
                      >
                        {d.delta_type.replace(/_/g, " ")}
                      </span>
                    </td>
                    <td style={{ color: "var(--muted)", fontSize: 12 }}>
                      {d.baseline_success === null
                        ? "—"
                        : d.baseline_success
                        ? "Vulnerable"
                        : "Safe"}
                    </td>
                    <td style={{ fontSize: 12 }}>
                      {d.current_success === null
                        ? "—"
                        : d.current_success
                        ? <span style={{ color: "var(--critical)" }}>Vulnerable</span>
                        : <span style={{ color: "var(--safe)" }}>Safe</span>}
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
