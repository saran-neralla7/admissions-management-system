"use client";

import React, { useState, useEffect } from "react";
import { Header } from "@/components/layout/Header";
import { Sidebar } from "@/components/layout/Sidebar";
import { fetchApi } from "@/lib/api";
import { GVPLogoSpinner } from "@/components/ui/GVPLogoSpinner";

export default function AdmittedApprovedPage() {
  const [currentUser, setCurrentUser] = useState<any | null>(null);
  const [schools, setSchools] = useState<any[]>([]);
  const [selectedSchoolId, setSelectedSchoolId] = useState("");
  const [selectedProgramId, setSelectedProgramId] = useState("");
  const [admittedStudents, setAdmittedStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadUserAndSchools();
  }, []);

  useEffect(() => {
    loadAdmittedStudents();
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

  const loadAdmittedStudents = async () => {
    setLoading(true);
    try {
      const queryParams = new URLSearchParams();
      queryParams.append("status", "ADMITTED");
      if (selectedSchoolId) queryParams.append("schoolId", selectedSchoolId);
      if (selectedProgramId) queryParams.append("programId", selectedProgramId);

      const res = await fetchApi(`/students?${queryParams.toString()}`);
      if (res.success) {
        setAdmittedStudents(res.data);
      }
    } catch (err: any) {
      console.error("Failed to load admitted students:", err);
    } finally {
      setLoading(false);
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
                  <span className="px-2.5 py-0.5 bg-emerald-50 text-emerald-900 font-bold text-[10px] rounded border border-emerald-200">
                    ADMITTED ARCHIVE
                  </span>
                  <h2 className="text-xl font-bold text-slate-900">Official Admitted Students Roster</h2>
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  Students whose final admission has been granted and official admission confirmation slips issued.
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
                  onClick={loadAdmittedStudents}
                  className="px-3.5 py-2 bg-slate-900 text-white text-xs font-bold rounded-lg hover:bg-slate-800 transition-colors"
                >
                  🔄 Refresh Roster
                </button>
              </div>
            </div>

            {loading ? (
              <GVPLogoSpinner label="Loading Official Admitted Students Roster..." />
            ) : admittedStudents.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-400 border-2 border-dashed rounded-xl">
                No officially admitted students found for the selected School / Program filter.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-600">
                      <th className="p-3.5">Student Login ID</th>
                      <th className="p-3.5">Full Name</th>
                      <th className="p-3.5">Gender</th>
                      <th className="p-3.5">Program / School</th>
                      <th className="p-3.5">Aadhaar (Protected)</th>
                      <th className="p-3.5">Admission Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs text-slate-800 font-medium">
                    {admittedStudents.map((s) => (
                      <tr key={s.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="p-3.5">
                          <span className="px-2.5 py-1 bg-blue-50 text-blue-900 font-bold font-mono text-xs rounded-md border border-blue-200 inline-block">
                            {s.studentId}
                          </span>
                        </td>
                        <td className="p-3.5 font-bold text-slate-900">{s.fullName}</td>
                        <td className="p-3.5">
                          <span className="px-2 py-0.5 bg-slate-100 text-slate-700 font-bold text-[10px] rounded uppercase border">
                            {s.gender || "MALE"}
                          </span>
                        </td>
                        <td className="p-3.5">
                          <div className="font-semibold">{s.programName}</div>
                          <div className="text-[10px] text-slate-400">{s.schoolName}</div>
                        </td>
                        <td className="p-3.5 font-mono text-xs text-slate-600">{s.maskedAadhaar}</td>
                        <td className="p-3.5">
                          <span className="px-3 py-1 bg-emerald-50 text-emerald-900 font-bold text-xs rounded-full border border-emerald-300 inline-flex items-center gap-1">
                            <span>🎉</span>
                            <span>ADMITTED (CONFIRMED)</span>
                          </span>
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
    </div>
  );
}
