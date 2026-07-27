import { createContext, useCallback, useContext, useState } from 'react';
import { CheckCircle2, XCircle, Info, X } from 'lucide-react';

const ToastContext = createContext(null);

const ICONS = { success: CheckCircle2, error: XCircle, info: Info };
const COLORS = {
  success: 'bg-gs-online text-white',
  error: 'bg-gs-danger text-white',
  info: 'bg-gs-teal-900 text-white',
};

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const dismiss = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback(
    (message, type = 'info') => {
      const id = Date.now() + Math.random();
      setToasts((prev) => [...prev, { id, message, type }]);
      setTimeout(() => dismiss(id), 4000);
    },
    [dismiss]
  );

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div
        className="fixed bottom-20 md:bottom-6 left-1/2 -translate-x-1/2 z-[100] flex flex-col gap-2 w-[calc(100%-2rem)] max-w-sm"
        role="region"
        aria-live="polite"
      >
        {toasts.map((toast) => {
          const Icon = ICONS[toast.type] ?? Info;
          return (
            <div
              key={toast.id}
              className={`flex items-center gap-2 rounded-xl px-4 py-3 shadow-lg ${COLORS[toast.type] ?? COLORS.info}`}
            >
              <Icon size={20} aria-hidden="true" />
              <span className="text-sm font-medium flex-1">{toast.message}</span>
              <button
                type="button"
                onClick={() => dismiss(toast.id)}
                aria-label="Dismiss notification"
                className="min-w-[32px] min-h-[32px] flex items-center justify-center shrink-0"
              >
                <X size={16} aria-hidden="true" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}
