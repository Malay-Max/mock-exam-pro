import { create } from "zustand";

export interface QuestionData {
  id: string;
  subUnitId: string;
  subUnitTitle?: string;
  unitTitle?: string;
  stem: string;
  explanation?: string;
  correctOptionKey: "A" | "B" | "C" | "D";
  options: {
    id: string;
    key: "A" | "B" | "C" | "D";
    text: string;
  }[];
}

export interface ExamSessionState {
  sessionId: string;
  sessionType: "timed_exam" | "instant_quiz";
  questions: QuestionData[];
  currentIndex: number;
  userAnswers: Record<string, "A" | "B" | "C" | "D">;
  markedForReview: string[]; // question IDs
  timeRemainingSeconds: number;
  timeSpentSeconds: number;
  isSubmitted: boolean;
  instantFeedback: Record<string, boolean>; // for instant quiz mode: questionId -> boolean
  streak: number;
}

interface AppState {
  activeExamId: string | null;
  selectedSubUnitIds: string[];
  completedSubUnitIds: string[];
  activeSession: ExamSessionState | null;

  // Actions
  setActiveExamId: (examId: string) => void;
  toggleSubUnitSelection: (subUnitId: string) => void;
  selectSubUnits: (subUnitIds: string[]) => void;
  deselectSubUnits: (subUnitIds: string[]) => void;
  clearSubUnitSelections: () => void;
  toggleMarkDone: (subUnitId: string) => void;
  setCompletedSubUnits: (subUnitIds: string[]) => void;

  // Session Actions
  startSession: (session: ExamSessionState) => void;
  selectOption: (questionId: string, optionKey: "A" | "B" | "C" | "D") => void;
  clearOption: (questionId: string) => void;
  toggleMarkForReview: (questionId: string) => void;
  goToQuestion: (index: number) => void;
  nextQuestion: () => void;
  prevQuestion: () => void;
  tickTimer: () => void;
  submitSession: () => void;
  exitSession: () => void;
}

export const useAppStore = create<AppState>((set, get) => ({
  activeExamId: null,
  selectedSubUnitIds: [],
  completedSubUnitIds: [],
  activeSession: null,

  setActiveExamId: (examId) => set({ activeExamId: examId, selectedSubUnitIds: [] }),

  toggleSubUnitSelection: (subUnitId) => {
    set((state) => {
      const exists = state.selectedSubUnitIds.includes(subUnitId);
      return {
        selectedSubUnitIds: exists
          ? state.selectedSubUnitIds.filter((id) => id !== subUnitId)
          : [...state.selectedSubUnitIds, subUnitId],
      };
    });
  },

  selectSubUnits: (subUnitIds) => {
    set((state) => {
      const setIds = new Set([...state.selectedSubUnitIds, ...subUnitIds]);
      return { selectedSubUnitIds: Array.from(setIds) };
    });
  },

  deselectSubUnits: (subUnitIds) => {
    set((state) => ({
      selectedSubUnitIds: state.selectedSubUnitIds.filter((id) => !subUnitIds.includes(id)),
    }));
  },

  clearSubUnitSelections: () => set({ selectedSubUnitIds: [] }),

  toggleMarkDone: (subUnitId) => {
    set((state) => {
      const exists = state.completedSubUnitIds.includes(subUnitId);
      return {
        completedSubUnitIds: exists
          ? state.completedSubUnitIds.filter((id) => id !== subUnitId)
          : [...state.completedSubUnitIds, subUnitId],
      };
    });
  },

  setCompletedSubUnits: (subUnitIds) => set({ completedSubUnitIds: subUnitIds }),

  startSession: (session) => set({ activeSession: session }),

  selectOption: (questionId, optionKey) => {
    const { activeSession } = get();
    if (!activeSession || activeSession.isSubmitted) return;

    const currentQ = activeSession.questions[activeSession.currentIndex];
    const isCorrect = currentQ && currentQ.correctOptionKey === optionKey;
    let newStreak = activeSession.streak;

    if (activeSession.sessionType === "instant_quiz") {
      newStreak = isCorrect ? activeSession.streak + 1 : 0;
    }

    set({
      activeSession: {
        ...activeSession,
        userAnswers: {
          ...activeSession.userAnswers,
          [questionId]: optionKey,
        },
        instantFeedback: {
          ...activeSession.instantFeedback,
          [questionId]: isCorrect,
        },
        streak: newStreak,
      },
    });
  },

  clearOption: (questionId) => {
    const { activeSession } = get();
    if (!activeSession || activeSession.isSubmitted) return;

    const newAnswers = { ...activeSession.userAnswers };
    delete newAnswers[questionId];

    set({
      activeSession: {
        ...activeSession,
        userAnswers: newAnswers,
      },
    });
  },

  toggleMarkForReview: (questionId) => {
    const { activeSession } = get();
    if (!activeSession || activeSession.isSubmitted) return;

    const exists = activeSession.markedForReview.includes(questionId);
    set({
      activeSession: {
        ...activeSession,
        markedForReview: exists
          ? activeSession.markedForReview.filter((id) => id !== questionId)
          : [...activeSession.markedForReview, questionId],
      },
    });
  },

  goToQuestion: (index) => {
    const { activeSession } = get();
    if (!activeSession) return;
    if (index >= 0 && index < activeSession.questions.length) {
      set({
        activeSession: {
          ...activeSession,
          currentIndex: index,
        },
      });
    }
  },

  nextQuestion: () => {
    const { activeSession } = get();
    if (!activeSession) return;
    if (activeSession.currentIndex < activeSession.questions.length - 1) {
      set({
        activeSession: {
          ...activeSession,
          currentIndex: activeSession.currentIndex + 1,
        },
      });
    }
  },

  prevQuestion: () => {
    const { activeSession } = get();
    if (!activeSession) return;
    if (activeSession.currentIndex > 0) {
      set({
        activeSession: {
          ...activeSession,
          currentIndex: activeSession.currentIndex - 1,
        },
      });
    }
  },

  tickTimer: () => {
    const { activeSession } = get();
    if (!activeSession || activeSession.isSubmitted) return;

    if (activeSession.timeRemainingSeconds <= 1) {
      // Auto submit on time expire
      get().submitSession();
    } else {
      set({
        activeSession: {
          ...activeSession,
          timeRemainingSeconds: activeSession.timeRemainingSeconds - 1,
          timeSpentSeconds: activeSession.timeSpentSeconds + 1,
        },
      });
    }
  },

  submitSession: () => {
    const { activeSession } = get();
    if (!activeSession) return;
    set({
      activeSession: {
        ...activeSession,
        isSubmitted: true,
      },
    });
  },

  exitSession: () => set({ activeSession: null }),
}));
