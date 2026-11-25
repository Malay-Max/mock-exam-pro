import React from "react";
import Link from "next/link";
import {
  BookOpen,
  Timer,
  BookmarkCheck,
  BarChart3,
  CheckCircle2,
  ArrowRight,
  Layers,
  Keyboard,
  Sparkles,
} from "lucide-react";

export const LandingPage: React.FC = () => {
  const features = [
    {
      icon: Layers,
      accent: "bg-sky-50 text-sky-600 border-sky-200",
      title: "Hierarchical Syllabus Hub",
      description:
        "Navigate cleanly from Exam → Paper → Unit → Topic → Prescribed Texts. Keep study revision ('Mark Done') decoupled from practice test selection.",
    },
    {
      icon: Keyboard,
      accent: "bg-slate-100 text-slate-800 border-slate-300",
      title: "Keyboard-First Exam & Quiz Simulator",
      description:
        "Practice under real competitive exam scoring (+1 / -0.33) with a timed exam simulator or instant-feedback Quiz Mode using 1–4, J/K, and M shortcuts.",
    },
    {
      icon: BookmarkCheck,
      accent: "bg-amber-50 text-amber-600 border-amber-200",
      title: "SM-2 Spaced Repetition Notebook",
      description:
        "Every missed question is automatically cataloged, scheduled with the SM-2 algorithm, filterable by Unit and Topic, and ready for targeted error drills.",
    },
    {
      icon: BarChart3,
      accent: "bg-emerald-50 text-emerald-600 border-emerald-200",
      title: "Personal Mastery & Accuracy Analytics",
      description:
        "Track your personal syllabus completion, exam accuracy per unit, and mistake resolution rate across every study session.",
    },
  ];

  const highlights = [
    "Paper 1 & Paper 2 multi-exam structure",
    "Prescribed texts tagged right inside each topic",
    "Instant .txt question bank ingestion",
    "Distraction-free Pure Light Focus UI on desktop & mobile",
  ];

  return (
    <div className="bg-slate-50/40">
      {/* Hero Section */}
      <section className="max-w-6xl mx-auto px-4 pt-12 pb-12 sm:px-6 sm:pt-20 sm:pb-16">
        <div className="max-w-3xl mx-auto text-center">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-sky-50 text-sky-700 border border-sky-200 mb-5">
            <Sparkles className="w-3.5 h-3.5" />
            <span>High-Stakes Competitive Exam Preparation</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-black text-slate-900 tracking-tight leading-tight">
            Master Your Syllabus.{" "}
            <span className="text-sky-600">Simulate Real Exams.</span>
          </h1>

          <p className="mt-4 text-sm sm:text-base text-slate-600 leading-relaxed max-w-2xl mx-auto">
            MockExam Pro pairs a structured multi-exam syllabus hierarchy with a keyboard-first
            examination simulator and an automated SM-2 Spaced Repetition error notebook — built for
            UPESSC, UGC-NET, and state PSC aspirants.
          </p>

          {/* Primary CTAs */}
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              href="/register"
              className="w-full sm:w-auto px-6 py-3 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-sm font-bold flex items-center justify-center gap-2 shadow-sm transition-colors"
            >
              <span>Create Free Account</span>
              <ArrowRight className="w-4 h-4" />
            </Link>

            <Link
              href="/login"
              className="w-full sm:w-auto px-6 py-3 rounded-xl bg-white hover:bg-slate-50 text-slate-900 border border-slate-300 text-sm font-bold flex items-center justify-center gap-2 shadow-2xs transition-colors"
            >
              <span>Sign In to Your Workspace</span>
            </Link>
          </div>

          {/* Quick Highlights */}
          <div className="mt-8 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-xs text-slate-500 font-medium">
            {highlights.map((item) => (
              <span key={item} className="inline-flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span>{item}</span>
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* Feature Cards Grid */}
      <section className="max-w-6xl mx-auto px-4 pb-16 sm:px-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
          {features.map((feat) => {
            const Icon = feat.icon;
            return (
              <div
                key={feat.title}
                className="bg-white border border-slate-200 rounded-2xl p-6 shadow-2xs hover:border-slate-300 transition-colors"
              >
                <div
                  className={`w-10 h-10 rounded-xl border flex items-center justify-center mb-4 ${feat.accent}`}
                >
                  <Icon className="w-5 h-5" />
                </div>
                <h2 className="text-base sm:text-lg font-bold text-slate-900 mb-1.5">
                  {feat.title}
                </h2>
                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                  {feat.description}
                </p>
              </div>
            );
          })}
        </div>

        {/* Bottom CTA Banner */}
        <div className="mt-10 bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-2xs">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-sky-600 text-white flex items-center justify-center shrink-0">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Ready to start your focused preparation?
              </h3>
              <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
                Sign in or create an account to save your syllabus mastery, mock history, and SRS mistakes.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 w-full sm:w-auto shrink-0">
            <Link
              href="/login"
              className="flex-1 sm:flex-none text-center px-4 py-2 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-800 text-xs sm:text-sm font-bold transition-colors"
            >
              Sign In
            </Link>
            <Link
              href="/register"
              className="flex-1 sm:flex-none text-center px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs sm:text-sm font-bold transition-colors flex items-center justify-center gap-1.5"
            >
              <Timer className="w-3.5 h-3.5 text-amber-400" />
              <span>Get Started</span>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
};
