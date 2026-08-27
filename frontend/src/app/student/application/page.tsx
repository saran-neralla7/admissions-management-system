"use client";

import React, { useState, useEffect } from "react";
import { Header } from "@/components/layout/Header";
import { Sidebar } from "@/components/layout/Sidebar";
import { fetchApi, uploadApi } from "@/lib/api";
import { ERPStatusChip } from "@/components/ui/ERPStatusChip";
import { ERPModal } from "@/components/ui/ERPModal";
import { GVPLogoSpinner } from "@/components/ui/GVPLogoSpinner";

export default function StudentApplicationPage() {
  const [appData, setAppData] = useState<any | null>(null);
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [aadhaarConsent, setAadhaarConsent] = useState(false);
  const [isEditingOverride, setIsEditingOverride] = useState(false);

  // Fee state
  const [amountPaid, setAmountPaid] = useState("");
  const [transactionRefNo, setTransactionRefNo] = useState("");
  const [feeFile, setFeeFile] = useState<File | null>(null);
  const [submittingFee, setSubmittingFee] = useState(false);

  // Document upload state
  const [uploadingDocType, setUploadingDocType] = useState<string | null>(null);
  const [selectedDocFiles, setSelectedDocFiles] = useState<Record<string, File | null>>({});
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
    loadMyApplication();
  }, []);

  const loadMyApplication = async () => {
    setLoading(true);
    try {
      const res = await fetchApi("/applications/my-application");
      if (res.success) {
        setAppData(res.data);
        setFormData(res.data.application.customFormData || {});
      }
    } catch (err: any) {
      console.error("Failed to load application:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (key: string, val: any) => {
    setFormData((prev) => ({ ...prev, [key]: val }));
  };

  const handleMarksChange = (key: string, part: "secured" | "total", val: string) => {
    const currentObj = formData[key] || { secured: "", total: "", percentage: "" };
    const updatedSecured = part === "secured" ? val : currentObj.secured;
    const updatedTotal = part === "total" ? val : currentObj.total;

    let calcPct = "";
    const secNum = parseFloat(updatedSecured);
    const totNum = parseFloat(updatedTotal);
    if (!isNaN(secNum) && !isNaN(totNum) && totNum > 0) {
      calcPct = ((secNum / totNum) * 100).toFixed(2);
    }

    setFormData((prev) => ({
      ...prev,
      [key]: {
        secured: updatedSecured,
        total: updatedTotal,
        percentage: calcPct,
      },
    }));
  };

  const handleMultiSelectChange = (key: string, option: string, isChecked: boolean) => {
    const currentArr: string[] = Array.isArray(formData[key]) ? formData[key] : [];
    let updatedArr: string[];
    if (isChecked) {
      updatedArr = [...currentArr, option];
    } else {
      updatedArr = currentArr.filter((o) => o !== option);
    }
    setFormData((prev) => ({ ...prev, [key]: updatedArr }));
  };

  const handleSaveDraft = async () => {
    try {
      const res = await fetchApi("/applications/my-application/draft", {
        method: "PATCH",
        body: JSON.stringify({ customFormData: formData }),
      });
      if (res.success) {
        setModalState({
          isOpen: true,
          title: "Draft Saved",
          message: "Your application form responses have been saved.",
          type: "success",
        });
        loadMyApplication();
      }
    } catch (err: any) {
      setModalState({
        isOpen: true,
        title: "Save Failed",
        message: err.message || "Failed to save draft.",
        type: "danger",
      });
    }
  };

  const handleDocumentFileUpload = async (docType: string) => {
    const file = selectedDocFiles[docType];
    if (!file || !appData) {
      setModalState({
        isOpen: true,
        title: "No File Selected",
        message: "Please choose a file scan (PDF, JPG, PNG) before clicking Upload.",
        type: "warning",
      });
      return;
    }

    setUploadingDocType(docType);
    const payload = new FormData();
    payload.append("applicationId", appData.application.id);
    payload.append("documentType", docType);
    payload.append("document", file);

    try {
      const res = await uploadApi("/documents/upload", payload);
      if (res.success) {
        setModalState({
          isOpen: true,
          title: "Document Uploaded",
          message: `Certificate uploaded successfully. Verification officers will audit your scan.`,
          type: "success",
        });
        setSelectedDocFiles((prev) => ({ ...prev, [docType]: null }));
        loadMyApplication();
      }
    } catch (err: any) {
      setModalState({
        isOpen: true,
        title: "Upload Failed",
        message: err.message || "Failed to upload document.",
        type: "danger",
      });
    } finally {
      setUploadingDocType(null);
    }
  };

  const handleSubmitApplication = async () => {
    if (!aadhaarConsent) {
      setModalState({
        isOpen: true,
        title: "Consent Required",
        message: "Please read and check the mandatory Aadhaar & Information Verification Consent checkbox before submitting.",
        type: "warning",
      });
      return;
    }

    setActionLoading(true);
    try {
      // Save draft first
      await fetchApi("/applications/my-application/draft", {
        method: "PATCH",
        body: JSON.stringify({ customFormData: formData }),
      });

      const res = await fetchApi("/applications/my-application/submit", {
        method: "POST",
      });

      if (res.success) {
        setModalState({
          isOpen: true,
          title: "Application Submitted & Locked! 🎉",
          message: "Your application has been locked and submitted to GVP Admissions Verification Office.",
          type: "success",
        });
        setIsEditingOverride(false);
        loadMyApplication();
      }
    } catch (err: any) {
      setModalState({
        isOpen: true,
        title: "Submission Error",
        message: err.message || "Could not submit application.",
        type: "danger",
      });
    } finally {
      setActionLoading(false);
    }
  };

  const handleFeeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!appData || !feeFile || !amountPaid || !transactionRefNo) {
      setModalState({
        isOpen: true,
        title: "Missing Fields",
        message: "Please enter amount paid, transaction ref #, and upload receipt file.",
        type: "warning",
      });
      return;
    }

    setSubmittingFee(true);
    const payload = new FormData();
    payload.append("applicationId", appData.application.id);
    payload.append("amountPaid", amountPaid);
    payload.append("transactionRefNo", transactionRefNo);
    payload.append("receipt", feeFile);

    try {
      const res = await uploadApi("/fees/submit", payload);
      if (res.success) {
        setModalState({
          isOpen: true,
          title: "Fee Receipt Submitted",
          message: "Your payment receipt has been submitted to Central Accounts for verification.",
          type: "success",
        });
        setAmountPaid("");
        setTransactionRefNo("");
        setFeeFile(null);
        loadMyApplication();
      }
    } catch (err: any) {
      setModalState({
        isOpen: true,
        title: "Fee Submission Error",
        message: err.message || "Failed to submit fee payment.",
        type: "danger",
      });
    } finally {
      setSubmittingFee(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-100 flex flex-col">
        <Header userEmail="Student" userRole="STUDENT" />
        <div className="flex-1 flex items-center justify-center">
          <GVPLogoSpinner label="Loading GVP Student Application Portal..." />
        </div>
      </div>
    );
  }

  if (!appData) {
    return (
      <div className="min-h-screen bg-slate-100 flex flex-col">
        <Header userEmail="Student" userRole="STUDENT" />
        <div className="flex-1 flex">
          <Sidebar userRole="STUDENT" />
          <main className="flex-1 p-8">
            <div className="bg-white rounded-xl p-8 text-center text-slate-500 text-xs border">
              No active application record found. Please contact GVP Admissions Office.
            </div>
          </main>
        </div>
      </div>
    );
  }

  const { student, application } = appData;
  const programFields = student.program.formFields || [];
  const docRequirements = student.program.docRequirements || [];
  const uploadedDocuments = application.documents || [];
  const feeRecords = application.feeRecords || [];

  const isUnlockedStatus =
    application.status === "STUDENT_INVITED" ||
    application.status === "APPLICATION_IN_PROGRESS" ||
    application.status === "CORRECTION_REQUIRED";

  const isFormLocked = !isUnlockedStatus && !isEditingOverride;

  const groupedSections: Record<string, any[]> = {};
  programFields.forEach((f: any) => {
    const sec = f.sectionName || "General Details";
    if (!groupedSections[sec]) groupedSections[sec] = [];
    groupedSections[sec].push(f);
  });

  const sectionTitles = Object.keys(groupedSections);
  if (sectionTitles.length === 0) sectionTitles.push("General Details");

  const allWizardSteps = [
    ...sectionTitles.map((title, idx) => ({ id: `sec_${idx}`, label: title, type: "form_section", index: idx })),
    { id: "sec_docs", label: "Document Scans Upload", type: "documents", index: sectionTitles.length },
    { id: "sec_consent", label: "Aadhaar Consent & Submit", type: "consent", index: sectionTitles.length + 1 },
  ];

  const currentStep = allWizardSteps[Math.min(currentStepIndex, allWizardSteps.length - 1)];

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col">
      <Header userEmail={student.fullName} userRole="STUDENT" schoolName={student.program.school.name} />
      <div className="flex-1 flex">
        <Sidebar userRole="STUDENT" />
        <main className="flex-1 p-8 max-w-5xl space-y-6">
          {/* Top Student Banner Card */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <span className="px-2.5 py-1 bg-blue-50 text-blue-900 font-bold font-mono text-xs rounded-md border border-blue-200 inline-block mb-1">
                {student.studentId}
              </span>
              <h2 className="text-xl font-bold text-slate-900">{student.fullName}</h2>
              <p className="text-xs text-slate-500 mt-0.5">{student.program.name} ({student.program.school.name})</p>
            </div>
            <div className="flex items-center gap-3">
              <ERPStatusChip status={application.status} />
              {!isUnlockedStatus && (
                <span className="px-3 py-1 bg-slate-100 text-slate-700 font-bold text-xs rounded-full border border-slate-300 inline-flex items-center gap-1">
                  <span>🔒 Form Locked</span>
                </span>
              )}
            </div>
          </div>

          {/* Correction Required Warning Banner */}
          {application.status === "CORRECTION_REQUIRED" && (
            <div className="p-5 bg-rose-50 border border-rose-300 rounded-2xl shadow-xs space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-rose-900 uppercase tracking-wider flex items-center gap-2">
                  <span>⚠️</span> Correction Required by Admissions / Finance Officer
                </h4>
                <button
                  onClick={() => setIsEditingOverride(true)}
                  className="px-3 py-1 bg-rose-900 text-white font-bold text-xs rounded-lg hover:bg-rose-800 transition-colors"
                >
                  🔓 Edit Form / Re-upload File
                </button>
              </div>
              <p className="text-xs text-rose-800">
                The verification officer requested corrections to your form responses or document scans. Please inspect the officer notes below and click Edit to make corrections.
              </p>
            </div>
          )}

          {/* IF FORM IS LOCKED: READ-ONLY SUMMARY PORTAL */}
          {isFormLocked ? (
            <div className="space-y-6">
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8 space-y-6">
                <div className="border-b pb-4 flex items-center justify-between">
                  <div>
                    <h3 className="text-base font-bold text-slate-900">📄 Submitted Application Summary</h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Your application has been submitted and locked for verification. View your responses below.
                    </p>
                  </div>
                  <span className="px-3 py-1 bg-emerald-50 text-emerald-900 font-bold text-xs rounded-full border border-emerald-200">
                    ✓ Submitted
                  </span>
                </div>

                {/* Section-by-Section Form Summary */}
                <div className="space-y-6">
                  {Object.entries(groupedSections).map(([secTitle, secFields]) => (
                    <div key={secTitle} className="border border-slate-200 rounded-xl p-5 bg-slate-50/50 space-y-3">
                      <h4 className="text-xs font-bold uppercase text-slate-800 tracking-wider border-b pb-2 flex items-center gap-2">
                        <span>📁</span> {secTitle}
                      </h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {secFields.map((f: any) => {
                          const val = formData[f.fieldKey];
                          return (
                            <div key={f.id} className="p-3.5 bg-white border border-slate-200 rounded-xl text-xs space-y-1">
                              <span className="text-[10px] font-bold uppercase text-slate-500 block">{f.fieldLabel}</span>
                              {typeof val === "object" && val !== null ? (
                                <div className="font-mono text-slate-900">
                                  Secured: {val.secured} / {val.total} | <strong className="text-green-700 font-bold">{val.percentage}%</strong>
                                </div>
                              ) : Array.isArray(val) ? (
                                <div className="font-semibold text-slate-900">{val.join(", ")}</div>
                              ) : (
                                <div className="font-semibold text-slate-900">{String(val || "N/A")}</div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Uploaded Certificate Status Summary */}
                <div className="space-y-3 border-t pt-6">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                    📁 Uploaded Certificate Scans ({uploadedDocuments.length} Scans)
                  </h4>
                  {uploadedDocuments.length === 0 ? (
                    <p className="text-xs text-slate-400 italic">No certificates uploaded.</p>
                  ) : (
                    <div className="space-y-3">
                      {uploadedDocuments.map((doc: any) => {
                        const latestVersion = doc.versions?.[0];
                        const isVerified = doc.status === "VERIFIED";
                        const isReuploadReq = doc.status === "REJECTED_REUPLOAD_REQUIRED";

                        return (
                          <div key={doc.id} className="p-4 border rounded-xl bg-white flex items-center justify-between text-xs">
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <span className="font-bold uppercase text-slate-900">{doc.documentType}</span>
                                <span
                                  className={`px-2 py-0.5 text-[10px] font-bold rounded-full border ${
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
                              {doc.remarks && (
                                <div className="text-[11px] text-rose-900 bg-rose-50 p-2 rounded border border-rose-200">
                                  <strong>Officer Note:</strong> {doc.remarks}
                                </div>
                              )}
                            </div>
                            {latestVersion && (
                              <a
                                href={`http://localhost:4000/api/v1/documents/stream/${latestVersion.fileName}`}
                                target="_blank"
                                rel="noreferrer"
                                className="px-3 py-1.5 bg-blue-50 text-blue-800 font-bold rounded-lg border border-blue-200 text-xs"
                              >
                                👁️ View Scan
                              </a>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              {/* Fee Receipts Card */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8 space-y-6">
                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-700 border-b pb-3">
                  💳 Application &amp; Tuition Fee Payment Receipts
                </h3>

                {feeRecords.length > 0 && (
                  <div className="space-y-3">
                    <h4 className="text-xs font-bold uppercase text-slate-600">Submitted Fee Payment Receipts</h4>
                    <div className="space-y-3">
                      {feeRecords.map((f: any) => (
                        <div key={f.id} className="p-4 border rounded-xl bg-slate-50 text-xs flex items-center justify-between">
                          <div>
                            <span className="font-mono font-bold text-slate-900 text-sm">₹{f.amountPaid}</span>
                            <span className="ml-2 font-mono text-blue-900 bg-blue-50 px-2 py-0.5 rounded border">
                              Ref: {f.transactionRefNo}
                            </span>
                            <span className="ml-2 text-[10px] font-bold text-slate-500">
                              ({new Date(f.createdAt).toLocaleDateString()})
                            </span>
                            {f.remarks && (
                              <div className="mt-1 text-rose-900 bg-rose-50 p-1.5 rounded border text-[11px]">
                                <strong>Accounts Note:</strong> {f.remarks}
                              </div>
                            )}
                          </div>
                          <a
                            href={`http://localhost:4000/api/v1/documents/stream/${f.receiptFilePath}`}
                            target="_blank"
                            rel="noreferrer"
                            className="text-blue-700 font-bold hover:underline"
                          >
                            👁️ View Receipt
                          </a>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Submit Fee Receipt Form */}
                <form onSubmit={handleFeeSubmit} className="space-y-4 border-t pt-4">
                  <h4 className="text-xs font-bold uppercase text-slate-700">+ Submit Payment Receipt</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold uppercase text-slate-600 mb-1">Amount Paid (₹) *</label>
                      <input
                        type="number"
                        value={amountPaid}
                        onChange={(e) => setAmountPaid(e.target.value)}
                        placeholder={String(student.program.applicationFee)}
                        className="w-full px-3 py-2 border rounded-lg text-xs font-bold"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold uppercase text-slate-600 mb-1">Bank / NEFT / UTR Ref # *</label>
                      <input
                        type="text"
                        value={transactionRefNo}
                        onChange={(e) => setTransactionRefNo(e.target.value)}
                        placeholder="e.g. UTR987654321"
                        className="w-full px-3 py-2 border rounded-lg text-xs font-mono"
                        required
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold uppercase text-slate-600 mb-1">Upload Receipt File *</label>
                    <input
                      type="file"
                      accept=".pdf,.jpg,.jpeg,.png"
                      onChange={(e) => setFeeFile(e.target.files ? e.target.files[0] : null)}
                      className="w-full text-xs text-slate-600 border rounded-lg p-2 bg-slate-50"
                      required
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={submittingFee}
                    className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold text-xs rounded-lg transition-colors"
                  >
                    {submittingFee ? "Submitting..." : "+ Submit Payment Receipt"}
                  </button>
                </form>
              </div>
            </div>
          ) : (
            /* IF FORM IS EDITABLE: STEP WIZARD WITH TOP STEPPER */
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8 space-y-8">
              {/* TOP PROGRESS STEPPER BAR */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold uppercase tracking-wider text-slate-900">
                    Application Form &bull; Step {currentStepIndex + 1} of {allWizardSteps.length}
                  </h3>
                  <span className="text-xs font-bold text-blue-700 bg-blue-50 px-3 py-1 rounded-full border border-blue-200">
                    {currentStep.label}
                  </span>
                </div>

                {/* Progress Bar Track */}
                <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden flex">
                  <div
                    className="bg-slate-900 h-full transition-all duration-300"
                    style={{ width: `${((currentStepIndex + 1) / allWizardSteps.length) * 100}%` }}
                  />
                </div>

                {/* Stepper Node Items */}
                <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-2 pt-2">
                  {allWizardSteps.map((step, idx) => {
                    const isActive = idx === currentStepIndex;
                    const isCompleted = idx < currentStepIndex;

                    return (
                      <button
                        key={step.id}
                        onClick={() => setCurrentStepIndex(idx)}
                        className={`p-2 rounded-xl text-left border transition-all text-xs flex items-center gap-2 ${
                          isActive
                            ? "bg-slate-900 text-white border-slate-900 shadow-xs font-bold"
                            : isCompleted
                            ? "bg-emerald-50 text-emerald-900 border-emerald-200 font-semibold"
                            : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
                        }`}
                      >
                        <span
                          className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                            isActive
                              ? "bg-white text-slate-900"
                              : isCompleted
                              ? "bg-emerald-600 text-white"
                              : "bg-slate-200 text-slate-600"
                          }`}
                        >
                          {isCompleted ? "✓" : idx + 1}
                        </span>
                        <span className="truncate text-[11px]">{step.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* STEP CONTENT SWITCHER */}
              <div className="pt-4 border-t">
                {/* 1. DYNAMIC FORM SECTION STEPS */}
                {currentStep.type === "form_section" && (
                  <div className="space-y-6">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800 border-b pb-2 flex items-center gap-2">
                      <span>📁</span> Section: {currentStep.label}
                    </h4>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {groupedSections[currentStep.label]?.map((f: any) => {
                        const valObj = formData[f.fieldKey] || {};
                        const isRequired = f.validation?.required;

                        if (f.fieldType === "marks_percentage") {
                          const secured = typeof valObj === "object" ? valObj.secured || "" : "";
                          const total = typeof valObj === "object" ? valObj.total || "" : "";
                          const pct = typeof valObj === "object" ? valObj.percentage || "" : "";

                          return (
                            <div key={f.id} className="md:col-span-2 p-4 bg-white border border-slate-200 rounded-xl space-y-3">
                              <div className="flex items-center justify-between">
                                <label className="block text-xs font-bold uppercase tracking-wider text-slate-800">
                                  🧮 {f.fieldLabel} {isRequired && "*"}
                                </label>
                                {pct !== "" && (
                                  <span className="px-3 py-1 bg-green-100 text-green-900 font-bold text-xs rounded-full border border-green-300">
                                    Calculated: {pct}%
                                  </span>
                                )}
                              </div>
                              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                <div>
                                  <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Marks Secured *</label>
                                  <input
                                    type="number"
                                    value={secured}
                                    onChange={(e) => handleMarksChange(f.fieldKey, "secured", e.target.value)}
                                    placeholder="e.g. 540"
                                    className="w-full px-3 py-2 border rounded-lg text-xs font-bold"
                                  />
                                </div>
                                <div>
                                  <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Total Max Marks *</label>
                                  <input
                                    type="number"
                                    value={total}
                                    onChange={(e) => handleMarksChange(f.fieldKey, "total", e.target.value)}
                                    placeholder="e.g. 600"
                                    className="w-full px-3 py-2 border rounded-lg text-xs font-bold"
                                  />
                                </div>
                                <div>
                                  <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Auto Percentage (%)</label>
                                  <input
                                    type="text"
                                    value={pct ? `${pct}%` : ""}
                                    readOnly
                                    className="w-full px-3 py-2 bg-slate-100 border rounded-lg text-xs font-mono font-bold text-blue-900"
                                  />
                                </div>
                              </div>
                            </div>
                          );
                        }

                        if (f.fieldType === "radio") {
                          const options: string[] = Array.isArray(f.options) ? f.options : [];
                          return (
                            <div key={f.id} className="md:col-span-2 p-3 bg-white border rounded-xl space-y-2">
                              <label className="block text-xs font-semibold uppercase text-slate-700">
                                {f.fieldLabel} {isRequired && "*"}
                              </label>
                              <div className="flex flex-wrap items-center gap-4">
                                {options.map((opt) => (
                                  <label key={opt} className="flex items-center gap-2 text-xs font-medium cursor-pointer">
                                    <input
                                      type="radio"
                                      name={f.fieldKey}
                                      value={opt}
                                      checked={formData[f.fieldKey] === opt}
                                      onChange={(e) => handleInputChange(f.fieldKey, e.target.value)}
                                      className="w-4 h-4 text-slate-900 border-slate-300"
                                    />
                                    <span>{opt}</span>
                                  </label>
                                ))}
                              </div>
                            </div>
                          );
                        }

                        if (f.fieldType === "multiselect") {
                          const options: string[] = Array.isArray(f.options) ? f.options : [];
                          const selectedArr: string[] = Array.isArray(formData[f.fieldKey]) ? formData[f.fieldKey] : [];
                          return (
                            <div key={f.id} className="md:col-span-2 p-3 bg-white border rounded-xl space-y-2">
                              <label className="block text-xs font-semibold uppercase text-slate-700">
                                {f.fieldLabel} {isRequired && "*"}
                              </label>
                              <div className="flex flex-wrap items-center gap-4">
                                {options.map((opt) => (
                                  <label key={opt} className="flex items-center gap-2 text-xs font-medium cursor-pointer">
                                    <input
                                      type="checkbox"
                                      value={opt}
                                      checked={selectedArr.includes(opt)}
                                      onChange={(e) => handleMultiSelectChange(f.fieldKey, opt, e.target.checked)}
                                      className="w-4 h-4 rounded text-slate-900 border-slate-300"
                                    />
                                    <span>{opt}</span>
                                  </label>
                                ))}
                              </div>
                            </div>
                          );
                        }

                        if (f.fieldType === "textarea") {
                          return (
                            <div key={f.id} className="md:col-span-2">
                              <label className="block text-xs font-semibold uppercase text-slate-600 mb-1">
                                {f.fieldLabel} {isRequired && "*"}
                              </label>
                              <textarea
                                value={formData[f.fieldKey] || ""}
                                onChange={(e) => handleInputChange(f.fieldKey, e.target.value)}
                                rows={3}
                                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs"
                              />
                            </div>
                          );
                        }

                        return (
                          <div key={f.id}>
                            <label className="block text-xs font-semibold uppercase text-slate-600 mb-1">
                              {f.fieldLabel} {isRequired && "*"}
                            </label>
                            {f.fieldType === "select" ? (
                              <select
                                value={formData[f.fieldKey] || ""}
                                onChange={(e) => handleInputChange(f.fieldKey, e.target.value)}
                                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-semibold"
                              >
                                <option value="">Select option...</option>
                                {Array.isArray(f.options) &&
                                  f.options.map((opt: string) => (
                                    <option key={opt} value={opt}>
                                      {opt}
                                    </option>
                                  ))}
                              </select>
                            ) : (
                              <input
                                type={f.fieldType === "number" ? "number" : f.fieldType === "date" ? "date" : "text"}
                                value={formData[f.fieldKey] || ""}
                                onChange={(e) => handleInputChange(f.fieldKey, e.target.value)}
                                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-medium"
                              />
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* 2. DOCUMENT UPLOADS STEP */}
                {currentStep.type === "documents" && (
                  <div className="space-y-6">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800 border-b pb-2 flex items-center gap-2">
                      <span>📁</span> Required Certificate Scans Upload ({docRequirements.length} Rules)
                    </h4>

                    {docRequirements.length === 0 ? (
                      <div className="p-6 text-center text-xs text-slate-400 border-2 border-dashed rounded-xl">
                        No document upload rules required for this program.
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {docRequirements.map((d: any) => {
                          const existingDoc = uploadedDocuments.find((doc: any) => doc.documentType === d.type);
                          const latestVersion = existingDoc?.versions?.[0];
                          const isVerified = existingDoc?.status === "VERIFIED";
                          const isReuploadReq = existingDoc?.status === "REJECTED_REUPLOAD_REQUIRED";

                          return (
                            <div
                              key={d.id || d.type}
                              className={`p-4 border rounded-xl space-y-3 ${
                                isReuploadReq ? "bg-rose-50 border-rose-300" : "bg-slate-50 border-slate-200"
                              }`}
                            >
                              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b pb-2">
                                <div>
                                  <div className="flex items-center gap-2">
                                    <span className="text-sm">📄</span>
                                    <h4 className="text-xs font-bold text-slate-900">{d.label}</h4>
                                    <span
                                      className={`px-2 py-0.5 text-[10px] font-bold rounded ${
                                        d.required ? "bg-red-100 text-red-800" : "bg-slate-100 text-slate-600"
                                      }`}
                                    >
                                      {d.required ? "Mandatory Upload" : "Optional"}
                                    </span>
                                  </div>
                                </div>
                                <div>
                                  {isVerified ? (
                                    <span className="px-3 py-1 bg-emerald-100 text-emerald-900 font-bold text-xs rounded-full border border-emerald-300">
                                      ✅ Verified
                                    </span>
                                  ) : isReuploadReq ? (
                                    <span className="px-3 py-1 bg-rose-100 text-rose-900 font-bold text-xs rounded-full border border-rose-300">
                                      ⚠️ Re-upload Requested
                                    </span>
                                  ) : latestVersion ? (
                                    <span className="px-3 py-1 bg-blue-100 text-blue-900 font-bold text-xs rounded-full border border-blue-300">
                                      ⏳ Pending Audit
                                    </span>
                                  ) : (
                                    <span className="px-3 py-1 bg-amber-100 text-amber-900 font-bold text-xs rounded-full border border-amber-300">
                                      ⏳ Upload Pending
                                    </span>
                                  )}
                                </div>
                              </div>

                              {existingDoc?.remarks && (
                                <div className="p-3 bg-rose-100/80 border border-rose-300 rounded-lg text-xs text-rose-900">
                                  <strong>⚠️ Officer Note:</strong> {existingDoc.remarks}
                                </div>
                              )}

                              <div className="flex flex-col sm:flex-row items-center gap-3">
                                <input
                                  type="file"
                                  accept=".pdf,.jpg,.jpeg,.png"
                                  onChange={(e) => {
                                    const f = e.target.files ? e.target.files[0] : null;
                                    setSelectedDocFiles((prev) => ({ ...prev, [d.type]: f }));
                                  }}
                                  className="flex-1 text-xs border rounded-lg p-2 bg-white"
                                />
                                <button
                                  onClick={() => handleDocumentFileUpload(d.type)}
                                  disabled={uploadingDocType === d.type || !selectedDocFiles[d.type]}
                                  className="px-4 py-2 bg-slate-900 text-white font-bold text-xs rounded-lg hover:bg-slate-800 transition-colors whitespace-nowrap"
                                >
                                  {uploadingDocType === d.type ? "Uploading..." : "📤 Upload Scan"}
                                </button>
                              </div>

                              {latestVersion && (
                                <div className="text-[11px] text-slate-600 bg-white p-2.5 border rounded-lg flex items-center justify-between">
                                  <span>Uploaded: {latestVersion.fileName} (v{latestVersion.versionNumber})</span>
                                  <a
                                    href={`http://localhost:4000/api/v1/documents/stream/${latestVersion.fileName}`}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="text-blue-700 font-bold hover:underline"
                                  >
                                    👁️ View Scan
                                  </a>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}

                {/* 3. COOL INTERACTIVE AADHAAR CONSENT & DECLARATION STEP */}
                {currentStep.type === "consent" && (
                  <div className="space-y-6">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800 border-b pb-2 flex items-center gap-2">
                      <span>🛡️</span> Final Step: Aadhaar Verification &amp; Consent Agreement
                    </h4>

                    {/* COOL INTERACTIVE CONSENT CARD */}
                    <div
                      className={`p-6 rounded-2xl border transition-all duration-300 space-y-6 ${
                        aadhaarConsent
                          ? "bg-slate-900 text-white border-slate-900 shadow-xl ring-2 ring-emerald-500/50"
                          : "bg-slate-50 text-slate-800 border-slate-200 shadow-xs"
                      }`}
                    >
                      <div className="flex items-center justify-between border-b border-slate-700/50 pb-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center text-xl">
                            📜
                          </div>
                          <div>
                            <h5 className="font-bold text-sm">GVP Identity &amp; Aadhaar Verification Agreement</h5>
                            <span className="text-[11px] opacity-75">Encrypted AES-256 Protocol &bull; Statutory Compliance</span>
                          </div>
                        </div>

                        <span
                          className={`px-3.5 py-1 text-xs font-bold rounded-full border transition-all ${
                            aadhaarConsent
                              ? "bg-emerald-500/20 text-emerald-300 border-emerald-400/30"
                              : "bg-amber-100 text-amber-900 border-amber-300"
                          }`}
                        >
                          {aadhaarConsent ? "✅ Consent Verified & Signed" : "⏳ Consent Pending"}
                        </span>
                      </div>

                      <div className="space-y-3 text-xs leading-relaxed opacity-90">
                        <p>
                          I hereby declare that all personal details, academic percentage marks, and certificate scans submitted in this application are authentic, original, and accurate to the best of my knowledge.
                        </p>
                        <p>
                          <strong>Aadhaar Consent Clause:</strong> I voluntarily consent to provide my 12-digit Aadhaar number and uploaded document scans to <strong>Gayatri Vidya Parishad (GVP)</strong> for student identity verification, admission processing, and audit compliance under AES-256 encrypted security protocols.
                        </p>
                      </div>

                      {/* Cool Toggle Action Box */}
                      <div
                        onClick={() => setAadhaarConsent(!aadhaarConsent)}
                        className={`p-4 rounded-xl border cursor-pointer select-none transition-all flex items-center justify-between ${
                          aadhaarConsent
                            ? "bg-emerald-500/15 border-emerald-400/40 text-emerald-200"
                            : "bg-white border-slate-300 hover:border-slate-400 text-slate-900"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-6 h-6 rounded-lg flex items-center justify-center border transition-all font-bold text-xs ${
                              aadhaarConsent
                                ? "bg-emerald-500 text-white border-emerald-400 scale-110"
                                : "bg-slate-100 border-slate-400 text-transparent"
                            }`}
                          >
                            ✓
                          </div>
                          <span className="font-bold text-xs">
                            I accept the terms, verify information accuracy, and sign Aadhaar consent.
                          </span>
                        </div>

                        <span className="text-[11px] font-mono opacity-75">
                          {aadhaarConsent ? "[ CLICK TO UNCHECK ]" : "[ CLICK TO SIGN ]"}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* BOTTOM WIZARD CONTROLS */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-6 border-t">
                <div className="flex items-center gap-3 w-full sm:w-auto">
                  {currentStepIndex > 0 && (
                    <button
                      onClick={() => setCurrentStepIndex((prev) => prev - 1)}
                      className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold rounded-xl transition-colors"
                    >
                      ← Previous Section
                    </button>
                  )}
                  <button
                    onClick={handleSaveDraft}
                    className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold rounded-xl transition-colors"
                  >
                    💾 Save Draft
                  </button>
                </div>

                <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
                  {currentStepIndex < allWizardSteps.length - 1 ? (
                    <button
                      onClick={() => setCurrentStepIndex((prev) => prev + 1)}
                      className="px-6 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow-xs transition-colors"
                    >
                      Next Section →
                    </button>
                  ) : (
                    <button
                      onClick={handleSubmitApplication}
                      disabled={actionLoading || !aadhaarConsent}
                      className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold text-xs uppercase tracking-wider rounded-xl shadow-md transition-all"
                    >
                      {actionLoading ? "Submitting & Locking..." : "🚀 Submit Application & Lock Form"}
                    </button>
                  )}
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
