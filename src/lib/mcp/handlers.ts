import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { exams, units, subUnits, questions, options } from "@/db/schema";
import { eq, asc } from "drizzle-orm";
import { parseQuestionText } from "@/lib/parser";

const isUuid = (id?: string | null) =>
  !!id && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);

function normalizeStem(stem: string): string {
  return stem.trim().toLowerCase().replace(/\s+/g, " ");
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function parsePrescribedTexts(raw: unknown): string[] {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw.map((x) => String(x).trim()).filter(Boolean);
  if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed.map((x) => String(x).trim()).filter(Boolean);
      }
    } catch {
      return raw
        .split(",")
        .map((x) => x.trim())
        .filter(Boolean);
    }
  }
  return [];
}

function revalidateUi() {
  try {
    revalidatePath("/");
    revalidatePath("/admin");
    revalidatePath("/analytics");
  } catch {
    // Ignore when executed outside a Next.js request lifecycle (e.g. unit test scripts)
  }
}

export async function mcpListExams() {
  const examRows = await db.query.exams.findMany({
    with: {
      units: {
        with: {
          subUnits: {
            with: {
              questions: {
                columns: { id: true },
              },
            },
          },
        },
      },
    },
    orderBy: (e, { desc }) => [desc(e.createdAt)],
  });

  return examRows.map((exam) => {
    const unitCount = exam.units.length;
    let subUnitCount = 0;
    let questionCount = 0;
    for (const u of exam.units) {
      subUnitCount += u.subUnits.length;
      for (const s of u.subUnits) {
        questionCount += s.questions.length;
      }
    }
    return {
      id: exam.id,
      title: exam.title,
      slug: exam.slug,
      description: exam.description,
      unitCount,
      subUnitCount,
      questionCount,
    };
  });
}

export async function mcpGetExamSyllabus(examId: string, includeQuestionStems = false) {
  if (!isUuid(examId)) {
    throw new Error(`Invalid examId UUID: ${examId}`);
  }

  const exam = await db.query.exams.findFirst({
    where: eq(exams.id, examId),
    with: {
      units: {
        orderBy: (u, { asc }) => [asc(u.orderIndex), asc(u.unitNumber)],
        with: {
          subUnits: {
            orderBy: (s, { asc }) => [asc(s.orderIndex)],
            with: {
              questions: {
                columns: {
                  id: true,
                  stem: true,
                  correctOptionKey: true,
                },
              },
            },
          },
        },
      },
    },
  });

  if (!exam) {
    throw new Error(`Exam not found: ${examId}`);
  }

  return {
    id: exam.id,
    title: exam.title,
    slug: exam.slug,
    description: exam.description,
    units: exam.units.map((u) => ({
      id: u.id,
      unitNumber: u.unitNumber,
      title: u.title,
      paper: u.paper || null,
      orderIndex: u.orderIndex,
      topics: u.subUnits.map((s) => ({
        id: s.id,
        title: s.title,
        orderIndex: s.orderIndex,
        prescribedTexts: parsePrescribedTexts(s.prescribedTexts),
        questionCount: s.questions.length,
        ...(includeQuestionStems
          ? {
              questions: s.questions.map((q) => ({
                id: q.id,
                stem: q.stem,
                correctOptionKey: q.correctOptionKey,
              })),
            }
          : {}),
      })),
    })),
  };
}

export async function mcpListQuestions(subUnitId: string, search?: string, limit = 50) {
  if (!isUuid(subUnitId)) {
    throw new Error(`Invalid subUnitId UUID: ${subUnitId}`);
  }

  const qRows = await db.query.questions.findMany({
    where: eq(questions.subUnitId, subUnitId),
    with: {
      options: {
        orderBy: (o, { asc }) => [asc(o.key)],
      },
    },
    orderBy: (q, { asc }) => [asc(q.createdAt)],
  });

  const normalizedSearch = search?.trim().toLowerCase();
  const filtered = normalizedSearch
    ? qRows.filter(
        (q) =>
          q.stem.toLowerCase().includes(normalizedSearch) ||
          (q.explanation || "").toLowerCase().includes(normalizedSearch) ||
          q.options.some((o) => o.text.toLowerCase().includes(normalizedSearch))
      )
    : qRows;

  return {
    totalInTopic: qRows.length,
    matchedCount: filtered.length,
    questions: filtered.slice(0, limit).map((q) => ({
      id: q.id,
      stem: q.stem,
      options: q.options.map((o) => ({ key: o.key, text: o.text })),
      correctOptionKey: q.correctOptionKey,
      explanation: q.explanation,
    })),
  };
}

export async function mcpCreateExam(input: {
  title: string;
  description?: string;
  slug?: string;
}) {
  const baseSlug = slugify(input.slug || input.title) || `exam-${Date.now()}`;
  const existingSlug = await db.query.exams.findFirst({
    where: eq(exams.slug, baseSlug),
  });
  const finalSlug = existingSlug ? `${baseSlug}-${Date.now().toString().slice(-4)}` : baseSlug;

  const [created] = await db
    .insert(exams)
    .values({
      title: input.title.trim(),
      slug: finalSlug,
      description: input.description?.trim() || null,
      isPublished: true,
    })
    .returning();

  revalidateUi();
  return created;
}

export async function mcpUpdateExam(input: {
  examId: string;
  title?: string;
  description?: string | null;
}) {
  if (!isUuid(input.examId)) {
    throw new Error(`Invalid examId UUID: ${input.examId}`);
  }

  const patch: Partial<typeof exams.$inferInsert> = {};
  if (input.title !== undefined) patch.title = input.title.trim();
  if (input.description !== undefined) {
    patch.description = input.description === null ? null : input.description.trim();
  }

  if (Object.keys(patch).length === 0) {
    throw new Error("At least one field (title or description) must be provided to update_exam.");
  }

  const [updated] = await db
    .update(exams)
    .set(patch)
    .where(eq(exams.id, input.examId))
    .returning();

  if (!updated) {
    throw new Error(`Exam not found: ${input.examId}`);
  }

  revalidateUi();
  return updated;
}

export async function mcpBatchUpsertUnits(
  examId: string,
  unitItems: Array<{
    unitId?: string;
    unitNumber: number;
    title: string;
    paper?: string | null;
    orderIndex?: number;
  }>
) {
  if (!isUuid(examId)) {
    throw new Error(`Invalid examId UUID: ${examId}`);
  }

  const parentExam = await db.query.exams.findFirst({ where: eq(exams.id, examId) });
  if (!parentExam) {
    throw new Error(`Exam not found: ${examId}`);
  }

  const results = [];
  for (const item of unitItems) {
    if (item.unitId) {
      if (!isUuid(item.unitId)) {
        throw new Error(`Invalid unitId UUID: ${item.unitId}`);
      }
      const [updated] = await db
        .update(units)
        .set({
          unitNumber: item.unitNumber,
          title: item.title.trim(),
          paper: item.paper === undefined ? undefined : item.paper?.trim() || null,
          orderIndex: item.orderIndex ?? item.unitNumber,
        })
        .where(eq(units.id, item.unitId))
        .returning();
      if (!updated) {
        throw new Error(`Unit not found for update: ${item.unitId}`);
      }
      results.push({ action: "updated", unit: updated });
    } else {
      const [created] = await db
        .insert(units)
        .values({
          examId,
          unitNumber: item.unitNumber,
          title: item.title.trim(),
          paper: item.paper?.trim() || null,
          orderIndex: item.orderIndex ?? item.unitNumber,
        })
        .returning();
      results.push({ action: "created", unit: created });
    }
  }

  revalidateUi();
  return results;
}

export async function mcpBatchUpsertTopics(
  unitId: string,
  topicItems: Array<{
    subUnitId?: string;
    title: string;
    prescribedTexts?: string[];
    orderIndex?: number;
  }>
) {
  if (!isUuid(unitId)) {
    throw new Error(`Invalid unitId UUID: ${unitId}`);
  }

  const existingTopics = await db.query.subUnits.findMany({
    where: eq(subUnits.unitId, unitId),
  });
  let nextOrder = existingTopics.length + 1;

  const results = [];
  for (const item of topicItems) {
    const textsJson =
      item.prescribedTexts !== undefined
        ? item.prescribedTexts.length > 0
          ? JSON.stringify(item.prescribedTexts.map((t) => t.trim()).filter(Boolean))
          : null
        : undefined;

    if (item.subUnitId) {
      if (!isUuid(item.subUnitId)) {
        throw new Error(`Invalid subUnitId UUID: ${item.subUnitId}`);
      }
      const [updated] = await db
        .update(subUnits)
        .set({
          title: item.title.trim(),
          ...(textsJson !== undefined ? { prescribedTexts: textsJson } : {}),
          ...(item.orderIndex !== undefined ? { orderIndex: item.orderIndex } : {}),
        })
        .where(eq(subUnits.id, item.subUnitId))
        .returning();
      if (!updated) {
        throw new Error(`Topic (subUnit) not found for update: ${item.subUnitId}`);
      }
      results.push({
        action: "updated",
        topic: {
          ...updated,
          prescribedTexts: parsePrescribedTexts(updated.prescribedTexts),
        },
      });
    } else {
      const orderVal = item.orderIndex ?? nextOrder++;
      const [created] = await db
        .insert(subUnits)
        .values({
          unitId,
          title: item.title.trim(),
          prescribedTexts: textsJson ?? null,
          orderIndex: orderVal,
        })
        .returning();
      results.push({
        action: "created",
        topic: {
          ...created,
          prescribedTexts: parsePrescribedTexts(created.prescribedTexts),
        },
      });
    }
  }

  revalidateUi();
  return results;
}

export async function mcpEnsureSyllabusPath(input: {
  examTitle: string;
  examDescription?: string;
  paper?: string;
  unitNumber?: number;
  unitTitle: string;
  topicTitle: string;
  prescribedTexts?: string[];
}) {
  const createdFlags = { exam: false, unit: false, topic: false };

  // 1. Find or create Exam
  const allExams = await db.query.exams.findMany();
  let exam = allExams.find(
    (e) => e.title.trim().toLowerCase() === input.examTitle.trim().toLowerCase()
  );
  if (!exam) {
    exam = await mcpCreateExam({
      title: input.examTitle,
      description: input.examDescription,
    });
    createdFlags.exam = true;
  }

  // 2. Find or create Unit
  const examUnits = await db.query.units.findMany({
    where: eq(units.examId, exam.id),
    orderBy: [asc(units.orderIndex)],
  });
  let unit = examUnits.find((u) => {
    const titleMatches = u.title.trim().toLowerCase() === input.unitTitle.trim().toLowerCase();
    const paperMatches = input.paper
      ? (u.paper || "").trim().toLowerCase() === input.paper.trim().toLowerCase()
      : true;
    return titleMatches && paperMatches;
  });
  if (!unit) {
    const unitNum = input.unitNumber ?? examUnits.length + 1;
    const [newUnit] = await db
      .insert(units)
      .values({
        examId: exam.id,
        unitNumber: unitNum,
        title: input.unitTitle.trim(),
        paper: input.paper?.trim() || null,
        orderIndex: unitNum,
      })
      .returning();
    unit = newUnit;
    createdFlags.unit = true;
  }

  // 3. Find or create Topic (Sub-Unit)
  const unitTopics = await db.query.subUnits.findMany({
    where: eq(subUnits.unitId, unit.id),
    orderBy: [asc(subUnits.orderIndex)],
  });
  let topic = unitTopics.find(
    (t) => t.title.trim().toLowerCase() === input.topicTitle.trim().toLowerCase()
  );

  if (!topic) {
    const textsJson =
      input.prescribedTexts && input.prescribedTexts.length > 0
        ? JSON.stringify(input.prescribedTexts.map((t) => t.trim()).filter(Boolean))
        : null;
    const [newTopic] = await db
      .insert(subUnits)
      .values({
        unitId: unit.id,
        title: input.topicTitle.trim(),
        prescribedTexts: textsJson,
        orderIndex: unitTopics.length + 1,
      })
      .returning();
    topic = newTopic;
    createdFlags.topic = true;
  } else if (input.prescribedTexts && input.prescribedTexts.length > 0) {
    // Merge any new prescribed texts without overwriting existing ones
    const existingTexts = parsePrescribedTexts(topic.prescribedTexts);
    const merged = Array.from(
      new Set([...existingTexts, ...input.prescribedTexts.map((t) => t.trim()).filter(Boolean)])
    );
    const [updatedTopic] = await db
      .update(subUnits)
      .set({ prescribedTexts: JSON.stringify(merged) })
      .where(eq(subUnits.id, topic.id))
      .returning();
    topic = updatedTopic;
  }

  revalidateUi();
  return {
    examId: exam.id,
    unitId: unit.id,
    subUnitId: topic.id,
    created: createdFlags,
    prescribedTexts: parsePrescribedTexts(topic.prescribedTexts),
  };
}

export async function mcpAddQuestions(
  subUnitId: string,
  items: Array<{
    stem: string;
    options: { A: string; B: string; C: string; D: string };
    correctOptionKey: "A" | "B" | "C" | "D";
    explanation?: string;
  }>,
  skipDuplicates = true
) {
  if (!isUuid(subUnitId)) {
    throw new Error(`Invalid subUnitId UUID: ${subUnitId}`);
  }

  const targetTopic = await db.query.subUnits.findFirst({
    where: eq(subUnits.id, subUnitId),
  });
  if (!targetTopic) {
    throw new Error(`Topic (subUnit) not found: ${subUnitId}`);
  }

  const existingSet = new Set<string>();
  if (skipDuplicates) {
    const existingQs = await db.query.questions.findMany({
      where: eq(questions.subUnitId, subUnitId),
      columns: { stem: true },
    });
    for (const q of existingQs) {
      existingSet.add(normalizeStem(q.stem));
    }
  }

  const insertedIds: string[] = [];
  const skippedStems: string[] = [];

  for (const item of items) {
    const stemTrimmed = item.stem.trim();
    const norm = normalizeStem(stemTrimmed);
    if (skipDuplicates && existingSet.has(norm)) {
      skippedStems.push(stemTrimmed);
      continue;
    }
    existingSet.add(norm);

    const [createdQ] = await db
      .insert(questions)
      .values({
        subUnitId,
        stem: stemTrimmed,
        correctOptionKey: item.correctOptionKey,
        explanation: item.explanation?.trim() || null,
      })
      .returning();

    const optEntries: Array<{ key: "A" | "B" | "C" | "D"; text: string }> = [
      { key: "A", text: item.options.A.trim() },
      { key: "B", text: item.options.B.trim() },
      { key: "C", text: item.options.C.trim() },
      { key: "D", text: item.options.D.trim() },
    ];

    await db.insert(options).values(
      optEntries.map((opt) => ({
        questionId: createdQ.id,
        key: opt.key,
        text: opt.text,
      }))
    );

    insertedIds.push(createdQ.id);
  }

  revalidateUi();
  return {
    insertedCount: insertedIds.length,
    skippedCount: skippedStems.length,
    insertedIds,
    skippedStems,
  };
}

export async function mcpImportQuestionsText(
  subUnitId: string,
  rawText: string,
  skipDuplicates = true
) {
  const parsed = parseQuestionText(rawText);
  const validItems: Array<{
    stem: string;
    options: { A: string; B: string; C: string; D: string };
    correctOptionKey: "A" | "B" | "C" | "D";
    explanation?: string;
  }> = [];
  const syntaxErrors: Array<{ blockIndex: number; stem: string; errors: string[] }> = [];

  parsed.questions.forEach((pq, idx) => {
    if (pq.errors && pq.errors.length > 0) {
      syntaxErrors.push({
        blockIndex: idx + 1,
        stem: pq.stem,
        errors: pq.errors,
      });
      return;
    }

    const optMap: Record<string, string> = {};
    for (const o of pq.options) {
      optMap[o.key] = o.text;
    }

    validItems.push({
      stem: pq.stem,
      options: {
        A: optMap.A || "",
        B: optMap.B || "",
        C: optMap.C || "",
        D: optMap.D || "",
      },
      correctOptionKey: pq.correctOptionKey,
      explanation: pq.explanation,
    });
  });

  const insertResult =
    validItems.length > 0
      ? await mcpAddQuestions(subUnitId, validItems, skipDuplicates)
      : { insertedCount: 0, skippedCount: 0, insertedIds: [], skippedStems: [] };

  return {
    totalParsed: parsed.totalParsed,
    validCount: parsed.validCount,
    invalidCount: parsed.invalidCount,
    ...insertResult,
    syntaxErrors,
  };
}

export async function mcpUpdateQuestions(
  updates: Array<{
    questionId: string;
    stem?: string;
    options?: Partial<Record<"A" | "B" | "C" | "D", string>>;
    correctOptionKey?: "A" | "B" | "C" | "D";
    explanation?: string | null;
  }>
) {
  const updatedIds: string[] = [];

  for (const upd of updates) {
    if (!isUuid(upd.questionId)) {
      throw new Error(`Invalid questionId UUID: ${upd.questionId}`);
    }

    const existingQ = await db.query.questions.findFirst({
      where: eq(questions.id, upd.questionId),
      with: { options: true },
    });
    if (!existingQ) {
      throw new Error(`Question not found: ${upd.questionId}`);
    }

    const qPatch: Partial<typeof questions.$inferInsert> = {};
    if (upd.stem !== undefined) qPatch.stem = upd.stem.trim();
    if (upd.correctOptionKey !== undefined) qPatch.correctOptionKey = upd.correctOptionKey;
    if (upd.explanation !== undefined) {
      qPatch.explanation = upd.explanation === null ? null : upd.explanation.trim();
    }

    if (Object.keys(qPatch).length > 0) {
      await db.update(questions).set(qPatch).where(eq(questions.id, upd.questionId));
    }

    if (upd.options) {
      for (const key of ["A", "B", "C", "D"] as const) {
        const newText = upd.options[key];
        if (newText !== undefined) {
          const existingOpt = existingQ.options.find((o) => o.key === key);
          if (existingOpt) {
            await db
              .update(options)
              .set({ text: newText.trim() })
              .where(eq(options.id, existingOpt.id));
          } else {
            await db.insert(options).values({
              questionId: upd.questionId,
              key,
              text: newText.trim(),
            });
          }
        }
      }
    }

    updatedIds.push(upd.questionId);
  }

  revalidateUi();
  return {
    updatedCount: updatedIds.length,
    updatedIds,
  };
}
