"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Header } from "@/components/layout/Header";
import { Sidebar } from "@/components/layout/Sidebar";
import { fetchApi } from "@/lib/api";
import { ERPModal } from "@/components/ui/ERPModal";

export default function AdminManagementPage() {
  const [currentUser, setCurrentUser] = useState<any | null>(null);
  const [activeTab, setActiveTab] = useState<"schools" | "programs" | "users" | "cycles">("schools");

  // Data lists
  const [schools, setSchools] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [cycles, setCycles] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // Edit entity states
  const [editingSchool, setEditingSchool] = useState<any | null>(null);
  const [editingProgram, setEditingProgram] = useState<any | null>(null);
  const [editingUser, setEditingUser] = useState<any | null>(null);
  const [editingCycle, setEditingCycle] = useState<any | null>(null);

  // School Form
  const [schoolName, setSchoolName] = useState("");
  const [schoolCode, setSchoolCode] = useState("");

  // Program Form
  const [progSchoolId, setProgSchoolId] = useState("");
  const [progName, setProgName] = useState("");
  const [progCode, setProgCode] = useState("");
  const [progPrefix, setProgPrefix] = useState("");
  const [progFee, setProgFee] = useState(1500);

  // User Form
  const [userEmail, setUserEmail] = useState("");
  const [userRole, setUserRole] = useState("SCHOOL_ADMIN");
  const [userSchoolId, setUserSchoolId] = useState("");
  const [userPass, setUserPass] = useState("");

  // Academic Cycle Form
  const [cycleProgId, setCycleProgId] = useState("");
  const [cycleYear, setCycleYear] = useState(new Date().getFullYear());
  const [cycleTitle, setCycleTitle] = useState(`${new Date().getFullYear()} Regular Phase 1`);

  const [modalState, setModalState] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    type: "info" | "success" | "warning" | "danger" | "confirm";
    onConfirmAction?: () => void;
    userCredentials?: { email: string; role: string; tempPass: string };
  }>({
    isOpen: false,
    title: "",
    message: "",
    type: "info",
  });

  useEffect(() => {
    loadUserAndData();
  }, []);

  const loadUserAndData = async () => {
    setLoading(true);
    try {
      const userRes = await fetchApi("/auth/me");
      if (userRes.success) {
        setCurrentUser(userRes.data);
        if (userRes.data.role?.name !== "SUPER_ADMIN") {
          setLoading(false);
          return;
        }
      }

      const [schoolsRes, usersRes, cyclesRes] = await Promise.all([
        fetchApi("/academics/schools").catch(() => ({ success: false, data: [] })),
        fetchApi("/users").catch(() => ({ success: false, data: [] })),
        fetchApi("/academics/cycles").catch(() => ({ success: false, data: [] })),
      ]);

      if (schoolsRes.success) {
        setSchools(schoolsRes.data);
        if (schoolsRes.data.length > 0) {
          setProgSchoolId(schoolsRes.data[0].id);
          setUserSchoolId(schoolsRes.data[0].id);
        }
      }
      if (usersRes.success) {
        setUsers(usersRes.data);
      }
      if (cyclesRes.success) {
        setCycles(cyclesRes.data);
      }
    } catch (err: any) {
      console.error("Failed to load admin management data:", err);
    } finally {
      setLoading(false);
    }
  };

  const allPrograms = schools.flatMap((s) => s.programs?.map((p: any) => ({ ...p, schoolName: s.name })) || []);

  useEffect(() => {
    if (allPrograms.length > 0 && !cycleProgId) {
      setCycleProgId(allPrograms[0].id);
    }
  }, [schools]);

  // --- SCHOOL ACTIONS ---
  const handleCreateSchool = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!schoolName || !schoolCode) return;

    try {
      const res = await fetchApi("/academics/schools", {
        method: "POST",
        body: JSON.stringify({ name: schoolName, code: schoolCode }),
      });

      if (res.success) {
        setModalState({
          isOpen: true,
          title: "School Created",
          message: `School "${res.data.name}" (${res.data.code}) created successfully.`,
          type: "success",
        });
        setSchoolName("");
        setSchoolCode("");
        loadUserAndData();
      }
    } catch (err: any) {
      setModalState({
        isOpen: true,
        title: "Creation Failed",
        message: err.message || "Failed to create school.",
        type: "danger",
      });
    }
  };

  const handleUpdateSchool = async (schoolId: string) => {
    if (!editingSchool) return;
    try {
      const res = await fetchApi(`/academics/schools/${schoolId}`, {
        method: "PUT",
        body: JSON.stringify({ name: editingSchool.name, code: editingSchool.code }),
      });
      if (res.success) {
        setModalState({
          isOpen: true,
          title: "School Updated",
          message: "School details updated successfully.",
          type: "success",
        });
        setEditingSchool(null);
        loadUserAndData();
      }
    } catch (err: any) {
      setModalState({
        isOpen: true,
        title: "Update Failed",
        message: err.message || "Could not update school.",
        type: "danger",
      });
    }
  };

  const handleDeleteSchool = (schoolId: string, schoolName: string) => {
    setModalState({
      isOpen: true,
      title: "Confirm School Deletion",
      message: `Are you sure you want to delete "${schoolName}"? All associated programs will be permanently deleted.`,
      type: "confirm",
      onConfirmAction: async () => {
        setModalState((prev) => ({ ...prev, isOpen: false }));
        try {
          const res = await fetchApi(`/academics/schools/${schoolId}`, { method: "DELETE" });
          if (res.success) {
            setModalState({
              isOpen: true,
              title: "School Deleted",
              message: "School deleted successfully.",
              type: "success",
            });
            loadUserAndData();
          }
        } catch (err: any) {
          setModalState({
            isOpen: true,
            title: "Delete Failed",
            message: err.message || "Failed to delete school.",
            type: "danger",
          });
        }
      },
    });
  };

  // --- PROGRAM ACTIONS ---
  const handleCreateProgram = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!progSchoolId || !progName || !progCode || !progPrefix) return;

    try {
      const res = await fetchApi("/academics/programs", {
        method: "POST",
        body: JSON.stringify({
          schoolId: progSchoolId,
          name: progName,
          code: progCode,
          studentIdPrefix: progPrefix,
          applicationFee: progFee,
        }),
      });

      if (res.success) {
        setModalState({
          isOpen: true,
          title: "Program Provisioned",
          message: `Program "${res.data.name}" (${res.data.code}) provisioned.`,
          type: "success",
        });
        setProgName("");
        setProgCode("");
        setProgPrefix("");
        loadUserAndData();
      }
    } catch (err: any) {
      setModalState({
        isOpen: true,
        title: "Program Creation Failed",
        message: err.message || "Could not provision program.",
        type: "danger",
      });
    }
  };

  const handleUpdateProgram = async (programId: string) => {
    if (!editingProgram) return;
    try {
      const res = await fetchApi(`/academics/programs/${programId}`, {
        method: "PUT",
        body: JSON.stringify({
          name: editingProgram.name,
          code: editingProgram.code,
          studentIdPrefix: editingProgram.studentIdPrefix,
          applicationFee: editingProgram.applicationFee,
        }),
      });
      if (res.success) {
        setModalState({
          isOpen: true,
          title: "Program Updated",
          message: "Program details and fee updated successfully.",
          type: "success",
        });
        setEditingProgram(null);
        loadUserAndData();
      }
    } catch (err: any) {
      setModalState({
        isOpen: true,
        title: "Update Failed",
        message: err.message || "Could not update program.",
        type: "danger",
      });
    }
  };

  const handleDeleteProgram = (programId: string, programName: string) => {
    setModalState({
      isOpen: true,
      title: "Confirm Program Deletion",
      message: `Are you sure you want to delete "${programName}"?`,
      type: "confirm",
      onConfirmAction: async () => {
        setModalState((prev) => ({ ...prev, isOpen: false }));
        try {
          const res = await fetchApi(`/academics/programs/${programId}`, { method: "DELETE" });
          if (res.success) {
            setModalState({
              isOpen: true,
              title: "Program Deleted",
              message: "Program deleted successfully.",
              type: "success",
            });
            loadUserAndData();
          }
        } catch (err: any) {
          setModalState({
            isOpen: true,
            title: "Delete Failed",
            message: err.message || "Failed to delete program.",
            type: "danger",
          });
        }
      },
    });
  };

  // --- USER ACTIONS ---
  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userEmail || !userRole) return;

    try {
      const res = await fetchApi("/users", {
        method: "POST",
        body: JSON.stringify({
          email: userEmail,
          roleName: userRole,
          schoolId: userSchoolId,
          password: userPass || undefined,
        }),
      });

      if (res.success) {
        setModalState({
          isOpen: true,
          title: "System User Created",
          message: `User account created for ${res.data.email}.`,
          type: "success",
          userCredentials: {
            email: res.data.email,
            role: res.data.role,
            tempPass: res.data.temporaryPassword,
          },
        });
        setUserEmail("");
        setUserPass("");
        loadUserAndData();
      }
    } catch (err: any) {
      setModalState({
        isOpen: true,
        title: "User Creation Failed",
        message: err.message || "Failed to create user account.",
        type: "danger",
      });
    }
  };

  const handleUpdateUser = async (userId: string) => {
    if (!editingUser) return;
    try {
      const res = await fetchApi(`/users/${userId}`, {
        method: "PUT",
        body: JSON.stringify({
          email: editingUser.email,
          roleName: editingUser.roleName,
          schoolId: editingUser.schoolId,
          isActive: editingUser.isActive,
        }),
      });

      if (res.success) {
        setModalState({
          isOpen: true,
          title: "User Updated",
          message: "Staff user account updated successfully.",
          type: "success",
        });
        setEditingUser(null);
        loadUserAndData();
      }
    } catch (err: any) {
      setModalState({
        isOpen: true,
        title: "Update Failed",
        message: err.message || "Could not update user account.",
        type: "danger",
      });
    }
  };

  const handleDeleteUser = (userId: string, email: string) => {
    setModalState({
      isOpen: true,
      title: "Confirm User Account Deletion",
      message: `Are you sure you want to delete staff account "${email}"?`,
      type: "confirm",
      onConfirmAction: async () => {
        setModalState((prev) => ({ ...prev, isOpen: false }));
        try {
          const res = await fetchApi(`/users/${userId}`, { method: "DELETE" });
          if (res.success) {
            setModalState({
              isOpen: true,
              title: "User Deleted",
              message: "Staff user account deleted successfully.",
              type: "success",
            });
            loadUserAndData();
          }
        } catch (err: any) {
          setModalState({
            isOpen: true,
            title: "Delete Failed",
            message: err.message || "Failed to delete user account.",
            type: "danger",
          });
        }
      },
    });
  };

  // --- ACADEMIC CYCLE ACTIONS ---
  const handleCreateCycle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cycleProgId || !cycleYear || !cycleTitle) return;

    try {
      const res = await fetchApi("/academics/cycles", {
        method: "POST",
        body: JSON.stringify({
          programId: cycleProgId,
          academicYear: cycleYear,
          title: cycleTitle,
          isActive: true,
        }),
      });

      if (res.success) {
        setModalState({
          isOpen: true,
          title: "Academic Cycle Created",
          message: `Academic Year ${res.data.academicYear} cycle "${res.data.title}" created.`,
          type: "success",
        });
        setCycleTitle(`${cycleYear} Phase 2`);
        loadUserAndData();
      }
    } catch (err: any) {
      setModalState({
        isOpen: true,
        title: "Creation Failed",
        message: err.message || "Failed to create academic cycle.",
        type: "danger",
      });
    }
  };

  const handleUpdateCycle = async (cycleId: string) => {
    if (!editingCycle) return;
    try {
      const res = await fetchApi(`/academics/cycles/${cycleId}`, {
        method: "PUT",
        body: JSON.stringify({
          academicYear: editingCycle.academicYear,
          title: editingCycle.title,
          isActive: editingCycle.isActive,
        }),
      });
      if (res.success) {
        setModalState({
          isOpen: true,
          title: "Cycle Updated",
          message: "Academic cycle details updated successfully.",
          type: "success",
        });
        setEditingCycle(null);
        loadUserAndData();
      }
    } catch (err: any) {
      setModalState({
        isOpen: true,
        title: "Update Failed",
        message: err.message || "Could not update academic cycle.",
        type: "danger",
      });
    }
  };

  const handleDeleteCycle = (cycleId: string, title: string) => {
    setModalState({
      isOpen: true,
      title: "Confirm Cycle Deletion",
      message: `Are you sure you want to delete academic cycle "${title}"?`,
      type: "confirm",
      onConfirmAction: async () => {
        setModalState((prev) => ({ ...prev, isOpen: false }));
        try {
          const res = await fetchApi(`/academics/cycles/${cycleId}`, { method: "DELETE" });
          if (res.success) {
            setModalState({
              isOpen: true,
              title: "Cycle Deleted",
              message: "Academic cycle deleted successfully.",
              type: "success",
            });
            loadUserAndData();
          }
        } catch (err: any) {
          setModalState({
            isOpen: true,
            title: "Delete Failed",
            message: err.message || "Failed to delete academic cycle.",
            type: "danger",
          });
        }
      },
    });
  };

  const activeRole = currentUser?.role?.name || "OFFICE_USER";
  const activeEmail = currentUser?.email || "office@gvpihlr.edu.in";

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col">
      <Header userEmail={activeEmail} userRole={activeRole} />
      <div className="flex-1 flex">
        <Sidebar userRole={activeRole} />
        <main className="flex-1 p-8 max-w-6xl space-y-6">
          {currentUser && currentUser.role?.name !== "SUPER_ADMIN" ? (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-12 text-center space-y-4 max-w-2xl mx-auto my-12">
              <div className="text-4xl">🔒</div>
              <h2 className="text-xl font-bold text-slate-900">Access Restricted</h2>
              <p className="text-xs text-slate-600 leading-relaxed">
                System Management (Schools, Programs, Academic Cycles, and Staff User Accounts) is restricted to <strong>Super Admin</strong> logins (<code className="bg-slate-100 px-1.5 py-0.5 rounded">admin@gvpihlr.edu.in</code>).
              </p>
              <p className="text-xs text-slate-500">
                As a <strong>School Office User</strong>, your primary options are <strong>Create Student</strong>, <strong>Form &amp; Doc Builder</strong>, and <strong>Certificate Verification</strong>.
              </p>
              <div className="pt-4">
                <Link
                  href="/dashboard"
                  className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow-xs inline-block"
                >
                  Back to Dashboard
                </Link>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8 space-y-6">
              <div>
                <h2 className="text-xl font-bold text-slate-900">Super Admin Full Control Center</h2>
                <p className="text-xs text-slate-500 mt-1">
                  Full Create, Edit (Update), and Delete rights across Schools, Programs, Fees, Staff Accounts, and Academic Years.
                </p>
              </div>

              {/* Tab Controls */}
              <div className="flex border-b border-slate-200 gap-6 overflow-x-auto">
                <button
                  onClick={() => setActiveTab("schools")}
                  className={`pb-3 text-xs font-bold uppercase tracking-wider transition-colors whitespace-nowrap ${
                    activeTab === "schools"
                      ? "border-b-2 border-slate-900 text-slate-900"
                      : "text-slate-400 hover:text-slate-700"
                  }`}
                >
                  🏫 Schools ({schools.length})
                </button>
                <button
                  onClick={() => setActiveTab("programs")}
                  className={`pb-3 text-xs font-bold uppercase tracking-wider transition-colors whitespace-nowrap ${
                    activeTab === "programs"
                      ? "border-b-2 border-slate-900 text-slate-900"
                      : "text-slate-400 hover:text-slate-700"
                  }`}
                >
                  🎓 Programs & Fees ({allPrograms.length})
                </button>
                <button
                  onClick={() => setActiveTab("users")}
                  className={`pb-3 text-xs font-bold uppercase tracking-wider transition-colors whitespace-nowrap ${
                    activeTab === "users"
                      ? "border-b-2 border-slate-900 text-slate-900"
                      : "text-slate-400 hover:text-slate-700"
                  }`}
                >
                  👤 Staff Users ({users.length})
                </button>
                <button
                  onClick={() => setActiveTab("cycles")}
                  className={`pb-3 text-xs font-bold uppercase tracking-wider transition-colors whitespace-nowrap ${
                    activeTab === "cycles"
                      ? "border-b-2 border-slate-900 text-slate-900"
                      : "text-slate-400 hover:text-slate-700"
                  }`}
                >
                  📅 Academic Years ({cycles.length})
                </button>
              </div>

              {/* TAB 1: SCHOOLS */}
              {activeTab === "schools" && (
                <div className="space-y-6">
                  <form onSubmit={handleCreateSchool} className="bg-slate-50 border p-6 rounded-xl space-y-4">
                    <h4 className="text-xs font-bold uppercase text-slate-700">+ Create New University School</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[11px] font-semibold uppercase text-slate-600 mb-1">School Name *</label>
                        <input
                          type="text"
                          value={schoolName}
                          onChange={(e) => setSchoolName(e.target.value)}
                          placeholder="e.g. School of Pharmacy"
                          className="w-full px-3 py-2 border rounded-lg text-xs bg-white"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold uppercase text-slate-600 mb-1">Unique School Code *</label>
                        <input
                          type="text"
                          value={schoolCode}
                          onChange={(e) => setSchoolCode(e.target.value.toUpperCase())}
                          placeholder="e.g. PHARM"
                          className="w-full px-3 py-2 border rounded-lg text-xs font-mono uppercase bg-white"
                          required
                        />
                      </div>
                    </div>
                    <button type="submit" className="px-4 py-2 bg-slate-900 text-white text-xs font-bold rounded-lg hover:bg-slate-800">
                      Create School
                    </button>
                  </form>

                  <div className="space-y-3">
                    {schools.map((s) => (
                      <div key={s.id} className="p-4 border rounded-xl bg-white shadow-2xs flex items-center justify-between">
                        {editingSchool?.id === s.id ? (
                          <div className="flex-1 flex gap-3 items-center">
                            <input
                              type="text"
                              value={editingSchool.name}
                              onChange={(e) => setEditingSchool({ ...editingSchool, name: e.target.value })}
                              className="px-2.5 py-1 border text-xs rounded"
                            />
                            <input
                              type="text"
                              value={editingSchool.code}
                              onChange={(e) => setEditingSchool({ ...editingSchool, code: e.target.value })}
                              className="px-2 py-1 border text-xs rounded font-mono w-24"
                            />
                            <button
                              onClick={() => handleUpdateSchool(s.id)}
                              className="px-3 py-1 bg-emerald-600 text-white text-xs font-bold rounded"
                            >
                              Save
                            </button>
                            <button
                              onClick={() => setEditingSchool(null)}
                              className="px-3 py-1 bg-slate-200 text-slate-700 text-xs font-bold rounded"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <>
                            <div>
                              <span className="text-sm font-bold text-slate-900">{s.name}</span>
                              <span className="ml-3 px-2 py-0.5 text-[10px] font-mono font-bold bg-slate-100 rounded border">
                                {s.code}
                              </span>
                              <div className="text-xs text-slate-400 mt-0.5">{s.programs?.length || 0} Programs</div>
                            </div>
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => setEditingSchool(s)}
                                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-lg"
                              >
                                ✏️ Edit
                              </button>
                              <button
                                onClick={() => handleDeleteSchool(s.id, s.name)}
                                className="px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-700 text-xs font-bold rounded-lg"
                              >
                                🗑️ Delete
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* TAB 2: PROGRAMS */}
              {activeTab === "programs" && (
                <div className="space-y-6">
                  <form onSubmit={handleCreateProgram} className="bg-slate-50 border p-6 rounded-xl space-y-4">
                    <h4 className="text-xs font-bold uppercase text-slate-700">+ Provision New Academic Program</h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-[11px] font-semibold uppercase text-slate-600 mb-1">Host School *</label>
                        <select
                          value={progSchoolId}
                          onChange={(e) => setProgSchoolId(e.target.value)}
                          className="w-full px-3 py-2 border rounded-lg text-xs bg-white"
                        >
                          {schools.map((s) => (
                            <option key={s.id} value={s.id}>
                              {s.name} ({s.code})
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold uppercase text-slate-600 mb-1">Program Name *</label>
                        <input
                          type="text"
                          value={progName}
                          onChange={(e) => setProgName(e.target.value)}
                          placeholder="e.g. M.Tech Software Engineering"
                          className="w-full px-3 py-2 border rounded-lg text-xs bg-white"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold uppercase text-slate-600 mb-1">Program Code *</label>
                        <input
                          type="text"
                          value={progCode}
                          onChange={(e) => setProgCode(e.target.value.toUpperCase())}
                          placeholder="e.g. SE"
                          className="w-full px-3 py-2 border rounded-lg text-xs uppercase bg-white font-mono"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold uppercase text-slate-600 mb-1">Student ID Prefix *</label>
                        <input
                          type="text"
                          value={progPrefix}
                          onChange={(e) => setProgPrefix(e.target.value.toUpperCase())}
                          placeholder="e.g. GVPSE"
                          className="w-full px-3 py-2 border rounded-lg text-xs uppercase bg-white font-mono"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold uppercase text-slate-600 mb-1">Application Fee (₹) *</label>
                        <input
                          type="number"
                          value={progFee}
                          onChange={(e) => setProgFee(Number(e.target.value))}
                          className="w-full px-3 py-2 border rounded-lg text-xs bg-white font-mono"
                          required
                        />
                      </div>
                    </div>
                    <button type="submit" className="px-4 py-2 bg-slate-900 text-white text-xs font-bold rounded-lg hover:bg-slate-800">
                      Provision Program
                    </button>
                  </form>

                  <div className="space-y-3">
                    {allPrograms.map((p) => (
                      <div key={p.id} className="p-4 border rounded-xl bg-white flex flex-col md:flex-row md:items-center justify-between gap-4">
                        {editingProgram?.id === p.id ? (
                          <div className="flex-1 grid grid-cols-1 sm:grid-cols-4 gap-2 items-center">
                            <input
                              type="text"
                              value={editingProgram.name}
                              onChange={(e) => setEditingProgram({ ...editingProgram, name: e.target.value })}
                              className="px-2.5 py-1 border text-xs rounded"
                            />
                            <input
                              type="text"
                              value={editingProgram.code}
                              onChange={(e) => setEditingProgram({ ...editingProgram, code: e.target.value })}
                              className="px-2 py-1 border text-xs rounded font-mono"
                            />
                            <input
                              type="text"
                              value={editingProgram.studentIdPrefix}
                              onChange={(e) => setEditingProgram({ ...editingProgram, studentIdPrefix: e.target.value })}
                              className="px-2 py-1 border text-xs rounded font-mono"
                            />
                            <input
                              type="number"
                              value={editingProgram.applicationFee}
                              onChange={(e) => setEditingProgram({ ...editingProgram, applicationFee: Number(e.target.value) })}
                              className="px-2 py-1 border text-xs rounded font-mono"
                            />
                            <div className="col-span-4 flex gap-2 justify-end mt-2">
                              <button
                                onClick={() => handleUpdateProgram(p.id)}
                                className="px-3 py-1 bg-emerald-600 text-white text-xs font-bold rounded"
                              >
                                Save Program
                              </button>
                              <button
                                onClick={() => setEditingProgram(null)}
                                className="px-3 py-1 bg-slate-200 text-slate-700 text-xs font-bold rounded"
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        ) : (
                          <>
                            <div>
                              <div className="text-xs text-slate-400 font-bold uppercase">{p.schoolName}</div>
                              <h4 className="text-sm font-bold text-slate-900">{p.name}</h4>
                              <div className="text-xs text-slate-600 mt-1">
                                Code: <span className="font-mono">{p.code}</span> | Prefix: <span className="font-mono font-bold text-blue-700">{p.studentIdPrefix}</span> | Fee: <span className="font-bold">₹{p.applicationFee}</span>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => setEditingProgram(p)}
                                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-lg"
                              >
                                ✏️ Edit Program
                              </button>
                              <button
                                onClick={() => handleDeleteProgram(p.id, p.name)}
                                className="px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-700 text-xs font-bold rounded-lg"
                              >
                                🗑️ Delete Program
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* TAB 3: USERS */}
              {activeTab === "users" && (
                <div className="space-y-6">
                  <form onSubmit={handleCreateUser} className="bg-slate-50 border p-6 rounded-xl space-y-4">
                    <h4 className="text-xs font-bold uppercase text-slate-700">+ Provision System Staff Account</h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-[11px] font-semibold uppercase text-slate-600 mb-1">Email Address *</label>
                        <input
                          type="email"
                          value={userEmail}
                          onChange={(e) => setUserEmail(e.target.value)}
                          placeholder="staff@gvpihlr.edu.in"
                          className="w-full px-3 py-2 border rounded-lg text-xs bg-white"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold uppercase text-slate-600 mb-1">System Role *</label>
                        <select
                          value={userRole}
                          onChange={(e) => setUserRole(e.target.value)}
                          className="w-full px-3 py-2 border rounded-lg text-xs bg-white font-bold"
                        >
                          <option value="SCHOOL_ADMIN">School Admin</option>
                          <option value="OFFICE_USER">School Office User</option>
                          <option value="CENTRAL_ACCOUNTS">Central Accounts User</option>
                          <option value="SUPER_ADMIN">Super Admin</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold uppercase text-slate-600 mb-1">Assigned School</label>
                        <select
                          value={userSchoolId}
                          onChange={(e) => setUserSchoolId(e.target.value)}
                          className="w-full px-3 py-2 border rounded-lg text-xs bg-white"
                        >
                          <option value="">None / All Schools (Super Admin)</option>
                          {schools.map((s) => (
                            <option key={s.id} value={s.id}>
                              {s.name} ({s.code})
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                    <button type="submit" className="px-4 py-2 bg-slate-900 text-white text-xs font-bold rounded-lg hover:bg-slate-800">
                      Create Staff Account
                    </button>
                  </form>

                  <div className="space-y-3">
                    {users.map((u) => (
                      <div key={u.id} className="p-4 border rounded-xl bg-white flex flex-col md:flex-row md:items-center justify-between gap-4">
                        {editingUser?.id === u.id ? (
                          <div className="flex-1 grid grid-cols-1 sm:grid-cols-3 gap-2 items-center">
                            <input
                              type="email"
                              value={editingUser.email}
                              onChange={(e) => setEditingUser({ ...editingUser, email: e.target.value })}
                              className="px-2.5 py-1 border text-xs rounded"
                            />
                            <select
                              value={editingUser.roleName}
                              onChange={(e) => setEditingUser({ ...editingUser, roleName: e.target.value })}
                              className="px-2 py-1 border text-xs rounded"
                            >
                              <option value="SCHOOL_ADMIN">School Admin</option>
                              <option value="OFFICE_USER">School Office User</option>
                              <option value="CENTRAL_ACCOUNTS">Central Accounts</option>
                              <option value="SUPER_ADMIN">Super Admin</option>
                            </select>
                            <div className="flex gap-2 justify-end">
                              <button
                                onClick={() => handleUpdateUser(u.id)}
                                className="px-3 py-1 bg-emerald-600 text-white text-xs font-bold rounded"
                              >
                                Save User
                              </button>
                              <button
                                onClick={() => setEditingUser(null)}
                                className="px-3 py-1 bg-slate-200 text-slate-700 text-xs font-bold rounded"
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        ) : (
                          <>
                            <div>
                              <h4 className="text-sm font-bold text-slate-900">{u.email}</h4>
                              <div className="text-xs text-slate-500 mt-0.5">
                                Role: <span className="font-bold text-blue-900">{u.roleName}</span> | School: {u.schoolName}
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => setEditingUser({ ...u, roleName: u.roleName, schoolId: u.schoolId || "" })}
                                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-lg"
                              >
                                ✏️ Edit User
                              </button>
                              <button
                                onClick={() => handleDeleteUser(u.id, u.email)}
                                className="px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-700 text-xs font-bold rounded-lg"
                              >
                                🗑️ Delete User
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* TAB 4: ACADEMIC YEARS */}
              {activeTab === "cycles" && (
                <div className="space-y-6">
                  <form onSubmit={handleCreateCycle} className="bg-slate-50 border p-6 rounded-xl space-y-4">
                    <h4 className="text-xs font-bold uppercase text-slate-700">+ Create Academic Year &amp; Admission Phase</h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-[11px] font-semibold uppercase text-slate-600 mb-1">Target Program *</label>
                        <select
                          value={cycleProgId}
                          onChange={(e) => setCycleProgId(e.target.value)}
                          className="w-full px-3 py-2 border rounded-lg text-xs bg-white"
                        >
                          {allPrograms.map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.schoolName} • {p.name} ({p.code})
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold uppercase text-slate-600 mb-1">Academic Year *</label>
                        <input
                          type="number"
                          value={cycleYear}
                          onChange={(e) => setCycleYear(Number(e.target.value))}
                          className="w-full px-3 py-2 border rounded-lg text-xs bg-white font-mono"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold uppercase text-slate-600 mb-1">Phase Title *</label>
                        <input
                          type="text"
                          value={cycleTitle}
                          onChange={(e) => setCycleTitle(e.target.value)}
                          placeholder="e.g. 2026 Phase 1"
                          className="w-full px-3 py-2 border rounded-lg text-xs bg-white"
                          required
                        />
                      </div>
                    </div>
                    <button type="submit" className="px-4 py-2 bg-slate-900 text-white text-xs font-bold rounded-lg hover:bg-slate-800">
                      Create Academic Cycle
                    </button>
                  </form>

                  <div className="space-y-3">
                    {cycles.map((c) => (
                      <div key={c.id} className="p-4 border rounded-xl bg-white flex flex-col md:flex-row md:items-center justify-between gap-4">
                        {editingCycle?.id === c.id ? (
                          <div className="flex-1 flex gap-3 items-center">
                            <input
                              type="number"
                              value={editingCycle.academicYear}
                              onChange={(e) => setEditingCycle({ ...editingCycle, academicYear: Number(e.target.value) })}
                              className="px-2 py-1 border text-xs rounded font-mono w-24"
                            />
                            <input
                              type="text"
                              value={editingCycle.title}
                              onChange={(e) => setEditingCycle({ ...editingCycle, title: e.target.value })}
                              className="px-2.5 py-1 border text-xs rounded flex-1"
                            />
                            <button
                              onClick={() => handleUpdateCycle(c.id)}
                              className="px-3 py-1 bg-emerald-600 text-white text-xs font-bold rounded"
                            >
                              Save Cycle
                            </button>
                            <button
                              onClick={() => setEditingCycle(null)}
                              className="px-3 py-1 bg-slate-200 text-slate-700 text-xs font-bold rounded"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <>
                            <div>
                              <span className="text-xs font-bold text-blue-900 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                                Academic Year {c.academicYear}
                              </span>
                              <h4 className="text-sm font-bold text-slate-900 mt-1">{c.title}</h4>
                              <div className="text-xs text-slate-500 mt-0.5">
                                Program: {c.programName} ({c.schoolName})
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => setEditingCycle(c)}
                                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-lg"
                              >
                                ✏️ Edit Cycle
                              </button>
                              <button
                                onClick={() => handleDeleteCycle(c.id, c.title)}
                                className="px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-700 text-xs font-bold rounded-lg"
                              >
                                🗑️ Delete Cycle
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </main>
      </div>

      <ERPModal
        isOpen={modalState.isOpen}
        title={modalState.title}
        message={modalState.message}
        type={modalState.type}
        confirmText={modalState.type === "confirm" ? "Proceed Delete" : "Done"}
        cancelText="Cancel"
        onConfirm={() => {
          if (modalState.onConfirmAction) {
            modalState.onConfirmAction();
          } else {
            setModalState((prev) => ({ ...prev, isOpen: false }));
          }
        }}
        onCancel={modalState.type === "confirm" ? () => setModalState((prev) => ({ ...prev, isOpen: false })) : undefined}
      >
        {modalState.userCredentials && (
          <div className="bg-slate-50 border p-4 rounded-lg font-mono text-xs space-y-2 mt-2">
            <div><span className="text-slate-500">Email:</span> {modalState.userCredentials.email}</div>
            <div><span className="text-slate-500">Role:</span> {modalState.userCredentials.role}</div>
            <div><span className="text-slate-500">Temp Password:</span> <strong className="text-blue-700 bg-blue-50 px-2 py-0.5 rounded">{modalState.userCredentials.tempPass}</strong></div>
          </div>
        )}
      </ERPModal>
    </div>
  );
}
