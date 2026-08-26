"use client";

import React, { useState, useEffect } from "react";
import { Header } from "@/components/layout/Header";
import { Sidebar } from "@/components/layout/Sidebar";
import { fetchApi } from "@/lib/api";
import { ERPModal } from "@/components/ui/ERPModal";

export default function FormBuilderPage() {
  const [currentUser, setCurrentUser] = useState<any | null>(null);
  const [schools, setSchools] = useState<any[]>([]);
  const [selectedProgramId, setSelectedProgramId] = useState("");
  const [activeTab, setActiveTab] = useState<"fields" | "documents">("fields");

  // Form Fields State
  const [fields, setFields] = useState<any[]>([]);
  const [sections, setSections] = useState<string[]>([]);
  const [newSectionInput, setNewSectionInput] = useState("");
  const [cloneSourceProgramId, setCloneSourceProgramId] = useState("");
  const [loading, setLoading] = useState(false);

  // Document Requirements State
  const [docRequirements, setDocRequirements] = useState<any[]>([]);

  // New Document Input State
  const [newDocType, setNewDocType] = useState("");
  const [newDocLabel, setNewDocLabel] = useState("");
  const [newDocRequired, setNewDocRequired] = useState(true);

  const [modalState, setModalState] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    type: "info" | "success" | "warning" | "danger" | "confirm";
    onConfirmAction?: () => void;
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
    if (selectedProgramId) {
      loadSchema(selectedProgramId);
    } else {
      setFields([]);
      setSections([]);
      setDocRequirements([]);
    }
  }, [selectedProgramId]);

  const loadUserAndSchools = async () => {
    try {
      const [userRes, schoolsRes] = await Promise.all([
        fetchApi("/auth/me"),
        fetchApi("/academics/schools"),
      ]);

      if (userRes.success) setCurrentUser(userRes.data);

      if (schoolsRes.success) {
        setSchools(schoolsRes.data);
        if (schoolsRes.data.length > 0 && schoolsRes.data[0].programs?.length > 0) {
          setSelectedProgramId(schoolsRes.data[0].programs[0].id);
        }
      }
    } catch (err: any) {
      console.error("Failed to load initial data:", err);
    }
  };

  const loadSchema = async (progId: string) => {
    setLoading(true);
    try {
      const res = await fetchApi(`/form-builder/${progId}`);
      if (res.success) {
        const loadedFields = res.data.fields || [];
        setFields(loadedFields);

        // Extract unique section names dynamically
        const extractedSections = Array.from(
          new Set(loadedFields.map((f: any) => f.sectionName).filter(Boolean))
        );
        setSections(extractedSections as string[]);

        // Load saved document requirements
        if (res.data.docRequirements) {
          setDocRequirements(res.data.docRequirements);
        } else {
          setDocRequirements([]);
        }
      }
    } catch (err: any) {
      console.error("Failed to load form schema:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddSection = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSectionInput.trim()) return;
    const trimmed = newSectionInput.trim();
    if (!sections.includes(trimmed)) {
      setSections([...sections, trimmed]);
    }
    setNewSectionInput("");
  };

  const handleDeleteSection = (sectionName: string) => {
    setModalState({
      isOpen: true,
      title: "Confirm Section Deletion",
      message: `Are you sure you want to delete the entire section "${sectionName}"? All questions inside this section will be removed.`,
      type: "confirm",
      onConfirmAction: () => {
        setSections(sections.filter((s) => s !== sectionName));
        setFields(fields.filter((f) => f.sectionName !== sectionName));
        setModalState((prev) => ({ ...prev, isOpen: false }));
      },
    });
  };

  const handleAddFieldToSection = (sectionName: string) => {
    const sectionFieldsCount = fields.filter((f) => f.sectionName === sectionName).length;
    const cleanSectionPrefix = sectionName.toLowerCase().replace(/[^a-z0-9]/g, "_").replace(/^_+|_+$/g, "");
    const uniqueKey = `${cleanSectionPrefix}_q${sectionFieldsCount + 1}_${Date.now().toString().slice(-4)}`;

    const newField = {
      id: `temp_${Date.now()}`,
      sectionName: sectionName,
      fieldKey: uniqueKey,
      fieldLabel: `Question ${sectionFieldsCount + 1}`,
      fieldType: "text",
      options: [],
      validationPreset: "none",
      validation: { required: true },
      displayOrder: fields.length + 1,
    };
    setFields([...fields, newField]);
  };

  const handleDuplicateField = (index: number) => {
    const target = fields[index];
    const uniqueKey = `${target.fieldKey}_copy_${Date.now().toString().slice(-4)}`;
    const duplicated = {
      ...target,
      id: `temp_${Date.now()}`,
      fieldKey: uniqueKey,
      fieldLabel: `${target.fieldLabel} (Copy)`,
      displayOrder: fields.length + 1,
    };
    const updated = [...fields];
    updated.splice(index + 1, 0, duplicated);
    setFields(updated);
  };

  const handleMoveUp = (index: number) => {
    if (index === 0) return;
    const updated = [...fields];
    const temp = updated[index];
    updated[index] = updated[index - 1];
    updated[index - 1] = temp;
    setFields(updated);
  };

  const handleMoveDown = (index: number) => {
    if (index === fields.length - 1) return;
    const updated = [...fields];
    const temp = updated[index];
    updated[index] = updated[index + 1];
    updated[index + 1] = temp;
    setFields(updated);
  };

  const handleUpdateField = (index: number, key: string, value: any) => {
    const updated = [...fields];
    if (key === "required") {
      updated[index].validation = { ...updated[index].validation, required: value };
    } else {
      updated[index][key] = value;
    }
    setFields(updated);
  };

  const handleDeleteField = (index: number) => {
    const updated = fields.filter((_, i) => i !== index);
    setFields(updated);
  };

  const handleSaveSchema = async () => {
    if (!selectedProgramId) return;
    try {
      const res = await fetchApi(`/form-builder/${selectedProgramId}`, {
        method: "PUT",
        body: JSON.stringify({ fields, docRequirements }),
      });

      if (res.success) {
        setModalState({
          isOpen: true,
          title: "Form Schema Saved Successfully",
          message: "Form sections, questions, validation rules, and duplicate field keys saved successfully.",
          type: "success",
        });
        loadSchema(selectedProgramId);
      }
    } catch (err: any) {
      setModalState({
        isOpen: true,
        title: "Save Failed",
        message: err.message || "Failed to save form schema.",
        type: "danger",
      });
    }
  };

  const handleSaveDocRequirements = async () => {
    if (!selectedProgramId) return;
    try {
      const res = await fetchApi(`/form-builder/${selectedProgramId}`, {
        method: "PUT",
        body: JSON.stringify({ fields, docRequirements }),
      });

      if (res.success) {
        setModalState({
          isOpen: true,
          title: "Document Requirements Saved",
          message: "Document upload rules and mandatory flags saved successfully.",
          type: "success",
        });
        loadSchema(selectedProgramId);
      }
    } catch (err: any) {
      setModalState({
        isOpen: true,
        title: "Save Failed",
        message: err.message || "Failed to save document requirements.",
        type: "danger",
      });
    }
  };

  const handleCloneForm = async () => {
    if (!cloneSourceProgramId || !selectedProgramId) return;
    try {
      const res = await fetchApi("/form-builder/clone", {
        method: "POST",
        body: JSON.stringify({
          sourceProgramId: cloneSourceProgramId,
          targetProgramId: selectedProgramId,
        }),
      });

      if (res.success) {
        setModalState({
          isOpen: true,
          title: "Form & Documents Cloned Successfully",
          message: `Cloned form fields and document rules into selected program.`,
          type: "success",
        });
        loadSchema(selectedProgramId);
      }
    } catch (err: any) {
      setModalState({
        isOpen: true,
        title: "Cloning Failed",
        message: err.message || "Failed to clone form schema.",
        type: "danger",
      });
    }
  };

  const handleAddDocumentRequirement = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDocType || !newDocLabel) return;

    const docObj = {
      id: `doc_${Date.now()}`,
      type: newDocType.toLowerCase().replace(/[^a-z0-9_]/g, "_"),
      label: newDocLabel,
      required: newDocRequired,
      allowedFormats: "PDF, JPG, PNG",
      maxMb: 5,
    };

    setDocRequirements([...docRequirements, docObj]);
    setNewDocType("");
    setNewDocLabel("");
  };

  const handleDeleteDocumentRequirement = (docId: string) => {
    setDocRequirements(docRequirements.filter((d) => d.id !== docId));
  };

  const userRole = currentUser?.role?.name || "OFFICE_USER";
  const userEmail = currentUser?.email || "office@gvpihlr.edu.in";
  const allPrograms = schools.flatMap((s) => s.programs?.map((p: any) => ({ ...p, schoolName: s.name })) || []);

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col">
      <Header userEmail={userEmail} userRole={userRole} />
      <div className="flex-1 flex">
        <Sidebar userRole={userRole} />
        <main className="flex-1 p-8 max-w-7xl space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-4">
              <div>
                <h2 className="text-xl font-bold text-slate-900">Program Form & Document Builder</h2>
                <p className="text-xs text-slate-500 mt-1">
                  Build custom form sections, re-order questions, duplicate fields, set validation rules (10-Digit Mobile, 12-Digit Aadhaar, Auto-Calculated Marks & Percentage), and mandate documents.
                </p>
              </div>

              <div className="flex items-center gap-3">
                <label className="text-xs font-bold text-slate-700">Target Program:</label>
                {allPrograms.length === 0 ? (
                  <span className="text-xs text-amber-700 font-bold bg-amber-50 border border-amber-200 px-3 py-1.5 rounded-lg">
                    ⚠️ No Programs Created Yet (Create in System Management)
                  </span>
                ) : (
                  <select
                    value={selectedProgramId}
                    onChange={(e) => setSelectedProgramId(e.target.value)}
                    className="px-3.5 py-2 border rounded-lg text-xs font-bold bg-white text-slate-900"
                  >
                    {allPrograms.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.schoolName} • {p.name} ({p.code})
                      </option>
                    ))}
                  </select>
                )}
              </div>
            </div>

            {/* Navigation Tabs */}
            <div className="flex border-b border-slate-200 gap-6">
              <button
                onClick={() => setActiveTab("fields")}
                className={`pb-3 text-xs font-bold uppercase tracking-wider transition-colors ${
                  activeTab === "fields"
                    ? "border-b-2 border-slate-900 text-slate-900"
                    : "text-slate-400 hover:text-slate-700"
                }`}
              >
                📝 Section Form Builder ({fields.length} Fields)
              </button>
              <button
                onClick={() => setActiveTab("documents")}
                className={`pb-3 text-xs font-bold uppercase tracking-wider transition-colors ${
                  activeTab === "documents"
                    ? "border-b-2 border-slate-900 text-slate-900"
                    : "text-slate-400 hover:text-slate-700"
                }`}
              >
                📁 Document Upload Rules ({docRequirements.length} Docs)
              </button>
            </div>

            {/* TAB 1: SECTION-BASED FORM BUILDER */}
            {activeTab === "fields" && (
              <div className="space-y-6">
                {/* Clone Bar */}
                {allPrograms.length > 1 && (
                  <div className="bg-blue-50/60 border border-blue-200 p-4 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <h4 className="text-xs font-bold text-blue-900">⚡ Clone Form Configuration</h4>
                      <p className="text-[11px] text-blue-700 mt-0.5">
                        Duplicate form fields, sections, mandatory rules, and validation patterns from another program into this one.
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <select
                        value={cloneSourceProgramId}
                        onChange={(e) => setCloneSourceProgramId(e.target.value)}
                        className="px-3 py-1.5 border rounded-lg text-xs bg-white text-slate-900"
                      >
                        <option value="">Select Source Program...</option>
                        {allPrograms
                          .filter((p) => p.id !== selectedProgramId)
                          .map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.name} ({p.code})
                            </option>
                          ))}
                      </select>
                      <button
                        onClick={handleCloneForm}
                        disabled={!cloneSourceProgramId}
                        className="px-3.5 py-1.5 bg-blue-700 hover:bg-blue-800 disabled:opacity-50 text-white text-xs font-bold rounded-lg transition-colors"
                      >
                        Clone Form
                      </button>
                    </div>
                  </div>
                )}

                {/* Add Custom Section Form */}
                <form onSubmit={handleAddSection} className="bg-slate-50 border p-4 rounded-xl flex items-center justify-between gap-4">
                  <div className="flex-1 flex items-center gap-3">
                    <span className="text-xs font-bold uppercase text-slate-700 whitespace-nowrap">+ Create New Section:</span>
                    <input
                      type="text"
                      value={newSectionInput}
                      onChange={(e) => setNewSectionInput(e.target.value)}
                      placeholder="e.g. Personal Details, Academic Credentials, Entrance Exam Details"
                      className="flex-1 px-3.5 py-2 border rounded-lg text-xs bg-white"
                      required
                    />
                  </div>
                  <button type="submit" className="px-4 py-2 bg-slate-900 text-white text-xs font-bold rounded-lg hover:bg-slate-800">
                    Add Section
                  </button>
                </form>

                {/* Empty State */}
                {sections.length === 0 ? (
                  <div className="p-12 text-center border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50/50 space-y-3">
                    <div className="text-3xl">📁</div>
                    <h3 className="text-sm font-bold text-slate-900">No Form Sections Created Yet</h3>
                    <p className="text-xs text-slate-500 max-w-md mx-auto">
                      Start building your application form from scratch! Use the <strong>+ Create New Section</strong> box above to add your first section.
                    </p>
                  </div>
                ) : (
                  /* Sections and Questions List */
                  <div className="space-y-8">
                    {sections.map((sectionName) => {
                      const sectionFields = fields.filter((f) => f.sectionName === sectionName);
                      return (
                        <div key={sectionName} className="border-2 border-slate-200 rounded-2xl p-6 bg-slate-50/40 space-y-4">
                          <div className="flex items-center justify-between border-b pb-3">
                            <div className="flex items-center gap-3">
                              <span className="text-lg">📁</span>
                              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide">{sectionName}</h3>
                              <span className="px-2 py-0.5 text-[10px] font-bold bg-slate-200 text-slate-700 rounded-full">
                                {sectionFields.length} Questions
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => handleAddFieldToSection(sectionName)}
                                className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-lg transition-colors"
                              >
                                + Add Question to {sectionName}
                              </button>
                              <button
                                onClick={() => handleDeleteSection(sectionName)}
                                className="px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-700 font-bold text-xs rounded-lg transition-colors"
                              >
                                🗑️ Delete Entire Section
                              </button>
                            </div>
                          </div>

                          <div className="space-y-4">
                            {fields.map((f, idx) => {
                              if (f.sectionName !== sectionName) return null;
                              return (
                                <div key={idx} className="p-4 border border-slate-200 rounded-xl bg-white shadow-2xs space-y-3">
                                  {/* Action Bar */}
                                  <div className="flex items-center justify-between border-b border-slate-100 pb-2 text-xs">
                                    <div className="flex items-center gap-2">
                                      <span className="text-[10px] font-mono text-slate-400">Order #{idx + 1}</span>
                                      <button
                                        onClick={() => handleMoveUp(idx)}
                                        disabled={idx === 0}
                                        className="px-2 py-0.5 bg-slate-100 hover:bg-slate-200 disabled:opacity-30 rounded font-bold"
                                        title="Move Up"
                                      >
                                        ⬆️ Up
                                      </button>
                                      <button
                                        onClick={() => handleMoveDown(idx)}
                                        disabled={idx === fields.length - 1}
                                        className="px-2 py-0.5 bg-slate-100 hover:bg-slate-200 disabled:opacity-30 rounded font-bold"
                                        title="Move Down"
                                      >
                                        ⬇️ Down
                                      </button>
                                    </div>

                                    <div className="flex items-center gap-2">
                                      <button
                                        onClick={() => handleDuplicateField(idx)}
                                        className="px-2.5 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-bold rounded-lg transition-colors"
                                      >
                                        📋 Duplicate Question
                                      </button>
                                      <button
                                        onClick={() => handleDeleteField(idx)}
                                        className="px-2.5 py-1 bg-red-50 hover:bg-red-100 text-red-700 text-xs font-bold rounded-lg transition-colors"
                                      >
                                        🗑️ Delete Question
                                      </button>
                                    </div>
                                  </div>

                                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
                                    <div className="sm:col-span-3">
                                      <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Section</label>
                                      <select
                                        value={f.sectionName}
                                        onChange={(e) => handleUpdateField(idx, "sectionName", e.target.value)}
                                        className="w-full px-3 py-1.5 border rounded-lg text-xs bg-white font-bold"
                                      >
                                        {sections.map((s) => (
                                          <option key={s} value={s}>
                                            {s}
                                          </option>
                                        ))}
                                      </select>
                                    </div>
                                    <div className="sm:col-span-3">
                                      <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Field Key (Unique Variable)</label>
                                      <input
                                        type="text"
                                        value={f.fieldKey}
                                        onChange={(e) => handleUpdateField(idx, "fieldKey", e.target.value)}
                                        className="w-full px-3 py-1.5 border rounded-lg text-xs font-mono bg-white"
                                      />
                                    </div>
                                    <div className="sm:col-span-4">
                                      <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Question Label *</label>
                                      <input
                                        type="text"
                                        value={f.fieldLabel}
                                        onChange={(e) => handleUpdateField(idx, "fieldLabel", e.target.value)}
                                        className="w-full px-3 py-1.5 border rounded-lg text-xs bg-white font-semibold"
                                      />
                                    </div>
                                    <div className="sm:col-span-2">
                                      <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Input Type</label>
                                      <select
                                        value={f.fieldType}
                                        onChange={(e) => handleUpdateField(idx, "fieldType", e.target.value)}
                                        className="w-full px-2 py-1.5 border rounded-lg text-xs bg-white font-semibold"
                                      >
                                        <option value="text">Text Input</option>
                                        <option value="number">Number Input</option>
                                        <option value="marks_percentage">🧮 Auto-Calculated Marks (%)</option>
                                        <option value="select">Dropdown Select (Single)</option>
                                        <option value="radio">Radio Buttons (Single Choice)</option>
                                        <option value="multiselect">Multiple Checkboxes (Multi Select)</option>
                                        <option value="textarea">Textarea</option>
                                        <option value="date">Date Picker</option>
                                      </select>
                                    </div>
                                  </div>

                                  {/* Dropdown / Radio / Checkbox Options Input */}
                                  {(f.fieldType === "select" || f.fieldType === "radio" || f.fieldType === "multiselect") && (
                                    <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                                      <label className="block text-[10px] font-bold uppercase text-slate-600 mb-1">
                                        Choice Options (Comma Separated) *
                                      </label>
                                      <input
                                        type="text"
                                        value={Array.isArray(f.options) ? f.options.join(", ") : f.options || ""}
                                        onChange={(e) =>
                                          handleUpdateField(
                                            idx,
                                            "options",
                                            e.target.value.split(",").map((s) => s.trim()).filter(Boolean)
                                          )
                                        }
                                        placeholder="e.g. Option A, Option B, Option C"
                                        className="w-full px-3 py-1.5 border rounded-lg text-xs bg-white font-mono"
                                      />
                                    </div>
                                  )}

                                  {/* Mandatory & Validation Rules Bar */}
                                  <div className="flex flex-wrap items-center gap-6 pt-2 border-t border-slate-100 text-xs">
                                    <label className="flex items-center gap-2 font-semibold text-slate-800 cursor-pointer">
                                      <input
                                        type="checkbox"
                                        checked={Boolean(f.validation?.required)}
                                        onChange={(e) => handleUpdateField(idx, "required", e.target.checked)}
                                        className="w-4 h-4 rounded text-slate-900 border-slate-300"
                                      />
                                      <span>Mandatory Question (Required)</span>
                                    </label>

                                    <div className="flex items-center gap-2">
                                      <span className="text-[11px] font-bold text-slate-500 uppercase">Input Validation Rule:</span>
                                      <select
                                        value={f.validationPreset || "none"}
                                        onChange={(e) => handleUpdateField(idx, "validationPreset", e.target.value)}
                                        className="px-2.5 py-1 border rounded-lg text-xs font-semibold bg-white text-slate-800"
                                      >
                                        <option value="none">Standard Text / Any Input</option>
                                        <option value="mobile_10">📱 Mobile Number (Strict 10-Digit Numeric)</option>
                                        <option value="aadhaar_12">🪪 Aadhaar Number (Strict 12-Digit Numeric)</option>
                                        <option value="email">✉️ Email Address Format</option>
                                        <option value="pincode_6">📍 Pincode / Zip (Strict 6-Digit)</option>
                                        <option value="percentage">📊 Marks Percentage (0 - 100 Range)</option>
                                      </select>
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {selectedProgramId && (
                  <div className="pt-4 flex justify-end">
                    <button
                      onClick={handleSaveSchema}
                      className="px-6 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow-sm transition-colors"
                    >
                      SAVE PROGRAM FORM CONFIGURATION
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* TAB 2: DOCUMENT REQUIREMENTS */}
            {activeTab === "documents" && (
              <div className="space-y-6">
                <form onSubmit={handleAddDocumentRequirement} className="bg-slate-50 border p-6 rounded-xl space-y-4">
                  <h4 className="text-xs font-bold uppercase text-slate-700">+ Add Required Certificate Upload Rule</h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-[11px] font-semibold uppercase text-slate-600 mb-1">Document Key *</label>
                      <input
                        type="text"
                        value={newDocType}
                        onChange={(e) => setNewDocType(e.target.value)}
                        placeholder="e.g. income_certificate"
                        className="w-full px-3 py-2 border rounded-lg text-xs font-mono bg-white"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold uppercase text-slate-600 mb-1">Document Display Label *</label>
                      <input
                        type="text"
                        value={newDocLabel}
                        onChange={(e) => setNewDocLabel(e.target.value)}
                        placeholder="e.g. Income Certificate Scan"
                        className="w-full px-3 py-2 border rounded-lg text-xs bg-white"
                        required
                      />
                    </div>
                    <div className="flex items-center gap-2 mt-6">
                      <input
                        type="checkbox"
                        id="docReqCheck"
                        checked={newDocRequired}
                        onChange={(e) => setNewDocRequired(e.target.checked)}
                        className="w-4 h-4 rounded"
                      />
                      <label htmlFor="docReqCheck" className="text-xs font-bold text-slate-800">Mandatory Upload</label>
                    </div>
                  </div>
                  <button type="submit" className="px-4 py-2 bg-slate-900 text-white text-xs font-bold rounded-lg hover:bg-slate-800">
                    + Add Document Requirement Rule
                  </button>
                </form>

                <div className="space-y-3">
                  {docRequirements.length === 0 ? (
                    <div className="p-8 text-center text-xs text-slate-400 border-2 border-dashed rounded-xl">
                      No document requirements configured yet for this program. Add rules above and click Save below.
                    </div>
                  ) : (
                    docRequirements.map((d) => (
                      <div key={d.id} className="p-4 border rounded-xl bg-white flex items-center justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="text-xs font-bold text-slate-900">{d.label}</h4>
                            <span className={`px-2 py-0.5 text-[10px] font-bold rounded ${d.required ? "bg-red-100 text-red-800" : "bg-slate-100 text-slate-600"}`}>
                              {d.required ? "Mandatory Upload" : "Optional"}
                            </span>
                          </div>
                          <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                            Key: {d.type} | Allowed: {d.allowedFormats} | Max Size: {d.maxMb}MB
                          </div>
                        </div>
                        <button
                          onClick={() => handleDeleteDocumentRequirement(d.id)}
                          className="px-2.5 py-1 bg-red-50 hover:bg-red-100 text-red-700 text-xs font-bold rounded-lg"
                        >
                          🗑️ Delete Rule
                        </button>
                      </div>
                    ))
                  )}
                </div>

                {selectedProgramId && (
                  <div className="pt-4 flex justify-end">
                    <button
                      onClick={handleSaveDocRequirements}
                      className="px-6 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow-sm transition-colors"
                    >
                      SAVE DOCUMENT REQUIREMENTS CONFIGURATION
                    </button>
                  </div>
                )}
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
      />
    </div>
  );
}
