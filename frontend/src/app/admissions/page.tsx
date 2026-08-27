"use client";

import React, { useState, useEffect } from "react";
import { Header } from "@/components/layout/Header";
import { Sidebar } from "@/components/layout/Sidebar";
import { fetchApi } from "@/lib/api";
import { ERPStatusChip } from "@/components/ui/ERPStatusChip";
import { ERPModal } from "@/components/ui/ERPModal";
import { GVPLogoSpinner } from "@/components/ui/GVPLogoSpinner";

export default function AdmissionsPendingPage() {
  const [currentUser, setCurrentUser] = useState<any | null>(null);
  const [schools, setSchools] = useState<any[]>([]);
  const [selectedSchoolId, setSelectedSchoolId] = useState("");
  const [selectedProgramId, setSelectedProgramId] = useState("");
  const [readyStudents, setReadyStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [reverifyRemarks, setReverifyRemarks] = useState<Record<string, string>>({});

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
    loadReadyStudents();
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

  const loadReadyStudents = async () => {
    setLoading(true);
    try {
      const queryParams = new URLSearchParams();
      queryParams.append("status", "READY_FOR_ADMISSION");
      if (selectedSchoolId) queryParams.append("schoolId", selectedSchoolId);
      if (selectedProgramId) queryParams.append("programId", selectedProgramId);

      const res = await fetchApi(`/students?${queryParams.toString()}`);
      if (res.success) {
        setReadyStudents(res.data);
      }
    } catch (err: any) {
      console.error("Failed to load ready students:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleGrantAdmission = async (studentDbId: string, studentName: string) => {
    setActionLoading(true);
    try {
      const res = await fetchApi(`/students/${studentDbId}/admit`, {
        method: "POST",
        body: JSON.stringify({ remarks: "Official admission granted by Admissions Coordinator." }),
      });

      if (res.success) {
        setModalState({
          isOpen: true,
          title: "🎉 Final Admission Granted",
          message: `Admission officially confirmed for ${studentName}! Confirmation email sent to student.`,
          type: "success",
        });
        loadReadyStudents();
      }
    } catch (err: any) {
      setModalState({
        isOpen: true,
        title: "Admission Grant Failed",
        message: err.message || "Failed to grant final admission.",
        type: "danger",
      });
    } finally {
      setActionLoading(false);
    }
  };

  const handleRequestReverification = async (studentDbId: string, targetDept: "OFFICE" | "ACCOUNTS") => {
    const remarks = reverifyRemarks[studentDbId] || "";
    if (!remarks.trim()) {
      setModalState({
        isOpen: true,
        title: "Re-verification Remarks Required",
        message: "Please enter specific remarks explaining what needs to be re-verified by " + targetDept + ".",
        type: "warning",
      });
      return;
    }

    setActionLoading(true);
    try {
      const res = await fetchApi(`/students/${studentDbId}/request-reverification`, {
        method: "POST",
        body: JSON.stringify({ targetDepartment: targetDept, remarks }),
      });

      if (res.success) {
        setModalState({
          isOpen: true,
          title: "Re-verification Requested",
          message: `Request sent to ${targetDept}. Application status updated.`,
          type: "info",
        });
        loadReadyStudents();
      }
    } catch (err: any) {
      setModalState({
        isOpen: true,
        title: "Request Failed",
        message: err.message || "Failed to submit re-verification request.",
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

  const userRole = currentUser?.role?.name || "CENTRAL_ADMISSIONS";
  const userEmail = currentUser?.email || "admissions@gvpihlr.edu.in";
  const isGlobalAdmissions = userRole === "SUPER_ADMIN" || userRole === "CENTRAL_ADMISSIONS";

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
                  <span className="px-2.5 py-0.5 bg-blue-50 text-blue-900 font-bold text-[10px] rounded border border-blue-200">
                    ADMISSIONS OFFICER WORKSPACE
                  </span>
                  <h2 className="text-xl font-bold text-slate-900">Pending Final Admission Clearance</h2>
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  Audit applications with verified documents and fee clearance. Click Grant Final Admission to lock seat and dispatch confirmation email.
                </p>
              </div>

              {/* SCHOOL AND PROGRAM FILTERS */}
              <div className="flex flex-wrap items-center gap-3">
                {isGlobalAdmissions ? (
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
                      <option value="">All Schools (Central Admissions)</option>
                      {schools.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name} ({s.code})
                        </option>
                      ))}
                    </select>
                  </div>
                ) : (
                  <span className="px-3 py-2 bg-slate-100 text-slate-800 font-bold text-xs rounded-lg border border-slate-300">
                    🏫 Assigned School Admissions Workspace
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
                  onClick={loadReadyStudents}
                  className="px-3.5 py-2 bg-slate-900 text-white text-xs font-bold rounded-lg hover:bg-slate-800 transition-colors"
                >
                  🔄 Refresh Roster
                </button>
              </div>
            </div>

            {loading ? (
              <GVPLogoSpinner label="Loading Applications Ready for Final Admission..." />
            ) : readyStudents.length === 0 ? (
              <div className="p-12 text-center text-xs text-slate-500 border-2 border-dashed rounded-2xl space-y-3 bg-slate-50/50">
                <div className="text-3xl">🎓</div>
                <h4 className="text-sm font-bold text-slate-800">No Pending Applications Ready for Final Admission Grant</h4>
                <p className="text-slate-500">
                  Applications will appear here once document verification is completed by Office and fee receipts are cleared by Accounts.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {readyStudents.map((s) => (
                  <div key={s.id} className="p-5 border border-slate-200 rounded-2xl bg-white shadow-2xs space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-3">
                      <div className="flex items-center gap-3">
                        <span className="px-2.5 py-1 bg-blue-50 text-blue-900 font-bold font-mono text-xs rounded-md border border-blue-200">
                          {s.studentId}
                        </span>
                        <div>
                          <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                            <span>{s.fullName}</span>
                            <span className="text-[10px] px-2 py-0.5 bg-slate-100 text-slate-700 font-bold rounded uppercase">
                              {s.gender || "MALE"}
                            </span>
                          </h4>
                          <div className="text-xs text-slate-500">
                            {s.programName} • <span className="font-bold text-slate-700 uppercase">{s.schoolName}</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <ERPStatusChip status={s.applicationStatus} />
                      </div>
                    </div>

                    {/* Verification & Fee Clearance Checklist */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-50 p-3.5 rounded-xl text-xs">
                      <div className="flex items-center gap-2">
                        <span className="text-emerald-600 font-bold text-sm">✅</span>
                        <div>
                          <span className="text-slate-500 block text-[10px] uppercase font-bold">Document Verification</span>
                          <strong className="text-emerald-800">Verified by Verification Office</strong>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="text-emerald-600 font-bold text-sm">✅</span>
                        <div>
                          <span className="text-slate-500 block text-[10px] uppercase font-bold">Fee Clearance</span>
                          <strong className="text-emerald-800">Fee Payment Cleared by Central Accounts</strong>
                        </div>
                      </div>
                    </div>

                    {/* Action & Re-verify Bar */}
                    <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
                      <input
                        type="text"
                        placeholder="Enter officer notes for re-verification if required..."
                        value={reverifyRemarks[s.id] || ""}
                        onChange={(e) => setReverifyRemarks((prev) => ({ ...prev, [s.id]: e.target.value }))}
                        className="flex-1 px-3 py-2 border rounded-xl text-xs bg-slate-50"
                      />

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleGrantAdmission(s.id, s.fullName)}
                          disabled={actionLoading}
                          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-xs transition-colors whitespace-nowrap inline-flex items-center gap-1.5"
                        >
                          <span>🎓</span>
                          <span>Grant Final Admission</span>
                        </button>
                        <button
                          onClick={() => handleRequestReverification(s.id, "OFFICE")}
                          disabled={actionLoading}
                          className="px-3 py-2 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white font-bold text-xs rounded-xl transition-colors whitespace-nowrap"
                        >
                          🔄 Re-verify Office
                        </button>
                        <button
                          onClick={() => handleRequestReverification(s.id, "ACCOUNTS")}
                          disabled={actionLoading}
                          className="px-3 py-2 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl transition-colors whitespace-nowrap"
                        >
                          🔄 Re-verify Accounts
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
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
