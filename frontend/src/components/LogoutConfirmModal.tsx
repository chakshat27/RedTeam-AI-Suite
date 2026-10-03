import { motion, AnimatePresence } from "framer-motion";
import { LogOut, X } from "lucide-react";
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
          transition={{ duration: 0.18 }}
          className="auth-modal-card glass rounded-2xl w-full max-w-sm overflow-hidden border border-border-strong shadow-2xl relative"
        >
          {/* Header */}
          <div className="p-5 border-b border-border flex items-center justify-between">
            <h3 className="text-lg font-bold text-text">Sign Out</h3>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-surface-hover transition text-muted hover:text-text"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Simple Confirmation Content */}
          <div className="p-6 space-y-5">
            <p className="text-sm text-text-secondary">
              Are you sure you want to sign out?
            </p>

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-3 pt-1">
              <button
                type="button"
                onClick={onClose}
                className="btn btn-secondary py-2 px-4 text-sm font-medium"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  onConfirmLogout();
                  onClose();
                }}
                className="btn btn-primary py-2 px-4 text-sm font-semibold flex items-center gap-1.5"
              >
                <LogOut className="w-4 h-4" />
                <span>Sign Out</span>
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
