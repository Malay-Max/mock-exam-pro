"use client";

import React, { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useAppStore } from "@/store/useAppStore";
import { QuestionCard } from "@/components/exam/QuestionCard";
import { QuestionPalette } from "@/components/exam/QuestionPalette";
import { ExamScorecard } from "@/components/exam/ExamScorecard";
import { submitExamSession } from "@/app/actions/exam";
import { Timer, Bookmark, ArrowLeft, ArrowRight, CheckCircle2, AlertTriangle, X } from "lucide-react";

export default function ExamPage() {
  const router = useRouter();
  const { status } = useSession();
  const [isPending, startTransition] = useTransition();
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [showMobilePalette, setShowMobilePalette] = useState(false);

  const {
    activeSession,
    selectOption,
    clearOption,
    toggleMarkForReview,
    goToQuestion,
    nextQuestion,
    prevQuestion,
    tickTimer,
    submitSession,
    startSession,
    exitSession,
  } = useAppStore();

  // Redirect if unauthenticated or no active session
  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    } else if (status === "authenticated" && !activeSession) {
      router.push("/");
    }
  }, [status, activeSession, router]);

  // Timer interval
  useEffect(() => {
    if (!activeSession || activeSession.isSubmitted) return;

    const interval = setInterval(() => {
      tickTimer();
    }, 1000);

    return () => clearInterval(interval);
  }, [activeSession, tickTimer]);

  // Keyboard navigation event listener
  useEffect(() => {
    if (!activeSession || activeSession.isSubmitted) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      const key = e.key.toUpperCase();
      const currentQ = activeSession.questions[activeSession.currentIndex];
      if (!currentQ) return;

      if (key === "1" || key === "A") {
        e.preventDefault();
        selectOption(currentQ.id, "A");
      } else if (key === "2" || key === "B") {
        e.preventDefault();
        selectOption(currentQ.id, "B");
      } else if (key === "3" || key === "C") {
        e.preventDefault();
        selectOption(currentQ.id, "C");
      } else if (key === "4" || key === "D") {
        e.preventDefault();
        selectOption(currentQ.id, "D");
      } else if (key === "J" || e.key === "ArrowRight") {
        e.preventDefault();
        nextQuestion();
      } else if (key === "K" || e.key === "ArrowLeft") {
        e.preventDefault();
        prevQuestion();
      } else if (key === "M") {
        e.preventDefault();
        toggleMarkForReview(currentQ.id);
      } else if (key === "C" || e.key === "Backspace") {
        e.preventDefault();
        clearOption(currentQ.id);
      } else if (e.key === "Enter") {
        e.preventDefault();
        if (activeSession.currentIndex < activeSession.questions.length - 1) {
          nextQuestion();
        } else {
          setShowSubmitModal(true);
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [activeSession, selectOption, nextQuestion, prevQuestion, toggleMarkForReview, clearOption]);

  if (!activeSession) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <p className="text-sm font-semibold text-slate-500">Redirecting to Syllabus Hub...</p>
      </div>
    );
  }

  // Handle final submission and database persistence
  const handleSubmitConfirm = () => {
    setShowSubmitModal(false);
    submitSession();

    startTransition(async () => {
      await submitExamSession({
        sessionType: "timed_exam",
        questions: activeSession.questions.map((q) => ({
          id: q.id,
          stem: q.stem,
          options: q.options,
          explanation: q.explanation,
          subUnitTitle: q.subUnitTitle,
          unitTitle: q.unitTitle,
          correctOptionKey: q.correctOptionKey,
        })),
        userAnswers: activeSession.userAnswers,
        markedForReview: activeSession.markedForReview,
        durationSeconds: activeSession.timeSpentSeconds + activeSession.timeRemainingSeconds,
        timeSpentSeconds: activeSession.timeSpentSeconds,
      });
    });
  };

  // Retake test initiates a fresh session on the spot with the same questions
  const handleRetake = () => {
    const durationMinutes = Math.max(5, Math.ceil(activeSession.questions.length * 1.0));
    startSession({
      ...activeSession,
      currentIndex: 0,
      userAnswers: {},
      markedForReview: [],
      timeRemainingSeconds: durationMinutes * 60,
      timeSpentSeconds: 0,
      isSubmitted: false,
      instantFeedback: {},
      streak: 0,
    });
  };

  // If test is submitted, render full scorecard report
  if (activeSession.isSubmitted) {
    return (
      <ExamScorecard
        questions={activeSession.questions}
        userAnswers={activeSession.userAnswers}
        timeSpentSeconds={activeSession.timeSpentSeconds}
        onRetake={handleRetake}
      />
    );
  }

  const currentQ = activeSession.questions[activeSession.currentIndex];
  const isMarked = activeSession.markedForReview.includes(currentQ.id);
  const selectedOpt = activeSession.userAnswers[currentQ.id];

  const minutes = Math.floor(activeSession.timeRemainingSeconds / 60);
  const seconds = activeSession.timeRemainingSeconds % 60;
  const isTimeLow = activeSession.timeRemainingSeconds < 120;

  const answeredCount = Object.keys(activeSession.userAnswers).length;
  const reviewCount = activeSession.markedForReview.length;

  return (
    <div className="min-h-screen bg-slate-50/70 pb-20 w-full overflow-x-hidden">
      {/* Top Fixed Bar with responsive thumb ergonomics */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-30 px-3 py-2 sm:px-6 sm:py-2.5">
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-1.5 sm:gap-4">
          {/* Left: Exit + Unit title */}
          <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
            <button
              type="button"
              onClick={() => {
                if (confirm("Are you sure you want to exit the exam? Your progress will be discarded.")) {
                  exitSession();
                  router.push("/");
                }
              }}
              className="text-xs font-semibold text-slate-500 hover:text-slate-800 flex items-center gap-1 cursor-pointer py-1"
            >
              <ArrowLeft className="w-4 h-4" /> <span className="hidden xs:inline">Exit</span>
            </button>
            <span className="text-slate-300 hidden md:inline">|</span>
            <span className="text-xs font-bold text-slate-800 truncate hidden md:inline max-w-xs">
              {currentQ.unitTitle || "Mock Test Session"}
            </span>
          </div>

          {/* Center: Countdown Timer */}
          <div
            className={`flex items-center gap-1 sm:gap-2 px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-xl border font-mono font-bold text-xs sm:text-base shrink-0 ${
              isTimeLow
                ? "bg-red-50 text-red-600 border-red-300 animate-pulse"
                : "bg-slate-100 text-slate-900 border-slate-200"
            }`}
          >
            <Timer className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            <span>
              {minutes}:{seconds < 10 ? `0${seconds}` : seconds}
            </span>
          </div>

          {/* Right: Palette + Submit */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setShowMobilePalette(!showMobilePalette)}
              className="lg:hidden text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 px-2 py-1.5 rounded-lg cursor-pointer whitespace-nowrap"
            >
              Palette ({activeSession.currentIndex + 1}/{activeSession.questions.length})
            </button>

            <button
              type="button"
              onClick={() => setShowSubmitModal(true)}
              className="text-xs sm:text-sm font-bold bg-emerald-600 hover:bg-emerald-700 text-white px-2.5 sm:px-4 py-1.5 rounded-lg shadow-2xs transition-colors cursor-pointer whitespace-nowrap shrink-0"
            >
              Submit
            </button>
          </div>
        </div>
      </div>

      {/* Main Examination View */}
      <div className="max-w-6xl mx-auto px-4 py-6 sm:px-6">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Question Display & Action Bar */}
          <div className="lg:col-span-3 space-y-4">
            <QuestionCard
              question={currentQ}
              questionNumber={activeSession.currentIndex + 1}
              totalQuestions={activeSession.questions.length}
              selectedOptionKey={selectedOpt}
              onSelectOption={(key) => selectOption(currentQ.id, key)}
              isInstantMode={false}
            />

            {/* Bottom Actions Bar */}
            <div className="bg-white border border-slate-200 rounded-2xl p-3 sm:p-4 shadow-2xs flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => toggleMarkForReview(currentQ.id)}
                  className={`text-xs font-bold px-3 py-2 rounded-xl flex items-center gap-1.5 border transition-all cursor-pointer ${
                    isMarked
                      ? "bg-amber-500 text-white border-amber-500"
                      : "bg-slate-50 text-slate-700 border-slate-300 hover:bg-slate-100"
                  }`}
                  title="Hotkey: M"
                >
                  <Bookmark className="w-3.5 h-3.5" />
                  <span>{isMarked ? "Marked for Review" : "Mark for Review (M)"}</span>
                </button>

                {selectedOpt && (
                  <button
                    type="button"
                    onClick={() => clearOption(currentQ.id)}
                    className="text-xs font-medium text-slate-500 hover:text-slate-800 px-2.5 py-2 cursor-pointer"
                    title="Hotkey: C"
                  >
                    Clear (C)
                  </button>
                )}
              </div>

              {/* Prev / Next */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={activeSession.currentIndex === 0}
                  onClick={prevQuestion}
                  className="text-xs sm:text-sm font-bold bg-slate-100 hover:bg-slate-200 disabled:opacity-40 disabled:cursor-not-allowed text-slate-800 px-3.5 py-2 rounded-xl flex items-center gap-1 cursor-pointer transition-colors"
                  title="Hotkey: K or Left Arrow"
                >
                  <ArrowLeft className="w-4 h-4" /> Previous (K)
                </button>

                {activeSession.currentIndex < activeSession.questions.length - 1 ? (
                  <button
                    type="button"
                    onClick={nextQuestion}
                    className="text-xs sm:text-sm font-bold bg-slate-900 hover:bg-slate-800 text-white px-4 py-2 rounded-xl flex items-center gap-1 cursor-pointer transition-colors"
                    title="Hotkey: J or Right Arrow or Enter"
                  >
                    Next (J) <ArrowRight className="w-4 h-4" />
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => setShowSubmitModal(true)}
                    className="text-xs sm:text-sm font-bold bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-xl flex items-center gap-1 cursor-pointer transition-colors"
                  >
                    Review & Submit <CheckCircle2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>

            {/* Keyboard Shortcuts Hint Bar */}
            <div className="hidden sm:flex items-center justify-between text-[11px] text-slate-600 bg-white border border-slate-200 rounded-xl px-4 py-2">
              <span>Hotkeys:</span>
              <div className="flex items-center gap-3">
                <span><kbd className="px-1.5 py-0.5 rounded bg-slate-100 border text-slate-700 font-mono">1-4</kbd> Pick Option</span>
                <span><kbd className="px-1.5 py-0.5 rounded bg-slate-100 border text-slate-700 font-mono">J / K</kbd> Next / Prev</span>
                <span><kbd className="px-1.5 py-0.5 rounded bg-slate-100 border text-slate-700 font-mono">M</kbd> Mark Review</span>
                <span><kbd className="px-1.5 py-0.5 rounded bg-slate-100 border text-slate-700 font-mono">Enter</kbd> Save & Advance</span>
              </div>
            </div>
          </div>

          {/* Right Column: Question Palette */}
          <div className="hidden lg:block lg:col-span-1 space-y-4">
            <QuestionPalette
              questions={activeSession.questions}
              currentIndex={activeSession.currentIndex}
              userAnswers={activeSession.userAnswers}
              markedForReview={activeSession.markedForReview}
              onSelectQuestion={goToQuestion}
            />
          </div>
        </div>
      </div>

      {/* Mobile Question Palette Drawer */}
      {showMobilePalette && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-end lg:hidden">
          <div className="w-full bg-white rounded-t-3xl p-5 max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-base text-slate-900">Question Palette</h3>
              <button
                type="button"
                onClick={() => setShowMobilePalette(false)}
                className="p-1 rounded-full text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <QuestionPalette
              questions={activeSession.questions}
              currentIndex={activeSession.currentIndex}
              userAnswers={activeSession.userAnswers}
              markedForReview={activeSession.markedForReview}
              onSelectQuestion={(idx) => {
                goToQuestion(idx);
                setShowMobilePalette(false);
              }}
            />
          </div>
        </div>
      )}

      {/* Submit Confirmation Modal (Fixed for Mobile Screens) */}
      {showSubmitModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-4 sm:p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center gap-2.5 text-slate-900 font-bold text-base sm:text-lg mb-3">
              <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0" />
              <span>Submit Examination?</span>
            </div>

            <div className="space-y-2 text-xs sm:text-sm text-slate-600 mb-5 bg-slate-50 p-3 sm:p-4 rounded-xl border border-slate-200">
              <div className="flex justify-between">
                <span>Total Questions:</span>
                <span className="font-bold text-slate-900">{activeSession.questions.length}</span>
              </div>
              <div className="flex justify-between">
                <span>Attempted Answers:</span>
                <span className="font-bold text-emerald-600">{answeredCount}</span>
              </div>
              <div className="flex justify-between">
                <span>Marked for Review:</span>
                <span className="font-bold text-amber-600">{reviewCount}</span>
              </div>
              <div className="flex justify-between">
                <span>Unattempted:</span>
                <span className="font-bold text-slate-500">
                  {activeSession.questions.length - answeredCount}
                </span>
              </div>
            </div>

            <div className="flex flex-col-reverse sm:flex-row items-center justify-end gap-2 sm:gap-3">
              <button
                type="button"
                onClick={() => setShowSubmitModal(false)}
                className="w-full sm:w-auto text-xs sm:text-sm font-bold px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer text-center"
              >
                Back to Test
              </button>
              <button
                type="button"
                onClick={handleSubmitConfirm}
                className="w-full sm:w-auto text-xs sm:text-sm font-bold px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition-colors cursor-pointer text-center"
              >
                Confirm Submission
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
