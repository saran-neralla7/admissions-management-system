"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { fetchApi } from "@/lib/api";

interface SidebarProps {
  userRole?: string;
}

interface NavGroup {
  groupName: string;
  items: {
    label: string;
    href: string;
    icon: string;
  }[];
}

export const Sidebar: React.FC<SidebarProps> = ({ userRole }) => {
  const pathname = usePathname();

  const handleLogout = async () => {
    try {
      await fetchApi("/auth/logout", { method: "POST" });
    } catch (e) {
      console.error("Sidebar logout error:", e);
    } finally {
      window.location.href = "/login";
    }
  };

  const getNavGroups = (): NavGroup[] => {
    switch (userRole) {
      case "SUPER_ADMIN":
        return [
          {
            groupName: "OVERVIEW",
            items: [{ label: "Dashboard Overview", href: "/dashboard", icon: "📊" }],
          },
          {
            groupName: "SYSTEM ADMINISTRATION",
            items: [
              { label: "System Management", href: "/admin/manage", icon: "🏢" },
              { label: "Form & Doc Builder", href: "/admin/form-builder", icon: "⚙️" },
            ],
          },
          {
            groupName: "ADMISSIONS OFFICER WORKSPACE",
            items: [
              { label: "Pending Final Admissions", href: "/admissions", icon: "🎓" },
              { label: "Admitted Students Archive", href: "/admissions/approved", icon: "🎉" },
            ],
          },
          {
            groupName: "STUDENT ROSTER",
            items: [
              { label: "Register New Student", href: "/students/create", icon: "➕" },
              { label: "Student Roster", href: "/students", icon: "👥" },
            ],
          },
          {
            groupName: "VERIFICATION WORKSPACE",
            items: [
              { label: "Pending Verification", href: "/verification", icon: "🔍" },
              { label: "Approved Applications", href: "/verification/approved", icon: "✅" },
              { label: "Re-upload Requested", href: "/verification/reupload", icon: "⚠️" },
            ],
          },
          {
            groupName: "ACCOUNTS & FINANCE",
            items: [
              { label: "Pending Fee Receipts", href: "/finance", icon: "⏳" },
              { label: "Approved Fee Receipts", href: "/finance/approved", icon: "💳" },
            ],
          },
          {
            groupName: "AUDITS & REPORTS",
            items: [{ label: "Audit Trail & Logs", href: "/audit-logs", icon: "📜" }],
          },
        ];

      case "CENTRAL_ADMISSIONS":
      case "SCHOOL_ADMISSIONS":
        return [
          {
            groupName: "OVERVIEW",
            items: [{ label: "Dashboard Overview", href: "/dashboard", icon: "📊" }],
          },
          {
            groupName: "ADMISSIONS OFFICER WORKSPACE",
            items: [
              { label: "Pending Final Admissions", href: "/admissions", icon: "🎓" },
              { label: "Admitted Students Archive", href: "/admissions/approved", icon: "🎉" },
            ],
          },
        ];

      case "CENTRAL_OFFICE":
      case "OFFICE_USER":
      case "VERIFICATION_OFFICER":
        return [
          {
            groupName: "VERIFICATION WORKSPACE",
            items: [
              { label: "Pending Verification", href: "/verification", icon: "🔍" },
              { label: "Approved Applications", href: "/verification/approved", icon: "✅" },
              { label: "Re-upload Requested", href: "/verification/reupload", icon: "⚠️" },
            ],
          },
          {
            groupName: "STUDENT REGISTRATION",
            items: [{ label: "Register New Student", href: "/students/create", icon: "➕" }],
          },
        ];

      case "CENTRAL_ACCOUNTS":
      case "SCHOOL_ACCOUNTS":
      case "FINANCE_OFFICER":
        return [
          {
            groupName: "ACCOUNTS & FINANCE",
            items: [
              { label: "Pending Fee Receipts", href: "/finance", icon: "⏳" },
              { label: "Approved Fee Receipts", href: "/finance/approved", icon: "💳" },
            ],
          },
        ];

      case "SCHOOL_ADMIN":
        return [
          {
            groupName: "SCHOOL ADMINISTRATION",
            items: [
              { label: "Form & Doc Builder", href: "/admin/form-builder", icon: "⚙️" },
              { label: "Student Roster", href: "/students", icon: "👥" },
            ],
          },
        ];

      case "STUDENT":
        return [
          {
            groupName: "STUDENT PORTAL",
            items: [{ label: "My Application", href: "/student/application", icon: "📝" }],
          },
        ];

      default:
        return [
          {
            groupName: "NAVIGATION",
            items: [{ label: "Certificate Verification", href: "/verification", icon: "🔍" }],
          },
        ];
    }
  };

  const navGroups = getNavGroups();

  return (
    <aside className="w-64 bg-white border-r border-slate-200 min-h-[calc(100vh-4rem)] p-4 shrink-0 hidden md:flex md:flex-col md:justify-between space-y-6">
      <div className="space-y-5">
        {navGroups.map((group, idx) => (
          <div key={idx} className="space-y-1">
            <div className="px-3 text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
              {group.groupName}
            </div>
            {group.items.map((link) => {
              const isActive = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold transition-all ${
                    isActive
                      ? "bg-slate-900 text-white shadow-xs"
                      : "text-slate-700 hover:bg-slate-100 hover:text-slate-900"
                  }`}
                >
                  <span className="text-xs">{link.icon}</span>
                  <span className="truncate">{link.label}</span>
                </Link>
              );
            })}
          </div>
        ))}
      </div>

      <div className="pt-4 border-t border-slate-100">
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold text-red-700 bg-red-50 hover:bg-red-100 border border-red-200 transition-all cursor-pointer"
        >
          <span>🚪</span>
          <span>Sign Out Account</span>
        </button>
      </div>
    </aside>
  );
}
