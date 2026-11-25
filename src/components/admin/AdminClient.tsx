"use client";

import React, { useState, useEffect, useTransition, useCallback } from "react";
import { parseQuestionText, ParseResult } from "@/lib/parser";
import {
  batchImportQuestions,
  deleteExam,
  getSubUnitQuestions,
  updateQuestion,
  deleteQuestion,
} from "@/app/actions/admin";
import { ExamWithHierarchy } from "@/app/actions/syllabus";
import { SelectDropdown } from "@/components/ui/SelectDropdown";
import {
  Upload,
  CheckCircle2,
  AlertTriangle,
  Trash2,
  Pencil,
  Search,
  ListChecks,
  X,
  RefreshCw,
} from "lucide-react";

interface AdminClientProps {
  exams: ExamWithHierarchy[];
}

interface StoredSubUnitQuestion {
  id: string;
  stem: string;
  explanation?: string | null;
  correctOptionKey: string;
  options: { id: string; key: string; text: string }[];
}

const sampleFormatTemplate = `Q: In what year was Patrick White awarded the Nobel Prize in Literature, becoming the first Australian author to receive this honour?
A) 1968
B) 1973
C) 1979
D) 1982
Ans: B
Explanation: Patrick White was awarded the Nobel Prize in Literature in 1973.

Q: Which prestigious Australian literary award did Patrick White win in its inaugural year (1957) for his novel 'Voss'?
A) The Stella Prize
B) The Miles Franklin Literary Award
C) The Prime Minister's Literary Award
D) The Victorian Premier's Literary Award
Ans: B
Explanation: Patrick White won the inaugural Miles Franklin Award.

Q: Which real-life 19th-century German explorer, who vanished in the Australian interior in 1848, served as the historical starting point for 'Voss'?
A) Ludwig Leichhardt
B) Robert O'Hara Burke
C) William John Wills
D) Edward John Eyre
Ans: A

Q: What is the historical time setting of the expedition and narrative in Patrick White's 'Voss'?
A) The gold rush era of the 1890s
B) Colonial Australia in the 1840s, with a retrospective conclusion in the 1860s
C) The arrival of the First Fleet in 1788
D) The federation era around 1901
Ans: B`;

export const AdminClient: React.FC<AdminClientProps> = ({ exams: initialExams }) => {
  const [mounted, setMounted] = useState(false);
  const [examsList, setExamsList] = useState<ExamWithHierarchy[]>(initialExams);
  const [activeTab, setActiveTab] = useState<"ingest" | "review">("ingest");

  const [selectedExamId, setSelectedExamId] = useState<string>(initialExams[0]?.id || "");
  const [selectedUnitId, setSelectedUnitId] = useState<string>("");
  const [selectedSubUnitId, setSelectedSubUnitId] = useState<string>("");

  const [rawText, setRawText] = useState<string>(sampleFormatTemplate);
  const [parseResult, setParseResult] = useState<ParseResult>(() =>
    parseQuestionText(sampleFormatTemplate)
  );
  const [isPending, startTransition] = useTransition();
  const [statusBanner, setStatusBanner] = useState<string | null>(null);

  // Question Reviewer States
  const [existingQuestions, setExistingQuestions] = useState<StoredSubUnitQuestion[]>([]);
  const [isLoadingQuestions, setIsLoadingQuestions] = useState(false);
  const [questionSearch, setQuestionSearch] = useState("");
  const [editingQuestion, setEditingQuestion] = useState<StoredSubUnitQuestion | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  const currentExam = examsList.find((e) => e.id === selectedExamId) || examsList[0];
  const units = currentExam?.units || [];
  const currentUnit = units.find((u) => u.id === selectedUnitId) || units[0];
  const subUnits = currentUnit?.subUnits || [];
  const currentSubUnit = subUnits.find((s) => s.id === selectedSubUnitId) || subUnits[0];
  const activeSubUnitId = selectedSubUnitId || currentSubUnit?.id || "";

  const loadExistingQuestions = useCallback(async (subId: string) => {
    if (!subId) {
      setExistingQuestions([]);
      return;
    }
    setIsLoadingQuestions(true);
    try {
      const res = await getSubUnitQuestions(subId);
      if (res.success && Array.isArray(res.questions)) {
        setExistingQuestions(res.questions as StoredSubUnitQuestion[]);
      }
    } finally {
      setIsLoadingQuestions(false);
    }
  }, []);

  useEffect(() => {
    if (activeSubUnitId) {
      loadExistingQuestions(activeSubUnitId);
    } else {
      setExistingQuestions([]);
    }
  }, [activeSubUnitId, loadExistingQuestions]);

  const showBanner = (msg: string) => {
    setStatusBanner(msg);
    setTimeout(() => setStatusBanner(null), 5000);
  };

  // Auto-parse on text change
  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setRawText(val);
    const parsed = parseQuestionText(val);
    setParseResult(parsed);
  };

  const handleImport = () => {
    if (!activeSubUnitId) {
      alert("Please select a target sub-unit first.");
      return;
    }

    if (parseResult.validCount === 0) {
      alert("No valid questions to import.");
      return;
    }

    startTransition(async () => {
      const res = await batchImportQuestions(activeSubUnitId, parseResult.questions);
      if (res.success) {
        const addedCount = res.importedCount || 0;
        setExamsList((prev) =>
          prev.map((ex) => ({
            ...ex,
            units: ex.units.map((u) => ({
              ...u,
              subUnits: u.subUnits.map((s) =>
                s.id === activeSubUnitId
                  ? { ...s, questionCount: s.questionCount + addedCount }
                  : s
              ),
            })),
          }))
        );
        await loadExistingQuestions(activeSubUnitId);
        showBanner(
          `Successfully imported ${addedCount} questions to ${currentSubUnit?.title || "selected sub-unit"}!`
        );
      } else {
        alert("Failed to import questions.");
      }
    });
  };

  const handleDeleteExam = () => {
    if (!currentExam) return;
    const confirmed = confirm(
      `Are you sure you want to permanently delete "${currentExam.title}" along with all its units, topics, and questions? This action cannot be undone.`
    );
    if (!confirmed) return;

    const deletedTitle = currentExam.title;
    const deletedId = currentExam.id;

    startTransition(async () => {
      const res = await deleteExam(deletedId);
      if (res.success) {
        const remaining = examsList.filter((e) => e.id !== deletedId);
        setExamsList(remaining);
        setSelectedExamId(remaining[0]?.id || "");
        setSelectedUnitId("");
        setSelectedSubUnitId("");
        showBanner(`Exam "${deletedTitle}" has been permanently deleted.`);
      } else {
        alert("Failed to delete exam.");
      }
    });
  };

  const handleDeleteQuestion = (questionId: string) => {
    if (!confirm("Permanently delete this question?")) return;

    startTransition(async () => {
      const res = await deleteQuestion(questionId);
      if (res.success) {
        setExistingQuestions((prev) => prev.filter((q) => q.id !== questionId));
        setExamsList((prev) =>
          prev.map((ex) => ({
            ...ex,
            units: ex.units.map((u) => ({
              ...u,
              subUnits: u.subUnits.map((s) =>
                s.id === activeSubUnitId
                  ? { ...s, questionCount: Math.max(0, s.questionCount - 1) }
                  : s
              ),
            })),
          }))
        );
        showBanner("Question deleted.");
      } else {
        alert("Failed to delete question.");
      }
    });
  };

  const handleSaveEditedQuestion = () => {
    if (!editingQuestion || !editingQuestion.stem.trim()) return;

    const snapshot = editingQuestion;
    startTransition(async () => {
      const res = await updateQuestion(
        snapshot.id,
        snapshot.stem.trim(),
        snapshot.options,
        snapshot.correctOptionKey,
        snapshot.explanation || undefined
      );
      if (res.success) {
        setExistingQuestions((prev) =>
          prev.map((q) => (q.id === snapshot.id ? snapshot : q))
        );
        setEditingQuestion(null);
        showBanner("Question updated.");
      } else {
        alert("Failed to update question.");
      }
    });
  };

  const filteredExistingQuestions = existingQuestions.filter((q) => {
    const qLower = questionSearch.trim().toLowerCase();
    if (!qLower) return true;
    return (
      q.stem.toLowerCase().includes(qLower) ||
      (q.explanation || "").toLowerCase().includes(qLower) ||
      q.options.some((o) => o.text.toLowerCase().includes(qLower))
    );
  });

  // Styled dropdown options
  const examSelectOptions = examsList.map((ex) => ({
    value: ex.id,
    label: ex.title,
  }));

  const unitSelectOptions = units.map((u) => ({
    value: u.id,
    label: `Unit ${u.unitNumber}: ${u.title}`,
    badge: `${u.subUnits.length} subs`,
  }));

  const subUnitSelectOptions = subUnits.map((s) => ({
    value: s.id,
    label: s.title,
    badge: `${s.questionCount} Qs`,
  }));

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* Admin Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            Admin Management CMS
          </h1>
          <div className="flex items-center gap-2 mt-1 mb-1.5">
            <span className="text-xs font-bold text-sky-700 bg-sky-50 px-2.5 py-0.5 rounded-full border border-sky-200">
              Educator &amp; Administrator Workspace
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500">
            Granular plain-text question banking, batch ingestion, and question review/deletion.
          </p>
        </div>

        {/* Mode Switcher */}
        <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setActiveTab("ingest")}
            className={`text-xs font-bold px-3 py-1.5 rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 ${
              activeTab === "ingest"
                ? "bg-white text-slate-900 shadow-2xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Ingest Questions</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("review")}
            className={`text-xs font-bold px-3 py-1.5 rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 ${
              activeTab === "review"
                ? "bg-white text-slate-900 shadow-2xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <ListChecks className="w-3.5 h-3.5" />
            <span>Review Questions ({existingQuestions.length})</span>
          </button>
        </div>
      </div>

      {statusBanner && (
        <div className="mb-6 p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm font-bold flex items-center gap-2 animate-in fade-in duration-200">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <span>{statusBanner}</span>
        </div>
      )}

      {/* Shared Target Selector */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-2xs mb-6">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">
          1. Select Target Exam, Unit &amp; Topic (Sub-Unit)
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
          <div>
            <label className="text-[11px] font-bold text-slate-600 block mb-1">Exam</label>
            <div className="flex items-center gap-1.5">
              <SelectDropdown
                options={examSelectOptions}
                value={selectedExamId}
                onChange={(val) => {
                  setSelectedExamId(val);
                  setSelectedUnitId("");
                  setSelectedSubUnitId("");
                }}
                className="flex-1 min-w-0"
              />
              <button
                type="button"
                disabled={!currentExam || isPending}
                onClick={handleDeleteExam}
                title="Delete selected exam entirely"
                className="w-9 h-9 rounded-xl bg-white hover:bg-red-50 border border-slate-300 hover:border-red-300 text-slate-500 hover:text-red-600 disabled:opacity-40 flex items-center justify-center transition-colors cursor-pointer shrink-0 shadow-2xs"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div>
            <label className="text-[11px] font-bold text-slate-600 block mb-1">Unit</label>
            <SelectDropdown
              options={unitSelectOptions}
              value={selectedUnitId || currentUnit?.id || ""}
              onChange={(val) => {
                setSelectedUnitId(val);
                setSelectedSubUnitId("");
              }}
              placeholder="Select Unit"
            />
          </div>

          <div>
            <label className="text-[11px] font-bold text-slate-600 block mb-1">Sub-Unit</label>
            <SelectDropdown
              options={subUnitSelectOptions}
              value={activeSubUnitId}
              onChange={(val) => setSelectedSubUnitId(val)}
              placeholder="Select Sub-Unit"
            />
          </div>
        </div>
      </div>

      {/* TAB 1: UNIVERSAL QUESTION INGESTION */}
      {activeTab === "ingest" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Column: Text Input */}
          <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-2xs">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                2. Paste Question Text Block (.txt)
              </h3>
              <button
                type="button"
                onClick={() => {
                  setRawText(sampleFormatTemplate);
                  setParseResult(parseQuestionText(sampleFormatTemplate));
                }}
                className="text-xs font-bold text-sky-600 hover:text-sky-800 cursor-pointer"
              >
                Load Sample Format
              </button>
            </div>

            <textarea
              value={rawText}
              onChange={handleTextChange}
              rows={18}
              className="w-full font-mono text-xs p-3 rounded-xl border border-slate-300 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-500 transition-colors leading-relaxed"
              placeholder="Paste question blocks here..."
            />

            <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <span className="font-bold text-slate-800">{parseResult.totalParsed}</span> parsed in{" "}
                <span className="font-bold text-sky-600 font-mono" suppressHydrationWarning>
                  {mounted ? `${parseResult.elapsedMs}ms` : "0ms"}
                </span>
              </div>

              <button
                type="button"
                disabled={isPending || parseResult.validCount === 0 || !activeSubUnitId}
                onClick={handleImport}
                className="text-xs sm:text-sm font-bold bg-slate-900 hover:bg-slate-800 disabled:opacity-40 text-white px-5 py-2.5 rounded-xl shadow-xs transition-colors flex items-center gap-2 cursor-pointer"
              >
                <Upload className="w-4 h-4" />
                <span>
                  Import {parseResult.validCount} Valid Questions to{" "}
                  {currentSubUnit?.title || "Sub-Unit"}
                </span>
              </button>
            </div>
          </div>

          {/* Right Column: Live Validation Diagnostics & Question Preview */}
          <div className="space-y-4">
            <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-2xs flex items-center justify-between gap-4">
              <div>
                <span className="text-xs font-medium text-slate-500">Validation Status</span>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-sm font-bold text-emerald-600">
                    {parseResult.validCount} Valid
                  </span>
                  <span>•</span>
                  <span
                    className={`text-sm font-bold ${
                      parseResult.invalidCount > 0 ? "text-red-600" : "text-slate-400"
                    }`}
                  >
                    {parseResult.invalidCount} Invalid
                  </span>
                </div>
              </div>

              <div className="text-right">
                <span className="text-xs font-medium text-slate-500">Universal Throughput</span>
                <div
                  className="text-sm font-bold text-slate-900 font-mono"
                  suppressHydrationWarning
                >
                  {mounted ? `${parseResult.elapsedMs} ms` : "0 ms"}
                </div>
              </div>
            </div>

            <div className="space-y-3 max-h-[600px] overflow-y-auto no-scrollbar pr-1">
              {parseResult.questions.map((q, idx) => {
                const hasErrors = q.errors && q.errors.length > 0;

                return (
                  <div
                    key={idx}
                    className={`p-4 rounded-xl border bg-white ${
                      hasErrors ? "border-red-300 bg-red-50/20" : "border-slate-200"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                      <span className="text-xs font-bold text-slate-500">
                        Parsed Question {idx + 1}
                      </span>
                      {hasErrors ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-red-700 bg-red-100 px-2 py-0.5 rounded-md">
                          <AlertTriangle className="w-3 h-3" /> Syntax Issue
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-md">
                          <CheckCircle2 className="w-3 h-3" /> Ready (Ans: {q.correctOptionKey})
                        </span>
                      )}
                    </div>

                    <p className="text-xs sm:text-sm font-semibold text-slate-900 mb-2">
                      {q.stem}
                    </p>

                    <div className="grid grid-cols-2 gap-1.5 text-xs text-slate-600 mb-2">
                      {q.options.map((opt) => (
                        <div
                          key={opt.key}
                          className={`p-1.5 rounded-md border text-[11px] flex items-center gap-1.5 ${
                            opt.key === q.correctOptionKey
                              ? "bg-emerald-50 border-emerald-300 font-bold text-emerald-900"
                              : "bg-slate-50 border-slate-200"
                          }`}
                        >
                          <span className="font-bold">{opt.key})</span>
                          <span className="truncate">{opt.text}</span>
                        </div>
                      ))}
                    </div>

                    {q.explanation && (
                      <p className="text-[11px] text-slate-500 bg-slate-50 p-2 rounded border border-slate-200">
                        <span className="font-bold text-slate-700">Exp: </span>
                        {q.explanation}
                      </p>
                    )}

                    {hasErrors && (
                      <div className="mt-2 text-xs text-red-600 space-y-0.5">
                        {q.errors!.map((err, eIdx) => (
                          <div key={eIdx}>• {err}</div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: EXISTING QUESTIONS REVIEWER (MANUAL EDIT / DELETE) */}
      {activeTab === "review" && (
        <div className="space-y-4">
          <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={questionSearch}
                onChange={(e) => setQuestionSearch(e.target.value)}
                placeholder={`Search ${existingQuestions.length} questions in ${
                  currentSubUnit?.title || "selected topic"
                }...`}
                className="w-full pl-9 pr-3 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-300 rounded-xl text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-500"
              />
            </div>

            <button
              type="button"
              disabled={!activeSubUnitId || isLoadingQuestions}
              onClick={() => loadExistingQuestions(activeSubUnitId)}
              className="text-xs font-bold px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center gap-1.5 cursor-pointer shrink-0 self-end sm:self-auto"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoadingQuestions ? "animate-spin" : ""}`} />
              <span>Refresh List</span>
            </button>
          </div>

          {!activeSubUnitId ? (
            <div className="bg-white border border-slate-200 rounded-2xl p-10 text-center text-sm text-slate-500">
              Select an Exam, Unit, and Sub-Unit above to review its questions.
            </div>
          ) : isLoadingQuestions ? (
            <div className="bg-white border border-slate-200 rounded-2xl p-10 text-center text-sm text-slate-500">
              Loading questions...
            </div>
          ) : filteredExistingQuestions.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-2xl p-10 text-center">
              <p className="text-sm font-bold text-slate-800">No Questions Found</p>
              <p className="text-xs text-slate-500 mt-1">
                {questionSearch
                  ? "No questions match your search filter."
                  : "This topic has no questions yet. Switch to Ingest Questions or use the MCP agent to add some."}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredExistingQuestions.map((q, idx) => (
                <div
                  key={q.id}
                  className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-2xs"
                >
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <span className="text-xs font-bold text-slate-400">Q{idx + 1}</span>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => setEditingQuestion(q)}
                        title="Edit question"
                        className="w-7 h-7 rounded-lg bg-white hover:bg-slate-100 border border-slate-200 text-slate-500 hover:text-slate-900 flex items-center justify-center transition-colors cursor-pointer"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        disabled={isPending}
                        onClick={() => handleDeleteQuestion(q.id)}
                        title="Delete question"
                        className="w-7 h-7 rounded-lg bg-white hover:bg-red-50 border border-slate-200 hover:border-red-200 text-slate-400 hover:text-red-600 flex items-center justify-center transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <p className="text-sm font-semibold text-slate-900 leading-snug mb-3">
                    {q.stem}
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-2">
                    {q.options.map((opt) => (
                      <div
                        key={opt.key}
                        className={`p-2 rounded-lg border text-xs flex items-center gap-2 ${
                          opt.key === q.correctOptionKey
                            ? "bg-emerald-50 border-emerald-300 font-bold text-emerald-950"
                            : "bg-slate-50 border-slate-200 text-slate-700"
                        }`}
                      >
                        <span className="font-bold shrink-0">{opt.key})</span>
                        <span>{opt.text}</span>
                      </div>
                    ))}
                  </div>

                  {q.explanation && (
                    <div className="mt-2 p-2.5 rounded-lg bg-amber-50/70 border border-amber-200/80 text-xs text-amber-950">
                      <span className="font-bold">Explanation: </span>
                      {q.explanation}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Edit Question Modal */}
      {editingQuestion && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-5 sm:p-6 shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-slate-900">Edit Question</h3>
              <button
                type="button"
                onClick={() => setEditingQuestion(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Question Stem *</label>
                <textarea
                  rows={3}
                  value={editingQuestion.stem}
                  onChange={(e) =>
                    setEditingQuestion({ ...editingQuestion, stem: e.target.value })
                  }
                  className="w-full text-sm bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-500"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-700 block">
                  Options &amp; Correct Key
                </label>
                {editingQuestion.options.map((opt) => (
                  <div key={opt.key} className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        setEditingQuestion({ ...editingQuestion, correctOptionKey: opt.key })
                      }
                      className={`w-8 h-9 rounded-lg text-xs font-bold border shrink-0 cursor-pointer ${
                        editingQuestion.correctOptionKey === opt.key
                          ? "bg-emerald-600 text-white border-emerald-600"
                          : "bg-slate-100 text-slate-700 border-slate-300 hover:bg-slate-200"
                      }`}
                      title={`Set ${opt.key} as correct answer`}
                    >
                      {opt.key}
                    </button>
                    <input
                      type="text"
                      value={opt.text}
                      onChange={(e) =>
                        setEditingQuestion({
                          ...editingQuestion,
                          options: editingQuestion.options.map((o) =>
                            o.key === opt.key ? { ...o, text: e.target.value } : o
                          ),
                        })
                      }
                      className="flex-1 text-xs sm:text-sm bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-500"
                    />
                  </div>
                ))}
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Explanation (Optional)
                </label>
                <textarea
                  rows={2}
                  value={editingQuestion.explanation || ""}
                  onChange={(e) =>
                    setEditingQuestion({ ...editingQuestion, explanation: e.target.value })
                  }
                  className="w-full text-xs bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-500"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-5">
              <button
                type="button"
                onClick={() => setEditingQuestion(null)}
                className="text-xs font-semibold px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isPending || !editingQuestion.stem.trim()}
                onClick={handleSaveEditedQuestion}
                className="text-xs font-bold px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-700 text-white disabled:opacity-40 cursor-pointer"
              >
                Save Question
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
