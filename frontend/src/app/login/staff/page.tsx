"use client";

import React, { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { fetchApi } from "@/lib/api";
import { ERPModal } from "@/components/ui/ERPModal";
import { GVPLogoSpinner } from "@/components/ui/GVPLogoSpinner";

export default function StaffLoginPage() {
  const router = useRouter();
  const [userIdInput, setUserIdInput] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

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

  const handleStaffLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const inputClean = userIdInput.trim().toUpperCase();

    // Check frontend student input rejection (e.g., Student IDs like GVPCSE2026-001)
    if (inputClean.startsWith("GVP") && inputClean.includes("-")) {
      setModalState({
        isOpen: true,
        title: "⛔ Access Denied: Student Account Detected",
        message: "Student accounts are not permitted to sign in through the Staff & Officer Portal. Please use the Student Portal Login page.",
        type: "danger",
      });
      return;
    }

    if (!userIdInput || !password) {
      setModalState({
        isOpen: true,
        title: "Missing Information",
        message: "Please enter your Staff User ID and Password.",
        type: "warning",
      });
      return;
    }

    setLoading(true);
    try {
      const res = await fetchApi("/auth/login", {
        method: "POST",
        body: JSON.stringify({ email: userIdInput, password }),
      });

      if (res.success) {
        const user = res.data;

        // Role isolation enforcement: reject STUDENTS on Staff page
        if (user.role === "STUDENT") {
          // Immediately log out session if wrong portal used
          await fetchApi("/auth/logout", { method: "POST" });
          setModalState({
            isOpen: true,
            title: "⛔ Access Denied: Student Account",
            message: "Student accounts are strictly prohibited from logging in through the Staff & Officer Portal. Please use the Student Portal Login page.",
            type: "danger",
          });
          return;
        }

        if (user.mustChangePassword) {
          router.push("/change-password");
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
        title: "Staff Authentication Error",
        message: err.message || "Invalid Staff User ID or Password.",
        type: "danger",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-2xl border border-slate-200 shadow-xl overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
          <Link
            href="/login"
            className="text-xs font-bold text-slate-600 hover:text-slate-900 flex items-center gap-1 transition-colors"
          >
            <span>←</span>
            <span>Back to Portal Select</span>
          </Link>
          <span className="px-2.5 py-1 bg-slate-100 text-slate-900 font-bold text-[10px] uppercase rounded-full border border-slate-300">
            Staff &amp; Officer Entrance
          </span>
        </div>

        <div className="p-8 text-center border-b border-slate-100">
          <div className="flex justify-center mb-3">
            <Image
              src="/gvp-logo.png"
              alt="GVP Logo"
              width={64}
              height={64}
              className="object-contain"
              priority
            />
          </div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">
            Staff &amp; Officer Sign In
          </h2>
          <p className="text-xs text-slate-500 mt-1 font-semibold">
            Gayatri Vidya Parishad Admissions ERP
          </p>
        </div>

        {loading ? (
          <div className="p-12">
            <GVPLogoSpinner label="Authenticating Staff Credentials..." />
          </div>
        ) : (
          <form onSubmit={handleStaffLogin} className="p-8 space-y-5">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                Staff User ID
              </label>
              <input
                type="text"
                value={userIdInput}
                onChange={(e) => setUserIdInput(e.target.value)}
                placeholder="admin, office, or accounts"
                className="w-full px-3.5 py-3 bg-white border border-slate-300 rounded-xl text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent transition-all font-mono shadow-2xs"
                required
              />
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
              className="w-full py-3.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs uppercase tracking-widest rounded-xl shadow-md hover:shadow-lg transition-all disabled:opacity-50 cursor-pointer"
            >
              Sign In to Staff Portal →
            </button>

            <div className="text-center pt-2">
              <Link href="/login/student" className="text-[11px] font-bold text-slate-500 hover:text-slate-800 hover:underline">
                Are you a Student? Click here for Student Login →
              </Link>
            </div>
          </form>
        )}

        <div className="px-8 py-4 bg-slate-50 border-t border-slate-100 text-center">
          <p className="text-[11px] text-slate-400 font-medium">
            Gayatri Vidya Parishad &bull; Staff Administration
          </p>
        </div>
      </div>

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
