"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { BookOpen, BookmarkCheck, BarChart3, ShieldAlert, LogIn, LogOut, User } from "lucide-react";

export const Navbar: React.FC = () => {
  const pathname = usePathname();
  const { data: session, status } = useSession();

  const navItems = [
    { href: "/", label: "Syllabus Hub", icon: BookOpen },
    { href: "/notebook", label: "Error Notebook", icon: BookmarkCheck },
    { href: "/analytics", label: "Analytics", icon: BarChart3 },
    { href: "/admin", label: "Admin CMS", icon: ShieldAlert },
  ];

  return (
    <nav className="bg-white border-b border-slate-200 hidden md:block">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-14">
          <div className="flex items-center gap-6">
            <Link href="/" className="flex items-center gap-2 font-bold text-slate-900 text-lg">
              <span className="w-8 h-8 rounded-lg bg-sky-600 text-white flex items-center justify-center font-black">
                M
              </span>
              <span>MockExam Pro</span>
            </Link>

            {session?.user && (
              <div className="flex items-center gap-1">
                {navItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = pathname === item.href;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold transition-colors ${
                        isActive
                          ? "bg-slate-100 text-slate-900"
                          : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      <span>{item.label}</span>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>

          <div className="flex items-center gap-2.5">
            {status === "loading" ? (
              <span className="text-xs text-slate-400 font-medium">Loading...</span>
            ) : session?.user ? (
              <div className="flex items-center gap-2.5">
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-100 border border-slate-200 text-xs font-semibold text-slate-700">
                  <User className="w-3.5 h-3.5 text-sky-600" />
                  <span className="max-w-[140px] truncate">{session.user.name || session.user.email}</span>
                </div>
                <button
                  type="button"
                  onClick={() => signOut({ callbackUrl: "/" })}
                  title="Sign Out"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-slate-600 hover:text-red-600 hover:bg-red-50 border border-slate-200 transition-colors cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Sign Out</span>
                </button>
              </div>
            ) : (
              <>
                <Link
                  href="/login"
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold text-slate-700 hover:text-slate-900 hover:bg-slate-100 border border-slate-200 transition-colors"
                >
                  <LogIn className="w-3.5 h-3.5" />
                  <span>Sign In</span>
                </Link>
                <Link
                  href="/register"
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold bg-sky-600 hover:bg-sky-700 text-white transition-colors"
                >
                  <span>Register</span>
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};
