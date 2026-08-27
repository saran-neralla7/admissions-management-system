"use client";

import React, { useState, useEffect } from "react";
import { Header } from "@/components/layout/Header";
import { Sidebar } from "@/components/layout/Sidebar";
import { fetchApi } from "@/lib/api";
import { ERPModal } from "@/components/ui/ERPModal";

export default function CreateStudentPage() {
  const [currentUser, setCurrentUser] = useState<any | null>(null);
  const [schools, setSchools] = useState<any[]>([]);
  const [selectedSchoolId, setSelectedSchoolId] = useState("");
  const [selectedProgramId, setSelectedProgramId] = useState("");
  const [selectedCycleId, setSelectedCycleId] = useState("");

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [aadhaarNumber, setAadhaarNumber] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [gender, setGender] = useState("MALE");
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

  const loadUserAndSchools = async () => {
    try {
      const [userRes, schoolsRes] = await Promise.all([
        fetchApi("/auth/me"),
        fetchApi("/academics/schools"),
      ]);

      if (userRes.success) setCurrentUser(userRes.data);

      if (schoolsRes.success && schoolsRes.data.length > 0) {
        setSchools(schoolsRes.data);
        const firstSchool = schoolsRes.data[0];
        setSelectedSchoolId(firstSchool.id);
        if (firstSchool.programs && firstSchool.programs.length > 0) {
          setSelectedProgramId(firstSchool.programs[0].id);
        }
      }
    } catch (err: any) {
      console.error("Failed to load initial data:", err);
    }
  };

  const selectedSchool = schools.find((s) => s.id === selectedSchoolId);
  const availablePrograms = selectedSchool?.programs || [];

  const selectedProgramObj = availablePrograms.find((p: any) => p.id === selectedProgramId);
  const availableCyclesForProg = selectedProgramObj?.admissionCycles || [];

  useEffect(() => {
    if (availableCyclesForProg.length > 0) {
      setSelectedCycleId(availableCyclesForProg[0].id);
    } else {
      setSelectedCycleId("");
    }
  }, [selectedProgramId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedProgramId) {
      setModalState({
        isOpen: true,
        title: "Validation Error",
        message: "Please select a target academic program.",
        type: "warning",
      });
      return;
    }

    if (!selectedCycleId) {
      setModalState({
        isOpen: true,
        title: "Admission Phase Required",
        message: "No active Admission Phase selected. Please configure an Academic Year Phase under System Management.",
        type: "warning",
      });
      return;
    }

    const cleanAadhaar = aadhaarNumber.replace(/\D/g, "");
    if (cleanAadhaar.length !== 12) {
      setModalState({
        isOpen: true,
        title: "Validation Error",
        message: "Aadhaar Number must be exactly 12 digits.",
        type: "warning",
      });
      return;
    }

    setLoading(true);
    try {
      const res = await fetchApi("/students", {
        method: "POST",
        body: JSON.stringify({
          fullName,
          email,
          aadhaarNo: cleanAadhaar,
          dateOfBirth,
          gender,
          programId: selectedProgramId,
          admissionCycleId: selectedCycleId,
        }),
      });

      if (res.success) {
        setModalState({
          isOpen: true,
          title: "Student Account Created",
          message: `Student account created for ${res.data.fullName} under ID ${res.data.studentId}. Temporary password: ${res.data.temporaryPassword}. Invitation email sent to ${res.data.email}.`,
          type: "success",
        });

        setFullName("");
        setAadhaarNumber("");
        setDateOfBirth("");
        setEmail("");
        setGender("MALE");
      }
    } catch (err: any) {
      setModalState({
        isOpen: true,
        title: "Creation Failed",
        message: err.message || "Failed to create student account.",
        type: "danger",
      });
    } finally {
      setLoading(false);
    }
  };

  const userRole = currentUser?.role?.name || "OFFICE_USER";
  const userEmail = currentUser?.email || "office@gvpihlr.edu.in";

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col">
      <Header userEmail={userEmail} userRole={userRole} />
      <div className="flex-1 flex">
        <Sidebar userRole={userRole} />
        <main className="flex-1 p-8 max-w-4xl space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8 space-y-6">
            <div>
              <h2 className="text-xl font-bold text-slate-900">Create Student &amp; Dispatch Invitation</h2>
              <p className="text-xs text-slate-500 mt-1">
                Office User inputs student details, selects active Academic Year &amp; Phase, auto-generates Student ID, encrypts Aadhaar (AES-256), and emails temporary login credentials.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-semibold uppercase text-slate-600 mb-1">Select School *</label>
                  <select
                    value={selectedSchoolId}
                    onChange={(e) => {
                      setSelectedSchoolId(e.target.value);
                      const school = schools.find((s) => s.id === e.target.value);
                      if (school && school.programs?.length > 0) {
                        setSelectedProgramId(school.programs[0].id);
                      } else {
                        setSelectedProgramId("");
                      }
                    }}
                    className="w-full px-3 py-2 border rounded-lg text-xs font-semibold bg-white"
                  >
                    {schools.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} ({s.code})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold uppercase text-slate-600 mb-1">Target Academic Program *</label>
                  <select
                    value={selectedProgramId}
                    onChange={(e) => setSelectedProgramId(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg text-xs font-semibold bg-white"
                  >
                    {availablePrograms.map((p: any) => (
                      <option key={p.id} value={p.id}>
                        {p.name} ({p.code})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Admission Cycle Phase Selector */}
              <div className="p-4 bg-slate-50 border rounded-xl space-y-2">
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700">
                  📅 Active Academic Year &amp; Admission Phase *
                </label>

                {availableCyclesForProg.length === 0 ? (
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-900 font-semibold space-y-1">
                    <div>⚠️ No Active Academic Year / Admission Phase Configured for this Program!</div>
                    <div className="text-[11px] text-amber-700 font-normal">
                      Students CANNOT be added until an Academic Year &amp; Phase (e.g. <em>2026 Phase 1</em>) is created under <strong>System Management &rarr; Academic Years</strong>.
                    </div>
                  </div>
                ) : (
                  <select
                    value={selectedCycleId}
                    onChange={(e) => setSelectedCycleId(e.target.value)}
                    className="w-full px-3.5 py-2 border border-slate-300 rounded-lg text-xs font-bold bg-white text-slate-900"
                    required
                  >
                    {availableCyclesForProg.map((c: any) => (
                      <option key={c.id} value={c.id}>
                        Academic Year {c.academicYear} • {c.title}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-semibold uppercase text-slate-600 mb-1">Student Full Name *</label>
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="e.g. Student Full Name"
                    className="w-full px-3 py-2 border rounded-lg text-xs bg-white"
                    required
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold uppercase text-slate-600 mb-1">Student Email Address *</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="student@example.com"
                    className="w-full px-3 py-2 border rounded-lg text-xs bg-white"
                    required
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold uppercase text-slate-600 mb-1">Student Gender *</label>
                  <select
                    value={gender}
                    onChange={(e) => setGender(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg text-xs font-semibold bg-white"
                    required
                  >
                    <option value="MALE">Male</option>
                    <option value="FEMALE">Female</option>
                    <option value="OTHER">Other</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold uppercase text-slate-600 mb-1">Aadhaar Number (12 Digits) *</label>
                  <input
                    type="text"
                    value={aadhaarNumber}
                    onChange={(e) => setAadhaarNumber(e.target.value)}
                    placeholder="123456789012"
                    maxLength={12}
                    className="w-full px-3 py-2 border rounded-lg text-xs font-mono bg-white"
                    required
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold uppercase text-slate-600 mb-1">Date of Birth *</label>
                  <input
                    type="date"
                    value={dateOfBirth}
                    onChange={(e) => setDateOfBirth(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg text-xs bg-white"
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading || availableCyclesForProg.length === 0}
                className="w-full py-3 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-xs transition-all"
              >
                {loading ? "Creating Student & Dispatching Email..." : "Create Student & Send Invitation Email"}
              </button>
            </form>
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
