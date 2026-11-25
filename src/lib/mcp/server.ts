import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import {
  mcpListExams,
  mcpGetExamSyllabus,
  mcpListQuestions,
  mcpCreateExam,
  mcpUpdateExam,
  mcpBatchUpsertUnits,
  mcpBatchUpsertTopics,
  mcpEnsureSyllabusPath,
  mcpAddQuestions,
  mcpImportQuestionsText,
  mcpUpdateQuestions,
} from "./handlers";

function jsonResult(data: unknown) {
  return {
    content: [
      {
        type: "text" as const,
        text: JSON.stringify(data, null, 2),
      },
    ],
  };
}

function errorResult(err: unknown) {
  return {
    isError: true,
    content: [
      {
        type: "text" as const,
        text: `Error: ${err instanceof Error ? err.message : String(err)}`,
      },
    ],
  };
}

export function createMockExamMcpServer(): McpServer {
  const server = new McpServer({
    name: "mockexam-pro",
    version: "1.0.0",
  });

  // 1. list_exams (read-only)
  server.registerTool(
    "list_exams",
    {
      title: "List All Exams",
      description:
        "List all exams in MockExam Pro along with unit, topic, and question counts. Use this first to discover existing examIds before creating or modifying content.",
      annotations: { readOnlyHint: true, destructiveHint: false },
    },
    async () => {
      try {
        const data = await mcpListExams();
        return jsonResult({ exams: data });
      } catch (err) {
        return errorResult(err);
      }
    }
  );

  // 2. get_exam_syllabus (read-only)
  server.registerTool(
    "get_exam_syllabus",
    {
      title: "Get Exam Syllabus Hierarchy",
      description:
        "Return the complete Exam -> Paper -> Unit -> Topic (subUnit) -> Prescribed Texts tree with UUIDs and question counts. Set includeQuestionStems=true to inspect existing question stems.",
      inputSchema: {
        examId: z.string().describe("UUID of the exam"),
        includeQuestionStems: z
          .boolean()
          .optional()
          .describe("Include question id, stem, and correctOptionKey per topic (default false)"),
      },
      annotations: { readOnlyHint: true, destructiveHint: false },
    },
    async ({ examId, includeQuestionStems }) => {
      try {
        const data = await mcpGetExamSyllabus(examId, includeQuestionStems ?? false);
        return jsonResult(data);
      } catch (err) {
        return errorResult(err);
      }
    }
  );

  // 3. list_questions (read-only)
  server.registerTool(
    "list_questions",
    {
      title: "List Questions in Topic",
      description:
        "Fetch full question details (id, stem, options A-D, correctOptionKey, explanation) for a specific topic (subUnitId), optionally filtered by search substring.",
      inputSchema: {
        subUnitId: z.string().describe("UUID of the topic (sub-unit)"),
        search: z.string().optional().describe("Optional substring search over stem, options, or explanation"),
        limit: z.number().int().min(1).max(200).optional().describe("Max questions to return (default 50)"),
      },
      annotations: { readOnlyHint: true, destructiveHint: false },
    },
    async ({ subUnitId, search, limit }) => {
      try {
        const data = await mcpListQuestions(subUnitId, search, limit ?? 50);
        return jsonResult(data);
      } catch (err) {
        return errorResult(err);
      }
    }
  );

  // 4. create_exam (add)
  server.registerTool(
    "create_exam",
    {
      title: "Create Exam",
      description: "Create a new examination syllabus container.",
      inputSchema: {
        title: z.string().min(2).describe("Exam title, e.g. 'MPPSC Assistant Professor (English)'"),
        description: z.string().optional().describe("Short syllabus description"),
        slug: z.string().optional().describe("Optional URL slug (auto-generated from title if omitted)"),
      },
      annotations: { readOnlyHint: false, destructiveHint: false },
    },
    async (input) => {
      try {
        const created = await mcpCreateExam(input);
        return jsonResult({ exam: created });
      } catch (err) {
        return errorResult(err);
      }
    }
  );

  // 5. update_exam (edit)
  server.registerTool(
    "update_exam",
    {
      title: "Update Exam",
      description: "Edit the title or description of an existing exam.",
      inputSchema: {
        examId: z.string().describe("UUID of the exam to update"),
        title: z.string().min(2).optional().describe("Updated exam title"),
        description: z.string().nullable().optional().describe("Updated description (or null to clear)"),
      },
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true },
    },
    async (input) => {
      try {
        const updated = await mcpUpdateExam(input);
        return jsonResult({ exam: updated });
      } catch (err) {
        return errorResult(err);
      }
    }
  );

  // 6. batch_upsert_units (add/edit single or batch)
  server.registerTool(
    "batch_upsert_units",
    {
      title: "Create or Update Units (Single or Batch)",
      description:
        "Add new units or update existing units (when unitId is provided) in an exam, including optional Paper 1 / Paper 2 division.",
      inputSchema: {
        examId: z.string().describe("UUID of the target exam"),
        units: z
          .array(
            z.object({
              unitId: z.string().optional().describe("Provide unitId to edit an existing unit; omit to create new"),
              unitNumber: z.number().int().min(1).describe("Unit number (e.g. 1, 2, 3)"),
              title: z.string().min(1).describe("Unit title, e.g. 'Unit 1: British Poetry'"),
              paper: z.string().nullable().optional().describe("Optional paper division, e.g. 'Paper 1' or 'Paper 2'"),
              orderIndex: z.number().int().optional().describe("Optional sort index (defaults to unitNumber)"),
            })
          )
          .min(1)
          .max(50),
      },
      annotations: { readOnlyHint: false, destructiveHint: false },
    },
    async ({ examId, units }) => {
      try {
        const results = await mcpBatchUpsertUnits(examId, units);
        return jsonResult({ count: results.length, results });
      } catch (err) {
        return errorResult(err);
      }
    }
  );

  // 7. batch_upsert_topics (add/edit single or batch)
  server.registerTool(
    "batch_upsert_topics",
    {
      title: "Create or Update Topics (Single or Batch)",
      description:
        "Add new topics (sub-units) or update existing topics (when subUnitId is provided) under a unit, including prescribedTexts.",
      inputSchema: {
        unitId: z.string().describe("UUID of the parent unit"),
        topics: z
          .array(
            z.object({
              subUnitId: z.string().optional().describe("Provide subUnitId to edit an existing topic; omit to create new"),
              title: z.string().min(1).describe("Topic / Author title, e.g. 'William Shakespeare'"),
              prescribedTexts: z
                .array(z.string())
                .optional()
                .describe("Optional array of prescribed texts, e.g. ['Hamlet', 'Macbeth', 'King Lear']"),
              orderIndex: z.number().int().optional().describe("Optional sort order"),
            })
          )
          .min(1)
          .max(100),
      },
      annotations: { readOnlyHint: false, destructiveHint: false },
    },
    async ({ unitId, topics }) => {
      try {
        const results = await mcpBatchUpsertTopics(unitId, topics);
        return jsonResult({ count: results.length, results });
      } catch (err) {
        return errorResult(err);
      }
    }
  );

  // 8. ensure_syllabus_path (idempotent multi-level lookup/create)
  server.registerTool(
    "ensure_syllabus_path",
    {
      title: "Ensure Syllabus Path",
      description:
        "Idempotently resolve or create an Exam -> Unit -> Topic hierarchy by titles in a single call, merging any newly supplied prescribedTexts, and returning their UUIDs.",
      inputSchema: {
        examTitle: z.string().min(2).describe("Exact exam title to match or create"),
        examDescription: z.string().optional().describe("Description if the exam needs to be created"),
        paper: z.string().optional().describe("Optional paper division, e.g. 'Paper 2'"),
        unitNumber: z.number().int().min(1).optional().describe("Unit number if creating a new unit"),
        unitTitle: z.string().min(1).describe("Unit title to match or create"),
        topicTitle: z.string().min(1).describe("Topic title to match or create"),
        prescribedTexts: z
          .array(z.string())
          .optional()
          .describe("Prescribed texts to set or merge onto the topic"),
      },
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true },
    },
    async (input) => {
      try {
        const data = await mcpEnsureSyllabusPath(input);
        return jsonResult(data);
      } catch (err) {
        return errorResult(err);
      }
    }
  );

  // 9. add_questions (single or batch structured MCQ insertion)
  server.registerTool(
    "add_questions",
    {
      title: "Add Structured Questions (Single or Batch)",
      description:
        "Add 1 to 100 structured multiple-choice questions to a topic (subUnitId). Automatically skips duplicate stems when skipDuplicates=true (default).",
      inputSchema: {
        subUnitId: z.string().describe("UUID of the target topic (sub-unit)"),
        questions: z
          .array(
            z.object({
              stem: z.string().min(3).describe("Question prompt text"),
              options: z.object({
                A: z.string().min(1),
                B: z.string().min(1),
                C: z.string().min(1),
                D: z.string().min(1),
              }),
              correctOptionKey: z.enum(["A", "B", "C", "D"]),
              explanation: z.string().optional().describe("Optional explanation shown after answer / in Error Notebook"),
            })
          )
          .min(1)
          .max(100),
        skipDuplicates: z
          .boolean()
          .optional()
          .describe("Skip inserting a question if its normalized stem already exists in the topic (default true)"),
      },
      annotations: { readOnlyHint: false, destructiveHint: false },
    },
    async ({ subUnitId, questions, skipDuplicates }) => {
      try {
        const res = await mcpAddQuestions(subUnitId, questions, skipDuplicates ?? true);
        return jsonResult(res);
      } catch (err) {
        return errorResult(err);
      }
    }
  );

  // 10. import_questions_text (.txt block batch parser & importer)
  server.registerTool(
    "import_questions_text",
    {
      title: "Import Questions from Plain-Text Block",
      description:
        "Parse and import plain-text questions formatted with 'Q: ... A) ... B) ... C) ... D) ... Ans: A-D Explanation: ...' using MockExam Pro's built-in parser.",
      inputSchema: {
        subUnitId: z.string().describe("UUID of the target topic (sub-unit)"),
        rawText: z.string().min(10).describe("Plain-text question block following Q:/A)/B)/C)/D)/Ans:/Explanation: format"),
        skipDuplicates: z
          .boolean()
          .optional()
          .describe("Skip inserting questions whose stem already exists in the topic (default true)"),
      },
      annotations: { readOnlyHint: false, destructiveHint: false },
    },
    async ({ subUnitId, rawText, skipDuplicates }) => {
      try {
        const res = await mcpImportQuestionsText(subUnitId, rawText, skipDuplicates ?? true);
        return jsonResult(res);
      } catch (err) {
        return errorResult(err);
      }
    }
  );

  // 11. update_questions (single or batch question edit)
  server.registerTool(
    "update_questions",
    {
      title: "Update Existing Questions (Single or Batch)",
      description:
        "Edit 1 to 100 existing questions by questionId (fix stems, individual A/B/C/D options, correctOptionKey, or explanations). Note: Agents cannot delete questions.",
      inputSchema: {
        updates: z
          .array(
            z.object({
              questionId: z.string().describe("UUID of the question to edit"),
              stem: z.string().min(3).optional(),
              options: z
                .object({
                  A: z.string().min(1).optional(),
                  B: z.string().min(1).optional(),
                  C: z.string().min(1).optional(),
                  D: z.string().min(1).optional(),
                })
                .optional(),
              correctOptionKey: z.enum(["A", "B", "C", "D"]).optional(),
              explanation: z.string().nullable().optional(),
            })
          )
          .min(1)
          .max(100),
      },
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true },
    },
    async ({ updates }) => {
      try {
        const res = await mcpUpdateQuestions(updates);
        return jsonResult(res);
      } catch (err) {
        return errorResult(err);
      }
    }
  );

  return server;
}
