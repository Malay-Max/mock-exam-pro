import { getExams, getExamSyllabus, ExamWithHierarchy } from "@/app/actions/syllabus";
import { SyllabusHubClient } from "@/components/syllabus/SyllabusHubClient";
import { LandingPage } from "@/components/landing/LandingPage";
import { auth } from "@/auth";

// Fallback seed data if database is not connected during initial cold boot
const fallbackExams: { id: string; title: string; slug: string; description: string | null }[] = [
  {
    id: "exam-upessc-1",
    title: "UPESSC Assistant Professor (English)",
    slug: "upessc-assistant-professor-english",
    description: "Official syllabus aligned with Uttar Pradesh Higher Education Services Commission",
  },
  {
    id: "exam-ugcnet-2",
    title: "UGC-NET English Literature",
    slug: "ugc-net-english-literature",
    description: "Comprehensive national eligibility test syllabus for Assistant Professor & JRF",
  },
];

const fallbackHierarchy: ExamWithHierarchy = {
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
        { id: "s-104", title: "William Wordsworth", orderIndex: 4, questionCount: 0, isCompleted: false },
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
        { id: "s-204", title: "John Webster", orderIndex: 4, questionCount: 0, isCompleted: false },
        { id: "s-205", title: "George Bernard Shaw", orderIndex: 5, questionCount: 0, isCompleted: false },
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
        { id: "s-403", title: "Wole Soyinka", orderIndex: 3, questionCount: 2, isCompleted: false },
        { id: "s-404", title: "Margaret Atwood", orderIndex: 4, questionCount: 0, isCompleted: false },
      ],
    },
  ],
};

export default async function HomePage() {
  const session = await auth();
  if (!session?.user) {
    return <LandingPage />;
  }

  let examList = fallbackExams;
  let activeHierarchy = fallbackHierarchy;

  try {
    const examsResult = await getExams();
    if (examsResult.success && examsResult.exams.length > 0) {
      examList = examsResult.exams.map((e) => ({
        id: e.id,
        title: e.title,
        slug: e.slug,
        description: e.description,
      }));

      const hierarchyResult = await getExamSyllabus(examList[0].id, session.user.id);
      if (hierarchyResult.success && hierarchyResult.exam) {
        activeHierarchy = hierarchyResult.exam;
      }
    }
  } catch (err) {
    console.warn("Using fallback hierarchy data:", err);
  }

  return (
    <SyllabusHubClient
      initialExams={examList}
      initialExamHierarchy={activeHierarchy}
    />
  );
}
