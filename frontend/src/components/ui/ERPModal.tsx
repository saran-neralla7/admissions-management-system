"use client";

import React, { useEffect } from "react";

export type ModalType = "info" | "success" | "warning" | "danger" | "confirm" | "error";

export interface ERPModalProps {
  isOpen: boolean;
  title: string;
  message?: string;
  type?: ModalType;
  confirmText?: string;
  cancelText?: string;
  onConfirm?: () => void;
  onCancel?: () => void;
  children?: React.ReactNode;
}

export const ERPModal: React.FC<ERPModalProps> = ({
  isOpen,
  title,
  message,
  type = "info",
  confirmText = "Confirm",
  cancelText = "Cancel",
  onConfirm,
  onCancel,
  children,
}) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen && onCancel) {
        onCancel();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onCancel]);

  if (!isOpen) return null;

  const getTypeStyles = () => {
    switch (type) {
      case "danger":
      case "error":
        return {
          iconBg: "bg-red-100 text-red-600",
          btnBg: "bg-red-600 hover:bg-red-700 text-white",
          icon: "⚠️",
        };
      case "warning":
        return {
          iconBg: "bg-amber-100 text-amber-600",
          btnBg: "bg-amber-600 hover:bg-amber-700 text-white",
          icon: "⚡",
        };
      case "success":
        return {
          iconBg: "bg-emerald-100 text-emerald-600",
          btnBg: "bg-emerald-600 hover:bg-emerald-700 text-white",
          icon: "✓",
        };
      default:
        return {
          iconBg: "bg-blue-100 text-blue-600",
          btnBg: "bg-slate-900 hover:bg-slate-800 text-white",
          icon: "ℹ️",
        };
    }
  };

  const style = getTypeStyles();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm transition-opacity">
      <div 
        className="w-full max-w-md bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden transform transition-all animate-in fade-in zoom-in-95 duration-200"
        role="dialog"
        aria-modal="true"
      >
        <div className="p-6">
          <div className="flex items-start gap-4">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg shrink-0 ${style.iconBg}`}>
              {style.icon}
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-bold text-slate-900 leading-6">{title}</h3>
              {message && <p className="mt-2 text-sm text-slate-600 leading-relaxed">{message}</p>}
              {children && <div className="mt-4">{children}</div>}
            </div>
          </div>
        </div>

        <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-100 flex justify-end gap-3">
          {onCancel && (
            <button
              onClick={onCancel}
              className="px-4 py-2 text-xs font-semibold text-slate-700 hover:text-slate-900 hover:bg-slate-200/60 rounded-lg transition-colors"
            >
              {cancelText}
            </button>
          )}
          {onConfirm && (
            <button
              onClick={onConfirm}
              className={`px-4 py-2 text-xs font-semibold rounded-lg shadow-sm transition-colors ${style.btnBg}`}
            >
              {confirmText}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
