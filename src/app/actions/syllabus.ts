"use server";

import { db } from "@/db";
import { exams, units, subUnits, questions, userSyllabusProgress } from "@/db/schema";
import { eq } from "drizzle-orm";
import { localStore } from "@/lib/storage";
import { auth } from "@/auth";

export interface SubUnitWithStats {
  id: string;
  title: string;
  orderIndex: number;
  questionCount: number;
  isCompleted: boolean;
  prescribedTexts?: string[];
}

export interface UnitWithSubUnits {
  id: string;
  unitNumber: number;
  title: string;
  orderIndex: number;
  paper?: string | null;
  subUnits: SubUnitWithStats[];
  totalQuestions: number;
  completedSubUnitsCount: number;
}

export interface ExamWithHierarchy {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  units: UnitWithSubUnits[];
  papers?: string[];
  totalQuestions: number;
  totalSubUnits: number;
  totalCompletedSubUnits: number;
  masteryPercentage: number;
}

export async function getExams() {
  try {
    const list = await db.query.exams.findMany({
      where: eq(exams.isPublished, true),
      orderBy: (exams, { desc }) => [desc(exams.createdAt)],
    });
    if (list.length > 0) {
      return { success: true, exams: list };
    }
    return { success: true, exams: localStore.getExams() };
  } catch (error) {
    console.warn("DB offline, loading exams from local store");
    return { success: true, exams: localStore.getExams() };
  }
}

export async function getExamSyllabus(
  examId: string,
  userId?: string
): Promise<{ success: boolean; exam?: ExamWithHierarchy; error?: string }> {
  try {
    const session = !userId ? await auth() : null;
    const effectiveUserId = userId || session?.user?.id;

    const examRecord = await db.query.exams.findFirst({
      where: eq(exams.id, examId),
      with: {
        units: {
          orderBy: (units, { asc }) => [asc(units.orderIndex)],
          with: {
            subUnits: {
              orderBy: (subUnits, { asc }) => [asc(subUnits.orderIndex)],
              with: {
                questions: {
                  columns: { id: true },
                },
                progress: effectiveUserId
                  ? {
                      where: eq(userSyllabusProgress.userId, effectiveUserId),
                    }
                  : undefined,
              },
            },
          },
        },
      },
    });

    if (!examRecord) {
      const localHierarchy = localStore.getExamHierarchy(examId);
      if (localHierarchy) {
        return { success: true, exam: localHierarchy };
      }
      return { success: false, error: "Exam not found" };
    }

    let examTotalQuestions = 0;
    let examTotalSubUnits = 0;
    let examCompletedSubUnits = 0;

    const formattedUnits: UnitWithSubUnits[] = examRecord.units.map((unit) => {
      let unitTotalQuestions = 0;
      let unitCompletedCount = 0;

      const formattedSubUnits: SubUnitWithStats[] = unit.subUnits.map((sub) => {
        const qCount = sub.questions.length;
        const isDone = sub.progress && sub.progress.length > 0 ? sub.progress[0].isCompleted : false;

        unitTotalQuestions += qCount;
        examTotalQuestions += qCount;
        examTotalSubUnits += 1;
        if (isDone) {
          unitCompletedCount += 1;
          examCompletedSubUnits += 1;
        }

        let parsedTexts: string[] = [];
        if ((sub as any).prescribedTexts) {
          try {
            parsedTexts = typeof (sub as any).prescribedTexts === "string"
              ? JSON.parse((sub as any).prescribedTexts)
              : (sub as any).prescribedTexts;
          } catch {
            parsedTexts = String((sub as any).prescribedTexts).split(",").map((t: string) => t.trim());
          }
        }

        return {
          id: sub.id,
          title: sub.title,
          orderIndex: sub.orderIndex,
          questionCount: qCount,
          isCompleted: isDone,
          prescribedTexts: parsedTexts,
        };
      });

      return {
        id: unit.id,
        unitNumber: unit.unitNumber,
        title: unit.title,
        orderIndex: unit.orderIndex,
        paper: (unit as any).paper || null,
        subUnits: formattedSubUnits,
        totalQuestions: unitTotalQuestions,
        completedSubUnitsCount: unitCompletedCount,
      };
    });

    const masteryPercentage =
      examTotalSubUnits > 0 ? Math.round((examCompletedSubUnits / examTotalSubUnits) * 100) : 0;

    const papers = Array.from(
      new Set(
        formattedUnits
          .map((u) => u.paper)
          .filter((p): p is string => Boolean(p && p.trim().length > 0))
      )
    );

    return {
      success: true,
      exam: {
        id: examRecord.id,
        title: examRecord.title,
        slug: examRecord.slug,
        description: examRecord.description,
        units: formattedUnits,
        papers,
        totalQuestions: examTotalQuestions,
        totalSubUnits: examTotalSubUnits,
        totalCompletedSubUnits: examCompletedSubUnits,
        masteryPercentage,
      },
    };
  } catch (error) {
    console.warn("DB offline, fetching exam syllabus from local store");
    const localHierarchy = localStore.getExamHierarchy(examId);
    if (localHierarchy) {
      return { success: true, exam: localHierarchy };
    }
    return { success: false, error: "Failed to load syllabus" };
  }
}

export async function toggleSubUnitDone(subUnitId: string, userId: string, isCompleted: boolean) {
  try {
    const session = await auth();
    let effectiveUserId = session?.user?.id || (userId && userId !== "default-user-id" ? userId : undefined);

    if (!effectiveUserId) {
      const defaultUser = await db.query.users.findFirst();
      effectiveUserId = defaultUser?.id;
    }

    if (!effectiveUserId) {
      localStore.toggleSubUnitDone(subUnitId, isCompleted);
      return { success: true };
    }

    const existing = await db.query.userSyllabusProgress.findFirst({
      where: (prog, { and, eq }) => and(eq(prog.subUnitId, subUnitId), eq(prog.userId, effectiveUserId!)),
    });

    if (existing) {
      await db
        .update(userSyllabusProgress)
        .set({
          isCompleted,
          completedAt: isCompleted ? new Date() : null,
          updatedAt: new Date(),
        })
        .where(eq(userSyllabusProgress.id, existing.id));
    } else {
      await db.insert(userSyllabusProgress).values({
        userId: effectiveUserId,
        subUnitId,
        isCompleted,
        completedAt: isCompleted ? new Date() : null,
      });
    }

    return { success: true };
  } catch (error) {
    console.warn("DB offline, updating sub-unit status in local store");
    localStore.toggleSubUnitDone(subUnitId, isCompleted);
    return { success: true };
  }
}
