"use client";

import React, { useState, useEffect } from "react";
import { Header } from "@/components/layout/Header";
import { Sidebar } from "@/components/layout/Sidebar";
import { fetchApi } from "@/lib/api";
import { GVPLogoSpinner } from "@/components/ui/GVPLogoSpinner";

export default function ApprovedFinancePage() {
  const [currentUser, setCurrentUser] = useState<any | null>(null);
  const [approvedFees, setApprovedFees] = useState<any[]>([]);
  const [schools, setSchools] = useState<any[]>([]);
  const [selectedSchoolId, setSelectedSchoolId] = useState("");
  const [selectedProgramId, setSelectedProgramId] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadUserAndSchools();
  }, []);

  useEffect(() => {
    loadApprovedFees();
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

  const loadApprovedFees = async () => {
    setLoading(true);
    try {
      const queryParams = new URLSearchParams();
      queryParams.append("status", "VERIFIED");
      if (selectedSchoolId) queryParams.append("schoolId", selectedSchoolId);
      if (selectedProgramId) queryParams.append("programId", selectedProgramId);

      const res = await fetchApi(`/fees?${queryParams.toString()}`);
      if (res.success) {
        setApprovedFees(res.data);
      }
    } catch (err: any) {
      console.error("Failed to load approved fee records:", err);
    } finally {
      setLoading(false);
    }
  };

  const selectedSchoolObj = schools.find((s) => s.id === selectedSchoolId);
  const availablePrograms = selectedSchoolId
    ? selectedSchoolObj?.programs || []
    : schools.flatMap((s) => s.programs || []);

  const userRole = currentUser?.role?.name || "CENTRAL_ACCOUNTS";
  const userEmail = currentUser?.email || "accounts@gvpihlr.edu.in";
  const isGlobalAccounts = userRole === "SUPER_ADMIN" || userRole === "CENTRAL_ACCOUNTS";

  const totalApprovedAmount = approvedFees.reduce((acc, curr) => acc + (curr.amountPaid || 0), 0);

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col">
      <Header userEmail={userEmail} userRole={userRole} />
      <div className="flex-1 flex">
        <Sidebar userRole={userRole} />
        <main className="flex-1 p-8 max-w-7xl space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8 space-y-6">
            <div className="border-b border-slate-100 pb-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 bg-emerald-50 text-emerald-900 font-bold text-[10px] rounded border border-emerald-200">
                    APPROVED ARCHIVE
                  </span>
                  <h2 className="text-xl font-bold text-slate-900">Approved Fee Receipts Archive</h2>
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  Historical repository of all verified fee payment receipts cleared by Central Accounts.
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
                      <option value="">All Schools (Global Oversight)</option>
                      {schools.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name} ({s.code})
                        </option>
                      ))}
                    </select>
                  </div>
                ) : (
                  <span className="px-3 py-2 bg-slate-100 text-slate-800 font-bold text-xs rounded-lg border border-slate-300">
                    🏫 Assigned School Accounts
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
                  onClick={loadApprovedFees}
                  className="px-3.5 py-2 bg-slate-900 text-white text-xs font-bold rounded-lg hover:bg-slate-800 transition-colors"
                >
                  🔄 Refresh Approved Archive
                </button>
              </div>
            </div>

            {/* Total Cleared Summary Bar */}
            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-2xl">✅</span>
                <div>
                  <h4 className="text-xs font-bold uppercase text-emerald-900">Total Cleared Collection</h4>
                  <p className="text-[11px] text-emerald-700">Verified bank deposits across selected filter</p>
                </div>
              </div>
              <div className="text-right">
                <span className="text-xs text-emerald-800 font-bold block">{approvedFees.length} Approved Receipts</span>
                <strong className="text-xl font-black text-emerald-950 font-mono">₹{totalApprovedAmount.toLocaleString()}</strong>
              </div>
            </div>

            {loading ? (
              <GVPLogoSpinner label="Loading Approved Fee Receipts Archive..." />
            ) : approvedFees.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-400 border-2 border-dashed rounded-xl">
                No approved fee receipts found for the selected School / Program filter.
              </div>
            ) : (
              <div className="space-y-4">
                {approvedFees.map((f) => (
                  <div key={f.id} className="p-5 border border-emerald-100 rounded-2xl bg-white shadow-2xs space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
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
                        <span className="px-3 py-1 text-xs font-bold rounded-full bg-emerald-50 text-emerald-900 border border-emerald-300">
                          ✅ Fee Cleared (Approved)
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
                        <span className="text-slate-500 block text-[10px] uppercase font-bold">Approval Date</span>
                        <strong className="text-slate-700">{new Date(f.updatedAt || f.createdAt).toLocaleString()}</strong>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
