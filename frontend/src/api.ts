import type { RedTeamRun, RunSummary, VulnerabilityReport, RunComparison, AttackCategory } from "./types";

// Relative paths — vite.config.ts proxies these to the FastAPI backend in
// dev; in production these would be served from the same origin behind a
// reverse proxy, or this constant swapped to an absolute backend URL.
const BASE = "";

async function jsonFetch<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, init);
  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(`${response.status} ${response.statusText}: ${body}`);
  }
  return response.json() as Promise<T>;
}

export interface CustomCaseInput {
  category: AttackCategory;
  prompt: string;
  expected_failure_mode?: string;
  metadata?: any;
}

export interface CreateRunRequest {
  target_endpoint: string;
  target_model: string;
  target_api_key?: string;
  categories: AttackCategory[] | null;
  cases_per_category: number;
  triggered_by?: string;
  custom_cases?: CustomCaseInput[];
  execution_mode?: "local" | "relay"; // [V2] defaults to "local" server-side if omitted
  agent_id?: string; // [V2] required when execution_mode === "relay"
}

export const api = {
  createRun: (req: CreateRunRequest) =>
    jsonFetch<{ run_id: string }>(`${BASE}/run`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(req),
    }),

  getRun: (runId: string) => jsonFetch<RedTeamRun>(`${BASE}/run/${runId}`),

  listRuns: (limit = 50) => jsonFetch<RunSummary[]>(`${BASE}/runs?limit=${limit}`),

  getReport: (runId: string) => jsonFetch<VulnerabilityReport>(`${BASE}/report/${runId}`),

  // [V3] URL for the PDF export — used as a plain <a href> download link
  // rather than a fetch, so the browser handles the download/Content-
  // Disposition itself instead of us buffering the PDF bytes in JS.
  reportPdfUrl: (runId: string) => `${BASE}/report/${runId}/pdf`,

  compareRuns: (runIdA: string, runIdB: string) =>
    jsonFetch<RunComparison>(`${BASE}/compare/${runIdA}/${runIdB}`),

  // [V2] Which local relay agents are currently connected — lets the UI
  // offer "run this via my own machine" only when an agent is actually
  // listening, rather than dispatching to a dead agent_id.
  listAgents: () => jsonFetch<{ connected_agents: string[] }>(`${BASE}/agent/list`),

  streamUrl: (runId: string) => {
    const protocol = window.location.protocol === "https:" ? "wss" : "ws";
    return `${protocol}://${window.location.host}/run/${runId}/stream`;
  },
};
