"use client";

import React from "react";
import { QuestionData } from "@/store/useAppStore";
import { CheckCircle2, XCircle, Lightbulb } from "lucide-react";

interface QuestionCardProps {
  question: QuestionData;
  questionNumber: number;
  totalQuestions: number;
  selectedOptionKey?: "A" | "B" | "C" | "D";
  onSelectOption: (key: "A" | "B" | "C" | "D") => void;
  // Instant Quiz Props
  isInstantMode?: boolean;
  showExplanation?: boolean;
}

export const QuestionCard: React.FC<QuestionCardProps> = ({
  question,
  questionNumber,
  totalQuestions,
  selectedOptionKey,
  onSelectOption,
  isInstantMode = false,
  showExplanation = false,
}) => {
  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-6 shadow-xs">
      {/* Breadcrumb info */}
      <div className="flex items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
          {question.unitTitle && <span>{question.unitTitle}</span>}
          {question.unitTitle && question.subUnitTitle && <span>›</span>}
          {question.subUnitTitle && (
            <span className="text-sky-700 bg-sky-50 px-2 py-0.5 rounded border border-sky-200">
              {question.subUnitTitle}
            </span>
          )}
        </div>
        <span className="text-xs font-bold text-slate-400">
          Q {questionNumber} / {totalQuestions}
        </span>
      </div>

      {/* Stem */}
      <div className="text-base sm:text-lg font-semibold text-slate-900 leading-relaxed mb-6">
        {question.stem}
      </div>

      {/* Options A - D */}
      <div className="space-y-3">
        {question.options.map((opt) => {
          const isSelected = selectedOptionKey === opt.key;
          const isCorrectAnswer = opt.key === question.correctOptionKey;

          let optionStyle = "border-slate-200 bg-white hover:bg-slate-50 text-slate-800";
          let badgeStyle = "bg-slate-100 text-slate-600 border-slate-300";

          if (isInstantMode && selectedOptionKey) {
            // Instant feedback styling
            if (isCorrectAnswer) {
              optionStyle = "border-emerald-500 bg-emerald-50/70 text-emerald-950 ring-1 ring-emerald-500";
              badgeStyle = "bg-emerald-600 text-white border-emerald-600";
            } else if (isSelected && !isCorrectAnswer) {
              optionStyle = "border-red-500 bg-red-50/70 text-red-950 ring-1 ring-red-500";
              badgeStyle = "bg-red-600 text-white border-red-600";
            } else {
              optionStyle = "border-slate-200 bg-white opacity-60 text-slate-500";
            }
          } else if (isSelected) {
            // Timed exam standard selection
            optionStyle = "border-sky-600 bg-sky-50 text-sky-950 ring-1 ring-sky-600";
            badgeStyle = "bg-sky-600 text-white border-sky-600";
          }

          return (
            <button
              key={opt.id}
              type="button"
              disabled={isInstantMode && !!selectedOptionKey}
              onClick={() => onSelectOption(opt.key)}
              className={`w-full p-3.5 sm:p-4 rounded-xl border text-left flex items-start gap-3 transition-all cursor-pointer ${optionStyle}`}
            >
              <div
                className={`w-6 h-6 rounded-lg text-xs font-bold flex items-center justify-center shrink-0 border ${badgeStyle}`}
              >
                {opt.key}
              </div>

              <div className="flex-1 text-sm sm:text-base font-medium pt-0.5 leading-snug">
                {opt.text}
              </div>

              {isInstantMode && selectedOptionKey && (
                <div className="shrink-0 pt-0.5">
                  {isCorrectAnswer && <CheckCircle2 className="w-5 h-5 text-emerald-600" />}
                  {isSelected && !isCorrectAnswer && <XCircle className="w-5 h-5 text-red-600" />}
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Instant Mode Explanation Card */}
      {isInstantMode && showExplanation && question.explanation && (
        <div className="mt-6 p-4 rounded-xl bg-amber-50/70 border border-amber-200 animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="flex items-center gap-1.5 text-xs font-bold text-amber-900 mb-1">
            <Lightbulb className="w-4 h-4 text-amber-600" />
            <span>Explanation & Key Fact:</span>
          </div>
          <p className="text-xs sm:text-sm text-amber-950 leading-relaxed">
            {question.explanation}
          </p>
        </div>
      )}
    </div>
  );
};
