"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { fetchApi } from "@/lib/api";

interface SidebarProps {
  userRole?: string;
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

  const getNavLinks = () => {
    switch (userRole) {
      case "SUPER_ADMIN":
        return [
          { label: "Dashboard", href: "/dashboard", icon: "📊" },
          { label: "System Management", href: "/admin/manage", icon: "🏢" },
          { label: "Form & Doc Builder", href: "/admin/form-builder", icon: "⚙️" },
          { label: "Create Student", href: "/students/create", icon: "➕" },
          { label: "Student Roster", href: "/students", icon: "👥" },
          { label: "Certificate Verification", href: "/verification", icon: "🔍" },
          { label: "Central Accounts", href: "/finance", icon: "💳" },
          { label: "Reports & Audits", href: "/audit-logs", icon: "📜" },
        ];
      case "SCHOOL_ADMIN":
        return [
          { label: "Dashboard", href: "/dashboard", icon: "📊" },
          { label: "Form & Doc Builder", href: "/admin/form-builder", icon: "⚙️" },
          { label: "Create Student", href: "/students/create", icon: "➕" },
          { label: "Student Roster", href: "/students", icon: "👥" },
          { label: "Certificate Verification", href: "/verification", icon: "🔍" },
        ];
      case "OFFICE_USER":
        return [
          { label: "Dashboard", href: "/dashboard", icon: "📊" },
          { label: "Create Student", href: "/students/create", icon: "➕" },
          { label: "Form & Doc Builder", href: "/admin/form-builder", icon: "⚙️" },
          { label: "Student Roster", href: "/students", icon: "👥" },
          { label: "Certificate Verification", href: "/verification", icon: "🔍" },
        ];
      case "CENTRAL_ACCOUNTS":
        return [
          { label: "Dashboard", href: "/dashboard", icon: "📊" },
          { label: "Central Accounts & Fees", href: "/finance", icon: "💳" },
          { label: "Student Roster", href: "/students", icon: "👥" },
          { label: "Fee Audits & Logs", href: "/audit-logs", icon: "📜" },
        ];
      case "STUDENT":
        return [
          { label: "My Application", href: "/student/application", icon: "📝" },
        ];
      default:
        return [{ label: "Dashboard", href: "/dashboard", icon: "📊" }];
    }
  };

  const links = getNavLinks();

  return (
    <aside className="w-64 bg-white border-r border-slate-200 min-h-[calc(100vh-4rem)] p-4 shrink-0 hidden md:flex md:flex-col md:justify-between">
      <div className="space-y-1">
        <div className="px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">
          Navigation
        </div>
        {links.map((link) => {
          const isActive = pathname === link.href;
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-semibold transition-all ${
                isActive
                  ? "bg-slate-900 text-white shadow-xs"
                  : "text-slate-700 hover:bg-slate-100 hover:text-slate-900"
              }`}
            >
              <span>{link.icon}</span>
              <span>{link.label}</span>
            </Link>
          );
        })}
      </div>

      <div className="pt-4 border-t border-slate-100">
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-bold text-red-700 bg-red-50 hover:bg-red-100 border border-red-200 transition-all"
        >
          <span>🚪</span>
          <span>Sign Out Account</span>
        </button>
      </div>
    </aside>
  );
};
