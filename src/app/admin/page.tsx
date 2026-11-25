import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getExams, getExamSyllabus, ExamWithHierarchy } from "@/app/actions/syllabus";
import { AdminClient } from "@/components/admin/AdminClient";

const fallbackExamsList: ExamWithHierarchy[] = [
  {
    id: "exam-upessc-1",
    title: "UPESSC Assistant Professor (English)",
    slug: "upessc-assistant-professor-english",
    description: "Official syllabus aligned with Uttar Pradesh Higher Education Services Commission",
    totalQuestions: 18,
    totalSubUnits: 15,
    totalCompletedSubUnits: 5,
    masteryPercentage: 33,
    units: [
      {
        id: "u-1",
        unitNumber: 1,
        title: "Unit 1: British Poetry",
        orderIndex: 1,
        totalQuestions: 4,
        completedSubUnitsCount: 2,
        subUnits: [
          { id: "s-101", title: "Geoffrey Chaucer", orderIndex: 1, questionCount: 2, isCompleted: true },
          { id: "s-102", title: "John Milton", orderIndex: 2, questionCount: 2, isCompleted: true },
          { id: "s-103", title: "Alexander Pope", orderIndex: 3, questionCount: 0, isCompleted: false },
        ],
      },
      {
        id: "u-2",
        unitNumber: 2,
        title: "Unit 2: British Drama",
        orderIndex: 2,
        totalQuestions: 6,
        completedSubUnitsCount: 1,
        subUnits: [
          { id: "s-201", title: "Christopher Marlowe", orderIndex: 1, questionCount: 3, isCompleted: true },
          { id: "s-202", title: "William Shakespeare", orderIndex: 2, questionCount: 3, isCompleted: false },
          { id: "s-203", title: "Ben Jonson", orderIndex: 3, questionCount: 0, isCompleted: false },
        ],
      },
      {
        id: "u-4",
        unitNumber: 4,
        title: "Unit 4: Commonwealth & Postcolonial Literature",
        orderIndex: 4,
        totalQuestions: 8,
        completedSubUnitsCount: 2,
        subUnits: [
          { id: "s-401", title: "Patrick White", orderIndex: 1, questionCount: 4, isCompleted: true },
          { id: "s-402", title: "Chinua Achebe", orderIndex: 2, questionCount: 2, isCompleted: true },
        ],
      },
    ],
  },
];

export default async function AdminPage() {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }

  let examsList = fallbackExamsList;

  try {
    const listRes = await getExams();
    if (listRes.success && listRes.exams.length > 0) {
      const fullExams: ExamWithHierarchy[] = [];
      for (const ex of listRes.exams) {
        const hRes = await getExamSyllabus(ex.id, session.user.id);
        if (hRes.success && hRes.exam) {
          fullExams.push(hRes.exam);
        }
      }
      if (fullExams.length > 0) {
        examsList = fullExams;
      }
    }
  } catch (err) {
    console.warn("Using fallback admin data:", err);
  }

  return <AdminClient exams={examsList} />;
}
