"use server";

import { db } from "@/db";
import {
  examSessions,
  examResponses,
  errorNotebook,
  userSyllabusProgress,
  subUnits,
} from "@/db/schema";
import { eq, desc } from "drizzle-orm";

export interface UnitAccuracyStat {
  unitId: string;
  unitTitle: string;
  attempted: number;
  correct: number;
  accuracy: number;
}

export interface UserAnalyticsData {
  totalSessions: number;
  completedSessions: number;
  completionRate: number;
  averageScore: number;
  overallAccuracy: number;
  totalQuestionsAttempted: number;
  revisedSubUnits: number;
  totalSubUnits: number;
  revisionMasteryPercent: number;
  totalErrors: number;
  masteredErrors: number;
  mistakeResolutionRate: number;
  unitPerformance: UnitAccuracyStat[];
}

export async function getUserAnalytics(userId: string): Promise<UserAnalyticsData> {
  const emptyStats: UserAnalyticsData = {
    totalSessions: 0,
    completedSessions: 0,
    completionRate: 0,
    averageScore: 0,
    overallAccuracy: 0,
    totalQuestionsAttempted: 0,
    revisedSubUnits: 0,
    totalSubUnits: 0,
    revisionMasteryPercent: 0,
    totalErrors: 0,
    masteredErrors: 0,
    mistakeResolutionRate: 0,
    unitPerformance: [],
  };

  try {
    // 1. Sessions for this user
    const userSessions = await db.query.examSessions.findMany({
      where: eq(examSessions.userId, userId),
      orderBy: [desc(examSessions.createdAt)],
    });

    const totalSessions = userSessions.length;
    const completedSessions = userSessions.filter((s) => s.isCompleted).length;
    const completionRate =
      totalSessions > 0 ? Math.round((completedSessions / totalSessions) * 100) : 0;

    const totalScoreSum = userSessions.reduce((acc, s) => acc + (s.score || 0), 0);
    const averageScore =
      totalSessions > 0 ? Math.round((totalScoreSum / totalSessions) * 100) / 100 : 0;

    // 2. Responses for this user's sessions (joined with question -> subUnit -> unit)
    const sessionIds = new Set(userSessions.map((s) => s.id));
    let totalQuestionsAttempted = 0;
    let totalCorrect = 0;
    const unitMap = new Map<string, { unitTitle: string; attempted: number; correct: number }>();

    if (sessionIds.size > 0) {
      const allResponses = await db.query.examResponses.findMany({
        with: {
          question: {
            with: {
              subUnit: {
                with: {
                  unit: true,
                },
              },
            },
          },
        },
      });

      for (const r of allResponses) {
        if (!sessionIds.has(r.sessionId)) continue;
        if (r.selectedOptionKey === null) continue;

        totalQuestionsAttempted += 1;
        if (r.isCorrect) totalCorrect += 1;

        const unit = r.question?.subUnit?.unit;
        if (unit) {
          const entry = unitMap.get(unit.id) || {
            unitTitle: unit.title,
            attempted: 0,
            correct: 0,
          };
          entry.attempted += 1;
          if (r.isCorrect) entry.correct += 1;
          unitMap.set(unit.id, entry);
        }
      }
    }

    const overallAccuracy =
      totalQuestionsAttempted > 0
        ? Math.round((totalCorrect / totalQuestionsAttempted) * 100)
        : 0;

    const unitPerformance: UnitAccuracyStat[] = Array.from(unitMap.entries()).map(
      ([unitId, data]) => ({
        unitId,
        unitTitle: data.unitTitle,
        attempted: data.attempted,
        correct: data.correct,
        accuracy: data.attempted > 0 ? Math.round((data.correct / data.attempted) * 100) : 0,
      })
    );

    // 3. Syllabus revision mastery for this user
    const allSubUnits = await db.select({ id: subUnits.id }).from(subUnits);
    const userProgress = await db.query.userSyllabusProgress.findMany({
      where: eq(userSyllabusProgress.userId, userId),
    });
    const revisedSubUnits = userProgress.filter((p) => p.isCompleted).length;
    const totalSubUnits = allSubUnits.length;
    const revisionMasteryPercent =
      totalSubUnits > 0 ? Math.round((revisedSubUnits / totalSubUnits) * 100) : 0;

    // 4. Error notebook resolution rate for this user
    const userErrors = await db.query.errorNotebook.findMany({
      where: eq(errorNotebook.userId, userId),
    });
    const totalErrors = userErrors.length;
    const masteredErrors = userErrors.filter((e) => e.status === "mastered").length;
    const mistakeResolutionRate =
      totalErrors > 0 ? Math.round((masteredErrors / totalErrors) * 100) : 0;

    return {
      totalSessions,
      completedSessions,
      completionRate,
      averageScore,
      overallAccuracy,
      totalQuestionsAttempted,
      revisedSubUnits,
      totalSubUnits,
      revisionMasteryPercent,
      totalErrors,
      masteredErrors,
      mistakeResolutionRate,
      unitPerformance,
    };
  } catch (error) {
    console.warn("Analytics query failed, returning empty stats:", error);
    return emptyStats;
  }
}
