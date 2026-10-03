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
            {!isCollapsed && <span className="sidebar-collapse-text">Collapse Menu</span>}
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
          {/* Theme Toggle */}
          <div className="sidebar-theme-row">
            {!isCollapsed && <span>{theme === "dark" ? "Dark Mode" : "Light Mode"}</span>}
            <button
              className="sidebar-toggle-btn"
              onClick={toggleTheme}
              title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
              data-tooltip={theme === "dark" ? "Light Mode" : "Dark Mode"}
            >
              {theme === "dark" ? (
                <Sun size={15} strokeWidth={1.8} />
              ) : (
                <Moon size={15} strokeWidth={1.8} />
              )}
            </button>
          </div>

          {/* User Profile / Logout */}
          {user && (
            <div
              className="sidebar-user cursor-pointer hover:border-border-strong transition-all"
              onClick={onOpenLogoutConfirm}
              title="Click to view session details & sign out"
              data-tooltip={`Account Details & Sign Out (${user.full_name || user.email})`}
            >
              <div className="sidebar-user-avatar">
                {user.full_name
                  ? user.full_name.charAt(0).toUpperCase()
                  : user.email.charAt(0).toUpperCase()}
              </div>
              {!isCollapsed && (
                <div className="sidebar-user-info">
                  <div className="sidebar-user-name">
                    {user.full_name ? user.full_name : user.email}
                  </div>
                  <div className="sidebar-user-role text-accent">Sign Out...</div>
                </div>
              )}
              {!isCollapsed && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onOpenLogoutConfirm();
                  }}
                  className="sidebar-action-icon-btn"
                  title="Sign Out"
                >
                  <LogOut size={15} strokeWidth={1.8} />
                </button>
              )}
            </div>
          )}
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
}

function PageHeader({
  isLanding,
  activeTab,
  onOpenMobileMenu,
  onOpenAuth,
}: PageHeaderProps) {
  const { user } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();

  const titleMap: Record<string, string> = {
    configure: "Target Configuration",
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
          <div className="flex items-center gap-2.5">
            <div className="page-header-module">
              {activeTab === "configure" && <Settings2 size={14} className="text-accent" />}
              {activeTab === "dashboard" && <Activity size={14} className="text-accent" />}
              {activeTab === "report" && <FileWarning size={14} className="text-accent" />}
              {activeTab === "history" && <History size={14} className="text-accent" />}
              <span>{titleMap[activeTab] || "Security Console"}</span>
              <span className="page-header-badge">Active Engine</span>
            </div>
          </div>
        )}
      </div>

      <div className="page-header-right">
        {!isLanding && user && (
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-2 px-2.5 py-1 rounded-full bg-surface border border-border text-xs text-muted">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>Target Engine Ready</span>
            </div>
            {activeTab !== "configure" && (
              <button
                className="btn btn-primary btn-sm flex items-center gap-1.5"
                onClick={() => navigate("/configure")}
                title="Start a new adversarial scan"
              >
                <Plus size={14} />
                <span>New Scan</span>
              </button>
            )}
          </div>
        )}

        {isLanding && !user && (
          <button
            className="btn btn-primary btn-sm flex items-center gap-1.5"
            onClick={() => onOpenAuth("login")}
          >
            <LogIn size={13} />
            <span>Sign In</span>
          </button>
        )}

        {isLanding && (
          <button
            className="sidebar-toggle-btn"
            onClick={toggleTheme}
            title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
          >
            {theme === "dark" ? <Sun size={15} /> : <Moon size={15} />}
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
