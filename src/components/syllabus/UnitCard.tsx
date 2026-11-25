"use client";

import React from "react";
import { Check, CheckCircle, Circle, Pencil, Trash2, Plus } from "lucide-react";
import { UnitWithSubUnits } from "@/app/actions/syllabus";

interface UnitCardProps {
  unit: UnitWithSubUnits;
  selectedSubUnitIds: string[];
  completedSubUnitIds: string[];
  onToggleSelect: (subUnitId: string) => void;
  onSelectUnitAll: (subUnitIds: string[]) => void;
  onDeselectUnitAll: (subUnitIds: string[]) => void;
  onToggleDone: (subUnitId: string) => void;
  onEditUnit?: (unitId: string, currentTitle: string, currentUnitNumber: number, currentPaper?: string | null) => void;
  onDeleteUnit?: (unitId: string) => void;
  onAddSubUnit?: (unitId: string) => void;
  onEditSubUnit?: (subUnitId: string, currentTitle: string, currentPrescribedTexts?: string[]) => void;
  onDeleteSubUnit?: (subUnitId: string) => void;
}

export const UnitCard: React.FC<UnitCardProps> = ({
  unit,
  selectedSubUnitIds,
  completedSubUnitIds,
  onToggleSelect,
  onSelectUnitAll,
  onDeselectUnitAll,
  onToggleDone,
  onEditUnit,
  onDeleteUnit,
  onAddSubUnit,
  onEditSubUnit,
  onDeleteSubUnit,
}) => {
  const allSubIds = unit.subUnits.map((s) => s.id);
  const selectedCountInUnit = unit.subUnits.filter((s) => selectedSubUnitIds.includes(s.id)).length;
  const isAllSelected = allSubIds.length > 0 && selectedCountInUnit === allSubIds.length;

  const completedCount = unit.subUnits.filter((s) => completedSubUnitIds.includes(s.id)).length;
  const unitMasteryPercent = unit.subUnits.length > 0 ? Math.round((completedCount / unit.subUnits.length) * 100) : 0;

  return (
    <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs hover:border-slate-300 transition-colors">
      {/* Unit Header */}
      <div className="p-4 bg-slate-50 border-b border-slate-200">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2 mb-1.5">
              <span className="px-2 py-0.5 rounded-md bg-sky-100 text-sky-800 font-bold text-xs shrink-0">
                U{unit.unitNumber}
              </span>
              {unit.paper && (
                <span className="px-2 py-0.5 rounded-md bg-purple-50 text-purple-700 border border-purple-200 text-xs font-bold shrink-0">
                  {unit.paper}
                </span>
              )}
            </div>
            <h2 className="text-base font-bold text-slate-900 tracking-tight leading-snug">
              {unit.title}
            </h2>
            <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 mt-1 text-xs text-slate-500">
              <span className="whitespace-nowrap">{unit.subUnits.length} Topics</span>
              <span aria-hidden="true">•</span>
              <span className="whitespace-nowrap">{unit.totalQuestions} Qs</span>
              <span aria-hidden="true">•</span>
              <span className="text-emerald-700 font-semibold whitespace-nowrap">
                {completedCount}/{unit.subUnits.length} Done ({unitMasteryPercent}%)
              </span>
            </div>
          </div>

          {/* Unit Actions: Select All + Edit/Delete Icons */}
          <div className="flex items-center gap-2 self-start sm:self-center shrink-0">
            {isAllSelected ? (
              <button
                type="button"
                onClick={() => onDeselectUnitAll(allSubIds)}
                className="text-xs font-semibold px-2.5 py-1.5 rounded-lg bg-slate-200 hover:bg-slate-300 text-slate-700 transition-colors cursor-pointer whitespace-nowrap"
              >
                Deselect Unit
              </button>
            ) : (
              <button
                type="button"
                onClick={() => onSelectUnitAll(allSubIds)}
                className="text-xs font-semibold px-2.5 py-1.5 rounded-lg bg-sky-50 hover:bg-sky-100 text-sky-700 border border-sky-200 transition-colors cursor-pointer whitespace-nowrap"
              >
                Select All Unit
              </button>
            )}

            {/* Edit Unit Icon Button */}
            {onEditUnit && (
              <button
                type="button"
                onClick={() => onEditUnit(unit.id, unit.title, unit.unitNumber, unit.paper)}
                title="Edit Unit"
                className="w-7 h-7 rounded-lg bg-white hover:bg-slate-100 border border-slate-300 text-slate-600 hover:text-slate-900 flex items-center justify-center transition-colors cursor-pointer shrink-0"
              >
                <Pencil className="w-3.5 h-3.5" />
              </button>
            )}

            {/* Delete Unit Icon Button */}
            {onDeleteUnit && (
              <button
                type="button"
                onClick={() => {
                  if (confirm(`Are you sure you want to delete "${unit.title}" and its topics?`)) {
                    onDeleteUnit(unit.id);
                  }
                }}
                title="Delete Unit"
                className="w-7 h-7 rounded-lg bg-white hover:bg-red-50 border border-slate-300 hover:border-red-300 text-slate-500 hover:text-red-600 flex items-center justify-center transition-colors cursor-pointer shrink-0"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Unit Completion Progress Bar */}
        <div className="w-full bg-slate-200 rounded-full h-1.5 mt-3 overflow-hidden">
          <div
            className="bg-emerald-500 h-1.5 rounded-full transition-all duration-300"
            style={{ width: `${unitMasteryPercent}%` }}
          />
        </div>
      </div>

      {/* Sub-Units (Topics) List */}
      <div className="divide-y divide-slate-100">
        {unit.subUnits.map((sub) => {
          const isSelected = selectedSubUnitIds.includes(sub.id);
          const isDone = completedSubUnitIds.includes(sub.id);

          return (
            <div
              key={sub.id}
              className={`p-3.5 sm:px-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-3 transition-colors ${
                isSelected ? "bg-sky-50/40" : "hover:bg-slate-50/60"
              }`}
            >
              {/* Practice Selection Checkbox + Title + Prescribed Texts */}
              <div className="flex items-start gap-2.5 sm:gap-3 min-w-0 flex-1">
                <label className="relative flex items-center justify-center cursor-pointer pt-0.5 shrink-0">
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => onToggleSelect(sub.id)}
                    className="sr-only"
                  />
                  <div
                    className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${
                      isSelected
                        ? "bg-sky-600 border-sky-600 text-white"
                        : "border-slate-300 bg-white hover:border-slate-400"
                    }`}
                  >
                    {isSelected && <Check className="w-3.5 h-3.5 stroke-[2.5]" />}
                  </div>
                </label>

                <div className="min-w-0 flex-1">
                  <div className="flex items-start sm:items-center gap-2 flex-wrap">
                    <span className="text-sm font-semibold text-slate-900 leading-snug">
                      {sub.title}
                    </span>
                    <span className="hidden sm:inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-semibold bg-slate-100 text-slate-600 border border-slate-200 shrink-0">
                      {sub.questionCount} Qs
                    </span>
                  </div>

                  {/* Prescribed Texts (Clean, minimal inline display) */}
                  {sub.prescribedTexts && sub.prescribedTexts.length > 0 && (
                    <p className="mt-1 text-xs text-slate-500 leading-relaxed">
                      <span className="font-medium text-slate-400 mr-1.5">Prescribed:</span>
                      {sub.prescribedTexts.join(" • ")}
                    </p>
                  )}
                </div>
              </div>

              {/* Mobile bottom bar / Desktop right actions */}
              <div className="flex items-center justify-between sm:justify-end gap-1.5 pl-7 sm:pl-0 shrink-0">
                <span className="sm:hidden inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold bg-slate-100 text-slate-600 border border-slate-200 shrink-0">
                  {sub.questionCount} Qs
                </span>

                <div className="flex items-center gap-1.5">
                  {/* Edit Topic Icon */}
                  {onEditSubUnit && (
                    <button
                      type="button"
                      onClick={() => onEditSubUnit(sub.id, sub.title, sub.prescribedTexts)}
                      title="Edit Topic"
                      className="w-7 h-7 rounded-lg bg-white hover:bg-slate-100 border border-slate-200 text-slate-500 hover:text-slate-800 flex items-center justify-center transition-colors cursor-pointer"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                  )}

                  {/* Delete Topic Icon */}
                  {onDeleteSubUnit && (
                    <button
                      type="button"
                      onClick={() => {
                        if (confirm(`Are you sure you want to delete topic "${sub.title}"?`)) {
                          onDeleteSubUnit(sub.id);
                        }
                      }}
                      title="Delete Topic"
                      className="w-7 h-7 rounded-lg bg-white hover:bg-red-50 border border-slate-200 hover:border-red-200 text-slate-400 hover:text-red-600 flex items-center justify-center transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}

                  {/* Decoupled Revision Mastery "Mark as Done" Button */}
                  <button
                    type="button"
                    onClick={() => onToggleDone(sub.id)}
                    className={`text-xs font-semibold px-2.5 py-1.5 rounded-lg flex items-center gap-1.5 transition-all cursor-pointer ${
                      isDone
                        ? "bg-emerald-100 text-emerald-800 hover:bg-emerald-200 border border-emerald-300"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200 border border-slate-200"
                    }`}
                    title={isDone ? "Mark as in-progress" : "Mark as revised/studied"}
                  >
                    {isDone ? (
                      <>
                        <CheckCircle className="w-3.5 h-3.5 text-emerald-700" />
                        <span>Done</span>
                      </>
                    ) : (
                      <>
                        <Circle className="w-3.5 h-3.5 text-slate-400" />
                        <span className="hidden sm:inline">Mark Done</span>
                        <span className="sm:hidden">Done</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          );
        })}

        {/* 4. Add Topic Button at the end of each Unit */}
        {onAddSubUnit && (
          <button
            type="button"
            onClick={() => onAddSubUnit(unit.id)}
            className="w-full py-2.5 px-4 bg-slate-50/50 hover:bg-sky-50/60 text-slate-500 hover:text-sky-700 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer border-t border-slate-100"
          >
            <Plus className="w-3.5 h-3.5 text-sky-600" />
            <span>Add Topic to {unit.title}</span>
          </button>
        )}
      </div>
    </div>
  );
};
