import { useEffect } from "react";
import { X } from "lucide-react";
import "../styles/confirm-modal.css";

/**
 * Clean in-app Confirmation Modal without icons.
 */
export function ConfirmModal({
  isOpen,
  title = "Are you sure?",
  message = "This action cannot be undone.",
  confirmLabel = "Delete",
  confirmVariant = "critical",
  onConfirm,
  onClose,
  loading = false,
}) {
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="confirm-modal-overlay" onClick={onClose}>
      <div
        className="confirm-modal-card"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <button
          type="button"
          className="confirm-modal-close-btn"
          onClick={onClose}
          aria-label="Close"
        >
          <X size={16} />
        </button>

        <div className="confirm-modal-header">
          <h3 className="confirm-modal-title">{title}</h3>
        </div>

        <p className="confirm-modal-message">{message}</p>

        <div className="confirm-modal-actions">
          <button
            type="button"
            className="btn-confirm-cancel"
            onClick={onClose}
            disabled={loading}
          >
            Cancel
          </button>
          <button
            type="button"
            className={`btn-confirm-action ${confirmVariant}`}
            onClick={onConfirm}
            disabled={loading}
          >
            {loading ? "Processing..." : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
