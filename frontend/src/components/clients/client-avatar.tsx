"use client";

import { useState } from "react";

interface ClientAvatarProps {
  logoUrl?: string | null;
  name: string;
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  className?: string;
}

const sizeMap = {
  xs: { container: "w-6 h-6", text: "text-[10px]", px: 24 },
  sm: { container: "w-8 h-8", text: "text-xs", px: 32 },
  md: { container: "w-10 h-10", text: "text-sm", px: 40 },
  lg: { container: "w-14 h-14", text: "text-lg", px: 56 },
  xl: { container: "w-20 h-20", text: "text-2xl", px: 80 },
};

const colors = [
  "bg-blue-500", "bg-emerald-500", "bg-violet-500",
  "bg-amber-500", "bg-rose-500", "bg-cyan-500",
  "bg-indigo-500", "bg-teal-500", "bg-orange-500",
  "bg-pink-500", "bg-sky-500", "bg-lime-500",
];

function getColorFromName(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
}

function getInitials(name: string): string {
  if (!name) return "?";
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 1) return words[0].substring(0, 2).toUpperCase();
  return (words[0][0] + words[words.length - 1][0]).toUpperCase();
}

export function ClientAvatar({ logoUrl, name, size = "md", className = "" }: ClientAvatarProps) {
  const [imgError, setImgError] = useState(false);
  const { container, text } = sizeMap[size];
  const initials = getInitials(name);
  const bgColor = getColorFromName(name);
  const showFallback = !logoUrl || imgError;

  return (
    <div
      className={`${container} rounded-full overflow-hidden flex-shrink-0 flex items-center justify-center ${showFallback ? bgColor : "bg-white dark:bg-slate-700"} ring-2 ring-white dark:ring-slate-800 shadow-sm ${className}`}
      title={name}
    >
      {showFallback ? (
        <span className={`${text} font-semibold text-white select-none`}>
          {initials}
        </span>
      ) : (
        <img
          src={logoUrl}
          alt={`Logo ${name}`}
          className="w-full h-full object-cover"
          onError={() => setImgError(true)}
        />
      )}
    </div>
  );
}
