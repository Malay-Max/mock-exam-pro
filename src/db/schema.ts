import { pgTable, text, timestamp, boolean, integer, real, uuid, pgEnum } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

export const userRoleEnum = pgEnum("user_role", ["admin", "student"]);
export const sessionTypeEnum = pgEnum("session_type", ["timed_exam", "instant_quiz"]);
export const srsStatusEnum = pgEnum("srs_status", ["review", "learning", "mastered"]);

// --- Users & Auth ---
export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  fullName: text("full_name").notNull(),
  role: userRoleEnum("role").default("student").notNull(),
  targetExamId: uuid("target_exam_id"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// --- Syllabus Hierarchy ---
export const exams = pgTable("exams", {
  id: uuid("id").defaultRandom().primaryKey(),
  title: text("title").notNull(),
  slug: text("slug").notNull().unique(),
  description: text("description"),
  isPublished: boolean("is_published").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const units = pgTable("units", {
  id: uuid("id").defaultRandom().primaryKey(),
  examId: uuid("exam_id").references(() => exams.id, { onDelete: "cascade" }).notNull(),
  unitNumber: integer("unit_number").notNull(),
  title: text("title").notNull(),
  paper: text("paper"), // e.g. "Paper 1", "Paper 2"
  orderIndex: integer("order_index").default(0).notNull(),
});

export const subUnits = pgTable("sub_units", {
  id: uuid("id").defaultRandom().primaryKey(),
  unitId: uuid("unit_id").references(() => units.id, { onDelete: "cascade" }).notNull(),
  title: text("title").notNull(),
  prescribedTexts: text("prescribed_texts"), // JSON or comma-separated string of texts
  orderIndex: integer("order_index").default(0).notNull(),
});

// --- Questions & Options ---
export const questions = pgTable("questions", {
  id: uuid("id").defaultRandom().primaryKey(),
  subUnitId: uuid("sub_unit_id").references(() => subUnits.id, { onDelete: "cascade" }).notNull(),
  stem: text("stem").notNull(),
  explanation: text("explanation"),
  correctOptionKey: text("correct_option_key").notNull(), // 'A' | 'B' | 'C' | 'D'
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const options = pgTable("options", {
  id: uuid("id").defaultRandom().primaryKey(),
  questionId: uuid("question_id").references(() => questions.id, { onDelete: "cascade" }).notNull(),
  key: text("key").notNull(), // 'A', 'B', 'C', 'D'
  text: text("text").notNull(),
});

// --- Decoupled Syllabus Study Tracking ---
export const userSyllabusProgress = pgTable("user_syllabus_progress", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  subUnitId: uuid("sub_unit_id").references(() => subUnits.id, { onDelete: "cascade" }).notNull(),
  isCompleted: boolean("is_completed").default(false).notNull(),
  completedAt: timestamp("completed_at"),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// --- Exam Sessions & Marking (+1 / -0.33) ---
export const examSessions = pgTable("exam_sessions", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  sessionType: sessionTypeEnum("session_type").notNull(),
  totalQuestions: integer("total_questions").notNull(),
  correctCount: integer("correct_count").default(0).notNull(),
  incorrectCount: integer("incorrect_count").default(0).notNull(),
  unattemptedCount: integer("unattempted_count").default(0).notNull(),
  score: real("score").default(0.0).notNull(), // (correct * 1.0) - (incorrect * 0.33)
  durationSeconds: integer("duration_seconds").notNull(),
  timeSpentSeconds: integer("time_spent_seconds").default(0).notNull(),
  isCompleted: boolean("is_completed").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const examResponses = pgTable("exam_responses", {
  id: uuid("id").defaultRandom().primaryKey(),
  sessionId: uuid("session_id").references(() => examSessions.id, { onDelete: "cascade" }).notNull(),
  questionId: uuid("question_id").references(() => questions.id, { onDelete: "cascade" }).notNull(),
  selectedOptionKey: text("selected_option_key"), // null if unattempted
  isCorrect: boolean("is_correct"),
  isMarkedForReview: boolean("is_marked_for_review").default(false).notNull(),
  timeSpentSeconds: integer("time_spent_seconds").default(0).notNull(),
});

// --- Spaced Repetition (SRS) Error Notebook ---
export const errorNotebook = pgTable("error_notebook", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  questionId: uuid("question_id").references(() => questions.id, { onDelete: "cascade" }).notNull(),
  status: srsStatusEnum("status").default("review").notNull(),
  consecutiveCorrect: integer("consecutive_correct").default(0).notNull(),
  easeFactor: real("ease_factor").default(2.5).notNull(),
  intervalDays: integer("interval_days").default(1).notNull(),
  nextReviewAt: timestamp("next_review_at").defaultNow().notNull(),
  lastAttemptedAt: timestamp("last_attempted_at").defaultNow().notNull(),
});

// --- Drizzle Relations ---
export const examsRelations = relations(exams, ({ many }) => ({
  units: many(units),
}));

export const unitsRelations = relations(units, ({ one, many }) => ({
  exam: one(exams, {
    fields: [units.examId],
    references: [exams.id],
  }),
  subUnits: many(subUnits),
}));

export const subUnitsRelations = relations(subUnits, ({ one, many }) => ({
  unit: one(units, {
    fields: [subUnits.unitId],
    references: [units.id],
  }),
  questions: many(questions),
  progress: many(userSyllabusProgress),
}));

export const questionsRelations = relations(questions, ({ one, many }) => ({
  subUnit: one(subUnits, {
    fields: [questions.subUnitId],
    references: [subUnits.id],
  }),
  options: many(options),
  responses: many(examResponses),
  errorEntries: many(errorNotebook),
}));

export const optionsRelations = relations(options, ({ one }) => ({
  question: one(questions, {
    fields: [options.questionId],
    references: [questions.id],
  }),
}));

export const examSessionsRelations = relations(examSessions, ({ one, many }) => ({
  user: one(users, {
    fields: [examSessions.userId],
    references: [users.id],
  }),
  responses: many(examResponses),
}));

export const examResponsesRelations = relations(examResponses, ({ one }) => ({
  session: one(examSessions, {
    fields: [examResponses.sessionId],
    references: [examSessions.id],
  }),
  question: one(questions, {
    fields: [examResponses.questionId],
    references: [questions.id],
  }),
}));

export const errorNotebookRelations = relations(errorNotebook, ({ one }) => ({
  user: one(users, {
    fields: [errorNotebook.userId],
    references: [users.id],
  }),
  question: one(questions, {
    fields: [errorNotebook.questionId],
    references: [questions.id],
  }),
}));

export const userSyllabusProgressRelations = relations(userSyllabusProgress, ({ one }) => ({
  user: one(users, {
    fields: [userSyllabusProgress.userId],
    references: [users.id],
  }),
  subUnit: one(subUnits, {
    fields: [userSyllabusProgress.subUnitId],
    references: [subUnits.id],
  }),
}));
