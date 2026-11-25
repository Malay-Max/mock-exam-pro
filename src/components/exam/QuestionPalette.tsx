"use client";

import React from "react";
import { QuestionData } from "@/store/useAppStore";
import { Check, Bookmark, Circle } from "lucide-react";

interface QuestionPaletteProps {
  questions: QuestionData[];
  currentIndex: number;
  userAnswers: Record<string, "A" | "B" | "C" | "D">;
  markedForReview: string[];
  onSelectQuestion: (index: number) => void;
}

export const QuestionPalette: React.FC<QuestionPaletteProps> = ({
  questions,
  currentIndex,
  userAnswers,
  markedForReview,
  onSelectQuestion,
}) => {
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs">
      <div className="flex items-center justify-between mb-3 border-b border-slate-100 pb-2">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
          Question Palette ({questions.length})
        </h3>
      </div>

      {/* Legend */}
      <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-600 mb-4 pb-3 border-b border-slate-100">
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded bg-emerald-500 shrink-0" />
          <span>Answered</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded bg-amber-500 shrink-0" />
          <span>Review</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded bg-purple-600 shrink-0" />
          <span>Ans & Review</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded bg-slate-100 border border-slate-300 shrink-0" />
          <span>Unvisited</span>
        </div>
      </div>

      {/* Grid of question bubbles */}
      <div className="grid grid-cols-5 gap-2 max-h-80 overflow-y-auto no-scrollbar pr-1">
        {questions.map((q, idx) => {
          const isCurrent = idx === currentIndex;
          const isAnswered = !!userAnswers[q.id];
          const isMarked = markedForReview.includes(q.id);

          let bgClasses = "bg-slate-100 text-slate-700 hover:bg-slate-200 border-slate-200";

          if (isAnswered && isMarked) {
            bgClasses = "bg-purple-600 text-white hover:bg-purple-700 border-purple-600";
          } else if (isAnswered) {
            bgClasses = "bg-emerald-600 text-white hover:bg-emerald-700 border-emerald-600";
          } else if (isMarked) {
            bgClasses = "bg-amber-500 text-white hover:bg-amber-600 border-amber-500";
          }

          return (
            <button
              key={q.id}
              type="button"
              onClick={() => onSelectQuestion(idx)}
              className={`h-9 rounded-lg font-bold text-xs flex items-center justify-center border transition-all cursor-pointer relative ${bgClasses} ${
                isCurrent ? "ring-2 ring-sky-500 ring-offset-2 scale-105" : ""
              }`}
              title={`Jump to Question ${idx + 1}`}
            >
              <span>{idx + 1}</span>
              {isMarked && (
                <span className="absolute top-0.5 right-0.5 w-1.5 h-1.5 rounded-full bg-amber-300" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};
