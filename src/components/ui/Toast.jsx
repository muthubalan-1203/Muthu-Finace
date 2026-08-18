import { useApp } from '../../contexts/AppContext';
import { CheckCircle, AlertCircle, Info, X } from 'lucide-react';

const icons = {
  success: CheckCircle,
  error: AlertCircle,
  info: Info,
};

const colors = {
  success: 'bg-emerald-50 border-emerald-200 text-emerald-800 dark:bg-emerald-900/30 dark:border-emerald-800 dark:text-emerald-300',
  error: 'bg-red-50 border-red-200 text-red-800 dark:bg-red-900/30 dark:border-red-800 dark:text-red-300',
  info: 'bg-blue-50 border-blue-200 text-blue-800 dark:bg-blue-900/30 dark:border-blue-800 dark:text-blue-300',
};

export default function ToastContainer() {
  const { toasts } = useApp();

  return (
    <div className="fixed bottom-20 lg:bottom-6 right-4 z-[60] flex flex-col gap-2 max-w-sm">
      {toasts.map((toast) => {
        const Icon = icons[toast.type] || icons.success;
        return (
          <div
            key={toast.id}
            className={`flex items-center gap-2 px-4 py-3 rounded-xl border shadow-lg animate-slide-up text-sm ${colors[toast.type] || colors.success}`}
          >
            <Icon className="w-4 h-4 flex-shrink-0" />
            <span className="flex-1">{toast.message}</span>
          </div>
        );
      })}
    </div>
  );
}
