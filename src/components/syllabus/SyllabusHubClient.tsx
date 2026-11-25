"use client";

import React, { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ExamHeader } from "./ExamHeader";
import { UnitCard } from "./UnitCard";
import { StickyLauncher } from "./StickyLauncher";
import { useAppStore } from "@/store/useAppStore";
import { ExamWithHierarchy, getExamSyllabus, toggleSubUnitDone } from "@/app/actions/syllabus";
import { getQuestionsForSubUnits } from "@/app/actions/exam";
import {
  createExam,
  updateExam,
  deleteExam,
  createUnit,
  updateUnit,
  deleteUnit,
  createSubUnit,
  updateSubUnit,
  deleteSubUnit,
} from "@/app/actions/admin";
import { Filter, CheckSquare, RefreshCw, Plus, X, Pencil, Trash2, BookOpen } from "lucide-react";

interface SyllabusHubClientProps {
  initialExams: { id: string; title: string; slug: string; description?: string | null }[];
  initialExamHierarchy: ExamWithHierarchy;
}

export const SyllabusHubClient: React.FC<SyllabusHubClientProps> = ({
  initialExams,
  initialExamHierarchy,
}) => {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [examsList, setExamsList] = useState(initialExams);
  const [currentExam, setCurrentExam] = useState<ExamWithHierarchy>(initialExamHierarchy);
  const [selectedPaper, setSelectedPaper] = useState<string>("all");

  // Modal Dialog States
  const [modalType, setModalType] = useState<
    "addExam" | "editExam" | "addUnit" | "editUnit" | "addSubUnit" | "editSubUnit" | null
  >(null);

  // Form input fields
  const [formExamTitle, setFormExamTitle] = useState("");
  const [formExamDesc, setFormExamDesc] = useState("");
  const [formUnitTitle, setFormUnitTitle] = useState("");
  const [formUnitNumber, setFormUnitNumber] = useState(1);
  const [formUnitPaper, setFormUnitPaper] = useState("");
  const [formSubUnitTitle, setFormSubUnitTitle] = useState("");
  const [formPrescribedTexts, setFormPrescribedTexts] = useState("");
  const [targetId, setTargetId] = useState<string>("");

  const {
    selectedSubUnitIds,
    completedSubUnitIds,
    toggleSubUnitSelection,
    selectSubUnits,
    deselectSubUnits,
    clearSubUnitSelections,
    toggleMarkDone,
    setCompletedSubUnits,
    startSession,
  } = useAppStore();

  // Initialize completed sub-units from current hierarchy on first load
  React.useEffect(() => {
    const doneIds: string[] = [];
    for (const unit of currentExam.units) {
      for (const sub of unit.subUnits) {
        if (sub.isCompleted) {
          doneIds.push(sub.id);
        }
      }
    }
    setCompletedSubUnits(doneIds);
  }, [currentExam, setCompletedSubUnits]);

  // Handle Exam Switching
  const handleSelectExam = (examId: string) => {
    startTransition(async () => {
      const res = await getExamSyllabus(examId);
      if (res.success && res.exam) {
        setCurrentExam(res.exam);
        clearSubUnitSelections();
      }
    });
  };

  // Toggle "Mark as Done" with optimistic UI and background persistence
  const handleToggleDone = (subUnitId: string) => {
    const currentlyDone = completedSubUnitIds.includes(subUnitId);
    toggleMarkDone(subUnitId);

    startTransition(async () => {
      await toggleSubUnitDone(subUnitId, "default-user", !currentlyDone);
    });
  };

  // Calculate available question count in selected sub-units
  const allSubUnits = currentExam.units.flatMap((u) => u.subUnits);
  const selectedSubUnits = allSubUnits.filter((s) => selectedSubUnitIds.includes(s.id));
  const availableQuestionsCount = selectedSubUnits.reduce((acc, s) => acc + s.questionCount, 0);

  // Quick batch selections
  const handleSelectAllSyllabus = () => {
    const allIds = allSubUnits.map((s) => s.id);
    selectSubUnits(allIds);
  };

  const handleSelectUnrevisedOnly = () => {
    const unrevisedIds = allSubUnits.filter((s) => !completedSubUnitIds.includes(s.id)).map((s) => s.id);
    selectSubUnits(unrevisedIds);
  };

  // Launch Timed Exam Mode
  const handleStartTimedExam = async (limit: number) => {
    startTransition(async () => {
      const res = await getQuestionsForSubUnits(selectedSubUnitIds, limit);
      if (res.success && res.questions.length > 0) {
        const durationMinutes = Math.max(5, Math.ceil(res.questions.length * 1.0));
        startSession({
          sessionId: `exam-${Date.now()}`,
          sessionType: "timed_exam",
          questions: res.questions,
          currentIndex: 0,
          userAnswers: {},
          markedForReview: [],
          timeRemainingSeconds: durationMinutes * 60,
          timeSpentSeconds: 0,
          isSubmitted: false,
          instantFeedback: {},
          streak: 0,
        });
        router.push("/exam");
      } else {
        alert("No questions found in the selected sub-units. Please select sub-units containing questions or add questions in Admin CMS.");
      }
    });
  };

  // Launch ⚡ Instant Quiz Mode
  const handleStartInstantQuiz = async (limit: number) => {
    startTransition(async () => {
      const res = await getQuestionsForSubUnits(selectedSubUnitIds, limit);
      if (res.success && res.questions.length > 0) {
        startSession({
          sessionId: `quiz-${Date.now()}`,
          sessionType: "instant_quiz",
          questions: res.questions,
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
      } else {
        alert("No questions found in the selected sub-units. Please select sub-units containing questions or add questions in Admin CMS.");
      }
    });
  };

  // --- CRUD HANDLERS ---

  // 1. Add Exam
  const openAddExamModal = () => {
    setFormExamTitle("");
    setFormExamDesc("");
    setModalType("addExam");
  };

  const handleSaveAddExam = () => {
    if (!formExamTitle.trim()) return;
    startTransition(async () => {
      const res = await createExam(
        formExamTitle.trim(),
        formExamTitle.trim().toLowerCase().replace(/\s+/g, "-"),
        formExamDesc.trim() || undefined
      );
      if (res.success && res.exam) {
        const newExamItem = {
          id: res.exam.id,
          title: res.exam.title,
          slug: res.exam.slug,
          description: res.exam.description,
        };
        setExamsList((prev) => [newExamItem, ...prev]);
        setModalType(null);
        handleSelectExam(res.exam.id);
      }
    });
  };

  // 2. Edit Exam
  const openEditExamModal = () => {
    setFormExamTitle(currentExam.title);
    setFormExamDesc(currentExam.description || "");
    setModalType("editExam");
  };

  const handleSaveEditExam = () => {
    if (!formExamTitle.trim()) return;
    startTransition(async () => {
      await updateExam(currentExam.id, formExamTitle.trim(), formExamDesc.trim());
      setCurrentExam((prev) => ({
        ...prev,
        title: formExamTitle.trim(),
        description: formExamDesc.trim() || null,
      }));
      setExamsList((prev) =>
        prev.map((e) =>
          e.id === currentExam.id
            ? { ...e, title: formExamTitle.trim(), description: formExamDesc.trim() || null }
            : e
        )
      );
      setModalType(null);
    });
  };

  // 3. Add Unit
  const openAddUnitModal = () => {
    const nextNumber = currentExam.units.length + 1;
    setFormUnitNumber(nextNumber);
    setFormUnitTitle(`Unit ${nextNumber}: `);
    setFormUnitPaper(currentExam.papers && currentExam.papers.length > 0 ? (selectedPaper !== "all" ? selectedPaper : currentExam.papers[0]) : "");
    setModalType("addUnit");
  };

  const handleSaveAddUnit = () => {
    if (!formUnitTitle.trim()) return;
    startTransition(async () => {
      const res = await createUnit(currentExam.id, formUnitNumber, formUnitTitle.trim(), formUnitPaper);
      if (res.success && res.unit) {
        const newU = {
          id: res.unit.id,
          unitNumber: res.unit.unitNumber,
          title: res.unit.title,
          orderIndex: res.unit.orderIndex,
          paper: formUnitPaper.trim() || null,
          subUnits: [],
          totalQuestions: 0,
          completedSubUnitsCount: 0,
        };
        setCurrentExam((prev) => {
          const updatedUnits = [...prev.units, newU];
          const papers = Array.from(
            new Set(
              updatedUnits
                .map((u) => u.paper)
                .filter((p): p is string => Boolean(p && p.trim().length > 0))
            )
          );
          return {
            ...prev,
            units: updatedUnits,
            papers,
          };
        });
        setModalType(null);
      }
    });
  };

  // 4. Edit Unit
  const openEditUnitModal = (unitId: string, currentTitle: string, currentNum: number, currentPaper?: string | null) => {
    setTargetId(unitId);
    setFormUnitTitle(currentTitle);
    setFormUnitNumber(currentNum);
    setFormUnitPaper(currentPaper || "");
    setModalType("editUnit");
  };

  const handleSaveEditUnit = () => {
    if (!formUnitTitle.trim() || !targetId) return;
    startTransition(async () => {
      await updateUnit(targetId, formUnitTitle.trim(), formUnitNumber, formUnitPaper);
      setCurrentExam((prev) => {
        const updatedUnits = prev.units.map((u) =>
          u.id === targetId ? { ...u, title: formUnitTitle.trim(), unitNumber: formUnitNumber, paper: formUnitPaper.trim() || null } : u
        );
        const papers = Array.from(
          new Set(
            updatedUnits
              .map((u) => u.paper)
              .filter((p): p is string => Boolean(p && p.trim().length > 0))
          )
        );
        return {
          ...prev,
          units: updatedUnits,
          papers,
        };
      });
      setModalType(null);
    });
  };

  // 5. Delete Unit
  const handleDeleteUnit = (unitId: string) => {
    startTransition(async () => {
      await deleteUnit(unitId);
      setCurrentExam((prev) => {
        const updatedUnits = prev.units.filter((u) => u.id !== unitId);
        const papers = Array.from(
          new Set(
            updatedUnits
              .map((u) => u.paper)
              .filter((p): p is string => Boolean(p && p.trim().length > 0))
          )
        );
        return {
          ...prev,
          units: updatedUnits,
          papers,
        };
      });
    });
  };

  // 6. Add Sub-Unit (Topic)
  const openAddSubUnitModal = (unitId: string) => {
    setTargetId(unitId);
    setFormSubUnitTitle("");
    setFormPrescribedTexts("");
    setModalType("addSubUnit");
  };

  const handleSaveAddSubUnit = () => {
    if (!formSubUnitTitle.trim() || !targetId) return;
    const parsedTexts = formPrescribedTexts
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);

    startTransition(async () => {
      const res = await createSubUnit(targetId, formSubUnitTitle.trim(), parsedTexts);
      if (res.success && res.subUnit) {
        const newTopic = {
          id: res.subUnit.id,
          title: res.subUnit.title,
          orderIndex: 1,
          questionCount: 0,
          isCompleted: false,
          prescribedTexts: parsedTexts,
        };
        setCurrentExam((prev) => ({
          ...prev,
          units: prev.units.map((u) =>
            u.id === targetId ? { ...u, subUnits: [...u.subUnits, newTopic] } : u
          ),
          totalSubUnits: prev.totalSubUnits + 1,
        }));
        setModalType(null);
      }
    });
  };

  // 7. Edit Sub-Unit (Topic)
  const openEditSubUnitModal = (subUnitId: string, currentTitle: string, currentTexts?: string[]) => {
    setTargetId(subUnitId);
    setFormSubUnitTitle(currentTitle);
    setFormPrescribedTexts(currentTexts ? currentTexts.join(", ") : "");
    setModalType("editSubUnit");
  };

  const handleSaveEditSubUnit = () => {
    if (!formSubUnitTitle.trim() || !targetId) return;
    const parsedTexts = formPrescribedTexts
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);

    startTransition(async () => {
      await updateSubUnit(targetId, formSubUnitTitle.trim(), parsedTexts);
      setCurrentExam((prev) => ({
        ...prev,
        units: prev.units.map((u) => ({
          ...u,
          subUnits: u.subUnits.map((s) =>
            s.id === targetId ? { ...s, title: formSubUnitTitle.trim(), prescribedTexts: parsedTexts } : s
          ),
        })),
      }));
      setModalType(null);
    });
  };

  // 8. Delete Sub-Unit (Topic)
  const handleDeleteSubUnit = (subUnitId: string) => {
    startTransition(async () => {
      await deleteSubUnit(subUnitId);
      setCurrentExam((prev) => ({
        ...prev,
        units: prev.units.map((u) => ({
          ...u,
          subUnits: u.subUnits.filter((s) => s.id !== subUnitId),
        })),
        totalSubUnits: Math.max(0, prev.totalSubUnits - 1),
      }));
    });
  };

  return (
    <div className="min-h-screen bg-slate-50/50 pb-28">
      {/* Exam Header with Edit & Add Exam Buttons */}
      <ExamHeader
        exams={examsList}
        activeExam={currentExam}
        onSelectExam={handleSelectExam}
        onEditExam={openEditExamModal}
        onAddExam={openAddExamModal}
      />

      <div className="max-w-6xl mx-auto px-4 py-6 sm:px-6">
        {/* Quick Batch Filter Controls */}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-6 bg-white border border-slate-200 rounded-xl p-3 shadow-2xs">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-700">
            <Filter className="w-3.5 h-3.5 text-sky-600" />
            <span>Practice Batch Controls:</span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleSelectAllSyllabus}
              className="text-xs font-semibold px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <CheckSquare className="w-3.5 h-3.5" />
              <span>Select All Syllabus</span>
            </button>

            <button
              type="button"
              onClick={handleSelectUnrevisedOnly}
              className="text-xs font-semibold px-2.5 py-1.5 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Select Unrevised Only</span>
            </button>

            {selectedSubUnitIds.length > 0 && (
              <button
                type="button"
                onClick={clearSubUnitSelections}
                className="text-xs font-semibold px-2.5 py-1.5 rounded-lg text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
              >
                Clear ({selectedSubUnitIds.length})
              </button>
            )}
          </div>
        </div>

        {/* Optional Paper Division Tabs */}
        {currentExam.papers && currentExam.papers.length > 0 && (
          <div className="bg-white border border-slate-200 rounded-2xl p-2.5 sm:p-3 mb-6 shadow-2xs flex items-center gap-2 overflow-x-auto no-scrollbar">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider px-2 shrink-0">
              Paper:
            </span>
            <button
              type="button"
              onClick={() => setSelectedPaper("all")}
              className={`text-xs font-bold px-3 py-1.5 rounded-xl whitespace-nowrap transition-colors cursor-pointer ${
                selectedPaper === "all"
                  ? "bg-slate-900 text-white shadow-2xs"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              All Papers ({currentExam.units.length})
            </button>
            {currentExam.papers.map((paper) => {
              const pCount = currentExam.units.filter((u) => u.paper === paper).length;
              const isSelected = selectedPaper === paper;
              return (
                <button
                  key={paper}
                  type="button"
                  onClick={() => setSelectedPaper(paper)}
                  className={`text-xs font-bold px-3 py-1.5 rounded-xl whitespace-nowrap transition-colors cursor-pointer flex items-center gap-1.5 ${
                    isSelected
                      ? "bg-sky-600 text-white shadow-2xs"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  <span>{paper}</span>
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                      isSelected ? "bg-white/20 text-white" : "bg-slate-200 text-slate-700"
                    }`}
                  >
                    {pCount}
                  </span>
                </button>
              );
            })}
          </div>
        )}

        {/* Units & Sub-Units Hierarchy Cards */}
        <div className="space-y-6">
          {(selectedPaper === "all"
            ? currentExam.units
            : currentExam.units.filter((u) => u.paper === selectedPaper)
          ).map((unit) => (
            <UnitCard
              key={unit.id}
              unit={unit}
              selectedSubUnitIds={selectedSubUnitIds}
              completedSubUnitIds={completedSubUnitIds}
              onToggleSelect={toggleSubUnitSelection}
              onSelectUnitAll={selectSubUnits}
              onDeselectUnitAll={deselectSubUnits}
              onToggleDone={handleToggleDone}
              onEditUnit={openEditUnitModal}
              onDeleteUnit={handleDeleteUnit}
              onAddSubUnit={openAddSubUnitModal}
              onEditSubUnit={openEditSubUnitModal}
              onDeleteSubUnit={handleDeleteSubUnit}
            />
          ))}

          {/* 3. Add Unit Button at the end of All the Units of the selected exam */}
          <button
            type="button"
            onClick={openAddUnitModal}
            className="w-full py-4 px-4 bg-white hover:bg-sky-50/60 border-2 border-dashed border-slate-300 hover:border-sky-400 rounded-2xl flex items-center justify-center gap-2 text-sm font-bold text-slate-700 hover:text-sky-800 transition-all cursor-pointer shadow-2xs"
          >
            <Plus className="w-4 h-4 text-sky-600" />
            <span>Add Unit to {currentExam.title}</span>
          </button>
        </div>
      </div>

      {/* Floating Sticky Test Launcher */}
      <StickyLauncher
        selectedCount={selectedSubUnitIds.length}
        availableQuestionsCount={availableQuestionsCount}
        onStartTimedExam={handleStartTimedExam}
        onStartInstantQuiz={handleStartInstantQuiz}
        onClear={clearSubUnitSelections}
        onSelectAllExams={handleSelectAllSyllabus}
      />

      {/* MODAL DIALOGS */}

      {/* Modal 1: Add New Exam */}
      {modalType === "addExam" && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 sm:p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-slate-900">Add New Examination Syllabus</h3>
              <button
                type="button"
                onClick={() => setModalType(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Exam Title *</label>
                <input
                  type="text"
                  value={formExamTitle}
                  onChange={(e) => setFormExamTitle(e.target.value)}
                  placeholder="e.g. MPPSC Assistant Professor (English)"
                  className="w-full text-sm bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-500"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Description</label>
                <textarea
                  value={formExamDesc}
                  onChange={(e) => setFormExamDesc(e.target.value)}
                  placeholder="e.g. Official syllabus aligned with state higher education commission..."
                  rows={3}
                  className="w-full text-xs bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-500"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-5">
              <button
                type="button"
                onClick={() => setModalType(null)}
                className="text-xs font-semibold px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!formExamTitle.trim()}
                onClick={handleSaveAddExam}
                className="text-xs font-bold px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-700 text-white disabled:opacity-40 cursor-pointer"
              >
                Create Exam
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal 2: Edit Exam */}
      {modalType === "editExam" && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 sm:p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-slate-900">Edit Examination Details</h3>
              <button
                type="button"
                onClick={() => setModalType(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Exam Title *</label>
                <input
                  type="text"
                  value={formExamTitle}
                  onChange={(e) => setFormExamTitle(e.target.value)}
                  className="w-full text-sm bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-500"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Description</label>
                <textarea
                  value={formExamDesc}
                  onChange={(e) => setFormExamDesc(e.target.value)}
                  rows={3}
                  className="w-full text-xs bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-500"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-5">
              <button
                type="button"
                onClick={() => setModalType(null)}
                className="text-xs font-semibold px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!formExamTitle.trim()}
                onClick={handleSaveEditExam}
                className="text-xs font-bold px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-700 text-white disabled:opacity-40 cursor-pointer"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal 3: Add Unit */}
      {modalType === "addUnit" && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 sm:p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-slate-900">Add Unit to Syllabus</h3>
              <button
                type="button"
                onClick={() => setModalType(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Unit Number</label>
                <input
                  type="number"
                  value={formUnitNumber}
                  onChange={(e) => setFormUnitNumber(parseInt(e.target.value) || 1)}
                  className="w-full text-sm bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-900"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Paper Division (Optional)</label>
                <input
                  type="text"
                  value={formUnitPaper}
                  onChange={(e) => setFormUnitPaper(e.target.value)}
                  placeholder="e.g. Paper 1, Paper 2, or leave blank"
                  className="w-full text-sm bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-900"
                />
                <p className="text-[11px] text-slate-400 mt-0.5">Allows grouping units by Paper 1 and Paper 2</p>
              </div>
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Unit Title *</label>
                <input
                  type="text"
                  value={formUnitTitle}
                  onChange={(e) => setFormUnitTitle(e.target.value)}
                  placeholder="e.g. Unit 5: Literary Theory and Criticism"
                  className="w-full text-sm bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-900"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-5">
              <button
                type="button"
                onClick={() => setModalType(null)}
                className="text-xs font-semibold px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!formUnitTitle.trim()}
                onClick={handleSaveAddUnit}
                className="text-xs font-bold px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white disabled:opacity-40 cursor-pointer"
              >
                Add Unit
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal 4: Edit Unit */}
      {modalType === "editUnit" && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 sm:p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-slate-900">Edit Unit</h3>
              <button
                type="button"
                onClick={() => setModalType(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Unit Number</label>
                <input
                  type="number"
                  value={formUnitNumber}
                  onChange={(e) => setFormUnitNumber(parseInt(e.target.value) || 1)}
                  className="w-full text-sm bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-900"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Paper Division (Optional)</label>
                <input
                  type="text"
                  value={formUnitPaper}
                  onChange={(e) => setFormUnitPaper(e.target.value)}
                  placeholder="e.g. Paper 1, Paper 2, or leave blank"
                  className="w-full text-sm bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-900"
                />
                <p className="text-[11px] text-slate-400 mt-0.5">Allows grouping units by Paper 1 and Paper 2</p>
              </div>
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Unit Title *</label>
                <input
                  type="text"
                  value={formUnitTitle}
                  onChange={(e) => setFormUnitTitle(e.target.value)}
                  className="w-full text-sm bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-900"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-5">
              <button
                type="button"
                onClick={() => setModalType(null)}
                className="text-xs font-semibold px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!formUnitTitle.trim()}
                onClick={handleSaveEditUnit}
                className="text-xs font-bold px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-700 text-white disabled:opacity-40 cursor-pointer"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal 5: Add Topic / Sub-Unit */}
      {modalType === "addSubUnit" && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 sm:p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-slate-900">Add Topic / Author</h3>
              <button
                type="button"
                onClick={() => setModalType(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Topic / Author Title *</label>
                <input
                  type="text"
                  value={formSubUnitTitle}
                  onChange={(e) => setFormSubUnitTitle(e.target.value)}
                  placeholder="e.g. William Shakespeare"
                  className="w-full text-sm bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-500"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Prescribed Texts / Works (Optional)</label>
                <input
                  type="text"
                  value={formPrescribedTexts}
                  onChange={(e) => setFormPrescribedTexts(e.target.value)}
                  placeholder="e.g. Hamlet, Macbeth, King Lear (comma-separated)"
                  className="w-full text-sm bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-500"
                />
                <p className="text-[11px] text-slate-400 mt-0.5">Displayed as tags inside the topic card</p>
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-5">
              <button
                type="button"
                onClick={() => setModalType(null)}
                className="text-xs font-semibold px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!formSubUnitTitle.trim()}
                onClick={handleSaveAddSubUnit}
                className="text-xs font-bold px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white disabled:opacity-40 cursor-pointer"
              >
                Add Topic
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal 6: Edit Topic / Sub-Unit */}
      {modalType === "editSubUnit" && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 sm:p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-slate-900">Edit Topic & Prescribed Texts</h3>
              <button
                type="button"
                onClick={() => setModalType(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Topic / Author Title *</label>
                <input
                  type="text"
                  value={formSubUnitTitle}
                  onChange={(e) => setFormSubUnitTitle(e.target.value)}
                  className="w-full text-sm bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-500"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Prescribed Texts / Works (Optional)</label>
                <input
                  type="text"
                  value={formPrescribedTexts}
                  onChange={(e) => setFormPrescribedTexts(e.target.value)}
                  placeholder="e.g. Hamlet, Macbeth, King Lear (comma-separated)"
                  className="w-full text-sm bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-500"
                />
                <p className="text-[11px] text-slate-400 mt-0.5">Displayed as tags inside the topic card</p>
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-5">
              <button
                type="button"
                onClick={() => setModalType(null)}
                className="text-xs font-semibold px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!formSubUnitTitle.trim()}
                onClick={handleSaveEditSubUnit}
                className="text-xs font-bold px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-700 text-white disabled:opacity-40 cursor-pointer"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
