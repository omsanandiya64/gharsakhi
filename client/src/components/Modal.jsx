import { useEffect, useRef } from 'react';
import { X } from 'lucide-react';

export function Modal({ open, onClose, title, children }) {
  const dialogRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    function handleKey(e) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', handleKey);
    dialogRef.current?.focus();
    return () => document.removeEventListener('keydown', handleKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-gs-ink/50 p-4"
      onClick={onClose}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        className="w-full max-w-md bg-white rounded-2xl p-6 outline-none max-h-[85vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          {title && <h2 className="text-lg font-display font-semibold text-gs-teal-900">{title}</h2>}
          <button
            type="button"
            onClick={onClose}
            aria-label="Close dialog"
            className="min-w-[48px] min-h-[48px] flex items-center justify-center rounded-full hover:bg-gs-teal-100 shrink-0"
          >
            <X size={20} aria-hidden="true" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
