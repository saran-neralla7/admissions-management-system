"use client";

import React, { useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { fetchApi } from "@/lib/api";
import { ERPModal } from "@/components/ui/ERPModal";

export default function LoginPage() {
  const router = useRouter();
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
        message: "Please enter your Email Address or Student ID and password to continue.",
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
        message: err.message || "Invalid credentials provided.",
        type: "danger",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-2xl border border-slate-200 shadow-xl overflow-hidden">
        <div className="p-8 text-center border-b border-slate-100 bg-slate-50/50">
          <div className="flex justify-center mb-4">
            <Image
              src="/gvp-logo.png"
              alt="GVPIHLR Logo"
              width={72}
              height={72}
              className="object-contain"
              priority
            />
          </div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">
            GVPIHLR Admissions Portal
          </h2>
          <p className="text-xs text-slate-500 mt-1 font-medium">
            Gayatri Vidya Parishad Institution of Higher Learning
          </p>
        </div>

        <form onSubmit={handleLogin} className="p-8 space-y-5">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
              Email Address / Student Login ID
            </label>
            <input
              type="text"
              value={loginInput}
              onChange={(e) => setLoginInput(e.target.value)}
              placeholder="e.g. GVPCSE2026-001 or email@domain.com"
              className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent transition-all font-mono"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••••••"
              className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent transition-all"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs uppercase tracking-wider rounded-lg shadow-md hover:shadow-lg transition-all disabled:opacity-50"
          >
            {loading ? "Authenticating..." : "Sign In to Portal"}
          </button>
        </form>

        <div className="px-8 py-4 bg-slate-50 border-t border-slate-100 text-center">
          <p className="text-[11px] text-slate-400">
            Enterprise Admissions Management System &bull; Secure Access Only
          </p>
        </div>
      </div>

      {/* Custom Modal Interceptor */}
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
