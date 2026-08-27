"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Header } from "@/components/layout/Header";
import { Sidebar } from "@/components/layout/Sidebar";
import { fetchApi } from "@/lib/api";
import { ERPStatusChip } from "@/components/ui/ERPStatusChip";
import { ERPModal } from "@/components/ui/ERPModal";

export default function VerificationStudentDetailPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const studentDbId = params.id as string;

  const filterSchoolId = searchParams.get("schoolId") || "";
  const filterProgramId = searchParams.get("programId") || "";

  const [currentUser, setCurrentUser] = useState<any | null>(null);
  const [student, setStudent] = useState<any | null>(null);
  const [unmaskedAadhaar, setUnmaskedAadhaar] = useState<string | null>(null);
  const [reuploadRemarksMap, setReuploadRemarksMap] = useState<Record<string, string>>({});
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
    loadUserAndStudent();
  }, [studentDbId]);

  const loadUserAndStudent = async () => {
    setLoading(true);
    try {
      const [userRes, studentsRes] = await Promise.all([
        fetchApi("/auth/me"),
        fetchApi("/students"),
      ]);

      if (userRes.success) setCurrentUser(userRes.data);
      if (studentsRes.success) {
        const found = studentsRes.data.find((s: any) => s.id === studentDbId);
        setStudent(found || null);
      }
    } catch (err: any) {
      console.error("Failed to load student detail:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleUnmaskAadhaar = async () => {
    if (!student) return;
    try {
      const res = await fetchApi(`/students/${student.id}/unmask-aadhaar`, {
        method: "POST",
      });
      if (res.success) {
        setUnmaskedAadhaar(res.data.unmaskedAadhaar);
        setModalState({
          isOpen: true,
          title: "Aadhaar Access Audited",
          message: `Aadhaar number unmasked for Student ${res.data.studentId}. Recorded in immutable security audit log.`,
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

  const handleDocumentStatusUpdate = async (docId: string, targetStatus: "VERIFIED" | "REJECTED_REUPLOAD_REQUIRED") => {
    const remarks = reuploadRemarksMap[docId] || "";
    if (targetStatus === "REJECTED_REUPLOAD_REQUIRED" && !remarks.trim()) {
      setModalState({
        isOpen: true,
        title: "Remarks Required",
        message: "Please enter specific remarks for why this certificate scan needs to be re-uploaded.",
        type: "warning",
      });
      return;
    }

    setActionLoading(true);
    try {
      const res = await fetchApi(`/documents/${docId}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status: targetStatus, remarks }),
      });

      if (res.success) {
        setModalState({
          isOpen: true,
          title: targetStatus === "VERIFIED" ? "Certificate Verified" : "Re-upload Requested & Email Dispatched",
          message:
            targetStatus === "VERIFIED"
              ? "Certificate scan approved."
              : `Re-upload requested for certificate. Automated email notification dispatched to student.`,
          type: "success",
        });
        loadUserAndStudent();
      }
    } catch (err: any) {
      setModalState({
        isOpen: true,
        title: "Update Failed",
        message: err.message || "Failed to update document status.",
        type: "danger",
      });
    } finally {
      setActionLoading(false);
    }
  };

  const handleApplicationStatusChange = async (targetStatus: string) => {
    if (!student?.applicationId) return;
    setActionLoading(true);
    try {
      const res = await fetchApi(`/applications/${student.applicationId}/status`, {
        method: "PATCH",
        body: JSON.stringify({ targetStatus, remarks: "Updated by Verification Officer" }),
      });

      if (res.success) {
        setModalState({
          isOpen: true,
          title: "Application Workflow Updated",
          message: `Application workflow status updated to ${targetStatus}.`,
          type: "success",
        });
        loadUserAndStudent();
      }
    } catch (err: any) {
      setModalState({
        isOpen: true,
        title: "Update Failed",
        message: err.message || "Could not update status.",
        type: "danger",
      });
    } finally {
      setActionLoading(false);
    }
  };

  const userRole = currentUser?.role?.name || "OFFICE_USER";
  const userEmail = currentUser?.email || "office@gvpihlr.edu.in";

  // Build Back URL preserving exact filters
  const backQueryParams = new URLSearchParams();
  if (filterSchoolId) backQueryParams.append("schoolId", filterSchoolId);
  if (filterProgramId) backQueryParams.append("programId", filterProgramId);
  const backUrl = `/verification${backQueryParams.toString() ? `?${backQueryParams.toString()}` : ""}`;

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col">
      <Header userEmail={userEmail} userRole={userRole} />
      <div className="flex-1 flex">
        <Sidebar userRole={userRole} />
        <main className="flex-1 p-8 max-w-6xl space-y-6">
          {/* Back Navigation Bar */}
          <div className="flex items-center justify-between">
            <Link
              href={backUrl}
              className="px-4 py-2 bg-white hover:bg-slate-50 text-slate-800 text-xs font-bold rounded-xl border border-slate-200 shadow-2xs inline-flex items-center gap-2 transition-colors"
            >
              <span>←</span>
              <span>Back to Verification Roster</span>
            </Link>
          </div>

          {loading || !student ? (
            <div className="bg-white p-12 rounded-2xl text-center text-xs text-slate-400 border">
              Loading student verification details...
            </div>
          ) : (
            <div className="space-y-6">
              {/* Header Card */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                  <span className="px-2.5 py-1 bg-blue-50 text-blue-900 font-bold font-mono text-xs rounded-md border border-blue-200 inline-block mb-1">
                    {student.studentId}
                  </span>
                  <h2 className="text-xl font-bold text-slate-900">{student.fullName}</h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {student.programName} • {student.schoolName} ({student.academicYear} {student.cycleTitle})
                  </p>
                </div>
                <div>
                  <ERPStatusChip status={student.applicationStatus} />
                </div>
              </div>

              {/* Personal & Aadhaar Info Card */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-700 border-b pb-2">
                  👤 Personal &amp; Identity Information
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 text-xs">
                  <div>
                    <span className="text-slate-500 block text-[10px] uppercase font-bold">Registered Email</span>
                    <strong className="text-slate-900 text-sm">{student.email}</strong>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[10px] uppercase font-bold">Date of Birth</span>
                    <strong className="text-slate-900 text-sm">{new Date(student.dateOfBirth).toLocaleDateString()}</strong>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[10px] uppercase font-bold">Aadhaar (AES-256 Protected)</span>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="font-mono bg-slate-100 px-2.5 py-1 rounded border border-slate-200 text-xs font-bold">
                        {unmaskedAadhaar || student.maskedAadhaar}
                      </span>
                      {!unmaskedAadhaar && (
                        <button
                          onClick={handleUnmaskAadhaar}
                          className="text-xs font-bold text-blue-700 hover:underline"
                        >
                          👁️ Unmask
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Submitted Custom Form Responses Card */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-700 border-b pb-2">
                  📝 Student Form Responses
                </h3>
                {Object.keys(student.customFormData || {}).length === 0 ? (
                  <p className="text-xs text-slate-400 italic">No custom form responses saved yet.</p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {Object.entries(student.customFormData).map(([k, val]: any) => (
                      <div key={k} className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs space-y-1">
                        <span className="text-[10px] font-bold uppercase text-slate-500 block">{k}</span>
                        {typeof val === "object" && val !== null ? (
                          <div className="font-mono text-slate-900">
                            Secured: {val.secured} / {val.total} | <strong className="text-green-700 font-bold">{val.percentage}%</strong>
                          </div>
                        ) : Array.isArray(val) ? (
                          <div className="font-semibold text-slate-900">{val.join(", ")}</div>
                        ) : (
                          <div className="font-semibold text-slate-900">{String(val)}</div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Uploaded Certificate Scans Audit Card */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-700 border-b pb-2">
                  📁 Certificate Scans Uploaded by Student ({student.documents?.length || 0} Files)
                </h3>

                {(!student.documents || student.documents.length === 0) ? (
                  <div className="p-8 text-center text-xs text-slate-400 border-2 border-dashed rounded-xl">
                    No certificate files uploaded by student yet.
                  </div>
                ) : (
                  <div className="space-y-4">
                    {student.documents.map((doc: any) => {
                      const latestVersion = doc.versions?.[0];
                      const isVerified = doc.status === "VERIFIED";
                      const isReuploadReq = doc.status === "REJECTED_REUPLOAD_REQUIRED";

                      return (
                        <div key={doc.id} className="p-5 border rounded-2xl bg-white shadow-2xs space-y-3">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-3">
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="text-base">📜</span>
                                <h4 className="text-xs font-bold text-slate-900 uppercase">{doc.documentType}</h4>
                                <span
                                  className={`px-2.5 py-0.5 text-[10px] font-bold rounded-full border ${
                                    isVerified
                                      ? "bg-emerald-50 text-emerald-900 border-emerald-300"
                                      : isReuploadReq
                                      ? "bg-rose-50 text-rose-900 border-rose-300"
                                      : "bg-amber-50 text-amber-900 border-amber-300"
                                  }`}
                                >
                                  {isVerified ? "✅ Verified" : isReuploadReq ? "⚠️ Re-upload Requested" : "⏳ Pending Audit"}
                                </span>
                              </div>
                              {latestVersion && (
                                <div className="text-[11px] text-slate-500 font-mono mt-0.5">
                                  File: {latestVersion.fileName} (v{latestVersion.versionNumber})
                                </div>
                              )}
                            </div>

                            {latestVersion && (
                              <a
                                href={`http://localhost:4000/api/v1/documents/stream/${latestVersion.fileName}`}
                                target="_blank"
                                rel="noreferrer"
                                className="px-3.5 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-800 text-xs font-bold rounded-lg border border-blue-200 inline-flex items-center gap-1.5"
                              >
                                <span>👁️ View Certificate Scan</span>
                              </a>
                            )}
                          </div>

                          {/* Existing Officer Remarks */}
                          {doc.remarks && (
                            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-900">
                              <strong>Officer Note:</strong> {doc.remarks}
                            </div>
                          )}

                          {/* Certificate Actions */}
                          <div className="flex flex-col sm:flex-row items-center gap-3 pt-1">
                            <input
                              type="text"
                              placeholder="Enter specific remarks if requesting re-upload (e.g. Scan is blurry)..."
                              value={reuploadRemarksMap[doc.id] || ""}
                              onChange={(e) =>
                                setReuploadRemarksMap((prev) => ({ ...prev, [doc.id]: e.target.value }))
                              }
                              className="flex-1 px-3.5 py-2 border rounded-xl text-xs bg-slate-50"
                            />

                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => handleDocumentStatusUpdate(doc.id, "VERIFIED")}
                                disabled={actionLoading}
                                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-xs transition-colors whitespace-nowrap"
                              >
                                ✓ Approve Scan
                              </button>
                              <button
                                onClick={() => handleDocumentStatusUpdate(doc.id, "REJECTED_REUPLOAD_REQUIRED")}
                                disabled={actionLoading}
                                className="px-4 py-2 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-xs transition-colors whitespace-nowrap"
                              >
                                ⚠️ Request Re-upload &amp; Email Student
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Bottom Action Bar */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <ERPStatusChip status={student.applicationStatus} />

                <div className="flex items-center gap-3">
                  <button
                    onClick={() => handleApplicationStatusChange("CORRECTION_REQUIRED")}
                    disabled={actionLoading}
                    className="px-4 py-2.5 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-xs transition-colors inline-flex items-center gap-1.5"
                  >
                    <span>🔓</span>
                    <span>Unlock Application for Student Edit (Correction Required)</span>
                  </button>
                  <button
                    onClick={() => handleApplicationStatusChange("DOCUMENTS_VERIFIED")}
                    disabled={actionLoading}
                    className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-xs transition-colors"
                  >
                    ✅ Approve All Certificates (Mark Documents Verified)
                  </button>
                </div>
              </div>
            </div>
          )}
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
