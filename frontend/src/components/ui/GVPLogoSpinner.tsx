"use client";

import React from "react";
import Image from "next/image";

interface GVPLogoSpinnerProps {
  label?: string;
  size?: number;
}

export const GVPLogoSpinner: React.FC<GVPLogoSpinnerProps> = ({
  label = "Loading GVP Admissions Portal...",
  size = 56,
}) => {
  return (
    <div className="flex flex-col items-center justify-center p-8 space-y-4">
      <div className="relative flex items-center justify-center">
        {/* Outer Rotating Ring */}
        <div
          className="absolute inset-0 rounded-full border-2 border-slate-200 border-t-slate-900 animate-spin"
          style={{ width: size + 20, height: size + 20, margin: -10 }}
        />
        {/* Pulsating GVP Logo */}
        <div className="animate-pulse">
          <Image
            src="/gvp-logo.png"
            alt="GVP Logo Loading"
            width={size}
            height={size}
            className="object-contain"
            priority
          />
        </div>
      </div>
      {label && <p className="text-xs font-bold text-slate-600 tracking-wide animate-pulse">{label}</p>}
    </div>
  );
};
