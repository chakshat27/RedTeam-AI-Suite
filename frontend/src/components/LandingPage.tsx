import { Shield, Zap, FileText, Lock, ChevronRight, BookOpen } from "lucide-react";
import type { AttackCategory } from "../types";
import { useAuth } from "../context/AuthContext";

interface Props {
  onStart: () => void;
  onOpenHelp?: (category?: AttackCategory) => void;
  onOpenGuide?: () => void;
  onOpenAuth?: (mode?: "login" | "signup") => void;
}

const HIGHLIGHT_CARDS = [
  {
    icon: <Zap className="w-5 h-5 text-emerald-600" />,
    title: "Automated LLM Red-Teaming",
    desc: "Synthesises adversarial prompts across 9 attack vectors—covering prompt injection, jailbreaking, PII extraction, RAG poisoning, and prompt leakage.",
  },
  {
    icon: <Lock className="w-5 h-5 text-emerald-600" />,
    title: "100% Local & Privacy-First",
    desc: "Evaluations run on your local machine. Target API keys flow in-memory for the run's duration and are never stored in databases or telemetry logs.",
  },
  {
    icon: <FileText className="w-5 h-5 text-emerald-600" />,
    title: "LLM-as-Judge & OWASP Compliance",
    desc: "Evaluates model safety, maps findings to the OWASP LLM Top 10 2025 standard, tracks safety regressions, and exports evidence-backed PDF reports.",
  },
];

export default function LandingPage({ onStart, onOpenGuide, onOpenAuth }: Props) {
  const { user } = useAuth();

  const handleStartScan = () => {
    if (!user) {
      onOpenAuth?.("signup");
    } else {
      onStart();
    }
  };

  return (
    <div className="space-y-8 py-2 max-w-6xl mx-auto">
      {/* ── Hero Section ── */}
      <div className="landing-hero py-4">
        <div className="landing-eyebrow mb-3">
          <Shield size={11} strokeWidth={2.5} />
          <span>AI Safety &amp; Red-Team Suite</span>
        </div>

        <h1 className="landing-title text-4xl md:text-5xl mb-3">
          Find your AI's<br />
          <em>vulnerabilities before attackers do.</em>
        </h1>

        <p className="landing-description text-sm md:text-base text-sub max-w-2xl mb-6">
          Point AI Red Team Suite at any LLM endpoint and generate a scored,
          evidence-backed vulnerability report in minutes.
        </p>

        {/* Hero CTA Action Row */}
        <div className="landing-cta-row flex items-center gap-3">
          <button
            className="btn btn-primary btn-xl shadow-lg"
            onClick={handleStartScan}
          >
            Start a scan
            <ChevronRight size={16} strokeWidth={2} />
          </button>

          {onOpenGuide && (
            <button
              className="btn btn-secondary btn-lg"
              onClick={onOpenGuide}
            >
              <BookOpen size={15} strokeWidth={1.8} />
              <span>User Guide</span>
            </button>
          )}
        </div>
      </div>

      {/* ── Streamlined 3-Card Highlights ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2">
        {HIGHLIGHT_CARDS.map((card) => (
          <div key={card.title} className="glass rounded-2xl p-6 flex flex-col gap-3 transition-transform hover:-translate-y-1">
            <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 w-fit">
              {card.icon}
            </div>
            <h3 className="font-serif text-xl font-normal tracking-tight text-main leading-snug">
              {card.title}
            </h3>
            <p className="text-xs text-sub leading-relaxed">{card.desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
