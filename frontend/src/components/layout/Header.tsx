"use client";

import React from "react";
import Image from "next/image";
import { fetchApi } from "@/lib/api";

interface HeaderProps {
  userEmail?: string;
  userRole?: string;
  schoolName?: string;
  onLogout?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  userEmail,
  userRole,
  schoolName,
  onLogout,
}) => {
  const handleLogout = async () => {
    if (onLogout) {
      onLogout();
      return;
    }

    try {
      await fetchApi("/auth/logout", { method: "POST" });
    } catch (e) {
      console.error("Logout error:", e);
    } finally {
      window.location.href = "/login";
    }
  };

  return (
    <header className="h-16 bg-white border-b border-slate-200 sticky top-0 z-40 px-6 flex items-center justify-between shadow-xs">
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-3">
          <Image
            src="/gvp-logo.png"
            alt="GVP Logo"
            width={40}
            height={40}
            className="object-contain"
            priority
          />
          <div>
            <h1 className="text-sm font-bold text-slate-900 tracking-tight leading-tight flex items-center gap-2">
              <span>GVP Admissions ERP</span>
            </h1>
            <p className="text-xs text-slate-500 font-medium">
              {schoolName || "Gayatri Vidya Parishad"}
            </p>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-4">
        {userEmail && (
          <div className="text-right hidden sm:block">
            <div className="text-xs font-semibold text-slate-900">{userEmail}</div>
            <span className="inline-block px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-slate-600 bg-slate-100 rounded-md border border-slate-200">
              {userRole?.replace("_", " ")}
            </span>
          </div>
        )}

        <button
          onClick={handleLogout}
          className="px-3.5 py-1.5 text-xs font-bold text-red-700 bg-red-50 hover:bg-red-100 border border-red-200 rounded-lg transition-colors flex items-center gap-1.5"
        >
          <span>🚪</span>
          <span>Sign Out</span>
        </button>
      </div>
    </header>
  );
};
