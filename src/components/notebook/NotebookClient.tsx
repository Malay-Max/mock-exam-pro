"use client";

import React, { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ErrorItem, attemptErrorNotebookItem } from "@/app/actions/notebook";
import { useAppStore } from "@/store/useAppStore";
import { SelectDropdown } from "@/components/ui/SelectDropdown";
import { BookmarkCheck, Clock, Award, CheckCircle2, XCircle, RotateCcw, Lightbulb, Play, Filter } from "lucide-react";

interface NotebookClientProps {
  initialItems: ErrorItem[];
  resolutionRate: number;
  totalErrors: number;
  masteredCount: number;
  dueCount: number;
}

export const NotebookClient: React.FC<NotebookClientProps> = ({
  initialItems,
  resolutionRate,
  totalErrors,
  masteredCount,
  dueCount,
}) => {
  const router = useRouter();
  const [items, setItems] = useState<ErrorItem[]>(initialItems);
  const [activeTab, setActiveTab] = useState<"all" | "due" | "learning" | "mastered">("all");
  const [selectedUnit, setSelectedUnit] = useState<string>("all");
  const [selectedTopic, setSelectedTopic] = useState<string>("all");
  const [activeAnswerPicks, setActiveAnswerPicks] = useState<Record<string, "A" | "B" | "C" | "D">>({});
  const [revealedExplanations, setRevealedExplanations] = useState<Record<string, boolean>>({});
  const [isPending, startTransition] = useTransition();

  const { startSession } = useAppStore();

  const uniqueUnits = Array.from(new Set(items.map((i) => i.unitTitle))).filter(Boolean);
  const unitOptions = [
    { value: "all", label: "All Units", badge: `${items.length}` },
    ...uniqueUnits.map((u) => {
      const count = items.filter((i) => i.unitTitle === u).length;
      return { value: u, label: u, badge: `${count}` };
    }),
  ];

  const scopedItemsForTopics = selectedUnit === "all" ? items : items.filter((i) => i.unitTitle === selectedUnit);
  const uniqueTopics = Array.from(new Set(scopedItemsForTopics.map((i) => i.subUnitTitle))).filter(Boolean);
  const topicOptions = [
    { value: "all", label: "All Topics", badge: `${scopedItemsForTopics.length}` },
    ...uniqueTopics.map((t) => {
      const count = scopedItemsForTopics.filter((i) => i.subUnitTitle === t).length;
      return { value: t, label: t, badge: `${count}` };
    }),
  ];

  const handleUnitChange = (val: string) => {
    setSelectedUnit(val);
    setSelectedTopic("all");
  };

  const filteredItems = items.filter((item) => {
    if (activeTab === "due") {
      if (item.status === "mastered" || new Date(item.nextReviewAt) > new Date()) return false;
    } else if (activeTab === "learning") {
      if (item.status !== "learning") return false;
    } else if (activeTab === "mastered") {
      if (item.status !== "mastered") return false;
    }

    if (selectedUnit !== "all" && item.unitTitle !== selectedUnit) {
      return false;
    }

    if (selectedTopic !== "all" && item.subUnitTitle !== selectedTopic) {
      return false;
    }

    return true;
  });

  const handlePickOption = (item: ErrorItem, key: "A" | "B" | "C" | "D") => {
    if (activeAnswerPicks[item.id]) return; // already picked

    const isCorrect = key === item.correctOptionKey;
    setActiveAnswerPicks((prev) => ({ ...prev, [item.id]: key }));
    setRevealedExplanations((prev) => ({ ...prev, [item.id]: true }));

    startTransition(async () => {
      const res = await attemptErrorNotebookItem(item.id, isCorrect);
      if (res.success && "status" in res && res.status) {
        setItems((prev) =>
          prev.map((i) =>
            i.id === item.id
              ? {
                  ...i,
                  status: res.status as "review" | "learning" | "mastered",
                  consecutiveCorrect: res.consecutiveCorrect as number,
                  intervalDays: res.intervalDays as number,
                }
              : i
          )
        );
      }
    });
  };

  const handleLaunchErrorDrill = () => {
    const drillQuestions = filteredItems.map((item) => ({
      id: item.questionId,
      subUnitId: "error-sub",
      subUnitTitle: item.subUnitTitle,
      unitTitle: item.unitTitle,
      stem: item.stem,
      explanation: item.explanation || undefined,
      correctOptionKey: item.correctOptionKey,
      options: item.options.map((opt, idx) => ({
        id: `opt-${idx}`,
        key: opt.key,
        text: opt.text,
      })),
    }));

    if (drillQuestions.length === 0) {
      alert("No questions found in this filter to practice.");
      return;
    }

    startSession({
      sessionId: `error-drill-${Date.now()}`,
      sessionType: "instant_quiz",
      questions: drillQuestions,
      currentIndex: 0,
      userAnswers: {},
      markedForReview: [],
      timeRemainingSeconds: 0,
      timeSpentSeconds: 0,
      isSubmitted: false,
      instantFeedback: {},
      streak: 0,
    });
    router.push("/quiz");
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Error Notebook
          </h1>
          <div className="flex items-center gap-2 mt-1 mb-1.5">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
              <BookmarkCheck className="w-3.5 h-3.5" /> Spaced Repetition (SRS)
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500">
            Automatic catalog of missed examination questions scheduled with the SM-2 learning algorithm.
          </p>
        </div>

        {items.length > 0 && (
          <button
            type="button"
            onClick={handleLaunchErrorDrill}
            className="text-xs sm:text-sm font-bold bg-amber-500 hover:bg-amber-600 text-white px-4 py-2.5 rounded-xl flex items-center gap-2 shadow-xs transition-colors cursor-pointer self-start sm:self-center"
          >
            <Play className="w-4 h-4 fill-white" />
            <span>Practice Filtered Mistakes ({filteredItems.length})</span>
          </button>
        )}
      </div>

      {/* KPI Stats Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mb-8">
        <div className="p-4 bg-white border border-slate-200 rounded-2xl shadow-2xs">
          <span className="text-xs font-medium text-slate-500">Resolution Rate</span>
          <div className="text-2xl font-black text-slate-900 mt-1">{resolutionRate}%</div>
          <p className="text-[11px] text-emerald-600 font-semibold mt-0.5">KPI Target: ≥75%</p>
        </div>

        <div className="p-4 bg-white border border-slate-200 rounded-2xl shadow-2xs">
          <span className="text-xs font-medium text-slate-500">Due for Review</span>
          <div className="text-2xl font-black text-red-600 mt-1">{dueCount}</div>
          <p className="text-[11px] text-slate-400 mt-0.5">Needs re-attempt</p>
        </div>

        <div className="p-4 bg-white border border-slate-200 rounded-2xl shadow-2xs">
          <span className="text-xs font-medium text-slate-500">Learning (In Progress)</span>
          <div className="text-2xl font-black text-amber-600 mt-1">
            {items.filter((i) => i.status === "learning").length}
          </div>
          <p className="text-[11px] text-slate-400 mt-0.5">1-2 consecutive correct</p>
        </div>

        <div className="p-4 bg-white border border-slate-200 rounded-2xl shadow-2xs">
          <span className="text-xs font-medium text-slate-500">Mastered (Resolved)</span>
          <div className="text-2xl font-black text-emerald-600 mt-1">{masteredCount}</div>
          <p className="text-[11px] text-slate-400 mt-0.5">3+ consecutive correct</p>
        </div>
      </div>

      {/* Filter Card: Status Tabs & Unit/Topic Dropdown Filters */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 mb-6 shadow-2xs space-y-4">
        {/* Status Tabs */}
        <div>
          <span className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">
            Status Queue
          </span>
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
            {[
              { key: "all", label: `All Mistakes (${items.length})` },
              { key: "due", label: `Due for Review (${dueCount})` },
              { key: "learning", label: `Learning (${items.filter((i) => i.status === "learning").length})` },
              { key: "mastered", label: `Mastered (${masteredCount})` },
            ].map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key as any)}
                className={`text-xs font-bold px-3 py-1.5 rounded-lg whitespace-nowrap transition-colors cursor-pointer ${
                  activeTab === tab.key
                    ? "bg-slate-900 text-white"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Unit and Topic Selectors */}
        <div className="pt-3 border-t border-slate-100 flex flex-col sm:flex-row items-stretch sm:items-end gap-3">
          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-600 shrink-0 mb-1 sm:mb-2">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <span>Filter By:</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 flex-1">
            <div>
              <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                Unit
              </label>
              <SelectDropdown
                options={unitOptions}
                value={selectedUnit}
                onChange={handleUnitChange}
                placeholder="All Units"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                Topic
              </label>
              <SelectDropdown
                options={topicOptions}
                value={selectedTopic}
                onChange={setSelectedTopic}
                placeholder="All Topics"
              />
            </div>
          </div>

          {(selectedUnit !== "all" || selectedTopic !== "all") && (
            <button
              type="button"
              onClick={() => {
                setSelectedUnit("all");
                setSelectedTopic("all");
              }}
              className="text-xs font-semibold text-slate-500 hover:text-slate-800 underline px-2 py-2 shrink-0 self-end sm:self-center cursor-pointer"
            >
              Reset Filters
            </button>
          )}
        </div>
      </div>

      {/* Questions List */}
      {filteredItems.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center">
          <BookmarkCheck className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-base font-bold text-slate-900 mb-1">No Mistakes in This Filter</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            No questions match your current status queue, unit, or topic filters. Adjust the filters above or practice other units!
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredItems.map((item) => {
            const picked = activeAnswerPicks[item.id];
            const isAnswered = !!picked;

            return (
              <div
                key={item.id}
                className="bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs hover:border-slate-300 transition-colors"
              >
                {/* Meta header */}
                <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
                    <span>{item.unitTitle}</span>
                    <span>›</span>
                    <span className="text-sky-700 bg-sky-50 px-2 py-0.5 rounded border border-sky-200">
                      {item.subUnitTitle}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <span
                      className={`text-[11px] font-bold px-2 py-0.5 rounded-full border ${
                        item.status === "mastered"
                          ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                          : item.status === "learning"
                          ? "bg-amber-50 text-amber-700 border-amber-200"
                          : "bg-red-50 text-red-700 border-red-200"
                      }`}
                    >
                      {item.status === "mastered"
                        ? "Mastered ✓"
                        : item.status === "learning"
                        ? `Learning (${item.consecutiveCorrect}/3)`
                        : "Review Needed"}
                    </span>
                    <span className="text-xs text-slate-400 font-mono">
                      Interval: {item.intervalDays}d
                    </span>
                  </div>
                </div>

                {/* Stem */}
                <h4 className="text-base font-bold text-slate-900 leading-snug mb-4">
                  {item.stem}
                </h4>

                {/* Options */}
                <div className="space-y-2 mb-4">
                  {item.options.map((opt) => {
                    const isSelected = picked === opt.key;
                    const isActualAnswer = opt.key === item.correctOptionKey;

                    let optClass = "border-slate-200 bg-slate-50/50 hover:bg-slate-100 text-slate-800";
                    let badgeClass = "bg-white border-slate-300 text-slate-700";

                    if (isAnswered) {
                      if (isActualAnswer) {
                        optClass = "border-emerald-500 bg-emerald-50/80 text-emerald-950 font-bold";
                        badgeClass = "bg-emerald-600 text-white border-emerald-600";
                      } else if (isSelected) {
                        optClass = "border-red-500 bg-red-50/80 text-red-950 line-through";
                        badgeClass = "bg-red-600 text-white border-red-600";
                      } else {
                        optClass = "opacity-50 border-slate-200 bg-white text-slate-400";
                      }
                    }

                    return (
                      <button
                        key={opt.key}
                        type="button"
                        disabled={isAnswered}
                        onClick={() => handlePickOption(item, opt.key)}
                        className={`w-full p-2.5 rounded-xl border text-left flex items-center gap-2.5 text-xs sm:text-sm font-medium transition-colors cursor-pointer ${optClass}`}
                      >
                        <span
                          className={`w-5 h-5 rounded-md flex items-center justify-center font-bold text-xs border shrink-0 ${badgeClass}`}
                        >
                          {opt.key}
                        </span>
                        <span>{opt.text}</span>
                      </button>
                    );
                  })}
                </div>

                {/* Rationale / Explanation */}
                {item.explanation && (
                  <div className="p-3 bg-amber-50/60 rounded-xl border border-amber-200/80 text-xs text-amber-950 leading-relaxed">
                    <span className="font-bold flex items-center gap-1 text-amber-900 mb-0.5">
                      <Lightbulb className="w-3.5 h-3.5 text-amber-600" /> Explanation:
                    </span>
                    {item.explanation}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
