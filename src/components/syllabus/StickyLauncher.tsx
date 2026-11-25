"use client";

import React, { useState } from "react";
import { Timer, X, ChevronRight, Play } from "lucide-react";

interface StickyLauncherProps {
  selectedCount: number;
  availableQuestionsCount: number;
  onStartTimedExam: (questionLimit: number) => void;
  onStartInstantQuiz: (questionLimit: number) => void;
  onClear: () => void;
  onSelectAllExams: () => void;
}

export const StickyLauncher: React.FC<StickyLauncherProps> = ({
  selectedCount,
  availableQuestionsCount,
  onStartTimedExam,
  onStartInstantQuiz,
  onClear,
  onSelectAllExams,
}) => {
  const [selectedLimit, setSelectedLimit] = useState<number>(20);

  if (selectedCount === 0) {
    return (
      <div className="fixed bottom-16 sm:bottom-6 left-0 right-0 z-30 px-4 pointer-events-none">
        <div className="max-w-xl mx-auto bg-white/95 backdrop-blur-md border border-slate-200 rounded-2xl shadow-lg p-3 text-center pointer-events-auto flex items-center justify-between gap-3">
          <p className="text-xs sm:text-sm font-medium text-slate-600 text-left">
            Select sub-units with checkboxes to launch a focused practice session.
          </p>
          <button
            type="button"
            onClick={onSelectAllExams}
            className="text-xs font-bold text-sky-700 bg-sky-50 hover:bg-sky-100 border border-sky-200 rounded-lg px-3 py-1.5 transition-colors shrink-0 cursor-pointer"
          >
            Practice Entire Syllabus
          </button>
        </div>
      </div>
    );
  }

  const effectiveLimit = Math.min(selectedLimit, availableQuestionsCount || selectedLimit);

  return (
    <div className="fixed bottom-16 sm:bottom-6 left-0 right-0 z-30 px-4 pointer-events-none">
      <div className="max-w-2xl mx-auto bg-white border border-slate-300 rounded-2xl shadow-2xl p-3 sm:p-4 pointer-events-auto transition-all">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Selections info */}
          <div className="flex items-center justify-between sm:justify-start gap-3">
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-sky-600 text-white font-bold text-xs flex items-center justify-center">
                {selectedCount}
              </span>
              <div>
                <h4 className="text-sm font-bold text-slate-900 leading-tight">
                  {selectedCount} Sub-unit{selectedCount > 1 ? "s" : ""} Selected
                </h4>
                <p className="text-xs text-slate-500">
                  {availableQuestionsCount} total questions in pool
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClear}
              className="text-xs text-slate-400 hover:text-slate-600 p-1 rounded-md transition-colors sm:ml-2"
              title="Clear selections"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Test Launch Buttons */}
          <div className="flex items-center gap-2">
            {/* Mode 1: Timed Exam */}
            <button
              type="button"
              onClick={() => onStartTimedExam(effectiveLimit)}
              className="flex-1 sm:flex-none text-xs sm:text-sm font-bold bg-slate-900 hover:bg-slate-800 text-white px-3 sm:px-4 py-2 rounded-xl flex items-center justify-center gap-1.5 shadow-sm transition-colors cursor-pointer"
            >
              <Timer className="w-4 h-4 text-amber-400" />
              <span>Timed Exam</span>
            </button>

            {/* Mode 2: Quiz Mode */}
            <button
              type="button"
              onClick={() => onStartInstantQuiz(effectiveLimit)}
              className="flex-1 sm:flex-none text-xs sm:text-sm font-bold bg-sky-600 hover:bg-sky-700 text-white px-4 py-2 rounded-xl flex items-center justify-center shadow-sm transition-colors cursor-pointer"
            >
              <span>Quiz Mode</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
