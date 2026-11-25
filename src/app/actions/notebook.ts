"use server";

import { db } from "@/db";
import { errorNotebook } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { localStore } from "@/lib/storage";
import { auth } from "@/auth";

export interface ErrorItem {
  id: string;
  questionId: string;
  stem: string;
  explanation: string | null;
  correctOptionKey: "A" | "B" | "C" | "D";
  options: { key: "A" | "B" | "C" | "D"; text: string }[];
  subUnitTitle: string;
  unitTitle: string;
  status: "review" | "learning" | "mastered";
  consecutiveCorrect: number;
  intervalDays: number;
  nextReviewAt: Date;
  lastAttemptedAt: Date;
}

export async function getErrorNotebookItems(userId?: string): Promise<{
  success: boolean;
  items: ErrorItem[];
  resolutionRate: number;
  totalErrors: number;
  masteredCount: number;
  dueCount: number;
}> {
  try {
    const session = !userId ? await auth() : null;
    let effectiveUserId = userId || session?.user?.id;
    if (!effectiveUserId) {
      const defaultUser = await db.query.users.findFirst();
      effectiveUserId = defaultUser?.id;
    }

    if (!effectiveUserId) {
      const fallback = localStore.getErrorNotebook();
      return { success: true, ...fallback };
    }

    const records = await db.query.errorNotebook.findMany({
      where: eq(errorNotebook.userId, effectiveUserId),
      orderBy: [desc(errorNotebook.lastAttemptedAt)],
      with: {
        question: {
          with: {
            options: true,
            subUnit: {
              with: {
                unit: true,
              },
            },
          },
        },
      },
    });

    if (records.length === 0) {
      const fallback = localStore.getErrorNotebook();
      return { success: true, ...fallback };
    }

    const now = new Date();
    let masteredCount = 0;
    let dueCount = 0;

    const items: ErrorItem[] = records.map((r) => {
      if (r.status === "mastered") {
        masteredCount += 1;
      }
      if (new Date(r.nextReviewAt) <= now && r.status !== "mastered") {
        dueCount += 1;
      }

      return {
        id: r.id,
        questionId: r.questionId,
        stem: r.question.stem,
        explanation: r.question.explanation,
        correctOptionKey: r.question.correctOptionKey as "A" | "B" | "C" | "D",
        options: r.question.options.map((opt) => ({
          key: opt.key as "A" | "B" | "C" | "D",
          text: opt.text,
        })),
        subUnitTitle: r.question.subUnit.title,
        unitTitle: r.question.subUnit.unit.title,
        status: r.status,
        consecutiveCorrect: r.consecutiveCorrect,
        intervalDays: r.intervalDays,
        nextReviewAt: r.nextReviewAt,
        lastAttemptedAt: r.lastAttemptedAt,
      };
    });

    const resolutionRate =
      items.length > 0 ? Math.round((masteredCount / items.length) * 100) : 0;

    return {
      success: true,
      items,
      resolutionRate,
      totalErrors: items.length,
      masteredCount,
      dueCount,
    };
  } catch (error) {
    console.warn("DB offline, loading error notebook from local store");
    const fallback = localStore.getErrorNotebook();
    return { success: true, ...fallback };
  }
}

export async function attemptErrorNotebookItem(errorId: string, isCorrect: boolean) {
  try {
    const record = await db.query.errorNotebook.findFirst({
      where: eq(errorNotebook.id, errorId),
    });

    if (!record) {
      const localRes = localStore.attemptErrorItem(errorId, isCorrect);
      if (localRes) return { success: true, ...localRes };
      return { success: false, error: "Not found" };
    }

    let newConsecutive = isCorrect ? record.consecutiveCorrect + 1 : 0;
    let newInterval = record.intervalDays;
    let newStatus: "review" | "learning" | "mastered" = "review";

    if (!isCorrect) {
      newInterval = 1;
      newStatus = "review";
    } else {
      if (newConsecutive >= 3) {
        newStatus = "mastered";
        newInterval = 30;
      } else if (newConsecutive === 2) {
        newStatus = "learning";
        newInterval = 7;
      } else {
        newStatus = "learning";
        newInterval = 3;
      }
    }

    const nextDate = new Date(Date.now() + newInterval * 24 * 60 * 60 * 1000);

    await db
      .update(errorNotebook)
      .set({
        consecutiveCorrect: newConsecutive,
        intervalDays: newInterval,
        status: newStatus,
        nextReviewAt: nextDate,
        lastAttemptedAt: new Date(),
      })
      .where(eq(errorNotebook.id, errorId));

    return {
      success: true,
      status: newStatus,
      consecutiveCorrect: newConsecutive,
      intervalDays: newInterval,
    };
  } catch (error) {
    console.warn("DB offline, updating error item in local store");
    const localRes = localStore.attemptErrorItem(errorId, isCorrect);
    if (localRes) return { success: true, ...localRes };
    return { success: false, error: "Failed to update review status" };
  }
}
