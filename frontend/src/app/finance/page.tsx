"use client";

import React, { useState, useEffect } from "react";
import { Header } from "@/components/layout/Header";
import { Sidebar } from "@/components/layout/Sidebar";
import { fetchApi } from "@/lib/api";
import { ERPModal } from "@/components/ui/ERPModal";
import { GVPLogoSpinner } from "@/components/ui/GVPLogoSpinner";

export default function FinancePage() {
  const [currentUser, setCurrentUser] = useState<any | null>(null);
  const [feeRecords, setFeeRecords] = useState<any[]>([]);
  const [schools, setSchools] = useState<any[]>([]);
  const [selectedSchoolId, setSelectedSchoolId] = useState("");
  const [selectedProgramId, setSelectedProgramId] = useState("");
  const [remarksMap, setRemarksMap] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

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

  useEffect(() => {
    loadUserAndSchools();
  }, []);

  useEffect(() => {
    loadFees();
  }, [selectedSchoolId, selectedProgramId]);

  const loadUserAndSchools = async () => {
    try {
      const [userRes, schoolsRes] = await Promise.all([
        fetchApi("/auth/me"),
        fetchApi("/academics/schools"),
      ]);

      if (userRes.success) setCurrentUser(userRes.data);
      if (schoolsRes.success) setSchools(schoolsRes.data);
    } catch (err: any) {
      console.error("Failed to load initial data:", err);
    }
  };

  const loadFees = async () => {
    setLoading(true);
    try {
      const queryParams = new URLSearchParams();
      if (selectedSchoolId) queryParams.append("schoolId", selectedSchoolId);
      if (selectedProgramId) queryParams.append("programId", selectedProgramId);

      const queryString = queryParams.toString() ? `?${queryParams.toString()}` : "";
      const res = await fetchApi(`/fees${queryString}`);
      if (res.success) {
        setFeeRecords(res.data);
      }
    } catch (err: any) {
      console.error("Failed to load fee records:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyFee = async (feeRecordId: string, targetStatus: "VERIFIED" | "REJECTED_REUPLOAD_REQUIRED") => {
    const remarks = remarksMap[feeRecordId] || "";
    if (targetStatus === "REJECTED_REUPLOAD_REQUIRED" && !remarks.trim()) {
      setModalState({
        isOpen: true,
        title: "Officer Remarks Required",
        message: "Please enter specific remarks explaining why the payment receipt needs to be re-uploaded.",
        type: "warning",
      });
      return;
    }

    setActionLoading(true);
    try {
      const res = await fetchApi(`/fees/${feeRecordId}/verify`, {
        method: "PATCH",
        body: JSON.stringify({ status: targetStatus, remarks }),
      });

      if (res.success) {
        setModalState({
          isOpen: true,
          title: targetStatus === "VERIFIED" ? "Fee Approved" : "Re-upload Requested",
          message:
            targetStatus === "VERIFIED"
              ? "Fee receipt approved and marked Fee Cleared."
              : "Re-upload requested. Application status set to Correction Required.",
          type: "success",
        });
        loadFees();
      }
    } catch (err: any) {
      setModalState({
        isOpen: true,
        title: "Update Failed",
        message: err.message || "Failed to update fee verification status.",
        type: "danger",
      });
    } finally {
      setActionLoading(false);
    }
  };

  const selectedSchoolObj = schools.find((s) => s.id === selectedSchoolId);
  const availablePrograms = selectedSchoolId
    ? selectedSchoolObj?.programs || []
    : schools.flatMap((s) => s.programs || []);

  const userRole = currentUser?.role?.name || "CENTRAL_ACCOUNTS";
  const userEmail = currentUser?.email || "accounts@gvpihlr.edu.in";
  const isGlobalAccounts = userRole === "SUPER_ADMIN" || userRole === "CENTRAL_ACCOUNTS";

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col">
      <Header userEmail={userEmail} userRole={userRole} />
      <div className="flex-1 flex">
        <Sidebar userRole={userRole} />
        <main className="flex-1 p-8 max-w-7xl space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8 space-y-6">
            <div className="border-b border-slate-100 pb-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold text-slate-900">Central &amp; School Accounts Fee Clearance Portal</h2>
                <p className="text-xs text-slate-500 mt-1">
                  Verify student bank transaction ref numbers, amount paid, and view uploaded payment receipt scans. Request receipt re-uploads if needed.
                </p>
              </div>

              {/* SCHOOL AND PROGRAM FILTERS */}
              <div className="flex flex-wrap items-center gap-3">
                {isGlobalAccounts ? (
                  <div className="flex items-center gap-2">
                    <label className="text-xs font-bold text-slate-700 whitespace-nowrap">🏫 School:</label>
                    <select
                      value={selectedSchoolId}
                      onChange={(e) => {
                        setSelectedSchoolId(e.target.value);
                        setSelectedProgramId("");
                      }}
                      className="px-3.5 py-2 bg-white border border-slate-300 rounded-lg text-xs font-semibold text-slate-900"
                    >
                      <option value="">All Schools (Global Central Accounts)</option>
                      {schools.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name} ({s.code})
                        </option>
                      ))}
                    </select>
                  </div>
                ) : (
                  <span className="px-3 py-2 bg-slate-100 text-slate-800 font-bold text-xs rounded-lg border border-slate-300">
                    🏫 Assigned School Accounts Workspace
                  </span>
                )}

                <div className="flex items-center gap-2">
                  <label className="text-xs font-bold text-slate-700 whitespace-nowrap">🎓 Program / Dept:</label>
                  <select
                    value={selectedProgramId}
                    onChange={(e) => setSelectedProgramId(e.target.value)}
                    className="px-3.5 py-2 bg-white border border-slate-300 rounded-lg text-xs font-semibold text-slate-900"
                  >
                    <option value="">All Programs / Depts</option>
                    {availablePrograms.map((p: any) => (
                      <option key={p.id} value={p.id}>
                        {p.name} ({p.code})
                      </option>
                    ))}
                  </select>
                </div>

                <button
                  onClick={loadFees}
                  className="px-3.5 py-2 bg-slate-900 text-white text-xs font-bold rounded-lg hover:bg-slate-800 transition-colors"
                >
                  🔄 Refresh Fee Roster
                </button>
              </div>
            </div>

            {loading ? (
              <GVPLogoSpinner label="Loading Fee Roster..." />
            ) : feeRecords.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-400 border-2 border-dashed rounded-xl">
                No fee payment records submitted yet for the selected School / Program filter.
              </div>
            ) : (
              <div className="space-y-4">
                {feeRecords.map((f) => {
                  const isVerified = f.status === "VERIFIED";
                  const isReuploadReq = f.status === "REJECTED_REUPLOAD_REQUIRED";

                  return (
                    <div key={f.id} className="p-5 border rounded-2xl bg-white shadow-2xs space-y-4">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-3">
                        <div className="flex items-center gap-3">
                          <span className="px-2.5 py-1 bg-blue-50 text-blue-900 font-bold font-mono text-xs rounded-md border border-blue-200">
                            {f.studentId}
                          </span>
                          <div>
                            <h4 className="text-sm font-bold text-slate-900">{f.studentName}</h4>
                            <div className="text-xs text-slate-500">
                              {f.programName} • <span className="font-bold text-slate-700 uppercase">{f.schoolName}</span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                          <span
                            className={`px-3 py-1 text-xs font-bold rounded-full border ${
                              isVerified
                                ? "bg-emerald-50 text-emerald-900 border-emerald-300"
                                : isReuploadReq
                                ? "bg-rose-50 text-rose-900 border-rose-300"
                                : "bg-amber-50 text-amber-900 border-amber-300"
                            }`}
                          >
                            {isVerified ? "✅ Fee Cleared (Approved)" : isReuploadReq ? "⚠️ Receipt Re-upload Requested" : "⏳ Pending Verification"}
                          </span>

                          <a
                            href={`http://localhost:4000/api/v1/documents/stream/${f.receiptFilePath}`}
                            target="_blank"
                            rel="noreferrer"
                            className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-800 text-xs font-bold rounded-lg border border-blue-200 inline-flex items-center gap-1"
                          >
                            <span>👁️ View Receipt Scan</span>
                          </a>
                        </div>
                      </div>

                      {/* Transaction details grid */}
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-slate-50 p-3.5 rounded-xl text-xs">
                        <div>
                          <span className="text-slate-500 block text-[10px] uppercase font-bold">Amount Paid</span>
                          <strong className="text-slate-900 font-mono text-sm">₹{f.amountPaid}</strong>
                        </div>
                        <div>
                          <span className="text-slate-500 block text-[10px] uppercase font-bold">Bank / DD / NEFT Ref Number</span>
                          <strong className="text-blue-900 font-mono text-xs">{f.transactionRefNo}</strong>
                        </div>
                        <div>
                          <span className="text-slate-500 block text-[10px] uppercase font-bold">Submission Date</span>
                          <strong className="text-slate-700">{new Date(f.createdAt).toLocaleString()}</strong>
                        </div>
                      </div>

                      {/* Existing Officer Notes */}
                      {f.remarks && (
                        <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-900">
                          <strong>Accounts Note:</strong> {f.remarks}
                        </div>
                      )}

                      {/* Action & Remarks Bar */}
                      <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
                        <input
                          type="text"
                          placeholder="Enter remarks for receipt verification or re-upload request..."
                          value={remarksMap[f.id] || ""}
                          onChange={(e) => setRemarksMap((prev) => ({ ...prev, [f.id]: e.target.value }))}
                          className="flex-1 px-3 py-2 border rounded-xl text-xs bg-slate-50"
                        />

                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleVerifyFee(f.id, "VERIFIED")}
                            disabled={actionLoading}
                            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-xs transition-colors whitespace-nowrap"
                          >
                            ✓ Approve Fee Receipt
                          </button>
                          <button
                            onClick={() => handleVerifyFee(f.id, "REJECTED_REUPLOAD_REQUIRED")}
                            disabled={actionLoading}
                            className="px-4 py-2 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-xs transition-colors whitespace-nowrap"
                          >
                            ⚠️ Request Receipt Re-upload
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </main>
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
