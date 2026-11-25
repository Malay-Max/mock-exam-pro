"use client";

import React from "react";
import Link from "next/link";
import { QuestionData } from "@/store/useAppStore";
import { Award, CheckCircle, XCircle, MinusCircle, Clock, RotateCcw, BookmarkCheck, ArrowRight, BookOpen } from "lucide-react";

interface ExamScorecardProps {
  questions: QuestionData[];
  userAnswers: Record<string, "A" | "B" | "C" | "D">;
  timeSpentSeconds: number;
  onRetake: () => void;
}

export const ExamScorecard: React.FC<ExamScorecardProps> = ({
  questions,
  userAnswers,
  timeSpentSeconds,
  onRetake,
}) => {
  const totalQuestions = questions.length;
  let correctCount = 0;
  let incorrectCount = 0;
  let unattemptedCount = 0;

  for (const q of questions) {
    const selected = userAnswers[q.id];
    if (!selected) {
      unattemptedCount += 1;
    } else if (selected === q.correctOptionKey) {
      correctCount += 1;
    } else {
      incorrectCount += 1;
    }
  }

  // Scoring: +1 for correct, -0.33 for wrong
  const rawScore = correctCount * 1.0 - incorrectCount * 0.33;
  const finalScore = Math.max(0, Math.round(rawScore * 100) / 100);
  const maxScore = totalQuestions * 1.0;
  const accuracy = totalQuestions - unattemptedCount > 0
    ? Math.round((correctCount / (totalQuestions - unattemptedCount)) * 100)
    : 0;

  const minutes = Math.floor(timeSpentSeconds / 60);
  const seconds = timeSpentSeconds % 60;

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Overview Card */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-sm mb-8 text-center">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-sky-50 text-sky-700 border border-sky-200 mb-3">
          <Award className="w-4 h-4" /> Examination Performance Report
        </div>

        <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
          Score: {finalScore} / {maxScore}
        </h1>

        <p className="text-xs sm:text-sm text-slate-500 mt-1">
          Marking Scheme: +1.00 for Correct, -0.33 for Wrong, 0 for Unattempted
        </p>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mt-6">
          <div className="p-3 bg-emerald-50/70 border border-emerald-200 rounded-2xl">
            <div className="flex items-center justify-center gap-1.5 text-emerald-800 text-xs font-bold mb-1">
              <CheckCircle className="w-4 h-4" /> Correct
            </div>
            <div className="text-2xl font-black text-emerald-900">{correctCount}</div>
            <div className="text-[11px] text-emerald-700">+{correctCount * 1.0} marks</div>
          </div>

          <div className="p-3 bg-red-50/70 border border-red-200 rounded-2xl">
            <div className="flex items-center justify-center gap-1.5 text-red-800 text-xs font-bold mb-1">
              <XCircle className="w-4 h-4" /> Incorrect
            </div>
            <div className="text-2xl font-black text-red-900">{incorrectCount}</div>
            <div className="text-[11px] text-red-700">
              -{Math.round(incorrectCount * 0.33 * 100) / 100} marks
            </div>
          </div>

          <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl">
            <div className="flex items-center justify-center gap-1.5 text-slate-700 text-xs font-bold mb-1">
              <MinusCircle className="w-4 h-4" /> Skipped
            </div>
            <div className="text-2xl font-black text-slate-900">{unattemptedCount}</div>
            <div className="text-[11px] text-slate-500">0.00 marks</div>
          </div>

          <div className="p-3 bg-sky-50/70 border border-sky-200 rounded-2xl">
            <div className="flex items-center justify-center gap-1.5 text-sky-800 text-xs font-bold mb-1">
              <Clock className="w-4 h-4" /> Time Spent
            </div>
            <div className="text-2xl font-black text-sky-900">
              {minutes}:{seconds < 10 ? `0${seconds}` : seconds}
            </div>
            <div className="text-[11px] text-sky-700">{accuracy}% accuracy</div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center justify-center gap-3 mt-8">
          <Link
            href="/notebook"
            className="text-xs sm:text-sm font-bold bg-amber-500 hover:bg-amber-600 text-white px-5 py-2.5 rounded-xl flex items-center gap-2 shadow-xs transition-colors cursor-pointer"
          >
            <BookmarkCheck className="w-4 h-4" />
            <span>Review Error Notebook ({incorrectCount})</span>
          </Link>

          <button
            type="button"
            onClick={onRetake}
            className="text-xs sm:text-sm font-bold bg-slate-100 hover:bg-slate-200 text-slate-800 px-5 py-2.5 rounded-xl flex items-center gap-2 transition-colors cursor-pointer"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Retake Test</span>
          </button>

          <Link
            href="/"
            className="text-xs sm:text-sm font-bold bg-slate-900 hover:bg-slate-800 text-white px-5 py-2.5 rounded-xl flex items-center gap-2 shadow-xs transition-colors cursor-pointer"
          >
            <BookOpen className="w-4 h-4" />
            <span>Syllabus Hub</span>
          </Link>
        </div>
      </div>

      {/* Question By Question Detailed Review */}
      <div className="space-y-4">
        <h2 className="text-lg font-bold text-slate-900 tracking-tight">
          Detailed Question Breakdown ({totalQuestions})
        </h2>

        {questions.map((q, idx) => {
          const selected = userAnswers[q.id];
          const isCorrect = selected === q.correctOptionKey;
          const isUnattempted = !selected;

          return (
            <div
              key={q.id}
              className={`p-5 rounded-2xl border bg-white ${
                isCorrect
                  ? "border-emerald-200"
                  : isUnattempted
                  ? "border-slate-200"
                  : "border-red-200 bg-red-50/20"
              }`}
            >
              <div className="flex items-center justify-between gap-2 mb-2">
                <span className="text-xs font-bold text-slate-500">
                  Question {idx + 1} • {q.subUnitTitle || "General"}
                </span>

                {isCorrect && (
                  <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                    <CheckCircle className="w-3.5 h-3.5" /> Correct (+1.0)
                  </span>
                )}
                {!isCorrect && !isUnattempted && (
                  <span className="inline-flex items-center gap-1 text-xs font-bold text-red-700 bg-red-100 px-2 py-0.5 rounded-full">
                    <XCircle className="w-3.5 h-3.5" /> Incorrect (-0.33)
                  </span>
                )}
                {isUnattempted && (
                  <span className="inline-flex items-center gap-1 text-xs font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-full">
                    <MinusCircle className="w-3.5 h-3.5" /> Skipped (0.0)
                  </span>
                )}
              </div>

              <p className="text-sm sm:text-base font-semibold text-slate-900 mb-3">
                {q.stem}
              </p>

              {/* Options status */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-3">
                {q.options.map((opt) => {
                  const isUserPick = selected === opt.key;
                  const isActualAnswer = opt.key === q.correctOptionKey;

                  let optBg = "bg-slate-50 border-slate-200 text-slate-700";
                  if (isActualAnswer) {
                    optBg = "bg-emerald-100/70 border-emerald-300 text-emerald-950 font-semibold";
                  } else if (isUserPick) {
                    optBg = "bg-red-100/70 border-red-300 text-red-950 line-through";
                  }

                  return (
                    <div
                      key={opt.id}
                      className={`text-xs p-2.5 rounded-xl border flex items-center gap-2 ${optBg}`}
                    >
                      <span className="w-5 h-5 rounded-md bg-white border border-slate-300 font-bold flex items-center justify-center shrink-0">
                        {opt.key}
                      </span>
                      <span>{opt.text}</span>
                    </div>
                  );
                })}
              </div>

              {/* Explanation */}
              {q.explanation && (
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-700 leading-relaxed">
                  <span className="font-bold text-slate-900">Explanation: </span>
                  {q.explanation}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
