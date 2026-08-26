"use client";

import React, { useState, useEffect } from "react";
import { Header } from "@/components/layout/Header";
import { Sidebar } from "@/components/layout/Sidebar";
import { fetchApi } from "@/lib/api";

export default function AuditLogsPage() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [moduleFilter, setModuleFilter] = useState("");
  const [actionFilter, setActionFilter] = useState("");

  useEffect(() => {
    loadAuditLogs();
  }, [moduleFilter, actionFilter]);

  const loadAuditLogs = async () => {
    setLoading(true);
    try {
      let query = "?limit=50";
      if (moduleFilter) query += `&module=${moduleFilter}`;
      if (actionFilter) query += `&action=${actionFilter}`;

      const res = await fetchApi(`/audit-logs${query}`);
      if (res.success) {
        setLogs(res.data);
      }
    } catch (err: any) {
      console.error("Failed to load audit logs:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col">
      <Header userEmail="admin@gvpihlr.edu.in" userRole="SUPER_ADMIN" />
      <div className="flex-1 flex">
        <Sidebar userRole="SUPER_ADMIN" />
        <main className="flex-1 p-8 max-w-7xl">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8 space-y-6">
            <div className="border-b border-slate-100 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold text-slate-900">Immutable Audit Trail Logs</h2>
                <p className="text-xs text-slate-500 mt-1">
                  Cryptographically track and audit all administrative, security, document deletion, and Aadhaar unmasking events.
                </p>
              </div>

              <div className="flex items-center gap-3">
                <select
                  value={moduleFilter}
                  onChange={(e) => setModuleFilter(e.target.value)}
                  className="px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-medium text-slate-700"
                >
                  <option value="">All Modules</option>
                  <option value="AUTH">Auth</option>
                  <option value="ADMISSIONS">Admissions</option>
                  <option value="FORM_BUILDER">Form Builder</option>
                  <option value="DOCUMENTS">Documents</option>
                  <option value="FINANCE">Finance</option>
                  <option value="SECURITY">Security</option>
                </select>

                <button
                  onClick={loadAuditLogs}
                  className="px-3 py-1.5 bg-slate-900 text-white text-xs font-bold rounded-lg hover:bg-slate-800 transition-colors"
                >
                  Refresh
                </button>
              </div>
            </div>

            {loading ? (
              <div className="p-8 text-center text-xs text-slate-400">Loading audit records...</div>
            ) : logs.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-400 border-2 border-dashed rounded-xl">
                No audit log entries matching criteria.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-600">
                      <th className="p-3">Timestamp</th>
                      <th className="p-3">User / Email</th>
                      <th className="p-3">Role</th>
                      <th className="p-3">Module</th>
                      <th className="p-3">Action</th>
                      <th className="p-3">IP Address</th>
                      <th className="p-3">Details</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs text-slate-800 font-medium">
                    {logs.map((log) => (
                      <tr key={log.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="p-3 font-mono text-[11px] text-slate-500">
                          {new Date(log.createdAt).toLocaleString()}
                        </td>
                        <td className="p-3 font-semibold">{log.user?.email || "System"}</td>
                        <td className="p-3">
                          <span className="px-2 py-0.5 text-[10px] font-bold bg-slate-100 text-slate-700 rounded border border-slate-200">
                            {log.roleName}
                          </span>
                        </td>
                        <td className="p-3 font-bold text-slate-700">{log.module}</td>
                        <td className="p-3">
                          <span className="font-bold text-blue-800 bg-blue-50 px-2 py-0.5 rounded border border-blue-100">
                            {log.action}
                          </span>
                        </td>
                        <td className="p-3 font-mono text-[11px] text-slate-500">{log.ipAddress}</td>
                        <td className="p-3 font-mono text-[10px] text-slate-600 max-w-xs truncate">
                          {JSON.stringify(log.details)}
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
