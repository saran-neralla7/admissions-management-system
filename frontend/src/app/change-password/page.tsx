"use client";

import React, { useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { fetchApi } from "@/lib/api";
import { ERPModal } from "@/components/ui/ERPModal";

export default function ChangePasswordPage() {
  const router = useRouter();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const [modalState, setModalState] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    type: "info" | "success" | "warning" | "danger" | "confirm";
  }>({
    isOpen: false,
    title: "",
    message: "",
    type: "info",
  });

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPassword || !newPassword || !confirmPassword) {
      setModalState({
        isOpen: true,
        title: "Missing Input",
        message: "Please fill in all password fields.",
        type: "warning",
      });
      return;
    }

    if (newPassword !== confirmPassword) {
      setModalState({
        isOpen: true,
        title: "Password Mismatch",
        message: "New password and confirmation password do not match.",
        type: "warning",
      });
      return;
    }

    if (newPassword.length < 8) {
      setModalState({
        isOpen: true,
        title: "Weak Password",
        message: "Password must be at least 8 characters long.",
        type: "warning",
      });
      return;
    }

    setLoading(true);
    try {
      const res = await fetchApi("/auth/change-password", {
        method: "POST",
        body: JSON.stringify({ currentPassword, newPassword }),
      });

      if (res.success) {
        setModalState({
          isOpen: true,
          title: "Password Updated Successfully!",
          message: "Your temporary password has been changed. You will now be redirected to your dashboard.",
          type: "success",
        });
        setTimeout(() => router.push("/student/application"), 1500);
      }
    } catch (err: any) {
      setModalState({
        isOpen: true,
        title: "Update Failed",
        message: err.message || "Failed to update password.",
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
            <Image src="/gvp-logo.png" alt="GVPIHLR Logo" width={64} height={64} priority />
          </div>
          <h2 className="text-xl font-bold text-slate-900">Change Temporary Password</h2>
          <p className="text-xs text-slate-500 mt-1">
            For security reasons, you must set a permanent password before continuing.
          </p>
        </div>

        <form onSubmit={handleChangePassword} className="p-8 space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase text-slate-600 mb-1">Current / Temporary Password</label>
            <input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className="w-full px-3.5 py-2 border rounded-lg text-sm"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase text-slate-600 mb-1">New Permanent Password</label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="At least 8 characters"
              className="w-full px-3.5 py-2 border rounded-lg text-sm"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase text-slate-600 mb-1">Confirm New Password</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full px-3.5 py-2 border rounded-lg text-sm"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs uppercase tracking-wider rounded-lg shadow-md transition-all disabled:opacity-50"
          >
            {loading ? "Updating..." : "Update Password & Continue"}
          </button>
        </form>
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
