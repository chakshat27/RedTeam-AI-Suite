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
    icon: <Zap size={22} className="text-accent" />,
    title: "Automated LLM Red-Teaming",
    desc: "Synthesises adversarial prompts across 9 attack vectors—covering prompt injection, jailbreaking, PII extraction, RAG poisoning, and prompt leakage.",
  },
  {
    icon: <Lock size={22} className="text-accent" />,
    title: "100% Local & Privacy-First",
    desc: "Evaluations run on your local machine. Target API keys flow in-memory for the run's duration and are never stored in databases or telemetry logs.",
  },
  {
    icon: <FileText size={22} className="text-accent" />,
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
    <div className="landing-container">
      {/* ── Hero Section ── */}
      <div className="landing-hero">
        <div className="landing-eyebrow">
          <Shield size={14} strokeWidth={2.5} />
          <span>AI Safety &amp; Red-Team Suite</span>
        </div>

        <h1 className="landing-title">
          Find your AI's<br />
          <em>vulnerabilities before attackers do.</em>
        </h1>

        <p className="landing-description">
          Point AI Red Team Suite at any LLM endpoint and generate a scored,
          evidence-backed vulnerability report in minutes.
        </p>

        {/* Hero CTA Action Row */}
        <div className="landing-cta-row">
          <button
            className="btn btn-primary btn-xl"
            onClick={handleStartScan}
          >
            Start a scan
            <ChevronRight size={16} strokeWidth={2.2} />
          </button>

          {onOpenGuide && (
            <button
              className="btn btn-secondary btn-lg"
              onClick={onOpenGuide}
            >
              <BookOpen size={16} strokeWidth={1.8} />
              <span>User Guide</span>
            </button>
          )}
        </div>
      </div>

      {/* ── Streamlined 3-Card Highlights ── */}
      <div className="feature-grid">
        {HIGHLIGHT_CARDS.map((card) => (
          <div key={card.title} className="feature-card">
            <div className="feature-icon">
              {card.icon}
            </div>
            <h3 className="feature-card-title">
              {card.title}
            </h3>
            <p className="feature-card-desc">{card.desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
