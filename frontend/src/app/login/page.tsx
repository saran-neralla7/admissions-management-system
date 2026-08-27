"use client";

import React from "react";
import Image from "next/image";
import Link from "next/link";

export default function LoginLandingPage() {
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 relative overflow-hidden">
      {/* Subtle Background Watermark Logo */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-[0.03]">
        <Image src="/gvp-logo.png" alt="GVP Background" width={700} height={700} priority />
      </div>

      <div className="w-full max-w-3xl text-center space-y-8 z-10">
        {/* Large GVP Logo with Animation */}
        <div className="flex justify-center">
          <div className="w-32 h-32 md:w-40 md:h-40 bg-white rounded-3xl border border-slate-200 shadow-xl p-5 flex items-center justify-center transform transition duration-500 hover:scale-105">
            <Image
              src="/gvp-logo.png"
              alt="Gayatri Vidya Parishad Logo"
              width={140}
              height={140}
              className="object-contain"
              priority
            />
          </div>
        </div>

        <div className="space-y-2">
          <h1 className="text-3xl md:text-4xl font-extrabold text-slate-900 tracking-tight">
            Gayatri Vidya Parishad
          </h1>
          <p className="text-base font-semibold text-slate-600">
            GVP Admissions Management Portal
          </p>
        </div>

        {/* Dual Portal Selection Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 text-left">
          {/* Student Portal Card */}
          <Link
            href="/login/student"
            className="p-8 bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-xl hover:border-blue-400 transition-all duration-300 group flex flex-col justify-between space-y-6 cursor-pointer"
          >
            <div className="space-y-3">
              <div className="w-14 h-14 rounded-2xl bg-blue-50 border border-blue-200 flex items-center justify-center text-3xl group-hover:scale-110 transition-transform">
                🎓
              </div>
              <h3 className="text-xl font-bold text-slate-900 group-hover:text-blue-900 transition-colors">
                Student Portal Login
              </h3>
              <p className="text-xs text-slate-500 leading-relaxed font-medium">
                For applicants and enrolled students. Access form filling, document uploads, and application status.
              </p>
            </div>
            <div className="pt-2 flex items-center text-xs font-bold text-blue-800 group-hover:translate-x-1 transition-transform">
              <span>Sign In as Student</span>
              <span className="ml-2">→</span>
            </div>
          </Link>

          {/* Staff & Officer Portal Card */}
          <Link
            href="/login/staff"
            className="p-8 bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-xl hover:border-slate-400 transition-all duration-300 group flex flex-col justify-between space-y-6 cursor-pointer"
          >
            <div className="space-y-3">
              <div className="w-14 h-14 rounded-2xl bg-slate-100 border border-slate-200 flex items-center justify-center text-3xl group-hover:scale-110 transition-transform">
                🏛️
              </div>
              <h3 className="text-xl font-bold text-slate-900 group-hover:text-slate-800 transition-colors">
                Staff &amp; Officer Login
              </h3>
              <p className="text-xs text-slate-500 leading-relaxed font-medium">
                For Super Admin, Admissions Verification Officers, and Central Accounts personnel.
              </p>
            </div>
            <div className="pt-2 flex items-center text-xs font-bold text-slate-900 group-hover:translate-x-1 transition-transform">
              <span>Sign In as Staff / Officer</span>
              <span className="ml-2">→</span>
            </div>
          </Link>
        </div>

        <div className="pt-6 border-t border-slate-200 text-center">
          <p className="text-xs text-slate-400 font-medium">
            Gayatri Vidya Parishad &bull; Admissions ERP System
          </p>
        </div>
      </div>
    </div>
  );
}
