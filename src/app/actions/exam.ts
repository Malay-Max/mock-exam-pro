"use server";

import { db } from "@/db";
import { questions, options, examSessions, examResponses, errorNotebook } from "@/db/schema";
import { inArray, eq } from "drizzle-orm";
import { QuestionData } from "@/store/useAppStore";
import { localStore } from "@/lib/storage";

export async function getQuestionsForSubUnits(
  subUnitIds: string[],
  limit: number = 50
): Promise<{ success: boolean; questions: QuestionData[]; error?: string }> {
  try {
    if (!subUnitIds || subUnitIds.length === 0) {
      return { success: true, questions: [] };
    }

    const qRecords = await db.query.questions.findMany({
      where: inArray(questions.subUnitId, subUnitIds),
      with: {
        options: true,
        subUnit: {
          with: {
            unit: true,
          },
        },
      },
      limit,
    });

    if (qRecords.length === 0) {
      const localQs = localStore.getQuestionsForSubUnits(subUnitIds, limit);
      return { success: true, questions: localQs };
    }

    const shuffled = [...qRecords].sort(() => Math.random() - 0.5);

    const formatted: QuestionData[] = shuffled.map((q) => ({
      id: q.id,
      subUnitId: q.subUnitId,
      subUnitTitle: q.subUnit.title,
      unitTitle: q.subUnit.unit.title,
      stem: q.stem,
      explanation: q.explanation || undefined,
      correctOptionKey: q.correctOptionKey as "A" | "B" | "C" | "D",
      options: q.options
        .map((opt) => ({
          id: opt.id,
          key: opt.key as "A" | "B" | "C" | "D",
          text: opt.text,
        }))
        .sort((a, b) => a.key.localeCompare(b.key)),
    }));

    return { success: true, questions: formatted };
  } catch (error) {
    console.warn("DB offline, loading questions from local store");
    const localQs = localStore.getQuestionsForSubUnits(subUnitIds, limit);
    return { success: true, questions: localQs };
  }
}

export interface SubmitSessionInput {
  userId?: string;
  sessionType: "timed_exam" | "instant_quiz";
  questions: {
    id: string;
    stem?: string;
    options?: { id: string; key: "A" | "B" | "C" | "D"; text: string }[];
    explanation?: string;
    subUnitTitle?: string;
    unitTitle?: string;
    correctOptionKey: "A" | "B" | "C" | "D";
  }[];
  userAnswers: Record<string, "A" | "B" | "C" | "D">;
  markedForReview: string[];
  durationSeconds: number;
  timeSpentSeconds: number;
}

export async function submitExamSession(input: SubmitSessionInput) {
  const totalQuestions = input.questions.length;
  let correctCount = 0;
  let incorrectCount = 0;
  let unattemptedCount = 0;

  const responseRecords: {
    questionId: string;
    selectedOptionKey: string | null;
    isCorrect: boolean | null;
    isMarkedForReview: boolean;
    timeSpentSeconds: number;
  }[] = [];

  const missedQuestionObjects: QuestionData[] = [];
  const missedQuestionIds: string[] = [];

  for (const q of input.questions) {
    const selected = input.userAnswers[q.id];
    const isMarked = input.markedForReview.includes(q.id);

    if (!selected) {
      unattemptedCount += 1;
      responseRecords.push({
        questionId: q.id,
        selectedOptionKey: null,
        isCorrect: null,
        isMarkedForReview: isMarked,
        timeSpentSeconds: 0,
      });
    } else if (selected === q.correctOptionKey) {
      correctCount += 1;
      responseRecords.push({
        questionId: q.id,
        selectedOptionKey: selected,
        isCorrect: true,
        isMarkedForReview: isMarked,
        timeSpentSeconds: 0,
      });
    } else {
      incorrectCount += 1;
      missedQuestionIds.push(q.id);
      missedQuestionObjects.push({
        id: q.id,
        subUnitId: "sub-1",
        subUnitTitle: q.subUnitTitle || "Topic",
        unitTitle: q.unitTitle || "Unit",
        stem: q.stem || "Question stem",
        explanation: q.explanation,
        correctOptionKey: q.correctOptionKey,
        options: q.options || [],
      });
      responseRecords.push({
        questionId: q.id,
        selectedOptionKey: selected,
        isCorrect: false,
        isMarkedForReview: isMarked,
        timeSpentSeconds: 0,
      });
    }
  }

  // Scoring scheme: +1.0 for correct, -0.33 for wrong, 0 for unattempted
  const rawScore = correctCount * 1.0 - incorrectCount * 0.33;
  const finalScore = Math.max(0, Math.round(rawScore * 100) / 100);

  try {
    let effectiveUserId = input.userId;
    if (!effectiveUserId) {
      const defaultUser = await db.query.users.findFirst();
      effectiveUserId = defaultUser?.id;
    }

    if (effectiveUserId) {
      const [session] = await db
        .insert(examSessions)
        .values({
          userId: effectiveUserId,
          sessionType: input.sessionType,
          totalQuestions,
          correctCount,
          incorrectCount,
          unattemptedCount,
          score: finalScore,
          durationSeconds: input.durationSeconds,
          timeSpentSeconds: input.timeSpentSeconds,
          isCompleted: true,
        })
        .returning();

      for (const resp of responseRecords) {
        await db.insert(examResponses).values({
          sessionId: session.id,
          questionId: resp.questionId,
          selectedOptionKey: resp.selectedOptionKey,
          isCorrect: resp.isCorrect,
          isMarkedForReview: resp.isMarkedForReview,
          timeSpentSeconds: resp.timeSpentSeconds,
        });
      }

      for (const qId of missedQuestionIds) {
        const existingError = await db.query.errorNotebook.findFirst({
          where: (err, { and, eq }) => and(eq(err.userId, effectiveUserId!), eq(err.questionId, qId)),
        });

        if (existingError) {
          await db
            .update(errorNotebook)
            .set({
              status: "review",
              consecutiveCorrect: 0,
              intervalDays: 1,
              nextReviewAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
              lastAttemptedAt: new Date(),
            })
            .where(eq(errorNotebook.id, existingError.id));
        } else {
          await db.insert(errorNotebook).values({
            userId: effectiveUserId,
            questionId: qId,
            status: "review",
            consecutiveCorrect: 0,
            easeFactor: 2.5,
            intervalDays: 1,
            nextReviewAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
            lastAttemptedAt: new Date(),
          });
        }
      }
    }
  } catch (error) {
    console.warn("DB offline, recording mistakes to local store");
    localStore.recordExamMistakes(missedQuestionObjects);
  }

  return {
    success: true,
    score: finalScore,
    correctCount,
    incorrectCount,
    unattemptedCount,
    totalQuestions,
  };
}
