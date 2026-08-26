"use client";

import React from "react";

export interface ERPStatusChipProps {
  status: string;
}

export const ERPStatusChip: React.FC<ERPStatusChipProps> = ({ status }) => {
  const getStatusConfig = () => {
    switch (status) {
      case "STUDENT_INVITED":
      case "ADMISSION_CREATED":
        return { label: "Invited", bg: "bg-slate-100 text-slate-700 border-slate-200" };
      case "APPLICATION_IN_PROGRESS":
        return { label: "Drafting", bg: "bg-sky-50 text-sky-700 border-sky-200" };
      case "APPLICATION_SUBMITTED":
      case "VERIFICATION_PENDING":
        return { label: "Verification Pending", bg: "bg-amber-50 text-amber-800 border-amber-200" };
      case "CORRECTION_REQUIRED":
        return { label: "Correction Required", bg: "bg-rose-50 text-rose-700 border-rose-200" };
      case "DOCUMENTS_VERIFIED":
        return { label: "Docs Verified", bg: "bg-blue-50 text-blue-700 border-blue-200" };
      case "FEE_PENDING":
        return { label: "Fee Pending", bg: "bg-indigo-50 text-indigo-700 border-indigo-200" };
      case "FEE_CLEARED":
      case "FINAL_APPROVAL":
        return { label: "Fee Cleared", bg: "bg-emerald-50 text-emerald-800 border-emerald-200" };
      case "ADMISSION_CONFIRMED":
      case "ENROLLED":
        return { label: "Enrolled", bg: "bg-emerald-600 text-white border-emerald-700 font-bold" };
      default:
        return { label: status, bg: "bg-slate-100 text-slate-700 border-slate-200" };
    }
  };

  const config = getStatusConfig();

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${config.bg}`}>
      {config.label}
    </span>
  );
};
