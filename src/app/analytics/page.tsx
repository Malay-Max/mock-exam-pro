import React from "react";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getUserAnalytics } from "@/app/actions/analytics";
import { CheckCircle2, TrendingUp, AlertTriangle } from "lucide-react";
import Link from "next/link";

export default async function AnalyticsPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  const stats = await getUserAnalytics(session.user.id);

  const kpiData = [
    {
      label: "Overall Accuracy",
      value: `${stats.overallAccuracy}%`,
      subtext: `${stats.totalQuestionsAttempted} questions answered`,
    },
    {
      label: "Mock Sessions",
      value: `${stats.completedSessions}`,
      subtext: `Avg Score: ${stats.averageScore}`,
    },
    {
      label: "Syllabus Revision",
      value: `${stats.revisionMasteryPercent}%`,
      subtext: `${stats.revisedSubUnits} of ${stats.totalSubUnits} topics done`,
    },
    {
      label: "Mistake Resolution",
      value: `${stats.mistakeResolutionRate}%`,
      subtext: `${stats.masteredErrors} of ${stats.totalErrors} resolved`,
    },
  ];

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
          Aspirant Analytics &amp; KPIs
        </h1>
        <div className="flex items-center gap-2 mt-1 mb-1.5">
          <span className="text-xs font-bold text-sky-700 bg-sky-50 px-2.5 py-0.5 rounded-full border border-sky-200">
            Personal Performance Dashboard • {session.user.name || session.user.email}
          </span>
        </div>
        <p className="text-xs sm:text-sm text-slate-500">
          Your syllabus coverage, examination accuracy, and mistake resolution metrics.
        </p>
      </div>

      {/* KPI Benchmark Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mb-8">
        {kpiData.map((kpi, idx) => (
          <div key={idx} className="bg-white border border-slate-200 rounded-2xl p-4 shadow-2xs">
            <span className="text-xs font-medium text-slate-500 block leading-tight">
              {kpi.label}
            </span>
            <div className="text-2xl font-black text-slate-900 mt-1">
              {kpi.value}
            </div>
            <div className="flex items-center gap-1 mt-1 text-[11px] font-semibold text-emerald-700">
              <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
              <span>{kpi.subtext}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Unit Breakdown */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-2xs mb-8">
        <h3 className="text-base font-bold text-slate-900 mb-4 flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-sky-600" />
          <span>Unit-Wise Accuracy Breakdown</span>
        </h3>

        {stats.unitPerformance.length === 0 ? (
          <div className="py-8 text-center">
            <p className="text-sm font-semibold text-slate-700">No examination attempts recorded yet.</p>
            <p className="text-xs text-slate-500 mt-1">
              Complete a Timed Exam or Quiz Mode session from the Syllabus Hub to see your unit-wise accuracy.
            </p>
            <Link
              href="/"
              className="inline-block mt-4 text-xs font-bold bg-sky-600 hover:bg-sky-700 text-white px-4 py-2 rounded-xl transition-colors"
            >
              Go to Syllabus Hub
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {stats.unitPerformance.map((u) => (
              <div key={u.unitId}>
                <div className="flex items-center justify-between text-xs font-bold text-slate-700 mb-1">
                  <span>{u.unitTitle}</span>
                  <span>
                    {u.accuracy}% ({u.attempted} Qs)
                  </span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                  <div
                    className={`h-2.5 rounded-full transition-all duration-300 ${
                      u.accuracy >= 80
                        ? "bg-emerald-500"
                        : u.accuracy >= 60
                        ? "bg-amber-500"
                        : "bg-red-500"
                    }`}
                    style={{ width: `${u.accuracy}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Actionable Insight */}
      <div className="bg-sky-50 border border-sky-200 rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-sky-600 shrink-0 mt-0.5" />
          <div>
            <h4 className="text-sm font-bold text-sky-900">
              Keep your Mistake Resolution Rate above 75%
            </h4>
            <p className="text-xs text-sky-700 mt-0.5">
              Reviewing your error queue daily ensures high-stakes retention for competitive exams.
            </p>
          </div>
        </div>
        <Link
          href="/notebook"
          className="text-xs font-bold bg-sky-600 hover:bg-sky-700 text-white px-4 py-2.5 rounded-xl shrink-0 text-center transition-colors"
        >
          Open Error Notebook
        </Link>
      </div>
    </div>
  );
}
