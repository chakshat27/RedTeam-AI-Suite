import { motion, AnimatePresence } from "framer-motion";
import { LogOut, X, ShieldAlert, User, Mail, Database } from "lucide-react";
import type { User as UserType } from "../types";

interface LogoutConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirmLogout: () => void;
  user: UserType | null;
}

export default function LogoutConfirmModal({
  isOpen,
  onClose,
  onConfirmLogout,
  user,
}: LogoutConfirmModalProps) {
  if (!isOpen || !user) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          transition={{ duration: 0.2 }}
          className="auth-modal-card glass rounded-2xl w-full max-w-lg overflow-hidden border shadow-2xl relative"
        >
          {/* Header */}
          <div className="p-6 border-b border-border flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500">
                <ShieldAlert className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-text">Confirm Sign Out</h3>
                <p className="text-xs text-muted font-medium">
                  Review active session details before logging out
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-surface-hover transition text-muted"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* User Session Info Body */}
          <div className="p-6 space-y-5">
            <div className="bg-surface-hover/50 rounded-xl p-4 border border-border space-y-3">
              <div className="text-xs font-bold uppercase tracking-wider text-muted flex items-center gap-2">
                <User className="w-3.5 h-3.5 text-accent" />
                <span>Active Account Details</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm pt-1">
                <div>
                  <span className="text-xs text-muted block">Full Name</span>
                  <span className="font-semibold text-text">
                    {user.full_name || "Security Researcher"}
                  </span>
                </div>
                <div>
                  <span className="text-xs text-muted block">Email Address</span>
                  <span className="font-semibold text-text flex items-center gap-1.5 truncate">
                    <Mail className="w-3.5 h-3.5 text-muted shrink-0" />
                    {user.email}
                  </span>
                </div>
                <div>
                  <span className="text-xs text-muted block">User ID</span>
                  <span className="font-mono text-xs text-text-secondary bg-surface p-1 rounded border border-border">
                    {user.id}
                  </span>
                </div>
                <div>
                  <span className="text-xs text-muted block">Local Database Status</span>
                  <span className="text-xs text-emerald-500 font-semibold flex items-center gap-1 mt-1">
                    <Database className="w-3.5 h-3.5 shrink-0" />
                    Saved to SQLite
                  </span>
                </div>
              </div>
            </div>

            <p className="text-xs text-muted leading-relaxed">
              Signing out will end your current active session. All scan benchmarks and configuration metrics tied to your account will remain securely persisted.
            </p>

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="btn btn-secondary py-2.5 px-5 text-sm font-semibold"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  onConfirmLogout();
                  onClose();
                }}
                className="btn btn-danger py-2.5 px-5 text-sm font-semibold flex items-center gap-2"
              >
                <LogOut className="w-4 h-4" />
                <span>Yes, Sign Out</span>
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
