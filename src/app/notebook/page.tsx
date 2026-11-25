import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getErrorNotebookItems, ErrorItem } from "@/app/actions/notebook";
import { NotebookClient } from "@/components/notebook/NotebookClient";

export default async function NotebookPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  let items: ErrorItem[] = [];
  let resolutionRate = 0;
  let totalErrors = 0;
  let masteredCount = 0;
  let dueCount = 0;

  try {
    const res = await getErrorNotebookItems(session.user.id);
    if (res.success) {
      items = res.items;
      resolutionRate = res.resolutionRate;
      totalErrors = res.totalErrors;
      masteredCount = res.masteredCount;
      dueCount = res.dueCount;
    }
  } catch (err) {
    console.warn("Failed to load error notebook items:", err);
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
