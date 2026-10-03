// Mirrors backend/schemas/*.py — kept as plain interfaces (no codegen)
// since the schema surface is small and stable enough that manual sync
// is low-cost; a larger project would generate these from the FastAPI
// OpenAPI schema instead.

export const ALL_CATEGORIES = [
  "prompt_injection",
  "jailbreak",
  "pii_extraction",
  "off_topic",
  "guardrail_bypass",
  "indirect_injection",
  "hallucination",
  "prompt_leakage",
  "excessive_agency",
] as const;

export type AttackCategory = (typeof ALL_CATEGORIES)[number];

export type Severity = "critical" | "high" | "medium" | "low" | "info";

export type RunStatus = "pending" | "running" | "completed" | "failed";

export interface AttackResult {
  id: string;
  attack_case_id: string;
  category: AttackCategory;
  prompt: string;
  target_response: string;
  judge_score: number;
  success: boolean;
  judge_reasoning: string;
  judge_model: string;
  latency_ms: number;
  timestamp: string;
  error: string | null;
}

export interface RedTeamRun {
  run_id: string;
  target_endpoint: string;
  target_model: string;
  categories_run: AttackCategory[];
  cases_per_category: number;
  status: RunStatus;
  results: AttackResult[];
  started_at: string;
  completed_at: string | null;
  triggered_by: string;
  error: string | null;
  execution_mode: "local" | "relay";
  agent_id: string | null;
}

export interface CategorySummary {
  category: AttackCategory;
  total_cases: number;
  successful_attacks: number;
  attack_success_rate: number;
  highest_severity: Severity | null;
}

export interface RunSummary {
  run_id: string;
  target_endpoint: string;
  target_model: string;
  status: RunStatus;
  overall_asr: number;
  category_summaries: CategorySummary[];
  started_at: string;
  completed_at: string | null;
}

export interface OWASPFinding {
  owasp_id: string;
  title: string;
  our_attack_categories: AttackCategory[];
}

export interface Finding {
  category: AttackCategory;
  owasp_mapping: OWASPFinding;
  severity: Severity;
  attack_success_rate: number;
  example_prompt: string;
  example_response: string;
  recommendation: string;
  affected_case_count: number;
}

export interface VulnerabilityReport {
  run_id: string;
  target_endpoint: string;
  executive_summary: string;
  findings_by_severity: Record<Severity, Finding[]>;
  overall_asr: number;
  total_attacks_run: number;
  generated_at: string;
}

export interface RunProgressEvent {
  event_type: "run_started" | "category_started" | "case_completed" | "category_completed" | "run_completed";
  run_id: string;
  category: AttackCategory | null;
  case_id: string | null;
  success: boolean | null;
  message: string;
  timestamp: string;
}

export interface CaseDelta {
  attack_case_id: string;
  category: AttackCategory;
  delta_type: "new_vulnerability" | "fixed" | "unchanged_vulnerable" | "unchanged_safe" | "not_comparable";
  baseline_success: boolean | null;
  current_success: boolean | null;
}

export interface RunComparison {
  baseline_run_id: string;
  current_run_id: string;
  deltas: CaseDelta[];
  new_vulnerability_count: number;
  fixed_count: number;
  has_regression: boolean;
}

export interface User {
  id: string;
  email: string;
  full_name: string;
  created_at: string;
}

