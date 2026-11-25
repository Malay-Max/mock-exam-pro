import type { Metadata } from "next";
import "./globals.css";
import { Navbar } from "@/components/layout/Navbar";
import { MobileNav } from "@/components/layout/MobileNav";
import { AuthProvider } from "@/components/providers/AuthProvider";

export const metadata: Metadata = {
  title: "MockExam Pro — Multi-Exam Syllabus Mastery & Examination Simulator",
  description: "Authoritative, keyboard-first, distraction-free examination simulator for competitive exams.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full bg-white text-slate-900 no-scrollbar">
      <body className="min-h-full flex flex-col bg-white text-slate-900 antialiased selection:bg-sky-100 selection:text-sky-900">
        <AuthProvider>
          <Navbar />
          <main className="flex-1 pb-20 sm:pb-12">{children}</main>
          <MobileNav />
        </AuthProvider>
      </body>
    </html>
  );
}
