import React from "react";
import { BarChart3, Award, Clock, Target, CheckCircle2, TrendingUp, AlertTriangle } from "lucide-react";
import Link from "next/link";

export default function AnalyticsPage() {
  const kpiData = [
    { label: "Exam Completion Rate", value: "94.2%", target: "≥ 92%", status: "success" },
    { label: "P95 Question Latency", value: "18 ms", target: "< 30 ms", status: "success" },
    { label: "Sub-Unit Revision Mastery", value: "81.4%", target: "≥ 80%", status: "success" },
    { label: "Mistake Resolution Rate", value: "78.0%", target: "≥ 75%", status: "success" },
  ];

  const unitPerformance = [
    { unit: "Unit 1: British Poetry", attempted: 45, accuracy: 84 },
    { unit: "Unit 2: British Drama", attempted: 60, accuracy: 78 },
    { unit: "Unit 3: British Fiction", attempted: 30, accuracy: 70 },
    { unit: "Unit 4: Commonwealth & Postcolonial", attempted: 55, accuracy: 91 },
  ];

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
          Aspirant Analytics & KPIs
        </h1>
        <div className="flex items-center gap-2 mt-1 mb-1.5">
          <span className="text-xs font-bold text-sky-700 bg-sky-50 px-2.5 py-0.5 rounded-full border border-sky-200">
            Executive Performance Dashboard
          </span>
        </div>
        <p className="text-xs sm:text-sm text-slate-500">
          Rigorous measurement of syllabus coverage, examination accuracy, and mistake resolution.
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
            <div className="flex items-center gap-1 mt-1 text-[11px] font-bold text-emerald-700">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Target {kpi.target} (Exceeded)</span>
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

        <div className="space-y-4">
          {unitPerformance.map((u, idx) => (
            <div key={idx}>
              <div className="flex justify-between items-center text-xs font-semibold text-slate-700 mb-1">
                <span>{u.unit}</span>
                <span className="font-bold text-slate-900">
                  {u.accuracy}% ({u.attempted} Qs)
                </span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                <div
                  className={`h-2 rounded-full transition-all duration-300 ${
                    u.accuracy >= 80 ? "bg-emerald-500" : u.accuracy >= 70 ? "bg-amber-500" : "bg-red-500"
                  }`}
                  style={{ width: `${u.accuracy}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Spaced Repetition Advice */}
      <div className="bg-sky-50 border border-sky-200 rounded-2xl p-5 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          <h4 className="text-sm font-bold text-sky-950 mb-0.5">
            Keep your Mistake Resolution Rate above 75%
          </h4>
          <p className="text-xs text-sky-800">
            Reviewing your error queue daily ensures high-stakes retention for competitive exams.
          </p>
        </div>
        <Link
          href="/notebook"
          className="text-xs font-bold bg-sky-600 hover:bg-sky-700 text-white px-4 py-2.5 rounded-xl transition-colors shrink-0 shadow-2xs"
        >
          Open Error Notebook
        </Link>
      </div>
    </div>
  );
}
