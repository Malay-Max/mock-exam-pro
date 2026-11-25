"use client";

import React from "react";
import { BookOpen, CheckCircle2, Award, Pencil, Plus } from "lucide-react";
import { SelectDropdown } from "@/components/ui/SelectDropdown";

interface ExamHeaderProps {
  exams: { id: string; title: string; slug: string; description?: string | null }[];
  activeExam: {
    id: string;
    title: string;
    description: string | null;
    totalQuestions: number;
    totalSubUnits: number;
    totalCompletedSubUnits: number;
    masteryPercentage: number;
  };
  onSelectExam: (examId: string) => void;
  onEditExam?: () => void;
  onAddExam?: () => void;
}

export const ExamHeader: React.FC<ExamHeaderProps> = ({
  exams,
  activeExam,
  onSelectExam,
  onEditExam,
  onAddExam,
}) => {
  const examOptions = exams.map((ex) => ({
    value: ex.id,
    label: ex.title,
  }));

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-40">
      <div className="max-w-6xl mx-auto px-4 py-4 sm:px-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          {/* Title & Styled Exam Switcher with Edit & Add Exam Buttons */}
          <div className="flex-1 min-w-0">
            {/* App Heading */}
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              MockExam Pro
            </h1>

            {/* Badge & Tagline: UNDER the heading */}
            <div className="flex items-center gap-2 mt-1 mb-2.5">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-sky-50 text-sky-700 border border-sky-200">
                <Award className="w-3.5 h-3.5" /> High-Stakes Exam Prep
              </span>
              <span className="text-xs text-slate-400">•</span>
              <span className="text-xs font-medium text-slate-600">Pure Light Focus</span>
            </div>

            {/* Exam Selector, Edit Exam, Add Exam: ONE LINE BELOW APP NAME ON MOBILE */}
            <div className="flex items-center gap-2 w-full max-w-xl">
              <div className="flex-1 min-w-0">
                <SelectDropdown
                  options={examOptions}
                  value={activeExam.id}
                  onChange={onSelectExam}
                  className="w-full"
                />
              </div>

              {/* 1. Edit Exam Button (Icon) */}
              {onEditExam && (
                <button
                  type="button"
                  onClick={onEditExam}
                  title="Edit current exam title & details"
                  className="w-9 h-9 rounded-xl bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 hover:text-slate-900 flex items-center justify-center transition-colors cursor-pointer shrink-0 shadow-2xs"
                >
                  <Pencil className="w-4 h-4" />
                </button>
              )}

              {/* 2. Add Exam Button (Icon) */}
              {onAddExam && (
                <button
                  type="button"
                  onClick={onAddExam}
                  title="Add new examination syllabus"
                  className="w-9 h-9 rounded-xl bg-sky-600 hover:bg-sky-700 text-white flex items-center justify-center transition-colors cursor-pointer shrink-0 shadow-2xs"
                >
                  <Plus className="w-4 h-4" />
                </button>
              )}
            </div>

            {activeExam.description && (
              <p className="text-xs sm:text-sm text-slate-500 mt-2 max-w-2xl line-clamp-1">
                {activeExam.description}
              </p>
            )}
          </div>

          {/* Revision Mastery & Syllabus Stats */}
          <div className="flex items-center gap-4 sm:gap-6 bg-slate-50 border border-slate-200 rounded-2xl px-4 py-2.5 shrink-0">
            <div>
              <div className="flex items-center justify-between gap-3 mb-1">
                <span className="text-xs font-medium text-slate-600 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Syllabus Mastery
                </span>
                <span className="text-xs font-bold text-slate-900">
                  {activeExam.masteryPercentage}%
                </span>
              </div>
              <div className="w-32 sm:w-40 bg-slate-200 rounded-full h-2 overflow-hidden">
                <div
                  className="bg-emerald-500 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${activeExam.masteryPercentage}%` }}
                />
              </div>
              <p className="text-[11px] text-slate-500 mt-0.5">
                {activeExam.totalCompletedSubUnits} of {activeExam.totalSubUnits} sub-units revised
              </p>
            </div>

            <div className="border-l border-slate-200 pl-4 flex flex-col justify-center">
              <span className="text-xs text-slate-500">Question Pool</span>
              <span className="text-lg font-bold text-slate-900 flex items-center gap-1">
                <BookOpen className="w-4 h-4 text-sky-600" />
                {activeExam.totalQuestions}
              </span>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};
