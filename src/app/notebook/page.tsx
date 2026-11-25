import { getErrorNotebookItems, ErrorItem } from "@/app/actions/notebook";
import { NotebookClient } from "@/components/notebook/NotebookClient";

const fallbackErrors: ErrorItem[] = [
  {
    id: "err-1",
    questionId: "q-pw-1",
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
  {
    id: "err-2",
    questionId: "q-cm-1",
    stem: "Who uttered the famous line: 'Was this the face that launch'd a thousand ships, / And burnt the topless towers of Ilium?'",
    explanation: "Doctor Faustus speaks these lines upon seeing the vision of Helen of Troy in Christopher Marlowe's tragedy.",
    correctOptionKey: "C",
    options: [
      { key: "A", text: "Mephistophilis" },
      { key: "B", text: "Tamburlaine" },
      { key: "C", text: "Doctor Faustus" },
      { key: "D", text: "Barabas" },
    ],
    subUnitTitle: "Christopher Marlowe",
    unitTitle: "Unit 2: British Drama",
    status: "learning",
    consecutiveCorrect: 1,
    intervalDays: 3,
    nextReviewAt: new Date(Date.now() + 48 * 60 * 60 * 1000),
    lastAttemptedAt: new Date(),
  },
];

export default async function NotebookPage() {
  let items = fallbackErrors;
  let resolutionRate = 50;
  let totalErrors = 2;
  let masteredCount = 0;
  let dueCount = 1;

  try {
    const res = await getErrorNotebookItems();
    if (res.success && res.items.length > 0) {
      items = res.items;
      resolutionRate = res.resolutionRate;
      totalErrors = res.totalErrors;
      masteredCount = res.masteredCount;
      dueCount = res.dueCount;
    }
  } catch (err) {
    console.warn("Using fallback error items:", err);
  }

  return (
    <NotebookClient
      initialItems={items}
      resolutionRate={resolutionRate}
      totalErrors={totalErrors}
      masteredCount={masteredCount}
      dueCount={dueCount}
    />
  );
}
