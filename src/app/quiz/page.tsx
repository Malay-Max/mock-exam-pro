"use client";

import React, { useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useAppStore } from "@/store/useAppStore";
import { QuestionCard } from "@/components/exam/QuestionCard";
import { ExamScorecard } from "@/components/exam/ExamScorecard";
import { submitExamSession } from "@/app/actions/exam";
import { ArrowLeft, ArrowRight, Flame, CheckCircle2 } from "lucide-react";

export default function QuizPage() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const {
    activeSession,
    selectOption,
    nextQuestion,
    prevQuestion,
    submitSession,
    startSession,
    exitSession,
  } = useAppStore();

  useEffect(() => {
    if (!activeSession) {
      router.push("/");
    }
  }, [activeSession, router]);

  // Keyboard navigation for Instant Quiz Mode
  useEffect(() => {
    if (!activeSession || activeSession.isSubmitted) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      const key = e.key.toUpperCase();
      const currentQ = activeSession.questions[activeSession.currentIndex];
      if (!currentQ) return;
      const isAnswered = !!activeSession.userAnswers[currentQ.id];

      if (!isAnswered) {
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
          // Allow skipping even if unanswered
          e.preventDefault();
          if (activeSession.currentIndex < activeSession.questions.length - 1) {
            nextQuestion();
          } else {
            handleCompleteQuiz();
          }
        }
      } else {
        // If already answered, Enter or J or ArrowRight advances
        if (e.key === "Enter" || key === "J" || e.key === "ArrowRight") {
          e.preventDefault();
          if (activeSession.currentIndex < activeSession.questions.length - 1) {
            nextQuestion();
          } else {
            handleCompleteQuiz();
          }
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [activeSession, selectOption, nextQuestion]);

  if (!activeSession) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <p className="text-sm font-semibold text-slate-500">Redirecting to Syllabus Hub...</p>
      </div>
    );
  }

  const handleCompleteQuiz = () => {
    submitSession();
    startTransition(async () => {
      await submitExamSession({
        sessionType: "instant_quiz",
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
        markedForReview: [],
        durationSeconds: activeSession.timeSpentSeconds || 60,
        timeSpentSeconds: activeSession.timeSpentSeconds || 60,
      });
    });
  };

  // Retake test initiates a fresh session on the spot with the same questions
  const handleRetake = () => {
    startSession({
      ...activeSession,
      currentIndex: 0,
      userAnswers: {},
      markedForReview: [],
      timeRemainingSeconds: 0,
      timeSpentSeconds: 0,
      isSubmitted: false,
      instantFeedback: {},
      streak: 0,
    });
  };

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
  const selectedOpt = activeSession.userAnswers[currentQ.id];
  const isAnswered = !!selectedOpt;
  const isLastQuestion = activeSession.currentIndex === activeSession.questions.length - 1;

  return (
    <div className="min-h-screen bg-slate-50/70 pb-20 w-full overflow-x-hidden">
      {/* Top Bar with Exit, Mode Indicator, Progress & Submit Button */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-30 px-3 py-2 sm:px-6 sm:py-2.5">
        <div className="max-w-3xl mx-auto flex items-center justify-between gap-2 sm:gap-4">
          <button
            type="button"
            onClick={() => {
              if (confirm("Are you sure you want to exit the quiz?")) {
                exitSession();
                router.push("/");
              }
            }}
            className="text-xs font-semibold text-slate-500 hover:text-slate-800 flex items-center gap-1 cursor-pointer py-1 shrink-0"
          >
            <ArrowLeft className="w-4 h-4" /> <span className="hidden xs:inline">Exit</span>
          </button>

          {/* Mode Title & Streak */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-sky-50 text-sky-700 border border-sky-200">
              Quiz Mode
            </span>

            {activeSession.streak > 1 && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-extrabold bg-amber-500 text-white animate-bounce">
                <Flame className="w-3 h-3 fill-white" /> {activeSession.streak}
              </span>
            )}

            <span className="text-xs font-bold text-slate-600 font-mono">
              {activeSession.currentIndex + 1}/{activeSession.questions.length}
            </span>
          </div>

          {/* Top Submit / Finish Quiz Button */}
          <button
            type="button"
            onClick={handleCompleteQuiz}
            className="text-xs sm:text-sm font-bold bg-emerald-600 hover:bg-emerald-700 text-white px-2.5 sm:px-3.5 py-1.5 rounded-lg shadow-2xs transition-colors cursor-pointer shrink-0"
          >
            Finish Quiz
          </button>
        </div>
      </div>

      {/* Main Container */}
      <div className="max-w-3xl mx-auto px-4 py-6 sm:px-6">
        <QuestionCard
          question={currentQ}
          questionNumber={activeSession.currentIndex + 1}
          totalQuestions={activeSession.questions.length}
          selectedOptionKey={selectedOpt}
          onSelectOption={(key) => selectOption(currentQ.id, key)}
          isInstantMode={true}
          showExplanation={isAnswered}
        />

        {/* Advance & Navigation Action Bar */}
        <div className="mt-6 flex items-center justify-between gap-3 bg-white border border-slate-200 rounded-2xl p-3 sm:p-4 shadow-2xs">
          <button
            type="button"
            disabled={activeSession.currentIndex === 0}
            onClick={prevQuestion}
            className="text-xs sm:text-sm font-bold text-slate-700 hover:bg-slate-100 px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition-colors"
          >
            Previous
          </button>

          <div className="flex items-center gap-2">
            {!isAnswered ? (
              // Unanswered: Show Skip / Next
              <button
                type="button"
                onClick={() => {
                  if (!isLastQuestion) {
                    nextQuestion();
                  } else {
                    handleCompleteQuiz();
                  }
                }}
                className="text-xs sm:text-sm font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 px-4 py-2 rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <span>{isLastQuestion ? "Skip & Finish" : "Skip / Next (J)"}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            ) : (
              // Answered: Show Next Question or Complete
              !isLastQuestion ? (
                <button
                  type="button"
                  onClick={nextQuestion}
                  className="text-xs sm:text-sm font-bold bg-slate-900 hover:bg-slate-800 text-white px-5 py-2.5 rounded-xl flex items-center gap-2 shadow-xs transition-colors cursor-pointer"
                >
                  <span>Next Question (Enter)</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleCompleteQuiz}
                  className="text-xs sm:text-sm font-bold bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2.5 rounded-xl flex items-center gap-2 shadow-xs transition-colors cursor-pointer"
                >
                  <span>Complete Quiz & Review</span>
                  <CheckCircle2 className="w-4 h-4" />
                </button>
              )
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
