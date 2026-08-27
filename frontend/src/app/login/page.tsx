"use client";

import React, { useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { fetchApi } from "@/lib/api";
import { ERPModal } from "@/components/ui/ERPModal";
import { GVPLogoSpinner } from "@/components/ui/GVPLogoSpinner";

export default function LoginPage() {
  const router = useRouter();
  const [showLoginForm, setShowLoginForm] = useState(false);
  const [loginInput, setLoginInput] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  // Custom Modal State
  const [modalState, setModalState] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    type: "info" | "error" | "success" | "warning" | "danger" | "confirm";
  }>({
    isOpen: false,
    title: "",
    message: "",
    type: "info",
  });

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginInput || !password) {
      setModalState({
        isOpen: true,
        title: "Missing Credentials",
        message: "Please enter your User ID / Login ID and password to continue.",
        type: "warning",
      });
      return;
    }

    setLoading(true);
    try {
      const res = await fetchApi("/auth/login", {
        method: "POST",
        body: JSON.stringify({ email: loginInput, password }),
      });

      if (res.success) {
        const user = res.data;
        if (user.mustChangePassword) {
          router.push("/change-password");
        } else if (user.role === "STUDENT") {
          router.push("/student/application");
        } else if (user.role === "VERIFICATION_OFFICER" || user.role === "OFFICE_USER" || user.role === "SCHOOL_ADMIN") {
          router.push("/verification");
        } else if (user.role === "FINANCE_OFFICER" || user.role === "CENTRAL_ACCOUNTS") {
          router.push("/finance");
        } else {
          router.push("/dashboard");
        }
      }
    } catch (err: any) {
      setModalState({
        isOpen: true,
        title: "Authentication Error",
        message: err.message || "Invalid User ID or Password provided.",
        type: "danger",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Dynamic Animated Background Glows */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-blue-600/10 rounded-full blur-3xl pointer-events-none animate-pulse" />
      <div className="absolute bottom-10 right-10 w-[350px] h-[350px] bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />

      {!showLoginForm ? (
        /* LANDING PAGE WITH ANIMATED LOGO & ENTER BUTTON */
        <div className="w-full max-w-2xl text-center space-y-8 z-10 p-8 rounded-3xl bg-slate-900/60 border border-slate-800 backdrop-blur-xl shadow-2xl transition-all duration-500 animate-in fade-in zoom-in-95">
          {/* Animated Big GVP Logo Container */}
          <div className="relative inline-block group">
            <div className="absolute -inset-4 bg-gradient-to-r from-blue-600 to-amber-500 rounded-full blur-xl opacity-40 group-hover:opacity-75 transition duration-500 animate-pulse" />
            <div className="relative w-36 h-36 md:w-44 md:h-44 mx-auto bg-slate-900 rounded-3xl border border-slate-700 p-5 shadow-2xl flex items-center justify-center transform transition duration-500 hover:scale-105">
              <Image
                src="/gvp-logo.png"
                alt="GVP Logo"
                width={150}
                height={150}
                className="object-contain drop-shadow-md animate-bounce-slow"
                priority
              />
            </div>
          </div>

          <div className="space-y-3">
            <h1 className="text-3xl md:text-5xl font-black text-white tracking-tight">
              Gayatri Vidya Parishad
            </h1>
            <p className="text-sm md:text-base font-semibold text-slate-400">
              GVP Admissions Management ERP Portal
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <span className="px-3.5 py-1.5 bg-slate-800/80 text-slate-300 font-mono font-bold text-xs rounded-full border border-slate-700">
              🛡️ Encrypted AES-256 Identity
            </span>
            <span className="px-3.5 py-1.5 bg-slate-800/80 text-slate-300 font-mono font-bold text-xs rounded-full border border-slate-700">
              🏫 Multi-School Architecture
            </span>
            <span className="px-3.5 py-1.5 bg-slate-800/80 text-slate-300 font-mono font-bold text-xs rounded-full border border-slate-700">
              ⚡ Automated Verification Workflow
            </span>
          </div>

          <div className="pt-4">
            <button
              onClick={() => setShowLoginForm(true)}
              className="px-8 py-4 bg-gradient-to-r from-slate-100 to-white hover:from-white hover:to-slate-100 text-slate-950 font-black text-sm uppercase tracking-widest rounded-2xl shadow-xl hover:shadow-blue-500/20 hover:scale-105 transition-all duration-300 inline-flex items-center gap-3 group cursor-pointer"
            >
              <span>Click Here to Login</span>
              <span className="group-hover:translate-x-1 transition-transform">→</span>
            </button>
          </div>
        </div>
      ) : (
        /* LOGIN FORM CARD WITH USER ID INPUT */
        <div className="w-full max-w-md bg-white rounded-3xl border border-slate-200 shadow-2xl overflow-hidden z-10 animate-in fade-in slide-in-from-bottom-6 transition-all duration-300">
          <div className="p-6 border-b border-slate-100 bg-slate-50/80 flex items-center justify-between">
            <button
              onClick={() => setShowLoginForm(false)}
              className="text-xs font-bold text-slate-600 hover:text-slate-900 flex items-center gap-1 transition-colors"
            >
              <span>←</span>
              <span>Back to Welcome</span>
            </button>

            <div className="flex items-center gap-2">
              <Image src="/gvp-logo.png" alt="GVP Logo" width={32} height={32} />
              <span className="font-bold text-xs text-slate-900">GVP ERP</span>
            </div>
          </div>

          <div className="p-8 text-center border-b border-slate-100">
            <h2 className="text-xl font-bold text-slate-900 tracking-tight">
              Portal Sign In
            </h2>
            <p className="text-xs text-slate-500 mt-1 font-medium">
              Gayatri Vidya Parishad Admissions ERP
            </p>
          </div>

          {loading ? (
            <div className="p-12">
              <GVPLogoSpinner label="Authenticating User Credentials..." />
            </div>
          ) : (
            <form onSubmit={handleLogin} className="p-8 space-y-5">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                  User ID / Login ID
                </label>
                <input
                  type="text"
                  value={loginInput}
                  onChange={(e) => setLoginInput(e.target.value)}
                  placeholder="admin, office, accounts, or Student ID"
                  className="w-full px-3.5 py-3 bg-white border border-slate-300 rounded-xl text-sm font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent transition-all font-mono shadow-2xs"
                  required
                />
                <p className="text-[11px] text-slate-500 mt-1 font-mono">
                  Enter your assigned User ID (e.g. <strong className="text-slate-900">admin</strong>, <strong className="text-slate-900">office</strong>, <strong className="text-slate-900">accounts</strong>, or <strong className="text-slate-900">GVPCSE2026-001</strong>).
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                  Password
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full px-3.5 py-3 bg-white border border-slate-300 rounded-xl text-sm font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent transition-all shadow-2xs"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs uppercase tracking-widest rounded-xl shadow-lg hover:shadow-xl transition-all disabled:opacity-50 cursor-pointer"
              >
                Sign In to Portal →
              </button>
            </form>
          )}

          <div className="px-8 py-4 bg-slate-50 border-t border-slate-100 text-center">
            <p className="text-[11px] text-slate-500 font-medium">
              Gayatri Vidya Parishad &bull; Admissions Management System
            </p>
          </div>
        </div>
      )}

      <ERPModal
        isOpen={modalState.isOpen}
        title={modalState.title}
        message={modalState.message}
        type={modalState.type}
        confirmText="OK"
        onConfirm={() => setModalState((prev) => ({ ...prev, isOpen: false }))}
      />
    </div>
  );
}
