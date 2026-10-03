import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Mail, ShieldCheck, Eye, EyeOff, AlertCircle, ArrowRight, User } from "lucide-react";
import { useAuth } from "../context/AuthContext";

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  defaultMode?: "login" | "signup";
}

export default function AuthModal({ isOpen, onClose, onSuccess, defaultMode = "login" }: AuthModalProps) {
  const { login, signup } = useAuth();
  const [mode, setMode] = useState<"login" | "signup">(defaultMode);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email || !password) {
      setError("Please fill in all required fields.");
      return;
    }

    if (mode === "signup" && !fullName.trim()) {
      setError("Please enter your full name.");
      return;
    }

    setIsSubmitting(true);
    try {
      if (mode === "login") {
        await login(email, password);
      } else {
        await signup(email, password, fullName);
      }
      onClose();
      onSuccess?.();
    } catch (err: any) {
      setError(err.message || "An error occurred during authentication.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const switchMode = (newMode: "login" | "signup") => {
    setMode(newMode);
    setError(null);
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 12 }}
          transition={{ duration: 0.22, ease: "easeOut" }}
          className="auth-modal-card glass rounded-2xl w-full max-w-md overflow-hidden border border-border-strong shadow-2xl relative"
        >
          {/* Top Banner / Header */}
          <div className="p-6 pb-5 border-b border-border flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-accent-subtle border border-accent/20 text-accent">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-text tracking-tight">
                  {mode === "login" ? "Welcome Back" : "Create Account"}
                </h3>
                <p className="text-xs text-muted font-medium mt-0.5">
                  {mode === "login"
                    ? "Log in to access your security workspace"
                    : "Register to start AI safety audits & red-teaming"}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-surface-hover transition text-muted hover:text-text"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Segmented Tab Switcher */}
          <div className="p-4 pb-0">
            <div className="auth-tab-container flex bg-surface-elevated p-1 rounded-xl border border-border">
              <button
                type="button"
                onClick={() => switchMode("login")}
                className={`auth-tab-btn ${mode === "login" ? "active" : "inactive"}`}
              >
                Log In
              </button>
              <button
                type="button"
                onClick={() => switchMode("signup")}
                className={`auth-tab-btn ${mode === "signup" ? "active" : "inactive"}`}
              >
                Sign Up
              </button>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/25 text-red-500 text-xs flex items-start gap-2.5"
              >
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{error}</span>
              </motion.div>
            )}

            {mode === "signup" && (
              <div className="space-y-1.5">
                <label className="field-label">Full Name</label>
                <div className="relative flex items-center">
                  <User className="w-4 h-4 absolute left-3.5 text-muted pointer-events-none" />
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="e.g. Alex Vance"
                    className="auth-input pl-10"
                  />
                </div>
              </div>
            )}

            <div className="space-y-1.5">
              <label className="field-label">Email Address</label>
              <div className="relative flex items-center">
                <Mail className="w-4 h-4 absolute left-3.5 text-muted pointer-events-none" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="researcher@example.com"
                  className="auth-input pl-10"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="field-label">Password</label>
              <div className="relative flex items-center">
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="auth-input pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 text-muted hover:text-text p-1"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3 px-4 rounded-xl btn-primary font-bold text-sm shadow-lg flex items-center justify-center gap-2 mt-6 disabled:opacity-50 transition-all"
            >
              {isSubmitting ? (
                <span>Processing...</span>
              ) : (
                <>
                  <span>{mode === "login" ? "Log In to Suite" : "Create Account"}</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>

            <div className="text-center pt-2">
              <p className="text-xs text-muted">
                {mode === "login" ? "Don't have an account?" : "Already registered?"}{" "}
                <button
                  type="button"
                  onClick={() => switchMode(mode === "login" ? "signup" : "login")}
                  className="text-accent font-semibold hover:underline"
                >
                  {mode === "login" ? "Sign Up" : "Log In"}
                </button>
              </p>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
