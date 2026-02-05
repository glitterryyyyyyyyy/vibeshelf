import React, { useEffect } from 'react';

export default function ConfirmDialog({ open, title = 'Are you sure?', description, onConfirm, onCancel, confirmLabel = 'Confirm', cancelLabel = 'Cancel' }) {
  useEffect(() => {
    function onKey(e) {
      if (e.key === 'Escape') onCancel?.();
    }
    if (open) window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onCancel]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4 py-8">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-gradient-to-br from-pink-50/60 via-rose-50/40 to-white/30 backdrop-blur-sm"
        aria-hidden="true"
        onClick={onCancel}
      />

      {/* Dialog */}
      <div className="relative z-10 max-w-md w-full bg-white/80 dark:bg-gray-900/70 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/40 dark:border-white/10 overflow-hidden">
        <div className="p-6">
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0 mt-1">
              <div className="w-12 h-12 rounded-full bg-pink-100/80 flex items-center justify-center ring-1 ring-pink-200/40">
                {/* Cute warning icon */}
                <svg className="w-6 h-6 text-pink-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.68-1.36 3.444 0l6 10.667A1.5 1.5 0 0116.444 16H3.556a1.5 1.5 0 01-1.257-2.234l6-10.667zM11 13a1 1 0 10-2 0 1 1 0 002 0zm-1-6a.75.75 0 00-.75.75v3.5a.75.75 0 001.5 0v-3.5A.75.75 0 0010 7z" clipRule="evenodd" />
                </svg>
              </div>
            </div>

            <div className="flex-1">
              <h3 className="text-lg font-semibold text-rose-700 dark:text-rose-300">{title}</h3>
              {description ? (
                <p className="mt-2 text-sm text-rose-700/80 dark:text-rose-200/60">{description}</p>
              ) : (
                <p className="mt-2 text-sm text-rose-700/80 dark:text-rose-200/60">You will be signed out and returned to the login screen.</p>
              )}

              <div className="mt-5 flex justify-end gap-3">
                <button
                  onClick={onCancel}
                  className="px-4 py-2 rounded-lg bg-white/60 dark:bg-gray-800/60 border border-white/30 text-rose-700 hover:bg-white/70 transition shadow-sm"
                >
                  {cancelLabel}
                </button>

                <button
                  onClick={() => onConfirm?.()}
                  className="px-5 py-2 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-semibold shadow-lg transform active:scale-[0.99] transition-all"
                >
                  {confirmLabel}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
