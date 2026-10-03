import { useEffect, useState, createContext, useContext } from "react";
import {
  HashRouter as Router,
  Routes,
  Route,
  useNavigate,
  useParams,
  useLocation,
  Navigate,
} from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import {
  Shield,
  Settings2,
  Activity,
  FileWarning,
  History,
  Sun,
  Moon,
  HelpCircle,
  BookOpen,
  LogIn,
  LogOut,
  User as UserIcon,
} from "lucide-react";
import LandingPage from "./components/LandingPage";
import TargetConfig from "./components/TargetConfig";
import RunDashboard from "./components/RunDashboard";
import VulnerabilityReportView from "./components/VulnerabilityReport";
import RunHistory from "./components/RunHistory";
import AttackHelpModal from "./components/AttackHelpModal";
import PlatformGuideModal from "./components/PlatformGuideModal";
import AuthModal from "./components/AuthModal";
import { AuthProvider, useAuth } from "./context/AuthContext";
import type { AttackCategory } from "./types";


import { ThemeProvider, useTheme } from "./context/ThemeContext";

/* ============================================================
   Top navigation bar
   ============================================================ */
interface TopbarProps {
  isLanding?: boolean;
  activeTab: string;
  onNavigate: (path: string) => void;
  canAccessDashboard: boolean;
  canAccessReport: boolean;
  dashRunId: string | null;
  reportRunId: string | null;
  onOpenHelp: () => void;
  onOpenGuide: () => void;
  onOpenAuth: (mode?: "login" | "signup") => void;
}

function Topbar({
  isLanding,
  activeTab,
  onNavigate,
  canAccessDashboard,
  canAccessReport,
  dashRunId,
  reportRunId,
  onOpenHelp,
  onOpenGuide,
  onOpenAuth,
}: TopbarProps) {
  const { theme, toggleTheme } = useTheme();
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <header className="topbar">
      <div className="topbar-inner">
        {/* Logo */}
        <div
          className="topbar-logo"
          onClick={() => navigate("/")}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => e.key === "Enter" && navigate("/")}
        >
          <div className="topbar-logo-icon">
            <Shield size={15} strokeWidth={2.2} />
          </div>
          <span className="topbar-logo-text">AI Red Team Suite</span>
        </div>

        {!isLanding && user && <div className="topbar-divider" />}

        {/* Nav tabs — only show when user is logged in AND not on landing page */}
        {!isLanding && user && (
          <nav className="topbar-nav">
            <button
              className={`topbar-tab ${activeTab === "configure" ? "active" : ""}`}
              onClick={() => onNavigate("/configure")}
            >
              <Settings2 size={14} strokeWidth={1.8} />
              <span>Configure</span>
            </button>

            <button
              className={`topbar-tab ${activeTab === "dashboard" ? "active" : ""} ${
                !canAccessDashboard ? "disabled" : ""
              }`}
              onClick={() =>
                canAccessDashboard && dashRunId && onNavigate(`/dashboard/${dashRunId}`)
              }
              title={!canAccessDashboard ? "Start a run first" : undefined}
            >
              <Activity size={14} strokeWidth={1.8} />
              <span>Dashboard</span>
            </button>

            <button
              className={`topbar-tab ${activeTab === "report" ? "active" : ""} ${
                !canAccessReport ? "disabled" : ""
              }`}
              onClick={() =>
                canAccessReport && reportRunId && onNavigate(`/report/${reportRunId}`)
              }
              title={!canAccessReport ? "Complete a run first" : undefined}
            >
              <FileWarning size={14} strokeWidth={1.8} />
              <span>Report</span>
            </button>

            <button
              className={`topbar-tab ${activeTab === "history" ? "active" : ""}`}
              onClick={() => onNavigate("/history")}
            >
              <History size={14} strokeWidth={1.8} />
              <span>History</span>
            </button>
          </nav>
        )}

        {/* Actions */}
        <div className="topbar-actions">
          {user ? (
            <>
              {!isLanding && (
                <button
                  className="topbar-action-btn"
                  onClick={onOpenGuide}
                  title="Platform User Guide & Local Setup"
                >
                  <BookOpen size={14} strokeWidth={1.8} />
                  <span className="hidden md:inline">Guide</span>
                </button>
              )}

              <button
                className="topbar-action-btn"
                onClick={onOpenHelp}
                title="Attack Knowledge Base & OWASP References"
              >
                <HelpCircle size={14} strokeWidth={1.8} />
                <span className="hidden md:inline">Attack KB</span>
              </button>

              <div className="topbar-divider" />

              <div className="topbar-user-badge">
                <div className="topbar-user-avatar">
                  {user.full_name ? user.full_name.charAt(0).toUpperCase() : user.email.charAt(0).toUpperCase()}
                </div>
                <span className="topbar-user-name">
                  {user.full_name ? user.full_name.split(" ")[0] : user.email.split("@")[0]}
                </span>
                <button
                  onClick={logout}
                  className="topbar-logout-btn"
                  title="Sign Out"
                >
                  <LogOut size={13} strokeWidth={2} />
                </button>
              </div>
            </>
          ) : (
            <button
              className="btn btn-secondary btn-sm flex items-center gap-1.5"
              onClick={() => onOpenAuth("login")}
            >
              <LogIn size={13} />
              <span>Log In</span>
            </button>
          )}

          <button
            className="theme-toggle"
            onClick={toggleTheme}
            title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
            aria-label="Toggle theme"
          >
            {theme === "dark" ? (
              <Sun size={15} strokeWidth={1.8} color="var(--muted)" />
            ) : (
              <Moon size={15} strokeWidth={1.8} color="var(--muted)" />
            )}
          </button>
        </div>
      </div>
    </header>
  );
}

/* ============================================================
   App content (router-aware)
   ============================================================ */
function AppContent() {
  const navigate = useNavigate();
  const location = useLocation();
  const path = location.pathname;

  const [activeRunId, setActiveRunId] = useState<string | null>(null);
  const [reportRunId, setReportRunId] = useState<string | null>(null);

  // Modal states
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const [helpCategory, setHelpCategory] = useState<AttackCategory | null>(null);
  const [isGuideOpen, setIsGuideOpen] = useState(false);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState<"login" | "signup">("login");

  function handleOpenAuth(mode: "login" | "signup" = "login") {
    setAuthMode(mode);
    setIsAuthOpen(true);
  }

  function handleOpenHelp(category?: AttackCategory) {
    if (category) setHelpCategory(category);
    setIsHelpOpen(true);
  }

  function handleRunStarted(runId: string) {
    setActiveRunId(runId);
    navigate(`/dashboard/${runId}`);
  }

  function handleViewReport(runId: string) {
    setActiveRunId(runId);
    setReportRunId(runId);
    navigate(`/report/${runId}`);
  }

  function handleViewDashboard(runId: string) {
    setActiveRunId(runId);
    navigate(`/dashboard/${runId}`);
  }

  useEffect(() => {
    const dashMatch = path.match(/^\/dashboard\/(.+)$/);
    const reportMatch = path.match(/^\/report\/(.+)$/);
    if (dashMatch?.[1] && dashMatch[1] !== activeRunId) setActiveRunId(dashMatch[1]);
    if (reportMatch?.[1]) {
      if (reportMatch[1] !== reportRunId) setReportRunId(reportMatch[1]);
      if (reportMatch[1] !== activeRunId) setActiveRunId(reportMatch[1]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [path]);

  const currentDashRunId =
    activeRunId ?? (path.match(/^\/dashboard\/(.+)$/)?.[1] ?? null);
  const currentReportRunId =
    reportRunId ?? (path.match(/^\/report\/(.+)$/)?.[1] ?? null);

  // Determine active tab key
  let activeTab = "";
  if (path.startsWith("/configure")) activeTab = "configure";
  else if (path.startsWith("/dashboard")) activeTab = "dashboard";
  else if (path.startsWith("/report")) activeTab = "report";
  else if (path.startsWith("/history")) activeTab = "history";

  const isLanding = path === "/" || path === "";

  return (
    <div className="app-shell">
      {/* Always show topbar */}
      <Topbar
        isLanding={isLanding}
        activeTab={activeTab}
        onNavigate={navigate}
        canAccessDashboard={!!currentDashRunId}
        canAccessReport={!!currentReportRunId}
        dashRunId={currentDashRunId}
        reportRunId={currentReportRunId}
        onOpenHelp={() => handleOpenHelp()}
        onOpenGuide={() => setIsGuideOpen(true)}
        onOpenAuth={handleOpenAuth}
      />

      {/* Page content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={isLanding ? "landing" : activeTab}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          transition={{ duration: 0.22, ease: "easeOut" }}
          style={{ flex: 1 }}
        >
          {isLanding ? (
            <div className="page-content">
              <LandingPage
                onStart={() => navigate("/configure")}
                onOpenHelp={() => handleOpenHelp()}
                onOpenGuide={() => setIsGuideOpen(true)}
                onOpenAuth={handleOpenAuth}
              />
            </div>
          ) : (
            <div className="page-content">
              <Routes>
                <Route
                  path="/configure"
                  element={
                    <ProtectedRoute onOpenAuth={handleOpenAuth}>
                      <TargetConfig
                        onRunStarted={handleRunStarted}
                        onOpenHelp={handleOpenHelp}
                        onOpenGuide={() => setIsGuideOpen(true)}
                      />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/dashboard/:runId"
                  element={
                    <ProtectedRoute onOpenAuth={handleOpenAuth}>
                      <DashboardWrapper onViewReport={handleViewReport} />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/report/:runId"
                  element={
                    <ProtectedRoute onOpenAuth={handleOpenAuth}>
                      <ReportWrapper />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/history"
                  element={
                    <ProtectedRoute onOpenAuth={handleOpenAuth}>
                      <RunHistory
                        onViewReport={handleViewReport}
                        onViewDashboard={handleViewDashboard}
                      />
                    </ProtectedRoute>
                  }
                />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      {/* Global Attack Category Knowledge Base Modal */}
      <AttackHelpModal
        isOpen={isHelpOpen}
        onClose={() => setIsHelpOpen(false)}
        initialCategory={helpCategory}
      />

      {/* Platform User Guide & Local Setup Modal */}
      <PlatformGuideModal
        isOpen={isGuideOpen}
        onClose={() => setIsGuideOpen(false)}
      />

      {/* User Signup & Login Auth Modal */}
      <AuthModal
        isOpen={isAuthOpen}
        onClose={() => setIsAuthOpen(false)}
        onSuccess={() => navigate("/configure")}
        defaultMode={authMode}
      />
    </div>
  );
}

function ProtectedRoute({
  children,
  onOpenAuth,
}: {
  children: React.ReactNode;
  onOpenAuth: (mode?: "login" | "signup") => void;
}) {
  const { user, isLoading } = useAuth();

  useEffect(() => {
    if (!isLoading && !user) {
      onOpenAuth("signup");
    }
  }, [user, isLoading, onOpenAuth]);

  if (isLoading) return null;
  if (!user) return <Navigate to="/" replace />;
  return <>{children}</>;
}

function DashboardWrapper({
  onViewReport,
}: {
  onViewReport: (runId: string) => void;
}) {
  const { runId } = useParams<{ runId: string }>();
  return runId ? (
    <RunDashboard runId={runId} onViewReport={() => onViewReport(runId)} />
  ) : (
    <Navigate to="/configure" replace />
  );
}

function ReportWrapper() {
  const { runId } = useParams<{ runId: string }>();
  return runId ? (
    <VulnerabilityReportView runId={runId} />
  ) : (
    <Navigate to="/configure" replace />
  );
}

/* ============================================================
   Root export
   ============================================================ */
export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <Router>
          <AppContent />
        </Router>
      </AuthProvider>
    </ThemeProvider>
  );
}
