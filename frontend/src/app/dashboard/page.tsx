"use client";

import React, { useState, useEffect } from "react";
import { Header } from "@/components/layout/Header";
import { Sidebar } from "@/components/layout/Sidebar";
import { fetchApi } from "@/lib/api";

export default function DashboardPage() {
  const [user, setUser] = useState<any | null>(null);
  const [summary, setSummary] = useState<any | null>(null);
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

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col">
      <Header userEmail={userEmail} userRole={userRole} schoolName={schoolName} />
      <div className="flex-1 flex">
        <Sidebar userRole={userRole} />
        <main className="flex-1 p-8 max-w-7xl space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-slate-900">University Admissions Dashboard</h2>
              <p className="text-xs text-slate-500 mt-1">Real-time statistics across schools, programs, and verification pipelines.</p>
            </div>
            <button
              onClick={loadUserAndSummary}
              className="px-3 py-1.5 bg-slate-900 text-white text-xs font-bold rounded-lg hover:bg-slate-800 transition-colors"
            >
              🔄 Refresh Data
            </button>
          </div>

          {loading || !summary ? (
            <div className="p-8 text-center text-xs text-slate-400">Loading metrics...</div>
          ) : (
            <>
              {/* Metric Cards */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
                  <div className="text-xs font-bold uppercase text-slate-400">Total Applicants</div>
                  <div className="text-3xl font-extrabold text-slate-900 mt-2">{summary.totalStudents}</div>
                </div>
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
                  <div className="text-xs font-bold uppercase text-slate-400">Active Applications</div>
                  <div className="text-3xl font-extrabold text-blue-600 mt-2">{summary.totalApplications}</div>
                </div>
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
                  <div className="text-xs font-bold uppercase text-slate-400">Docs Verified</div>
                  <div className="text-3xl font-extrabold text-emerald-600 mt-2">
                    {summary.statusBreakdown?.DOCUMENTS_VERIFIED || 0}
                  </div>
                </div>
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
                  <div className="text-xs font-bold uppercase text-slate-400">Fee Clearance Approved</div>
                  <div className="text-3xl font-extrabold text-indigo-600 mt-2">
                    {summary.statusBreakdown?.FEE_CLEARED || 0}
                  </div>
                </div>
              </div>

              {/* Status Breakdown Grid */}
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-700">Application Pipeline Status</h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs font-medium">
                  <div className="p-4 bg-slate-50 border rounded-xl">
                    <div className="text-slate-500">Student Invited</div>
                    <div className="text-lg font-bold text-slate-900 mt-1">{summary.statusBreakdown?.STUDENT_INVITED || 0}</div>
                  </div>
                  <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl">
                    <div className="text-amber-800">Verification Pending</div>
                    <div className="text-lg font-bold text-amber-900 mt-1">{summary.statusBreakdown?.VERIFICATION_PENDING || 0}</div>
                  </div>
                  <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl">
                    <div className="text-rose-800">Correction Required</div>
                    <div className="text-lg font-bold text-rose-900 mt-1">{summary.statusBreakdown?.CORRECTION_REQUIRED || 0}</div>
                  </div>
                  <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl">
                    <div className="text-emerald-800">Enrolled</div>
                    <div className="text-lg font-bold text-emerald-900 mt-1">{summary.statusBreakdown?.ENROLLED || 0}</div>
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
