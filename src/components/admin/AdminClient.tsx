"use client";

import React, { useState, useEffect, useTransition } from "react";
import { parseQuestionText, ParseResult } from "@/lib/parser";
import { batchImportQuestions, deleteExam } from "@/app/actions/admin";
import { ExamWithHierarchy } from "@/app/actions/syllabus";
import { SelectDropdown } from "@/components/ui/SelectDropdown";
import { Upload, CheckCircle2, AlertTriangle, Trash2 } from "lucide-react";

interface AdminClientProps {
  exams: ExamWithHierarchy[];
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

  const [selectedExamId, setSelectedExamId] = useState<string>(initialExams[0]?.id || "");
  const [selectedUnitId, setSelectedUnitId] = useState<string>("");
  const [selectedSubUnitId, setSelectedSubUnitId] = useState<string>("");

  const [rawText, setRawText] = useState<string>(sampleFormatTemplate);
  const [parseResult, setParseResult] = useState<ParseResult>(() => parseQuestionText(sampleFormatTemplate));
  const [isPending, startTransition] = useTransition();
  const [importSuccessMsg, setImportSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  const currentExam = examsList.find((e) => e.id === selectedExamId) || examsList[0];
  const units = currentExam?.units || [];
  const currentUnit = units.find((u) => u.id === selectedUnitId) || units[0];
  const subUnits = currentUnit?.subUnits || [];
  const currentSubUnit = subUnits.find((s) => s.id === selectedSubUnitId) || subUnits[0];

  // Auto-parse on text change
  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setRawText(val);
    const parsed = parseQuestionText(val);
    setParseResult(parsed);
  };

  const handleImport = () => {
    const targetSubId = selectedSubUnitId || currentSubUnit?.id;
    if (!targetSubId) {
      alert("Please select a target sub-unit first.");
      return;
    }

    if (parseResult.validCount === 0) {
      alert("No valid questions to import.");
      return;
    }

    startTransition(async () => {
      const res = await batchImportQuestions(targetSubId, parseResult.questions);
      if (res.success) {
        setImportSuccessMsg(
          `Successfully imported ${res.importedCount} questions to ${currentSubUnit?.title || "selected sub-unit"}!`
        );
        setTimeout(() => setImportSuccessMsg(null), 5000);
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
        setImportSuccessMsg(`Exam "${deletedTitle}" has been permanently deleted.`);
        setTimeout(() => setImportSuccessMsg(null), 5000);
      } else {
        alert("Failed to delete exam.");
      }
    });
  };

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
      <div className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
          Admin Management CMS
        </h1>
        <div className="flex items-center gap-2 mt-1 mb-1.5">
          <span className="text-xs font-bold text-sky-700 bg-sky-50 px-2.5 py-0.5 rounded-full border border-sky-200">
            Educator & Administrator Workspace
          </span>
        </div>
        <p className="text-xs sm:text-sm text-slate-500">
          Granular plain-text question banking and ingestion for examination units and topics.
        </p>
      </div>

      {importSuccessMsg && (
        <div className="mb-6 p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm font-bold flex items-center gap-2 animate-in fade-in duration-200">
          <CheckCircle2 className="w-5 h-5 text-emerald-600" />
          <span>{importSuccessMsg}</span>
        </div>
      )}

      {/* UNIVERSAL QUESTION INGESTION */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Column: Styled Target Selector & Text Input */}
          <div className="space-y-4">
            <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-2xs">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">
                1. Select Target Ingestion Sub-Unit
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
                    value={selectedSubUnitId || currentSubUnit?.id || ""}
                    onChange={(val) => setSelectedSubUnitId(val)}
                    placeholder="Select Sub-Unit"
                  />
                </div>
              </div>
            </div>

            {/* Plain-text textarea */}
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
                rows={16}
                className="w-full font-mono text-xs p-3 rounded-xl border border-slate-300 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-500 transition-colors leading-relaxed"
                placeholder="Paste question blocks here..."
              />

              <div className="mt-3 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <span className="font-bold text-slate-800">{parseResult.totalParsed}</span> parsed in{" "}
                  <span
                    className="font-bold text-sky-600 font-mono"
                    suppressHydrationWarning
                  >
                    {mounted ? `${parseResult.elapsedMs}ms` : "0ms"}
                  </span>
                </div>

                <button
                  type="button"
                  disabled={isPending || parseResult.validCount === 0}
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
          </div>

          {/* Right Column: Live Validation Diagnostics & Question Preview */}
          <div className="space-y-4">
            {/* Parser Diagnostics Bar */}
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

            {/* Questions Preview Cards List */}
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
      </div>
  );
};
