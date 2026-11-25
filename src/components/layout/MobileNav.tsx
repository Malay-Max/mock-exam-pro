"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { BookOpen, BookmarkCheck, BarChart3, Settings } from "lucide-react";

export const MobileNav: React.FC = () => {
  const pathname = usePathname();

  // If in an active exam/quiz session, hide bottom nav to avoid distraction
  if (pathname.startsWith("/exam") || pathname.startsWith("/quiz")) {
    return null;
  }

  const items = [
    { href: "/", label: "Syllabus", icon: BookOpen },
    { href: "/notebook", label: "Errors", icon: BookmarkCheck },
    { href: "/analytics", label: "Analytics", icon: BarChart3 },
    { href: "/admin", label: "Admin", icon: Settings },
  ];

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200">
      <div className="grid grid-cols-4 h-14">
        {items.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center justify-center min-h-[44px] gap-0.5 text-[11px] font-medium transition-colors ${
                isActive ? "text-sky-600 font-bold" : "text-slate-500 hover:text-slate-900"
              }`}
            >
              <Icon className={`w-5 h-5 ${isActive ? "stroke-[2.5]" : ""}`} />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
};
