"use client";

import React, { useState, useEffect } from "react";
import { Header } from "@/components/layout/Header";
import { Sidebar } from "@/components/layout/Sidebar";
import { fetchApi } from "@/lib/api";
import { GVPLogoSpinner } from "@/components/ui/GVPLogoSpinner";

export default function DashboardPage() {
  const [user, setUser] = useState<any | null>(null);
  const [summary, setSummary] = useState<any | null>(null);
  const [selectedSchoolId, setSelectedSchoolId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadUserAndSummary();
  }, []);

  const loadUserAndSummary = async () => {
    setLoading(true);
    try {
      const [userRes, summaryRes] = await Promise.all([
        fetchApi("/auth/me"),
        fetchApi("/reports/summary"),
      ]);

      if (userRes.success) {
        setUser(userRes.data);
      }
      if (summaryRes.success) {
        setSummary(summaryRes.data);
      }
    } catch (err: any) {
      console.error("Failed to load dashboard data:", err);
    } finally {
      setLoading(false);
    }
  };

  const userRole = user?.role?.name || "SUPER_ADMIN";
  const userEmail = user?.email || "admin@gvpihlr.edu.in";
  const schoolName = user?.userSchools?.[0]?.school?.name;

  const schoolAnalytics: any[] = summary?.schoolAnalytics || [];
  const selectedSchool = schoolAnalytics.find((s) => s.schoolId === selectedSchoolId);

  // Helper to find max application count for chart scaling
  const maxSchoolApps = Math.max(...schoolAnalytics.map((s) => s.applicationCount || 1), 1);
  const maxProgApps = selectedSchool
    ? Math.max(...(selectedSchool.programs || []).map((p: any) => p.applicationCount || 1), 1)
    : 1;

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col">
      <Header userEmail={userEmail} userRole={userRole} schoolName={schoolName} />
      <div className="flex-1 flex">
        <Sidebar userRole={userRole} />
        <main className="flex-1 p-8 max-w-7xl space-y-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-2xl font-black text-slate-900 tracking-tight">
                Gayatri Vidya Parishad Analytics Dashboard
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                Real-time interactive application volume, document verification rates, and fee collections across all schools &amp; programs.
              </p>
            </div>
            <button
              onClick={loadUserAndSummary}
              className="px-4 py-2 bg-slate-900 text-white text-xs font-bold rounded-xl hover:bg-slate-800 transition-colors shadow-xs"
            >
              🔄 Refresh Analytics Data
            </button>
          </div>

          {loading || !summary ? (
            <div className="p-16 flex justify-center">
              <GVPLogoSpinner label="Generating Interactive Analytics &amp; Visual Charts..." />
            </div>
          ) : (
            <>
              {/* TOP KPI METRIC CARDS */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Registered Students</span>
                    <span className="p-2 rounded-xl bg-blue-50 text-blue-800 text-lg">🎓</span>
                  </div>
                  <div className="text-3xl font-black text-slate-900">{summary.totalStudents}</div>
                  <div className="text-[11px] text-slate-500">Total student login credentials issued</div>
                </div>

                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Active Applications</span>
                    <span className="p-2 rounded-xl bg-indigo-50 text-indigo-800 text-lg">📄</span>
                  </div>
                  <div className="text-3xl font-black text-blue-600">{summary.totalApplications}</div>
                  <div className="text-[11px] text-slate-500">Applications in processing pipeline</div>
                </div>

                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Certificates Verified</span>
                    <span className="p-2 rounded-xl bg-emerald-50 text-emerald-800 text-lg">✅</span>
                  </div>
                  <div className="text-3xl font-black text-emerald-600">
                    {summary.statusBreakdown?.DOCUMENTS_VERIFIED || 0}
                  </div>
                  <div className="text-[11px] text-slate-500">Document verification cleared by Office</div>
                </div>

                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Total Fees Collected</span>
                    <span className="p-2 rounded-xl bg-purple-50 text-purple-800 text-lg">💳</span>
                  </div>
                  <div className="text-3xl font-black text-purple-700">
                    ₹{summary.feeBreakdown?.VERIFIED?.totalAmount ? summary.feeBreakdown.VERIFIED.totalAmount.toLocaleString() : 0}
                  </div>
                  <div className="text-[11px] text-slate-500">Cleared by Central Accounts office</div>
                </div>
              </div>

              {/* INTERACTIVE DRILL-DOWN ANALYTICS SECTION */}
              <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-8 space-y-6">
                {!selectedSchool ? (
                  /* LEVEL 1: ALL SCHOOLS OVERVIEW & CHARTS */
                  <div className="space-y-6">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b pb-4">
                      <div>
                        <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                          <span>🏫</span> School-Wise Admissions &amp; Verification Analytics
                        </h3>
                        <p className="text-xs text-slate-500 mt-0.5">
                          Click on any school card or chart bar below to drill down into Program-Wise / Department Analytics.
                        </p>
                      </div>
                      <span className="px-3 py-1 bg-slate-100 text-slate-700 font-bold text-xs rounded-full border">
                        {schoolAnalytics.length} Schools Active
                      </span>
                    </div>

                    {/* Visual Bar Chart Comparison */}
                    <div className="space-y-4 bg-slate-50 p-6 rounded-2xl border border-slate-200">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                        📊 School Application Volume &amp; Fee Collection Comparison
                      </h4>

                      <div className="space-y-4 pt-2">
                        {schoolAnalytics.map((school) => {
                          const appPct = Math.round((school.applicationCount / maxSchoolApps) * 100);
                          const verifyPct = school.applicationCount > 0
                            ? Math.round((school.verifiedCount / school.applicationCount) * 100)
                            : 0;

                          return (
                            <div
                              key={school.schoolId}
                              onClick={() => setSelectedSchoolId(school.schoolId)}
                              className="group cursor-pointer space-y-1.5 p-3 rounded-xl hover:bg-white hover:shadow-xs transition-all"
                            >
                              <div className="flex items-center justify-between text-xs">
                                <span className="font-bold text-slate-900 group-hover:text-blue-700 transition-colors">
                                  {school.schoolName} ({school.schoolCode})
                                </span>
                                <span className="font-mono text-slate-600 font-bold">
                                  {school.applicationCount} Applications &bull; ₹{school.totalFeeAmount.toLocaleString()} Fees
                                </span>
                              </div>

                              {/* Progress Track Bar */}
                              <div className="w-full bg-slate-200 rounded-full h-4 overflow-hidden flex relative">
                                <div
                                  className="bg-gradient-to-r from-slate-900 to-blue-900 h-full transition-all duration-500 flex items-center justify-end pr-2 text-[10px] font-bold text-white"
                                  style={{ width: `${Math.max(appPct, 8)}%` }}
                                >
                                  {school.applicationCount > 0 && `${school.applicationCount} Apps`}
                                </div>
                              </div>

                              <div className="flex items-center justify-between text-[11px] text-slate-500">
                                <span>Verification Completion: <strong className="text-emerald-700 font-bold">{verifyPct}%</strong></span>
                                <span className="text-blue-700 font-bold group-hover:underline">Click for Department Analytics →</span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Interactive School Cards Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {schoolAnalytics.map((school) => (
                        <div
                          key={school.schoolId}
                          onClick={() => setSelectedSchoolId(school.schoolId)}
                          className="p-6 rounded-2xl border border-slate-200 bg-white hover:border-blue-400 hover:shadow-lg transition-all duration-300 cursor-pointer group space-y-4"
                        >
                          <div className="flex items-start justify-between border-b pb-3">
                            <div>
                              <span className="px-2.5 py-0.5 bg-blue-50 text-blue-900 font-bold font-mono text-[10px] rounded border border-blue-200">
                                {school.schoolCode}
                              </span>
                              <h4 className="text-base font-bold text-slate-900 group-hover:text-blue-900 transition-colors mt-1">
                                {school.schoolName}
                              </h4>
                            </div>
                            <span className="w-8 h-8 rounded-full bg-slate-100 text-slate-700 flex items-center justify-center font-bold text-xs group-hover:bg-slate-900 group-hover:text-white transition-colors">
                              →
                            </span>
                          </div>

                          <div className="grid grid-cols-3 gap-3 text-xs bg-slate-50 p-3 rounded-xl">
                            <div>
                              <span className="text-[10px] font-bold uppercase text-slate-500 block">Applicants</span>
                              <strong className="text-slate-900 text-sm font-extrabold">{school.studentCount}</strong>
                            </div>
                            <div>
                              <span className="text-[10px] font-bold uppercase text-slate-500 block">Verified</span>
                              <strong className="text-emerald-700 text-sm font-extrabold">{school.verifiedCount}</strong>
                            </div>
                            <div>
                              <span className="text-[10px] font-bold uppercase text-slate-500 block">Fees Cleared</span>
                              <strong className="text-purple-700 text-xs font-bold font-mono">₹{school.totalFeeAmount.toLocaleString()}</strong>
                            </div>
                          </div>

                          <div className="flex items-center justify-between text-xs pt-1">
                            <span className="text-slate-500 font-medium">
                              📂 {school.programs?.length || 0} Programs / Departments
                            </span>
                            <span className="font-bold text-blue-700 group-hover:underline">
                              Drill Down to Programs &rarr;
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  /* LEVEL 2: PROGRAM-WISE ANALYTICS FOR SELECTED SCHOOL */
                  <div className="space-y-6 animate-in fade-in duration-300">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-4">
                      <div>
                        <span className="px-2.5 py-0.5 bg-blue-50 text-blue-900 font-bold font-mono text-[10px] rounded border border-blue-200">
                          {selectedSchool.schoolCode}
                        </span>
                        <h3 className="text-xl font-extrabold text-slate-900 mt-1">
                          Program &amp; Department Analytics: {selectedSchool.schoolName}
                        </h3>
                        <p className="text-xs text-slate-500 mt-0.5">
                          Detailed applicant enrollment, document verification, and tuition fee clearance broken down by program.
                        </p>
                      </div>

                      <button
                        onClick={() => setSelectedSchoolId(null)}
                        className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold rounded-xl border border-slate-300 transition-colors inline-flex items-center gap-2"
                      >
                        <span>←</span>
                        <span>Back to All Schools Overview</span>
                      </button>
                    </div>

                    {/* Program Level Visual Bar Chart */}
                    <div className="space-y-4 bg-slate-50 p-6 rounded-2xl border border-slate-200">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                        📊 Departmental Application Volume Comparison
                      </h4>

                      <div className="space-y-4 pt-2">
                        {selectedSchool.programs.map((prog: any) => {
                          const appPct = Math.round((prog.applicationCount / maxProgApps) * 100);

                          return (
                            <div key={prog.programId} className="space-y-1.5 p-3 rounded-xl bg-white border border-slate-200">
                              <div className="flex items-center justify-between text-xs">
                                <span className="font-bold text-slate-900">
                                  {prog.programName} ({prog.programCode})
                                </span>
                                <span className="font-mono text-slate-700 font-bold">
                                  {prog.applicationCount} Applicants &bull; ₹{prog.totalFeeAmount.toLocaleString()} Collected
                                </span>
                              </div>

                              <div className="w-full bg-slate-100 rounded-full h-3.5 overflow-hidden flex">
                                <div
                                  className="bg-gradient-to-r from-blue-700 to-indigo-900 h-full transition-all duration-500"
                                  style={{ width: `${Math.max(appPct, 5)}%` }}
                                />
                              </div>

                              <div className="flex items-center justify-between text-[11px] text-slate-500">
                                <span>Verified Scans: <strong className="text-emerald-700 font-bold">{prog.verifiedCount}</strong></span>
                                <span>Fees Cleared: <strong className="text-purple-700 font-bold">{prog.feeClearedCount} Students</strong></span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Detailed Program Grid Cards */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                      {selectedSchool.programs.map((prog: any) => (
                        <div key={prog.programId} className="p-5 bg-white border border-slate-200 rounded-2xl space-y-3 shadow-2xs">
                          <div className="border-b pb-2">
                            <span className="px-2 py-0.5 bg-slate-100 text-slate-700 font-bold font-mono text-[10px] rounded border">
                              {prog.programCode}
                            </span>
                            <h5 className="text-sm font-bold text-slate-900 mt-1">{prog.programName}</h5>
                          </div>

                          <div className="space-y-2 text-xs">
                            <div className="flex items-center justify-between">
                              <span className="text-slate-500">Enrolled Students:</span>
                              <strong className="text-slate-900">{prog.studentCount}</strong>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-slate-500">Certificates Verified:</span>
                              <strong className="text-emerald-700">{prog.verifiedCount}</strong>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-slate-500">Fee Collection:</span>
                              <strong className="text-purple-700 font-mono font-bold">₹{prog.totalFeeAmount.toLocaleString()}</strong>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* APPLICATION PIPELINE STATUS BREAKDOWN */}
              <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-8 space-y-4">
                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-700 border-b pb-3 flex items-center gap-2">
                  <span>⚡</span> Real-Time Application Pipeline Status Distribution
                </h3>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
                  <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-1">
                    <span className="text-slate-500 text-[10px] uppercase font-bold">Student Invited</span>
                    <div className="text-2xl font-black text-slate-900">{summary.statusBreakdown?.STUDENT_INVITED || 0}</div>
                  </div>

                  <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl space-y-1">
                    <span className="text-amber-800 text-[10px] uppercase font-bold">Verification Pending</span>
                    <div className="text-2xl font-black text-amber-900">{summary.statusBreakdown?.VERIFICATION_PENDING || 0}</div>
                  </div>

                  <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl space-y-1">
                    <span className="text-rose-800 text-[10px] uppercase font-bold">Correction Required</span>
                    <div className="text-2xl font-black text-rose-900">{summary.statusBreakdown?.CORRECTION_REQUIRED || 0}</div>
                  </div>

                  <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl space-y-1">
                    <span className="text-emerald-800 text-[10px] uppercase font-bold">Docs Verified</span>
                    <div className="text-2xl font-black text-emerald-900">{summary.statusBreakdown?.DOCUMENTS_VERIFIED || 0}</div>
                  </div>
                </div>
              </div>
            </>
          )}
        </main>
      </div>
    </div>
  );
}
