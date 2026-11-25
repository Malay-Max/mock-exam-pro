"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { BookOpen, BookmarkCheck, BarChart3, Settings, LogIn, LogOut } from "lucide-react";

export const MobileNav: React.FC = () => {
  const pathname = usePathname();
  const { data: session } = useSession();

  // If in an active exam/quiz session or unauthenticated, hide bottom app nav
  if (
    pathname.startsWith("/exam") ||
    pathname.startsWith("/quiz") ||
    !session?.user
  ) {
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
      <div className="grid grid-cols-5 h-14">
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

        {session?.user ? (
          <button
            type="button"
            onClick={() => {
              if (confirm(`Sign out (${session.user?.name || session.user?.email})?`)) {
                signOut({ callbackUrl: "/login" });
              }
            }}
            className="flex flex-col items-center justify-center min-h-[44px] gap-0.5 text-[11px] font-medium text-slate-500 hover:text-red-600 transition-colors cursor-pointer"
          >
            <LogOut className="w-5 h-5" />
            <span>Sign Out</span>
          </button>
        ) : (
          <Link
            href="/login"
            className={`flex flex-col items-center justify-center min-h-[44px] gap-0.5 text-[11px] font-medium transition-colors ${
              pathname === "/login" || pathname === "/register"
                ? "text-sky-600 font-bold"
                : "text-slate-500 hover:text-slate-900"
            }`}
          >
            <LogIn className={`w-5 h-5 ${pathname === "/login" ? "stroke-[2.5]" : ""}`} />
            <span>Sign In</span>
          </Link>
        )}
      </div>
    </div>
  );
};
