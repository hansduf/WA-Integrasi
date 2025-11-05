"use client";

import React, { createContext, useContext, useState } from 'react';

type Toast = { id: string; message: string; type?: 'info'|'success'|'error' };

const ToastContext = createContext<{ push: (t: Toast) => void } | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  function push(t: Toast) {
    setToasts((s) => [...s, t]);
    setTimeout(() => {
      setToasts((s) => s.filter((x) => x.id !== t.id));
    }, 4000);
  }

  return (
    <ToastContext.Provider value={{ push }}>
      {children}
      <div className="fixed right-4 bottom-4 flex flex-col gap-2 z-50">
        {toasts.map((t) => (
          <div key={t.id} className={`px-3 py-2 rounded shadow text-sm ${t.type === 'error' ? 'bg-red-500 text-white' : t.type === 'success' ? 'bg-green-500 text-white' : 'bg-gray-800 text-white'}`}>
            {t.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}
