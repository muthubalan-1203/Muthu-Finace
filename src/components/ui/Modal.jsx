import { X } from 'lucide-react';

export default function Modal({ isOpen, onClose, title, children, maxWidth = 'max-w-lg' }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in">
      <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div
        className={`relative w-full ${maxWidth} bg-white dark:bg-ink-700 rounded-2xl shadow-xl animate-pop-in max-h-[90vh] flex flex-col`}
      >
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-ink-50 dark:border-ink-600">
          <h2 className="font-display font-semibold text-lg text-ink dark:text-cream-50">{title}</h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-cream-300 dark:hover:bg-ink-600 transition-colors"
            aria-label="Close"
          >
            <X className="w-4 h-4 text-ink-400" />
          </button>
        </div>
        <div className="p-4 sm:p-5 overflow-y-auto scrollbar-thin">{children}</div>
      </div>
    </div>
  );
}

export function ConfirmModal({ isOpen, onClose, onConfirm, title, message, confirmText = 'Delete', danger = true }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in">
      <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-sm bg-white dark:bg-ink-700 rounded-2xl shadow-xl animate-pop-in">
        <div className="p-5">
          <h3 className="font-display font-semibold text-lg text-ink dark:text-cream-50 mb-2">{title}</h3>
          <p className="text-sm text-ink-300 dark:text-ink-200 mb-5">{message}</p>
          <div className="flex gap-3 justify-end">
            <button onClick={onClose} className="btn-secondary text-sm px-4 py-2">
              Cancel
            </button>
            <button
              onClick={() => {
                onConfirm();
                onClose();
              }}
              className={danger ? 'btn-danger text-sm px-4 py-2' : 'btn-primary text-sm px-4 py-2'}
            >
              {confirmText}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
