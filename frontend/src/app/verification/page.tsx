"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Header } from "@/components/layout/Header";
import { Sidebar } from "@/components/layout/Sidebar";
import { fetchApi } from "@/lib/api";
import { ERPStatusChip } from "@/components/ui/ERPStatusChip";
import { ERPModal } from "@/components/ui/ERPModal";
import { GVPLogoSpinner } from "@/components/ui/GVPLogoSpinner";

export default function VerificationPage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<any | null>(null);
  const [schools, setSchools] = useState<any[]>([]);
  const [selectedSchoolId, setSelectedSchoolId] = useState("");
  const [selectedProgramId, setSelectedProgramId] = useState("");
  const [students, setStudents] = useState<any[]>([]);
  const [unmaskedAadhaarMap, setUnmaskedAadhaarMap] = useState<Record<string, string>>({});
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

  useEffect(() => {
    loadUserAndSchools();
  }, []);

  useEffect(() => {
    loadStudents();
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

  const loadStudents = async () => {
    setLoading(true);
    try {
      const queryParams = new URLSearchParams();
      if (selectedSchoolId) queryParams.append("schoolId", selectedSchoolId);
      if (selectedProgramId) queryParams.append("programId", selectedProgramId);

      const queryString = queryParams.toString() ? `?${queryParams.toString()}` : "";
      const res = await fetchApi(`/students${queryString}`);

      if (res.success) {
        setStudents(res.data);
      }
    } catch (err: any) {
      console.error("Failed to load verification roster:", err);
    } finally {
      setLoading(false);
    }
  };

  const selectedSchoolObj = schools.find((s) => s.id === selectedSchoolId);
  const availablePrograms = selectedSchoolId
    ? selectedSchoolObj?.programs || []
    : schools.flatMap((s) => s.programs || []);

  const handleUnmaskAadhaar = async (studentDbId: string) => {
    try {
      const res = await fetchApi(`/students/${studentDbId}/unmask-aadhaar`, {
        method: "POST",
      });
      if (res.success) {
        setUnmaskedAadhaarMap((prev) => ({
          ...prev,
          [studentDbId]: res.data.unmaskedAadhaar,
        }));
        setModalState({
          isOpen: true,
          title: "Aadhaar Access Audited",
          message: `Aadhaar number unmasked for Student ${res.data.studentId}. Recorded in audit log.`,
          type: "info",
        });
      }
    } catch (err: any) {
      setModalState({
        isOpen: true,
        title: "Access Denied",
        message: err.message || "Failed to unmask Aadhaar number.",
        type: "danger",
      });
    }
  };

  const handleInspectStudent = (studentDbId: string) => {
    const queryParams = new URLSearchParams();
    if (selectedSchoolId) queryParams.append("schoolId", selectedSchoolId);
    if (selectedProgramId) queryParams.append("programId", selectedProgramId);

    const queryString = queryParams.toString() ? `?${queryParams.toString()}` : "";
    router.push(`/verification/${studentDbId}${queryString}`);
  };

  const userRole = currentUser?.role?.name || "OFFICE_USER";
  const userEmail = currentUser?.email || "office@gvpihlr.edu.in";

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col">
      <Header userEmail={userEmail} userRole={userRole} />
      <div className="flex-1 flex">
        <Sidebar userRole={userRole} />
        <main className="flex-1 p-8 max-w-7xl space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8 space-y-6">
            <div className="border-b border-slate-100 pb-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold text-slate-900">Document Verification Workspace</h2>
                <p className="text-xs text-slate-500 mt-1">
                  Filter by School &amp; Program, audit uploaded certificates, check dynamic form responses, and request certificate re-uploads.
                </p>
              </div>

              {/* SCHOOL AND PROGRAM FILTERS */}
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-2">
                  <label className="text-xs font-bold text-slate-700 whitespace-nowrap">🏫 School:</label>
                  <select
                    value={selectedSchoolId}
                    onChange={(e) => {
                      setSelectedSchoolId(e.target.value);
                      setSelectedProgramId("");
                    }}
                    className="px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-semibold text-slate-900"
                  >
                    <option value="">All Schools</option>
                    {schools.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} ({s.code})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center gap-2">
                  <label className="text-xs font-bold text-slate-700 whitespace-nowrap">🎓 Program:</label>
                  <select
                    value={selectedProgramId}
                    onChange={(e) => setSelectedProgramId(e.target.value)}
                    className="px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-semibold text-slate-900"
                  >
                    <option value="">All Programs</option>
                    {availablePrograms.map((p: any) => (
                      <option key={p.id} value={p.id}>
                        {p.name} ({p.code})
                      </option>
                    ))}
                  </select>
                </div>

                <button
                  onClick={loadStudents}
                  className="px-3 py-1.5 bg-slate-900 text-white hover:bg-slate-800 text-xs font-bold rounded-lg transition-colors"
                >
                  🔄 Refresh Roster
                </button>
              </div>
            </div>

            {loading ? (
              <GVPLogoSpinner label="Loading Verification Roster..." />
            ) : students.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-400 border-2 border-dashed rounded-xl">
                No student applications match the selected School / Program filter.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-600">
                      <th className="p-3.5">Student Login ID</th>
                      <th className="p-3.5">Full Name</th>
                      <th className="p-3.5">Program / School</th>
                      <th className="p-3.5">Aadhaar (AES-256 Protected)</th>
                      <th className="p-3.5">Certificates Uploaded</th>
                      <th className="p-3.5">Workflow Status</th>
                      <th className="p-3.5 text-right">Verification Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs text-slate-800 font-medium">
                    {students.map((s) => {
                      const isUnmasked = unmaskedAadhaarMap[s.id];
                      const docsCount = s.documents?.length || 0;

                      return (
                        <tr key={s.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="p-3.5">
                            <span className="px-2.5 py-1 bg-blue-50 text-blue-900 font-bold font-mono text-xs rounded-md border border-blue-200 inline-block">
                              {s.studentId}
                            </span>
                          </td>
                          <td className="p-3.5 font-bold text-slate-900">{s.fullName}</td>
                          <td className="p-3.5">
                            <div className="font-semibold">{s.programName}</div>
                            <div className="text-[10px] text-slate-400">{s.schoolName}</div>
                          </td>
                          <td className="p-3.5">
                            <div className="flex items-center gap-2">
                              <span className="font-mono bg-slate-100 px-2 py-0.5 rounded border border-slate-200 text-xs">
                                {isUnmasked ? isUnmasked : s.maskedAadhaar}
                              </span>
                              {!isUnmasked && (
                                <button
                                  onClick={() => handleUnmaskAadhaar(s.id)}
                                  className="text-[10px] font-bold text-blue-700 hover:underline"
                                  title="Unmask Aadhaar (Audited)"
                                >
                                  👁️ Unmask
                                </button>
                              )}
                            </div>
                          </td>
                          <td className="p-3.5">
                            <span className="px-2.5 py-1 bg-slate-100 text-slate-700 font-bold text-[11px] rounded-full border">
                              📁 {docsCount} Scans Uploaded
                            </span>
                          </td>
                          <td className="p-3.5">
                            <ERPStatusChip status={s.applicationStatus} />
                          </td>
                          <td className="p-3.5 text-right space-x-2">
                            <button
                              onClick={() => handleInspectStudent(s.id)}
                              className="px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-[11px] rounded-lg transition-colors inline-flex items-center gap-1.5"
                            >
                              <span>🔍 Inspect Details &amp; Certificates</span>
                              <span>→</span>
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
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
