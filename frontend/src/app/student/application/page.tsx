"use client";

import React, { useState, useEffect } from "react";
import { Header } from "@/components/layout/Header";
import { Sidebar } from "@/components/layout/Sidebar";
import { fetchApi, uploadApi } from "@/lib/api";
import { ERPStatusChip } from "@/components/ui/ERPStatusChip";
import { ERPModal } from "@/components/ui/ERPModal";

export default function StudentApplicationPage() {
  const [appData, setAppData] = useState<any | null>(null);
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [amountPaid, setAmountPaid] = useState("");
  const [transactionRefNo, setTransactionRefNo] = useState("");
  const [feeFile, setFeeFile] = useState<File | null>(null);
  const [uploadingDocType, setUploadingDocType] = useState<string | null>(null);
  const [submittingFee, setSubmittingFee] = useState(false);
  const [selectedDocFiles, setSelectedDocFiles] = useState<Record<string, File | null>>({});
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
    try {
      const res = await fetchApi("/applications/my-application/submit", {
        method: "POST",
      });
      if (res.success) {
        setModalState({
          isOpen: true,
          title: "Application Submitted Successfully!",
          message: "Your application has been submitted to the verification office.",
          type: "success",
        });
        loadMyApplication();
      }
    } catch (err: any) {
      setModalState({
        isOpen: true,
        title: "Submission Error",
        message: err.message || "Could not submit application.",
        type: "danger",
      });
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
          message: "Your payment receipt has been submitted to the Central Accounts Office for verification.",
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
    return <div className="min-h-screen bg-slate-100 p-8 text-center text-xs text-slate-500">Loading student portal...</div>;
  }

  if (!appData) {
    return (
      <div className="min-h-screen bg-slate-100 flex flex-col">
        <Header userEmail="student@gvpihlr.edu.in" userRole="STUDENT" />
        <div className="flex-1 flex">
          <Sidebar userRole="STUDENT" />
          <main className="flex-1 p-8">
            <div className="bg-white rounded-xl p-8 text-center text-slate-500 text-xs border">
              No active application record found. Please contact the Admissions Office.
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

  // Group fields by sectionName
  const groupedSections: Record<string, any[]> = {};
  programFields.forEach((f: any) => {
    const sec = f.sectionName || "General Details";
    if (!groupedSections[sec]) groupedSections[sec] = [];
    groupedSections[sec].push(f);
  });

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col">
      <Header userEmail={student.fullName} userRole="STUDENT" schoolName={student.program.school.name} />
      <div className="flex-1 flex">
        <Sidebar userRole="STUDENT" />
        <main className="flex-1 p-8 max-w-4xl space-y-6">
          {/* Header Card */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <div className="text-xs font-mono font-bold text-blue-700 bg-blue-50 px-2.5 py-1 rounded-md inline-block mb-1 border border-blue-100">
                {student.studentId}
              </div>
              <h2 className="text-xl font-bold text-slate-900">{student.fullName}</h2>
              <p className="text-xs text-slate-500 mt-0.5">{student.program.name}</p>
            </div>
            <div>
              <ERPStatusChip status={application.status} />
            </div>
          </div>

          {/* Dynamic Form Card */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8 space-y-6">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-700 border-b pb-3">
              Application Details Form
            </h3>

            {programFields.length === 0 ? (
              <p className="text-xs text-slate-400">Standard application fields initialized.</p>
            ) : (
              <div className="space-y-8">
                {Object.entries(groupedSections).map(([sectionTitle, secFields]) => (
                  <div key={sectionTitle} className="border border-slate-200 rounded-xl p-5 bg-slate-50/50 space-y-4">
                    <h4 className="text-xs font-bold uppercase text-slate-800 tracking-wider border-b pb-2 flex items-center gap-2">
                      <span>📁</span> {sectionTitle}
                    </h4>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {secFields.map((f: any) => {
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
                                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-bold"
                                  />
                                </div>
                                <div>
                                  <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Total Max Marks *</label>
                                  <input
                                    type="number"
                                    value={total}
                                    onChange={(e) => handleMarksChange(f.fieldKey, "total", e.target.value)}
                                    placeholder="e.g. 600"
                                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-bold"
                                  />
                                </div>
                                <div>
                                  <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Auto Percentage (%)</label>
                                  <input
                                    type="text"
                                    value={pct ? `${pct}%` : ""}
                                    readOnly
                                    placeholder="Auto Calculated"
                                    className="w-full px-3 py-2 bg-slate-100 border border-slate-300 rounded-lg text-xs font-mono font-bold text-blue-900"
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
                ))}
              </div>
            )}

            <div className="flex justify-between items-center pt-4 border-t">
              <button
                onClick={handleSaveDraft}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold rounded-lg transition-colors"
              >
                💾 Save Draft
              </button>
              <button
                onClick={handleSubmitApplication}
                className="px-6 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold uppercase tracking-wider rounded-lg shadow-sm transition-all"
              >
                Submit Application
              </button>
            </div>
          </div>

          {/* DOCUMENT UPLOADS CARD (CONFIGURED BY ADMIN IN FORM BUILDER) */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8 space-y-6">
            <div>
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-700 border-b pb-3">
                📁 Required Certificates &amp; Document Uploads ({docRequirements.length} Rules)
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Upload clear scans of your required certificates. Scans will be verified by the Admissions Office.
              </p>
            </div>

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
                      className={`p-4 border rounded-xl space-y-3 transition-colors ${
                        isReuploadReq ? "bg-rose-50/70 border-rose-300" : "bg-slate-50/50 border-slate-200"
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
                          <span className="text-[11px] font-mono text-slate-400">Key: {d.type}</span>
                        </div>

                        <div>
                          {isVerified ? (
                            <span className="px-3 py-1 bg-emerald-100 text-emerald-900 font-bold text-xs rounded-full border border-emerald-300 inline-flex items-center gap-1">
                              <span>✅ Certificate Verified</span>
                            </span>
                          ) : isReuploadReq ? (
                            <span className="px-3 py-1 bg-rose-100 text-rose-900 font-bold text-xs rounded-full border border-rose-300 inline-flex items-center gap-1">
                              <span>⚠️ Re-upload Requested</span>
                            </span>
                          ) : latestVersion ? (
                            <span className="px-3 py-1 bg-blue-100 text-blue-900 font-bold text-xs rounded-full border border-blue-300 inline-flex items-center gap-1">
                              <span>⏳ Pending Verification</span>
                            </span>
                          ) : (
                            <span className="px-3 py-1 bg-amber-100 text-amber-900 font-bold text-xs rounded-full border border-amber-300 inline-flex items-center gap-1">
                              <span>⏳ Upload Pending</span>
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Officer Re-upload Instructions */}
                      {existingDoc?.remarks && (
                        <div className="p-3 bg-rose-100/80 border border-rose-300 rounded-lg text-xs text-rose-900 font-medium">
                          <strong>⚠️ Verification Officer Note:</strong> {existingDoc.remarks}
                        </div>
                      )}

                      {/* File picker & Action */}
                      <div className="flex flex-col sm:flex-row items-center gap-3">
                        <input
                          type="file"
                          accept=".pdf,.jpg,.jpeg,.png"
                          onChange={(e) => {
                            const f = e.target.files ? e.target.files[0] : null;
                            setSelectedDocFiles((prev) => ({ ...prev, [d.type]: f }));
                          }}
                          className="flex-1 text-xs text-slate-600 border rounded-lg p-2 bg-white"
                        />
                        <button
                          onClick={() => handleDocumentFileUpload(d.type)}
                          disabled={uploadingDocType === d.type || !selectedDocFiles[d.type]}
                          className="px-4 py-2 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white font-bold text-xs rounded-lg transition-colors whitespace-nowrap"
                        >
                          {uploadingDocType === d.type ? "Uploading Scan..." : "📤 Upload Document Scan"}
                        </button>
                      </div>

                      {/* Uploaded metadata */}
                      {latestVersion && (
                        <div className="text-[11px] text-slate-600 bg-white p-2.5 border rounded-lg flex items-center justify-between">
                          <div>
                            <span className="font-semibold text-slate-800">Uploaded File:</span> {latestVersion.fileName} (v{latestVersion.versionNumber})
                          </div>
                          <a
                            href={`http://localhost:4000/api/v1/documents/stream/${latestVersion.fileName}`}
                            target="_blank"
                            rel="noreferrer"
                            className="text-blue-700 font-bold hover:underline"
                          >
                            👁️ View Document Scan
                          </a>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* MULTI FEE RECEIPT SUBMISSION & HISTORY CARD */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8 space-y-6">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-700 border-b pb-3">
              💳 Application &amp; Tuition Fee Payment Receipts (Program Fee: ₹{student.program.applicationFee})
            </h3>

            {/* Fee Receipts History List */}
            {feeRecords.length > 0 && (
              <div className="space-y-3">
                <h4 className="text-xs font-bold uppercase text-slate-600">Submitted Fee Receipts History</h4>
                <div className="space-y-3">
                  {feeRecords.map((f: any) => {
                    const isVerified = f.status === "VERIFIED";
                    const isReuploadReq = f.status === "REJECTED_REUPLOAD_REQUIRED";

                    return (
                      <div
                        key={f.id}
                        className={`p-4 border rounded-xl text-xs space-y-2 ${
                          isReuploadReq ? "bg-rose-50 border-rose-300" : "bg-slate-50 border-slate-200"
                        }`}
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b pb-2">
                          <div className="flex items-center gap-3">
                            <span className="font-mono font-bold text-slate-900 text-sm">₹{f.amountPaid}</span>
                            <span className="font-mono text-blue-900 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                              Ref: {f.transactionRefNo}
                            </span>
                          </div>

                          <div className="flex items-center gap-2">
                            <span
                              className={`px-2.5 py-0.5 text-[10px] font-bold rounded-full border ${
                                isVerified
                                  ? "bg-emerald-100 text-emerald-900 border-emerald-300"
                                  : isReuploadReq
                                  ? "bg-rose-100 text-rose-900 border-rose-300"
                                  : "bg-amber-100 text-amber-900 border-amber-300"
                              }`}
                            >
                              {isVerified ? "✅ Fee Cleared" : isReuploadReq ? "⚠️ Re-upload Requested" : "⏳ Pending Central Verification"}
                            </span>

                            <a
                              href={`http://localhost:4000/api/v1/documents/stream/${f.receiptFilePath}`}
                              target="_blank"
                              rel="noreferrer"
                              className="text-blue-700 font-bold hover:underline"
                            >
                              👁️ View Receipt
                            </a>
                          </div>
                        </div>

                        {f.remarks && (
                          <div className="p-2 bg-rose-100/80 border border-rose-300 rounded text-rose-900 font-medium">
                            <strong>Central Accounts Officer Note:</strong> {f.remarks}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Submit New Payment Receipt Form */}
            <form onSubmit={handleFeeSubmit} className="space-y-4 border-t pt-4">
              <h4 className="text-xs font-bold uppercase text-slate-700">+ Submit New / Additional Payment Receipt</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase text-slate-600 mb-1">
                    Amount Paid (₹) *
                  </label>
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
                  <label className="block text-xs font-semibold uppercase text-slate-600 mb-1">
                    Bank / DD / NEFT Ref Number *
                  </label>
                  <input
                    type="text"
                    value={transactionRefNo}
                    onChange={(e) => setTransactionRefNo(e.target.value)}
                    placeholder="e.g. TXN9876543210"
                    className="w-full px-3 py-2 border rounded-lg text-xs font-mono"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-slate-600 mb-1">
                  Upload Payment Receipt (PDF/JPG/PNG max 5MB) *
                </label>
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
                {submittingFee ? "Submitting Fee Payment Receipt..." : "+ Submit Payment Receipt"}
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
