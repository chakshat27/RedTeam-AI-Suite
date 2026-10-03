import { useEffect, useState } from "react";
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
  ChevronLeft,
  ChevronRight,
  Menu,
  X,
  Plus,
  Bell,
  ChevronDown,
} from "lucide-react";
import LandingPage from "./components/LandingPage";
import TargetConfig from "./components/TargetConfig";
import RunDashboard from "./components/RunDashboard";
import VulnerabilityReportView from "./components/VulnerabilityReport";
import RunHistory from "./components/RunHistory";
import AttackHelpModal from "./components/AttackHelpModal";
import PlatformGuideModal from "./components/PlatformGuideModal";
import AuthModal from "./components/AuthModal";
import LogoutConfirmModal from "./components/LogoutConfirmModal";
import { AuthProvider, useAuth } from "./context/AuthContext";
import type { AttackCategory } from "./types";
import { ThemeProvider, useTheme } from "./context/ThemeContext";

/* ============================================================
   LEFT SIDEBAR COMPONENT
   ============================================================ */
interface SidebarProps {
  activeTab: string;
  onNavigate: (path: string) => void;
  canAccessDashboard: boolean;
  canAccessReport: boolean;
  dashRunId: string | null;
  reportRunId: string | null;
  onOpenHelp: () => void;
  onOpenGuide: () => void;
  onOpenLogoutConfirm: () => void;
  onOpenAuth: (mode?: "login" | "signup") => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  isMobileOpen: boolean;
  onCloseMobile: () => void;
}

function Sidebar({
  activeTab,
  onNavigate,
  canAccessDashboard,
  canAccessReport,
  dashRunId,
  reportRunId,
  onOpenHelp,
  onOpenGuide,
  onOpenLogoutConfirm,
  onOpenAuth,
  isCollapsed,
  onToggleCollapse,
  isMobileOpen,
  onCloseMobile,
}: SidebarProps) {
  const { theme, toggleTheme } = useTheme();
  const { user } = useAuth();
  const navigate = useNavigate();

  const handleNavClick = (path: string) => {
    onNavigate(path);
    onCloseMobile();
  };

  return (
    <>
      {/* Mobile Backdrop Overlay */}
      {isMobileOpen && (
        <div className="sidebar-overlay lg:hidden" onClick={onCloseMobile} />
      )}

      <aside
        className={`sidebar ${isCollapsed ? "collapsed" : ""} ${
          isMobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        }`}
      >
        {/* Brand Header */}
        <div className="sidebar-brand">
          <div
            className="sidebar-logo"
            onClick={() => {
              navigate("/");
              onCloseMobile();
            }}
            role="button"
            tabIndex={0}
            title="AI Red Team Suite"
            data-tooltip="AI Red Team Suite"
          >
            <div className="sidebar-logo-icon">
              <Shield size={18} strokeWidth={2.2} />
            </div>
            {!isCollapsed && <span className="sidebar-logo-text">AI Red Team</span>}
          </div>

          <button
            className="sidebar-toggle-btn lg:hidden"
            onClick={onCloseMobile}
            title="Close sidebar"
          >
            <X size={16} />
          </button>
        </div>

        {/* Collapse Button Row (one step down) */}
        <div className="sidebar-collapse-row hidden lg:flex">
          <button
            className="sidebar-collapse-action-btn"
            onClick={onToggleCollapse}
            title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            data-tooltip={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {isCollapsed ? <ChevronRight size={15} /> : <ChevronLeft size={15} />}
          </button>
        </div>

        {/* Main Nav Items */}
        <nav className="sidebar-nav">
          <button
            className={`sidebar-nav-item ${activeTab === "configure" ? "active" : ""}`}
            onClick={() => handleNavClick("/configure")}
            title="Configure Target"
            data-tooltip="Configure"
          >
            <div className="sidebar-nav-icon">
              <Settings2 size={18} strokeWidth={1.8} />
            </div>
            {!isCollapsed && <span className="sidebar-nav-label">Configure</span>}
          </button>

          <button
            className={`sidebar-nav-item ${activeTab === "dashboard" ? "active" : ""} ${
              !canAccessDashboard ? "disabled" : ""
            }`}
            onClick={() =>
              canAccessDashboard && dashRunId && handleNavClick(`/dashboard/${dashRunId}`)
            }
            title={!canAccessDashboard ? "Start a scan first" : "Run Dashboard"}
            data-tooltip="Dashboard"
          >
            <div className="sidebar-nav-icon">
              <Activity size={18} strokeWidth={1.8} />
            </div>
            {!isCollapsed && <span className="sidebar-nav-label">Dashboard</span>}
          </button>

          <button
            className={`sidebar-nav-item ${activeTab === "report" ? "active" : ""} ${
              !canAccessReport ? "disabled" : ""
            }`}
            onClick={() =>
              canAccessReport && reportRunId && handleNavClick(`/report/${reportRunId}`)
            }
            title={!canAccessReport ? "Complete a scan first" : "Vulnerability Report"}
            data-tooltip="Report"
          >
            <div className="sidebar-nav-icon">
              <FileWarning size={18} strokeWidth={1.8} />
            </div>
            {!isCollapsed && <span className="sidebar-nav-label">Report</span>}
          </button>

          <button
            className={`sidebar-nav-item ${activeTab === "history" ? "active" : ""}`}
            onClick={() => handleNavClick("/history")}
            title="Scan History"
            data-tooltip="History"
          >
            <div className="sidebar-nav-icon">
              <History size={18} strokeWidth={1.8} />
            </div>
            {!isCollapsed && <span className="sidebar-nav-label">History</span>}
          </button>

          {/* Section Divider */}
          {!isCollapsed && <div className="sidebar-section-label">Resources</div>}

          <button
            className="sidebar-nav-item"
            onClick={() => {
              onOpenGuide();
              onCloseMobile();
            }}
            title="Platform User Guide"
            data-tooltip="Guide"
          >
            <div className="sidebar-nav-icon">
              <BookOpen size={18} strokeWidth={1.8} />
            </div>
            {!isCollapsed && <span className="sidebar-nav-label">Guide</span>}
          </button>

          <button
            className="sidebar-nav-item"
            onClick={() => {
              onOpenHelp();
              onCloseMobile();
            }}
            title="Attack Knowledge Base"
            data-tooltip="Attack KB"
          >
            <div className="sidebar-nav-icon">
              <HelpCircle size={18} strokeWidth={1.8} />
            </div>
            {!isCollapsed && <span className="sidebar-nav-label">Attack KB</span>}
          </button>
        </nav>

        {/* Sidebar Footer */}
        <div className="sidebar-footer">
          <button
            className="sidebar-nav-item"
            onClick={() => {
              if (user) {
                onOpenLogoutConfirm();
              } else {
                onOpenAuth("login");
              }
            }}
            title={user ? "Sign Out" : "Log In"}
            data-tooltip={user ? "Sign Out" : "Log In"}
          >
            <div className="sidebar-nav-icon">
              <LogIn size={18} strokeWidth={1.8} />
            </div>
            {!isCollapsed && <span className="sidebar-nav-label">Login</span>}
          </button>
        </div>
      </aside>
    </>
  );
}

/* ============================================================
   SLIM PAGE HEADER COMPONENT
   ============================================================ */
interface PageHeaderProps {
  isLanding: boolean;
  activeTab: string;
  onOpenMobileMenu: () => void;
  onOpenAuth: (mode?: "login" | "signup") => void;
  onOpenLogoutConfirm: () => void;
}

function PageHeader({
  isLanding,
  activeTab,
  onOpenMobileMenu,
  onOpenAuth,
  onOpenLogoutConfirm,
}: PageHeaderProps) {
  const { user } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isNotifOpen, setIsNotifOpen] = useState(false);

  const titleMap: Record<string, string> = {
    configure: "Configure Scan",
    dashboard: "Live Attack Dashboard",
    report: "Vulnerability Assessment Report",
    history: "Scan History & Benchmarks",
  };

  return (
    <header className="page-header">
      <div className="page-header-left">
        {!isLanding && user && (
          <button
            className="mobile-menu-btn"
            onClick={onOpenMobileMenu}
            title="Open Menu"
          >
            <Menu size={18} />
          </button>
        )}

        {isLanding ? (
          <div
            className="flex items-center gap-2 cursor-pointer"
            onClick={() => navigate("/")}
          >
            <div className="sidebar-logo-icon" style={{ width: 28, height: 28 }}>
              <Shield size={15} />
            </div>
            <span className="font-bold text-sm tracking-tight">AI Red Team Suite</span>
          </div>
        ) : (
          <div className="page-header-title">
            <span>{titleMap[activeTab] || "Dashboard"}</span>
          </div>
        )}
      </div>

      <div className="page-header-right">
        {/* Theme Switch Pill (Screenshot) */}
        <button
          onClick={toggleTheme}
          className="theme-switch-pill"
          title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
          aria-label="Toggle theme"
        >
          <div className={`theme-switch-knob ${theme === "dark" ? "knob-dark" : "knob-light"}`}>
            {theme === "dark" ? (
              <Moon size={12} strokeWidth={2.2} className="text-orange-400" />
            ) : (
              <Sun size={12} strokeWidth={2.2} className="text-amber-500" />
            )}
          </div>
          <div className="theme-switch-inactive">
            {theme === "dark" ? (
              <Sun size={12} strokeWidth={1.8} />
            ) : (
              <Moon size={12} strokeWidth={1.8} />
            )}
          </div>
        </button>

        {/* Notification Bell with Badge (Screenshot) */}
        <div className="relative">
          <button
            className="navbar-icon-btn"
            onClick={() => setIsNotifOpen(!isNotifOpen)}
            title="System Notifications"
          >
            <Bell size={17} strokeWidth={1.8} />
            <span className="navbar-badge-dot" />
          </button>

          {isNotifOpen && (
            <div className="navbar-dropdown notif-dropdown">
              <div className="dropdown-header">
                <span className="font-semibold text-xs text-text">Notifications</span>
                <span className="badge safe">Engine Online</span>
              </div>
              <div className="dropdown-body text-xs text-muted">
                <div className="p-2.5 border-b border-border">
                  <span className="text-text font-medium">⚡ Threat Definitions Loaded</span>
                  <p className="text-[11px] text-muted mt-0.5">OWASP LLM 2025 standard active</p>
                </div>
                <div className="p-2.5">
                  <span className="text-text font-medium">🛡️ Scanner Engine Ready</span>
                  <p className="text-[11px] text-muted mt-0.5">Target endpoint telemetry calibrated</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Vertical Divider (Screenshot) */}
        <div className="navbar-divider" />

        {/* User Profile / Login (Screenshot) */}
        {user ? (
          <div className="relative">
            <button
              className="navbar-user-btn"
              onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
              title="Account Options"
            >
              <div className="navbar-user-avatar">
                {user.full_name
                  ? user.full_name.charAt(0).toUpperCase()
                  : user.email
                  ? user.email.charAt(0).toUpperCase()
                  : "T"}
              </div>
              <span className="navbar-user-name">
                {user.full_name || (user.email ? user.email.split("@")[0] : "Chakshat")}
              </span>
              <ChevronDown size={14} className="text-muted" />
            </button>

            {isUserMenuOpen && (
              <div className="navbar-dropdown user-dropdown">
                <div className="dropdown-user-header">
                  <div className="font-semibold text-xs text-text">
                    {user.full_name || "Chakshat"}
                  </div>
                  <div className="text-[11px] text-muted truncate">{user.email}</div>
                </div>
                <div className="dropdown-divider" />
                <button
                  className="dropdown-item text-critical"
                  onClick={() => {
                    setIsUserMenuOpen(false);
                    onOpenLogoutConfirm();
                  }}
                >
                  <LogOut size={13} />
                  <span>Sign Out</span>
                </button>
              </div>
            )}
          </div>
        ) : (
          <button
            className="btn btn-primary btn-sm flex items-center gap-1.5"
            onClick={() => onOpenAuth("login")}
          >
            <LogIn size={13} />
            <span>Sign In</span>
          </button>
        )}
      </div>
    </header>
  );
}

/* ============================================================
   APP CONTENT (ROUTER-AWARE)
   ============================================================ */
function AppContent() {
  const navigate = useNavigate();
  const location = useLocation();
  const path = location.pathname;

  const [activeRunId, setActiveRunId] = useState<string | null>(null);
  const [reportRunId, setReportRunId] = useState<string | null>(null);

  // Sidebar states
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Modal states
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const [helpCategory, setHelpCategory] = useState<AttackCategory | null>(null);
  const [isGuideOpen, setIsGuideOpen] = useState(false);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState<"login" | "signup">("login");
  const [isLogoutConfirmOpen, setIsLogoutConfirmOpen] = useState(false);

  const { user, logout } = useAuth();

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
  }, [path, activeRunId, reportRunId]);

  const currentDashRunId =
    activeRunId ?? (path.match(/^\/dashboard\/(.+)$/)?.[1] ?? null);
  const currentReportRunId =
    reportRunId ?? (path.match(/^\/report\/(.+)$/)?.[1] ?? null);

  let activeTab = "";
  if (path.startsWith("/configure")) activeTab = "configure";
  else if (path.startsWith("/dashboard")) activeTab = "dashboard";
  else if (path.startsWith("/report")) activeTab = "report";
  else if (path.startsWith("/history")) activeTab = "history";

  const isLanding = path === "/" || path === "";

  return (
    <div className={`app-shell ${isLanding || !user ? "landing-mode" : ""}`}>
      {/* Sidebar — only shown when logged in and not on landing page */}
      {!isLanding && user && (
        <Sidebar
          activeTab={activeTab}
          onNavigate={navigate}
          canAccessDashboard={!!currentDashRunId}
          canAccessReport={!!currentReportRunId}
          dashRunId={currentDashRunId}
          reportRunId={currentReportRunId}
          onOpenHelp={() => handleOpenHelp()}
          onOpenGuide={() => setIsGuideOpen(true)}
          onOpenLogoutConfirm={() => setIsLogoutConfirmOpen(true)}
          onOpenAuth={handleOpenAuth}
          isCollapsed={isSidebarCollapsed}
          onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
          isMobileOpen={isMobileMenuOpen}
          onCloseMobile={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Main Wrapper */}
      <div
        className="main-wrapper"
        style={{
          marginLeft:
            !isLanding && user
              ? isSidebarCollapsed
                ? "var(--sidebar-collapsed-width)"
                : "var(--sidebar-width)"
              : 0,
        }}
      >
        {/* Slim Page Header */}
        <PageHeader
          isLanding={isLanding}
          activeTab={activeTab}
          onOpenMobileMenu={() => setIsMobileMenuOpen(true)}
          onOpenAuth={handleOpenAuth}
          onOpenLogoutConfirm={() => setIsLogoutConfirmOpen(true)}
        />

        {/* Page Content */}
        <AnimatePresence mode="wait">
          <motion.div
            key={isLanding ? "landing" : activeTab}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
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
      </div>

      {/* Global Modals */}
      <AttackHelpModal
        isOpen={isHelpOpen}
        onClose={() => setIsHelpOpen(false)}
        initialCategory={helpCategory}
      />

      <PlatformGuideModal
        isOpen={isGuideOpen}
        onClose={() => setIsGuideOpen(false)}
      />

      <AuthModal
        isOpen={isAuthOpen}
        onClose={() => setIsAuthOpen(false)}
        onSuccess={() => navigate("/configure")}
        defaultMode={authMode}
      />

      <LogoutConfirmModal
        isOpen={isLogoutConfirmOpen}
        onClose={() => setIsLogoutConfirmOpen(false)}
        onConfirmLogout={() => {
          logout();
          navigate("/");
        }}
        user={user}
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
