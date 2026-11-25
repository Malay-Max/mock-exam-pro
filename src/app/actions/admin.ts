"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { exams, units, subUnits, questions, options } from "@/db/schema";
import { eq, asc, desc } from "drizzle-orm";
import { ParsedQuestion } from "@/lib/parser";
import { localStore } from "@/lib/storage";

const isUuid = (id?: string | null) =>
  !!id && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);

function revalidateAppPaths() {
  revalidatePath("/");
  revalidatePath("/admin");
  revalidatePath("/notebook");
  revalidatePath("/analytics");
}

export async function createExam(title: string, slug: string, description?: string) {
  try {
    const [exam] = await db
      .insert(exams)
      .values({
        title,
        slug: slug.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
        description,
        isPublished: true,
      })
      .returning();
    return { success: true, exam };
  } catch (error) {
    console.warn("DB offline, creating exam in local store:", (error as Error).message);
    const localExam = localStore.createExam(title, slug, description);
    return { success: true, exam: localExam };
  }
}

export async function createUnit(examId: string, unitNumber: number, title: string, paper?: string) {
  try {
    const [unit] = await db
      .insert(units)
      .values({
        examId,
        unitNumber,
        title,
        paper: paper ? paper.trim() : null,
        orderIndex: unitNumber,
      })
      .returning();
    return { success: true, unit };
  } catch (error) {
    console.warn("DB offline, creating unit in local store:", (error as Error).message);
    const localUnit = localStore.createUnit(examId, unitNumber, title, paper);
    return { success: true, unit: localUnit };
  }
}

export async function createSubUnit(unitId: string, title: string, prescribedTexts?: string[]) {
  try {
    const [subUnit] = await db
      .insert(subUnits)
      .values({
        unitId,
        title,
        prescribedTexts: prescribedTexts ? JSON.stringify(prescribedTexts) : null,
      })
      .returning();
    return { success: true, subUnit };
  } catch (error) {
    console.warn("DB offline, creating sub-unit in local store:", (error as Error).message);
    const localSub = localStore.createSubUnit(unitId, title, prescribedTexts);
    return { success: true, subUnit: localSub };
  }
}

export async function updateExam(examId: string, title: string, description?: string) {
  try {
    await db
      .update(exams)
      .set({
        title,
        description: description !== undefined ? description : undefined,
      })
      .where(eq(exams.id, examId));
    return { success: true };
  } catch (error) {
    console.warn("DB offline, updating exam in local store");
    localStore.updateExam(examId, title, description);
    return { success: true };
  }
}

export async function deleteExam(examId: string) {
  try {
    if (!isUuid(examId)) {
      localStore.deleteExam(examId);
      revalidateAppPaths();
      return { success: true };
    }
    await db.delete(exams).where(eq(exams.id, examId));
    revalidateAppPaths();
    return { success: true };
  } catch (error) {
    console.warn("DB offline, deleting exam in local store");
    localStore.deleteExam(examId);
    return { success: true };
  }
}

export async function updateUnit(unitId: string, title: string, unitNumber?: number, paper?: string | null) {
  try {
    await db
      .update(units)
      .set({
        title,
        unitNumber: unitNumber !== undefined ? unitNumber : undefined,
        paper: paper !== undefined ? (paper ? paper.trim() : null) : undefined,
      })
      .where(eq(units.id, unitId));
    return { success: true };
  } catch (error) {
    console.warn("DB offline, updating unit in local store");
    localStore.updateUnit(unitId, title, unitNumber, paper);
    return { success: true };
  }
}

export async function deleteUnit(unitId: string) {
  try {
    await db.delete(units).where(eq(units.id, unitId));
    return { success: true };
  } catch (error) {
    console.warn("DB offline, deleting unit in local store");
    localStore.deleteUnit(unitId);
    return { success: true };
  }
}

export async function updateSubUnit(subUnitId: string, title: string, prescribedTexts?: string[]) {
  try {
    await db
      .update(subUnits)
      .set({
        title,
        prescribedTexts: prescribedTexts !== undefined ? (prescribedTexts.length > 0 ? JSON.stringify(prescribedTexts) : null) : undefined,
      })
      .where(eq(subUnits.id, subUnitId));
    return { success: true };
  } catch (error) {
    console.warn("DB offline, updating sub-unit in local store");
    localStore.updateSubUnit(subUnitId, title, prescribedTexts);
    return { success: true };
  }
}

export async function deleteSubUnit(subUnitId: string) {
  try {
    await db.delete(subUnits).where(eq(subUnits.id, subUnitId));
    return { success: true };
  } catch (error) {
    console.warn("DB offline, deleting sub-unit in local store");
    localStore.deleteSubUnit(subUnitId);
    return { success: true };
  }
}

export async function batchImportQuestions(subUnitId: string, parsedQuestions: ParsedQuestion[]) {
  try {
    let importedCount = 0;

    for (const q of parsedQuestions) {
      if (q.errors && q.errors.length > 0) continue; // skip invalid questions

      const [qRecord] = await db
        .insert(questions)
        .values({
          subUnitId,
          stem: q.stem,
          correctOptionKey: q.correctOptionKey,
          explanation: q.explanation || null,
        })
        .returning();

      for (const opt of q.options) {
        await db.insert(options).values({
          questionId: qRecord.id,
          key: opt.key,
          text: opt.text,
        });
      }
      importedCount += 1;
    }

    return { success: true, importedCount };
  } catch (error) {
    console.warn("DB offline, importing questions into local store:", (error as Error).message);
    const count = localStore.batchImportQuestions(subUnitId, parsedQuestions);
    return { success: true, importedCount: count };
  }
}

export async function getSubUnitQuestions(subUnitId: string) {
  try {
    const qList = await db.query.questions.findMany({
      where: eq(questions.subUnitId, subUnitId),
      with: {
        options: {
          orderBy: (options, { asc }) => [asc(options.key)],
        },
      },
      orderBy: [desc(questions.createdAt)],
    });

    return { success: true, questions: qList };
  } catch (error) {
    console.warn("DB offline, fetching sub-unit questions from local store");
    const localQs = localStore.getQuestionsForSubUnits([subUnitId], 100);
    return { success: true, questions: localQs };
  }
}

export async function updateQuestion(
  questionId: string,
  stem: string,
  opts: { id: string; key: string; text: string }[],
  correctOptionKey: string,
  explanation?: string
) {
  try {
    await db
      .update(questions)
      .set({
        stem,
        correctOptionKey,
        explanation: explanation || null,
      })
      .where(eq(questions.id, questionId));

    for (const opt of opts) {
      await db
        .update(options)
        .set({ text: opt.text })
        .where(eq(options.id, opt.id));
    }

    return { success: true };
  } catch (error) {
    return { success: true };
  }
}

export async function deleteQuestion(questionId: string) {
  try {
    await db.delete(questions).where(eq(questions.id, questionId));
    return { success: true };
  } catch (error) {
    return { success: true };
  }
}
