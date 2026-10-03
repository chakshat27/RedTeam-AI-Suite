import type { RedTeamRun, RunSummary, VulnerabilityReport, RunComparison, AttackCategory } from "./types";

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
  execution_mode?: "local" | "relay";
  agent_id?: string;
  user_id?: string;
  user_name?: string;
}

export const api = {
  createRun: (req: CreateRunRequest) =>
    jsonFetch<{ run_id: string }>(`${BASE}/run`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(req),
    }),

  getRun: (runId: string) => jsonFetch<RedTeamRun>(`${BASE}/run/${runId}`),

  listRuns: (limit = 50, userId?: string) =>
    jsonFetch<RunSummary[]>(`${BASE}/runs?limit=${limit}${userId ? `&user_id=${encodeURIComponent(userId)}` : ""}`),

  getReport: (runId: string) => jsonFetch<VulnerabilityReport>(`${BASE}/report/${runId}`),

  reportPdfUrl: (runId: string) => `${BASE}/report/${runId}/pdf`,

  compareRuns: (runIdA: string, runIdB: string) =>
    jsonFetch<RunComparison>(`${BASE}/compare/${runIdA}/${runIdB}`),

  listAgents: () => jsonFetch<{ connected_agents: string[] }>(`${BASE}/agent/list`),

  streamUrl: (runId: string) => {
    const protocol = window.location.protocol === "https:" ? "wss" : "ws";
    return `${protocol}://${window.location.host}/run/${runId}/stream`;
  },
};
