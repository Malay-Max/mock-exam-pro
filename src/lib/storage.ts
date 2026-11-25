import { ParsedQuestion } from "./parser";
import { ExamWithHierarchy, UnitWithSubUnits, SubUnitWithStats } from "@/app/actions/syllabus";
import { ErrorItem } from "@/app/actions/notebook";
import { QuestionData } from "@/store/useAppStore";

export interface StoredExam {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  units: StoredUnit[];
}

export interface StoredUnit {
  id: string;
  unitNumber: number;
  title: string;
  paper?: string | null;
  orderIndex: number;
  subUnits: StoredSubUnit[];
}

export interface StoredSubUnit {
  id: string;
  title: string;
  orderIndex: number;
  isCompleted: boolean;
  prescribedTexts?: string[];
  questions: StoredQuestion[];
}

export interface StoredQuestion {
  id: string;
  stem: string;
  correctOptionKey: "A" | "B" | "C" | "D";
  explanation?: string;
  options: { id: string; key: "A" | "B" | "C" | "D"; text: string }[];
}

// Global In-Memory Store for Local Development without requiring a live PostgreSQL instance
class LocalStore {
  private exams: StoredExam[] = [
    {
      id: "exam-upessc-1",
      title: "UPESSC Assistant Professor (English)",
      slug: "upessc-assistant-professor-english",
      description: "Official syllabus aligned with Uttar Pradesh Higher Education Services Commission",
      units: [
        {
          id: "u-gs-1",
          unitNumber: 1,
          paper: "Paper 1",
          title: "Unit 1: General Studies & Research Aptitude",
          orderIndex: 1,
          subUnits: [
            {
              id: "s-gs-101",
              title: "Teaching & Research Methodology",
              orderIndex: 1,
              isCompleted: true,
              prescribedTexts: ["Methods of Teaching", "Research Ethics & Methodology"],
              questions: [],
            },
            {
              id: "s-gs-102",
              title: "Higher Education System & Governance",
              orderIndex: 2,
              isCompleted: false,
              prescribedTexts: ["National Education Policy (NEP 2020)", "UGC Quality Mandate"],
              questions: [],
            },
          ],
        },
        {
          id: "u-1",
          unitNumber: 1,
          paper: "Paper 2",
          title: "Unit 1: British Poetry",
          orderIndex: 2,
          subUnits: [
            {
              id: "s-101",
              title: "Geoffrey Chaucer",
              orderIndex: 1,
              isCompleted: true,
              prescribedTexts: ["The Canterbury Tales (General Prologue)"],
              questions: [
                {
                  id: "q-gc-1",
                  stem: "In Chaucer's The Canterbury Tales, which pilgrim tells the very first tale?",
                  correctOptionKey: "A",
                  explanation: "The Knight draws the shortest straw and begins the tale-telling journey with a courtly romance.",
                  options: [
                    { id: "opt-1", key: "A", text: "The Knight" },
                    { id: "opt-2", key: "B", text: "The Miller" },
                    { id: "opt-3", key: "C", text: "The Wife of Bath" },
                    { id: "opt-4", key: "D", text: "The Pardoner" },
                  ],
                },
                {
                  id: "q-gc-2",
                  stem: "The General Prologue of The Canterbury Tales opens in which month?",
                  correctOptionKey: "C",
                  explanation: "'Whan that Aprill with his shoures soote' famously marks the month of April.",
                  options: [
                    { id: "opt-5", key: "A", text: "March" },
                    { id: "opt-6", key: "B", text: "May" },
                    { id: "opt-7", key: "C", text: "April" },
                    { id: "opt-8", key: "D", text: "June" },
                  ],
                },
              ],
            },
            {
              id: "s-102",
              title: "John Milton",
              orderIndex: 2,
              isCompleted: true,
              prescribedTexts: ["Paradise Lost (Book I & II)"],
              questions: [
                {
                  id: "q-jm-1",
                  stem: "In Paradise Lost, what is Milton's stated primary objective in Book I?",
                  correctOptionKey: "B",
                  explanation: "Milton seeks to 'assert Eternal Providence, / And justify the ways of God to men.'",
                  options: [
                    { id: "opt-9", key: "A", text: "To condemn Satan to eternal fire" },
                    { id: "opt-10", key: "B", text: "To justify the ways of God to men" },
                    { id: "opt-11", key: "C", text: "To re-tell the story of creation" },
                    { id: "opt-12", key: "D", text: "To warn against political tyranny" },
                  ],
                },
              ],
            },
            {
              id: "s-103",
              title: "Alexander Pope",
              orderIndex: 3,
              isCompleted: false,
              prescribedTexts: ["The Rape of the Lock", "An Essay on Criticism"],
              questions: [],
            },
            {
              id: "s-104",
              title: "William Wordsworth",
              orderIndex: 4,
              isCompleted: false,
              prescribedTexts: ["The Prelude (Book I)", "Tintern Abbey"],
              questions: [],
            },
          ],
        },
        {
          id: "u-2",
          unitNumber: 2,
          paper: "Paper 2",
          title: "Unit 2: British Drama",
          orderIndex: 3,
          subUnits: [
            {
              id: "s-201",
              title: "Christopher Marlowe",
              orderIndex: 1,
              isCompleted: true,
              prescribedTexts: ["Doctor Faustus", "Tamburlaine the Great"],
              questions: [
                {
                  id: "q-cm-1",
                  stem: "Which play by Christopher Marlowe introduces the tragic ambition of an astronomer-scholar who sells his soul for 24 years of forbidden knowledge?",
                  correctOptionKey: "A",
                  explanation: "Doctor Faustus is Marlowe's tragedy based on the German Faust legend.",
                  options: [
                    { id: "opt-13", key: "A", text: "Doctor Faustus" },
                    { id: "opt-14", key: "B", text: "Tamburlaine the Great" },
                    { id: "opt-15", key: "C", text: "The Jew of Malta" },
                    { id: "opt-16", key: "D", text: "Edward II" },
                  ],
                },
                {
                  id: "q-cm-2",
                  stem: "Who uttered the famous line: 'Was this the face that launch'd a thousand ships, / And burnt the topless towers of Ilium?'",
                  correctOptionKey: "C",
                  explanation: "Doctor Faustus speaks these lines upon seeing the vision of Helen of Troy.",
                  options: [
                    { id: "opt-17", key: "A", text: "Mephistophilis" },
                    { id: "opt-18", key: "B", text: "Tamburlaine" },
                    { id: "opt-19", key: "C", text: "Doctor Faustus" },
                    { id: "opt-20", key: "D", text: "Barabas" },
                  ],
                },
              ],
            },
            {
              id: "s-202",
              title: "William Shakespeare",
              orderIndex: 2,
              isCompleted: false,
              prescribedTexts: ["Hamlet", "Macbeth", "King Lear", "The Tempest"],
              questions: [
                {
                  id: "q-ws-1",
                  stem: "In Hamlet, who speaks the memorable line: 'Neither a borrower nor a lender be; For loan oft loses both itself and friend'?",
                  correctOptionKey: "B",
                  explanation: "Polonius offers this advice to his son Laertes prior to his departure for France.",
                  options: [
                    { id: "opt-21", key: "A", text: "Claudius" },
                    { id: "opt-22", key: "B", text: "Polonius" },
                    { id: "opt-23", key: "C", text: "Horatio" },
                    { id: "opt-24", key: "D", text: "Hamlet" },
                  ],
                },
              ],
            },
            {
              id: "s-203",
              title: "Ben Jonson",
              orderIndex: 3,
              isCompleted: false,
              prescribedTexts: ["Volpone", "The Alchemist"],
              questions: [],
            },
          ],
        },
        {
          id: "u-4",
          unitNumber: 3,
          paper: "Paper 2",
          title: "Unit 3: Commonwealth & Postcolonial Literature",
          orderIndex: 4,
          subUnits: [
            {
              id: "s-401",
              title: "Patrick White",
              orderIndex: 1,
              isCompleted: true,
              prescribedTexts: ["Voss", "Riders in the Chariot"],
              questions: [
                {
                  id: "q-pw-1",
                  stem: "In what year was Patrick White awarded the Nobel Prize in Literature, becoming the first Australian author to receive this honour?",
                  correctOptionKey: "B",
                  explanation: "Patrick White was awarded the Nobel Prize in Literature in 1973 for an epic and psychological narrative art.",
                  options: [
                    { id: "opt-25", key: "A", text: "1968" },
                    { id: "opt-26", key: "B", text: "1973" },
                    { id: "opt-27", key: "C", text: "1979" },
                    { id: "opt-28", key: "D", text: "1982" },
                  ],
                },
                {
                  id: "q-pw-2",
                  stem: "Which prestigious Australian literary award did Patrick White win in its inaugural year (1957) for his novel 'Voss'?",
                  correctOptionKey: "B",
                  explanation: "Patrick White won the inaugural Miles Franklin Award in 1957.",
                  options: [
                    { id: "opt-29", key: "A", text: "The Stella Prize" },
                    { id: "opt-30", key: "B", text: "The Miles Franklin Literary Award" },
                    { id: "opt-31", key: "C", text: "The Prime Minister's Literary Award" },
                    { id: "opt-32", key: "D", text: "The Victorian Premier's Literary Award" },
                  ],
                },
                {
                  id: "q-pw-3",
                  stem: "Which real-life 19th-century German explorer, who vanished in the Australian interior in 1848, served as the historical starting point for 'Voss'?",
                  correctOptionKey: "A",
                  explanation: "Ludwig Leichhardt's ill-fated 1848 expedition served as White's inspiration for Johann Ulrich Voss.",
                  options: [
                    { id: "opt-33", key: "A", text: "Ludwig Leichhardt" },
                    { id: "opt-34", key: "B", text: "Robert O'Hara Burke" },
                    { id: "opt-35", key: "C", text: "William John Wills" },
                    { id: "opt-36", key: "D", text: "Edward John Eyre" },
                  ],
                },
                {
                  id: "q-pw-4",
                  stem: "What is the historical time setting of the expedition and narrative in Patrick White's 'Voss'?",
                  correctOptionKey: "B",
                  explanation: "The novel is set primarily in colonial Australia during the 1840s, closing with a retrospective scene in Sydney in the 1860s.",
                  options: [
                    { id: "opt-37", key: "A", text: "The gold rush era of the 1890s" },
                    { id: "opt-38", key: "B", text: "Colonial Australia in the 1840s, with a retrospective conclusion in the 1860s" },
                    { id: "opt-39", key: "C", text: "The arrival of the First Fleet in 1788" },
                    { id: "opt-40", key: "D", text: "The federation era around 1901" },
                  ],
                },
              ],
            },
          ],
        },
      ],
    },
    {
      id: "exam-ugcnet-2",
      title: "UGC-NET English Literature",
      slug: "ugc-net-english-literature",
      description: "Comprehensive national eligibility test syllabus for Assistant Professor & JRF",
      units: [
        {
          id: "u-net-1",
          unitNumber: 1,
          paper: "Paper 1",
          title: "Unit 1: Teaching & Research Aptitude",
          orderIndex: 1,
          subUnits: [
            { id: "s-net-101", title: "Teaching Aptitude & Pedagogy", orderIndex: 1, isCompleted: false, prescribedTexts: ["Cognitive Learning Theories", "Evaluation Systems in Higher Education"], questions: [] },
            { id: "s-net-102", title: "Research Aptitude & Data Analysis", orderIndex: 2, isCompleted: false, prescribedTexts: ["Qualitative & Quantitative Methods", "Thesis & Article Writing"], questions: [] },
          ],
        },
        {
          id: "u-net-2",
          unitNumber: 1,
          paper: "Paper 2",
          title: "Unit 1: Drama",
          orderIndex: 2,
          subUnits: [
            { id: "s-net-201", title: "Classical & Elizabethan Drama", orderIndex: 1, isCompleted: false, prescribedTexts: ["Oedipus Rex", "Doctor Faustus", "Hamlet"], questions: [] },
            { id: "s-net-202", title: "Modern & Absurd Drama", orderIndex: 2, isCompleted: false, prescribedTexts: ["Waiting for Godot", "Look Back in Anger"], questions: [] },
          ],
        },
      ],
    },
  ];

  private errorNotebook: ErrorItem[] = [
    {
      id: "err-1",
      questionId: "q-pw-3",
      stem: "Which real-life 19th-century German explorer, who vanished in the Australian interior in 1848, served as the historical starting point for 'Voss'?",
      explanation: "Ludwig Leichhardt's ill-fated 1848 expedition served as White's inspiration for Johann Ulrich Voss.",
      correctOptionKey: "A",
      options: [
        { key: "A", text: "Ludwig Leichhardt" },
        { key: "B", text: "Robert O'Hara Burke" },
        { key: "C", text: "William John Wills" },
        { key: "D", text: "Edward John Eyre" },
      ],
      subUnitTitle: "Patrick White",
      unitTitle: "Unit 4: Commonwealth & Postcolonial Literature",
      status: "review",
      consecutiveCorrect: 0,
      intervalDays: 1,
      nextReviewAt: new Date(),
      lastAttemptedAt: new Date(),
    },
  ];

  // Exams
  getExams() {
    return this.exams.map((e) => ({
      id: e.id,
      title: e.title,
      slug: e.slug,
      description: e.description,
    }));
  }

  getExamHierarchy(examId: string): ExamWithHierarchy | null {
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(examId);
    const exam = isUuid
      ? this.exams.find((e) => e.id === examId) || null
      : this.exams.find((e) => e.id === examId) || this.exams[0];
    if (!exam) return null;

    let totalQuestions = 0;
    let totalSubUnits = 0;
    let totalCompleted = 0;

    const formattedUnits: UnitWithSubUnits[] = exam.units.map((unit) => {
      let unitQCount = 0;
      let unitDoneCount = 0;

      const subUnits: SubUnitWithStats[] = unit.subUnits.map((sub) => {
        const qCount = sub.questions.length;
        unitQCount += qCount;
        totalQuestions += qCount;
        totalSubUnits += 1;
        if (sub.isCompleted) {
          unitDoneCount += 1;
          totalCompleted += 1;
        }

        return {
          id: sub.id,
          title: sub.title,
          orderIndex: sub.orderIndex,
          questionCount: qCount,
          isCompleted: sub.isCompleted,
          prescribedTexts: sub.prescribedTexts || [],
        };
      });

      return {
        id: unit.id,
        unitNumber: unit.unitNumber,
        title: unit.title,
        orderIndex: unit.orderIndex,
        paper: unit.paper || null,
        subUnits,
        totalQuestions: unitQCount,
        completedSubUnitsCount: unitDoneCount,
      };
    });

    const masteryPercentage = totalSubUnits > 0 ? Math.round((totalCompleted / totalSubUnits) * 100) : 0;

    const papers = Array.from(
      new Set(
        formattedUnits
          .map((u) => u.paper)
          .filter((p): p is string => Boolean(p && p.trim().length > 0))
      )
    );

    return {
      id: exam.id,
      title: exam.title,
      slug: exam.slug,
      description: exam.description,
      units: formattedUnits,
      papers,
      totalQuestions,
      totalSubUnits,
      totalCompletedSubUnits: totalCompleted,
      masteryPercentage,
    };
  }

  createExam(title: string, slug: string, description?: string) {
    const newExam: StoredExam = {
      id: `exam-${Date.now()}`,
      title,
      slug,
      description: description || null,
      units: [
        {
          id: `u-${Date.now()}`,
          unitNumber: 1,
          paper: "Paper 1",
          title: "Unit 1: Overview & Foundation",
          orderIndex: 1,
          subUnits: [
            {
              id: `sub-${Date.now()}`,
              title: "General Topics",
              orderIndex: 1,
              isCompleted: false,
              prescribedTexts: [],
              questions: [],
            },
          ],
        },
      ],
    };
    this.exams.unshift(newExam);
    return newExam;
  }

  createUnit(examId: string, unitNumber: number, title: string, paper?: string) {
    const exam = this.exams.find((e) => e.id === examId);
    if (!exam) return null;

    const newUnit: StoredUnit = {
      id: `unit-${Date.now()}`,
      unitNumber,
      title,
      paper: paper?.trim() || null,
      orderIndex: unitNumber,
      subUnits: [
        {
          id: `sub-${Date.now()}`,
          title: "Core Topics",
          orderIndex: 1,
          isCompleted: false,
          prescribedTexts: [],
          questions: [],
        },
      ],
    };
    exam.units.push(newUnit);
    return newUnit;
  }

  createSubUnit(unitId: string, title: string, prescribedTexts?: string[]) {
    for (const exam of this.exams) {
      for (const unit of exam.units) {
        if (unit.id === unitId) {
          const newSub: StoredSubUnit = {
            id: `sub-${Date.now()}`,
            title,
            orderIndex: unit.subUnits.length + 1,
            isCompleted: false,
            prescribedTexts: prescribedTexts || [],
            questions: [],
          };
          unit.subUnits.push(newSub);
          return newSub;
        }
      }
    }
    return null;
  }

  updateExam(examId: string, title: string, description?: string) {
    const exam = this.exams.find((e) => e.id === examId);
    if (!exam) return null;
    exam.title = title;
    if (description !== undefined) exam.description = description;
    return exam;
  }

  deleteExam(examId: string) {
    const idx = this.exams.findIndex((e) => e.id === examId);
    if (idx !== -1) {
      this.exams.splice(idx, 1);
      return true;
    }
    return false;
  }

  updateUnit(unitId: string, title: string, unitNumber?: number, paper?: string | null) {
    for (const exam of this.exams) {
      const unit = exam.units.find((u) => u.id === unitId);
      if (unit) {
        unit.title = title;
        if (unitNumber !== undefined) {
          unit.unitNumber = unitNumber;
          unit.orderIndex = unitNumber;
        }
        if (paper !== undefined) {
          unit.paper = paper ? paper.trim() : null;
        }
        return unit;
      }
    }
    return null;
  }

  deleteUnit(unitId: string) {
    for (const exam of this.exams) {
      const idx = exam.units.findIndex((u) => u.id === unitId);
      if (idx !== -1) {
        exam.units.splice(idx, 1);
        return true;
      }
    }
    return false;
  }

  updateSubUnit(subUnitId: string, title: string, prescribedTexts?: string[]) {
    for (const exam of this.exams) {
      for (const unit of exam.units) {
        const sub = unit.subUnits.find((s) => s.id === subUnitId);
        if (sub) {
          sub.title = title;
          if (prescribedTexts !== undefined) {
            sub.prescribedTexts = prescribedTexts;
          }
          return sub;
        }
      }
    }
    return null;
  }

  deleteSubUnit(subUnitId: string) {
    for (const exam of this.exams) {
      for (const unit of exam.units) {
        const idx = unit.subUnits.findIndex((s) => s.id === subUnitId);
        if (idx !== -1) {
          unit.subUnits.splice(idx, 1);
          return true;
        }
      }
    }
    return false;
  }

  toggleSubUnitDone(subUnitId: string, isCompleted: boolean) {
    for (const exam of this.exams) {
      for (const unit of exam.units) {
        for (const sub of unit.subUnits) {
          if (sub.id === subUnitId) {
            sub.isCompleted = isCompleted;
            return true;
          }
        }
      }
    }
    return false;
  }

  batchImportQuestions(subUnitId: string, parsedQuestions: ParsedQuestion[]) {
    let count = 0;
    for (const exam of this.exams) {
      for (const unit of exam.units) {
        for (const sub of unit.subUnits) {
          if (sub.id === subUnitId) {
            for (const pq of parsedQuestions) {
              if (pq.errors && pq.errors.length > 0) continue;
              const newQ: StoredQuestion = {
                id: `q-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
                stem: pq.stem,
                correctOptionKey: pq.correctOptionKey,
                explanation: pq.explanation,
                options: pq.options.map((opt, oIdx) => ({
                  id: `opt-${Date.now()}-${oIdx}`,
                  key: opt.key,
                  text: opt.text,
                })),
              };
              sub.questions.push(newQ);
              count += 1;
            }
            return count;
          }
        }
      }
    }
    return count;
  }

  getQuestionsForSubUnits(subUnitIds: string[], limit: number = 50): QuestionData[] {
    const list: QuestionData[] = [];
    for (const exam of this.exams) {
      for (const unit of exam.units) {
        for (const sub of unit.subUnits) {
          if (subUnitIds.includes(sub.id)) {
            for (const q of sub.questions) {
              list.push({
                id: q.id,
                subUnitId: sub.id,
                subUnitTitle: sub.title,
                unitTitle: unit.title,
                stem: q.stem,
                explanation: q.explanation,
                correctOptionKey: q.correctOptionKey,
                options: q.options,
              });
            }
          }
        }
      }
    }
    return list.sort(() => Math.random() - 0.5).slice(0, limit);
  }

  findQuestionById(questionId: string): QuestionData | null {
    for (const exam of this.exams) {
      for (const unit of exam.units) {
        for (const sub of unit.subUnits) {
          const q = sub.questions.find((item) => item.id === questionId);
          if (q) {
            return {
              id: q.id,
              subUnitId: sub.id,
              subUnitTitle: sub.title,
              unitTitle: unit.title,
              stem: q.stem,
              explanation: q.explanation,
              correctOptionKey: q.correctOptionKey,
              options: q.options,
            };
          }
        }
      }
    }
    return null;
  }

  recordExamMistakes(missedQuestions: QuestionData[]) {
    for (const q of missedQuestions) {
      let actualQ = q;
      if (!actualQ.stem || actualQ.stem === "Question stem" || !actualQ.options || actualQ.options.length === 0) {
        const found = this.findQuestionById(q.id);
        if (found) {
          actualQ = found;
        }
      }

      const existing = this.errorNotebook.find((e) => e.questionId === actualQ.id);
      if (existing) {
        existing.status = "review";
        existing.consecutiveCorrect = 0;
        existing.intervalDays = 1;
        existing.nextReviewAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
        existing.lastAttemptedAt = new Date();
      } else {
        this.errorNotebook.unshift({
          id: `err-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
          questionId: actualQ.id,
          stem: actualQ.stem || "Question",
          explanation: actualQ.explanation || null,
          correctOptionKey: actualQ.correctOptionKey,
          options:
            actualQ.options && actualQ.options.length > 0
              ? actualQ.options.map((opt) => ({ key: opt.key, text: opt.text }))
              : [
                  { key: "A", text: "Option A" },
                  { key: "B", text: "Option B" },
                  { key: "C", text: "Option C" },
                  { key: "D", text: "Option D" },
                ],
          subUnitTitle: actualQ.subUnitTitle || "Topic",
          unitTitle: actualQ.unitTitle || "Unit",
          status: "review",
          consecutiveCorrect: 0,
          intervalDays: 1,
          nextReviewAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
          lastAttemptedAt: new Date(),
        });
      }
    }
  }

  getErrorNotebook() {
    let masteredCount = 0;
    let dueCount = 0;
    const now = new Date();

    for (const item of this.errorNotebook) {
      if (item.status === "mastered") masteredCount += 1;
      if (item.status !== "mastered" && new Date(item.nextReviewAt) <= now) dueCount += 1;
    }

    const resolutionRate =
      this.errorNotebook.length > 0 ? Math.round((masteredCount / this.errorNotebook.length) * 100) : 0;

    return {
      items: this.errorNotebook,
      resolutionRate,
      totalErrors: this.errorNotebook.length,
      masteredCount,
      dueCount,
    };
  }

  attemptErrorItem(errorId: string, isCorrect: boolean) {
    const item = this.errorNotebook.find((e) => e.id === errorId);
    if (!item) return null;

    let newConsecutive = isCorrect ? item.consecutiveCorrect + 1 : 0;
    let newInterval = item.intervalDays;
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

    item.consecutiveCorrect = newConsecutive;
    item.intervalDays = newInterval;
    item.status = newStatus;
    item.nextReviewAt = new Date(Date.now() + newInterval * 24 * 60 * 60 * 1000);
    item.lastAttemptedAt = new Date();

    return {
      status: newStatus,
      consecutiveCorrect: newConsecutive,
      intervalDays: newInterval,
    };
  }
}

// Global singleton instance with prototype & method synchronization across hot reloads
const globalForStore = globalThis as unknown as { localStore: LocalStore };

let storeInstance: LocalStore;

if (globalForStore.localStore) {
  storeInstance = globalForStore.localStore;
  Object.setPrototypeOf(storeInstance, LocalStore.prototype);
  // Ensure all prototype methods exist directly on storeInstance to prevent stale HMR closures
  for (const name of Object.getOwnPropertyNames(LocalStore.prototype)) {
    if (name !== "constructor") {
      const fn = (LocalStore.prototype as any)[name];
      if (typeof fn === "function") {
        (storeInstance as any)[name] = fn.bind(storeInstance);
      }
    }
  }
} else {
  storeInstance = new LocalStore();
}

export const localStore = storeInstance;
if (process.env.NODE_ENV !== "production") {
  globalForStore.localStore = storeInstance;
}
