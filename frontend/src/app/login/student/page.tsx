"use client";

import React, { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { fetchApi } from "@/lib/api";
import { ERPModal } from "@/components/ui/ERPModal";
import { GVPLogoSpinner } from "@/components/ui/GVPLogoSpinner";

export default function StudentLoginPage() {
  const router = useRouter();
  const [studentIdInput, setStudentIdInput] = useState("");
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

  const handleStudentLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const inputClean = studentIdInput.trim().toLowerCase();

    // Check frontend staff input rejection
    if (["admin", "office", "accounts", "account", "schooladmin"].includes(inputClean)) {
      setModalState({
        isOpen: true,
        title: "⛔ Access Denied: Staff Account Detected",
        message: "Staff and Officer accounts are not permitted to sign in through the Student Portal. Please use the Staff & Officer Login page.",
        type: "danger",
      });
      return;
    }

    if (!studentIdInput || !password) {
      setModalState({
        isOpen: true,
        title: "Missing Information",
        message: "Please enter your Student Login ID and Password.",
        type: "warning",
      });
      return;
    }

    setLoading(true);
    try {
      const res = await fetchApi("/auth/login", {
        method: "POST",
        body: JSON.stringify({ email: studentIdInput, password }),
      });

      if (res.success) {
        const user = res.data;

        // Role isolation enforcement: verify user is a STUDENT
        if (user.role !== "STUDENT") {
          // Immediately log out session if wrong portal used
          await fetchApi("/auth/logout", { method: "POST" });
          setModalState({
            isOpen: true,
            title: "⛔ Access Denied: Staff Account",
            message: "This login page is strictly reserved for Students. Staff and Officer accounts must sign in using the Staff & Officer Login page.",
            type: "danger",
          });
          return;
        }

        if (user.mustChangePassword) {
          router.push("/change-password");
        } else {
          router.push("/student/application");
        }
      }
    } catch (err: any) {
      setModalState({
        isOpen: true,
        title: "Student Authentication Error",
        message: err.message || "Invalid Student Login ID or Password.",
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
          <span className="px-2.5 py-1 bg-blue-50 text-blue-900 font-bold text-[10px] uppercase rounded-full border border-blue-200">
            Student Entrance
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
            Student Portal Sign In
          </h2>
          <p className="text-xs text-slate-500 mt-1 font-semibold">
            Gayatri Vidya Parishad Admissions
          </p>
        </div>

        {loading ? (
          <div className="p-12">
            <GVPLogoSpinner label="Authenticating Student Credentials..." />
          </div>
        ) : (
          <form onSubmit={handleStudentLogin} className="p-8 space-y-5">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                Student Login ID
              </label>
              <input
                type="text"
                value={studentIdInput}
                onChange={(e) => setStudentIdInput(e.target.value)}
                placeholder="e.g. GVPCSE2026-001"
                className="w-full px-3.5 py-3 bg-white border border-slate-300 rounded-xl text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all font-mono shadow-2xs"
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
                className="w-full px-3.5 py-3 bg-white border border-slate-300 rounded-xl text-sm font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all shadow-2xs"
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs uppercase tracking-widest rounded-xl shadow-md hover:shadow-lg transition-all disabled:opacity-50 cursor-pointer"
            >
              Sign In to Student Portal →
            </button>

            <div className="text-center pt-2">
              <Link href="/login/staff" className="text-[11px] font-bold text-slate-500 hover:text-slate-800 hover:underline">
                Are you a Staff / Officer? Click here for Staff Login →
              </Link>
            </div>
          </form>
        )}

        <div className="px-8 py-4 bg-slate-50 border-t border-slate-100 text-center">
          <p className="text-[11px] text-slate-400 font-medium">
            Gayatri Vidya Parishad &bull; Student Portal
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
