"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Header } from "@/components/layout/Header";
import { Sidebar } from "@/components/layout/Sidebar";
import { fetchApi } from "@/lib/api";
import { ERPStatusChip } from "@/components/ui/ERPStatusChip";
import { ERPModal } from "@/components/ui/ERPModal";

export default function StudentsListPage() {
  const [currentUser, setCurrentUser] = useState<any | null>(null);
  const [schools, setSchools] = useState<any[]>([]);
  const [selectedSchoolId, setSelectedSchoolId] = useState("");
  const [selectedProgramId, setSelectedProgramId] = useState("");
  const [students, setStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [resettingId, setResettingId] = useState<string | null>(null);

  const [modalState, setModalState] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    type: "info" | "success" | "warning" | "danger" | "confirm";
    credentials?: { studentId: string; email: string; tempPass: string };
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
      console.error("Failed to load student roster data:", err);
    } finally {
      setLoading(false);
    }
  };

  // Get available programs for selected school filter
  const selectedSchoolObj = schools.find((s) => s.id === selectedSchoolId);
  const availablePrograms = selectedSchoolId
    ? selectedSchoolObj?.programs || []
    : schools.flatMap((s) => s.programs || []);

  const handleResetPassword = async (studentDbId: string, studentName: string) => {
    setResettingId(studentDbId);
    try {
      const res = await fetchApi(`/students/${studentDbId}/reset-password`, {
        method: "POST",
      });

      if (res.success) {
        setModalState({
          isOpen: true,
          title: "Password Reset Successfully",
          message: `Temporary password reset for ${studentName}. Invitation email dispatched to student.`,
          type: "success",
          credentials: {
            studentId: res.data.studentId,
            email: res.data.email,
            tempPass: res.data.temporaryPassword,
          },
        });
      }
    } catch (err: any) {
      setModalState({
        isOpen: true,
        title: "Reset Failed",
        message: err.message || "Failed to reset student password.",
        type: "danger",
      });
    } finally {
      setResettingId(null);
    }
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
                <h2 className="text-xl font-bold text-slate-900">Student Admissions Roster</h2>
                <p className="text-xs text-slate-500 mt-1">
                  View registered student profiles, Student Login IDs (`GVPCSE2026-001`), filter by School / Program, and trigger password resets.
                </p>
              </div>

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

                <Link
                  href="/students/create"
                  className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-lg transition-colors"
                >
                  + Create Student
                </Link>
              </div>
            </div>

            {loading ? (
              <div className="p-8 text-center text-xs text-slate-400">Loading student roster...</div>
            ) : students.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-400 border-2 border-dashed rounded-xl">
                No students registered matching the selected School / Program filter.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-600">
                      <th className="p-3.5">Student Login ID</th>
                      <th className="p-3.5">Full Name</th>
                      <th className="p-3.5">Registered Email</th>
                      <th className="p-3.5">Program</th>
                      <th className="p-3.5">Aadhaar (Protected)</th>
                      <th className="p-3.5">Application Status</th>
                      <th className="p-3.5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs text-slate-800 font-medium">
                    {students.map((s) => (
                      <tr key={s.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="p-3.5">
                          <span className="px-2.5 py-1 bg-blue-50 text-blue-900 font-bold font-mono text-xs rounded-md border border-blue-200 inline-block">
                            {s.studentId}
                          </span>
                        </td>
                        <td className="p-3.5 font-bold text-slate-900">{s.fullName}</td>
                        <td className="p-3.5 text-slate-600">{s.email}</td>
                        <td className="p-3.5">{s.programName}</td>
                        <td className="p-3.5 font-mono text-slate-500">{s.maskedAadhaar}</td>
                        <td className="p-3.5">
                          <ERPStatusChip status={s.applicationStatus} />
                        </td>
                        <td className="p-3.5 text-right">
                          <button
                            onClick={() => handleResetPassword(s.id, s.fullName)}
                            disabled={resettingId === s.id}
                            className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 disabled:opacity-50 text-slate-800 text-xs font-bold rounded-lg transition-colors inline-flex items-center gap-1.5"
                          >
                            <span>🔑</span>
                            <span>{resettingId === s.id ? "Resetting..." : "Reset Password"}</span>
                          </button>
                        </td>
                      </tr>
                    ))}
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
        confirmText="Done"
        onConfirm={() => setModalState((prev) => ({ ...prev, isOpen: false }))}
      >
        {modalState.credentials && (
          <div className="bg-slate-50 border p-4 rounded-lg font-mono text-xs space-y-2 mt-2">
            <div><span className="text-slate-500">Student Login ID:</span> <strong className="text-slate-900 font-bold">{modalState.credentials.studentId}</strong></div>
            <div><span className="text-slate-500">Registered Email:</span> {modalState.credentials.email}</div>
            <div><span className="text-slate-500">New Temp Password:</span> <strong className="text-blue-700 bg-blue-50 px-2 py-0.5 rounded">{modalState.credentials.tempPass}</strong></div>
          </div>
        )}
      </ERPModal>
    </div>
  );
}
