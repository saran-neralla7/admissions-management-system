"use client";

import React, { useEffect } from "react";

export type ToastType = "success" | "error" | "warning" | "info";

export interface ToastMessage {
  id: string;
  type: ToastType;
  title: string;
  description?: string;
}

interface ERPToastProps {
  toasts: ToastMessage[];
  onDismiss: (id: string) => void;
}

export const ERPToastContainer: React.FC<ERPToastProps> = ({ toasts, onDismiss }) => {
  return (
    <div className="fixed top-5 right-5 z-50 flex flex-col gap-3 max-w-sm w-full pointer-events-none">
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onDismiss={onDismiss} />
      ))}
    </div>
  );
};

const ToastItem: React.FC<{ toast: ToastMessage; onDismiss: (id: string) => void }> = ({
  toast,
  onDismiss,
}) => {
  useEffect(() => {
    const timer = setTimeout(() => onDismiss(toast.id), 4000);
    return () => clearTimeout(timer);
  }, [toast.id, onDismiss]);

  const getStyle = () => {
    switch (toast.type) {
      case "success":
        return "bg-emerald-50 border-emerald-200 text-emerald-900 icon-emerald";
      case "error":
        return "bg-red-50 border-red-200 text-red-900 icon-red";
      case "warning":
        return "bg-amber-50 border-amber-200 text-amber-900 icon-amber";
      default:
        return "bg-blue-50 border-blue-200 text-blue-900 icon-blue";
    }
  };

  return (
    <div className={`pointer-events-auto p-4 rounded-xl border shadow-lg flex items-start gap-3 transition-all animate-in slide-in-from-top-2 ${getStyle()}`}>
      <div className="flex-1">
        <h4 className="text-xs font-bold uppercase tracking-wider">{toast.title}</h4>
        {toast.description && <p className="text-xs mt-1 leading-snug opacity-90">{toast.description}</p>}
      </div>
      <button 
        onClick={() => onDismiss(toast.id)} 
        className="text-xs font-bold opacity-50 hover:opacity-100 transition-opacity"
      >
        ✕
      </button>
    </div>
  );
};
