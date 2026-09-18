import React from 'react';
import { useNotificationStore } from '../store/notificationStore';
import { CheckCircle2, AlertCircle, Info, AlertTriangle, X } from 'lucide-react';

export const NotificationToastContainer: React.FC = () => {
  const { notifications, dismiss } = useNotificationStore();

  if (notifications.length === 0) return null;

  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2.5 max-w-sm w-full pointer-events-none">
      {notifications.map((n) => {
        const icons = {
          success: <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0" />,
          error: <AlertCircle className="h-5 w-5 text-rose-400 shrink-0" />,
          warning: <AlertTriangle className="h-5 w-5 text-amber-400 shrink-0" />,
          info: <Info className="h-5 w-5 text-sky-400 shrink-0" />,
        };

        const borders = {
          success: 'border-emerald-500/30 bg-surface-900/95 text-slate-100',
          error: 'border-rose-500/30 bg-surface-900/95 text-slate-100',
          warning: 'border-amber-500/30 bg-surface-900/95 text-slate-100',
          info: 'border-sky-500/30 bg-surface-900/95 text-slate-100',
        };

        return (
          <div
            key={n.id}
            className={`pointer-events-auto flex items-center justify-between gap-3 rounded-xl border p-4 shadow-xl backdrop-blur-md transition-all duration-200 animate-in fade-in slide-in-from-bottom-2 ${borders[n.type]}`}
          >
            <div className="flex items-center gap-3">
              {icons[n.type]}
              <span className="text-sm font-medium">{n.message}</span>
            </div>
            <button
              onClick={() => dismiss(n.id)}
              className="text-slate-400 hover:text-slate-200 rounded-lg p-1 transition-colors"
              aria-label="Dismiss"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
};
