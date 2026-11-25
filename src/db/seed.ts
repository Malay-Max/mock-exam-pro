import { db } from "./index";
import { users, exams, units, subUnits, questions, options } from "./schema";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";

export async function seedDatabase() {
  console.log("🌱 Starting MockExam Pro database seeding...");

  // 1. Seed Users
  const adminPassword = await bcrypt.hash("adminpassword123", 10);
  const studentPassword = await bcrypt.hash("studentpassword123", 10);

  const [admin] = await db
    .insert(users)
    .values({
      email: "admin@mockexam.pro",
      passwordHash: adminPassword,
      fullName: "MockExam Admin",
      role: "admin",
    })
    .onConflictDoNothing()
    .returning();

  const [student] = await db
    .insert(users)
    .values({
      email: "student@mockexam.pro",
      passwordHash: studentPassword,
      fullName: "Aspirant Rahul",
      role: "student",
    })
    .onConflictDoNothing()
    .returning();

  // 2. Seed Exams
  const [exam1] = await db
    .insert(exams)
    .values({
      title: "UPESSC Assistant Professor (English)",
      slug: "upessc-assistant-professor-english",
      description: "Official syllabus aligned with Uttar Pradesh Higher Education Services Commission",
      isPublished: true,
    })
    .onConflictDoNothing()
    .returning();

  const [exam2] = await db
    .insert(exams)
    .values({
      title: "UGC-NET English Literature",
      slug: "ugc-net-english-literature",
      description: "Comprehensive national eligibility test syllabus for Assistant Professor & JRF",
      isPublished: true,
    })
    .onConflictDoNothing()
    .returning();

  const targetExam = exam1 || (await db.query.exams.findFirst({ where: eq(exams.slug, "upessc-assistant-professor-english") }));
  if (!targetExam) {
    console.log("Exam already exists or could not be created.");
    return;
  }

  // 3. Seed Units
  const unitData = [
    { unitNumber: 1, title: "Unit 1: British Poetry", orderIndex: 1 },
    { unitNumber: 2, title: "Unit 2: British Drama", orderIndex: 2 },
    { unitNumber: 3, title: "Unit 3: British Fiction", orderIndex: 3 },
    { unitNumber: 4, title: "Unit 4: Commonwealth & Postcolonial Literature", orderIndex: 4 },
  ];

  for (const u of unitData) {
    const [createdUnit] = await db
      .insert(units)
      .values({
        examId: targetExam.id,
        unitNumber: u.unitNumber,
        title: u.title,
        orderIndex: u.orderIndex,
      })
      .returning();

    if (u.unitNumber === 2) {
      // British Drama sub-units
      const subDrama = [
        "Christopher Marlowe",
        "William Shakespeare",
        "Ben Jonson",
        "John Webster",
        "George Bernard Shaw",
      ];
      for (let i = 0; i < subDrama.length; i++) {
        const [sub] = await db
          .insert(subUnits)
          .values({
            unitId: createdUnit.id,
            title: subDrama[i],
            orderIndex: i + 1,
          })
          .returning();

        // Add questions for Christopher Marlowe
        if (subDrama[i] === "Christopher Marlowe") {
          const qList = [
            {
              stem: "Which play by Christopher Marlowe introduces the tragic ambition of an astronomer-scholar who sells his soul for 24 years of forbidden knowledge?",
              correctKey: "A",
              explanation: "Doctor Faustus is Marlowe's masterpiece based on the German Faustbuch legend.",
              opts: [
                { key: "A", text: "Doctor Faustus" },
                { key: "B", text: "Tamburlaine the Great" },
                { key: "C", text: "The Jew of Malta" },
                { key: "D", text: "Edward II" },
              ],
            },
            {
              stem: "Who uttered the famous line: 'Was this the face that launch'd a thousand ships, / And burnt the topless towers of Ilium?'",
              correctKey: "C",
              explanation: "Faustus speaks these lines upon seeing the apparition of Helen of Troy in Doctor Faustus.",
              opts: [
                { key: "A", text: "Mephistophilis" },
                { key: "B", text: "Tamburlaine" },
                { key: "C", text: "Doctor Faustus" },
                { key: "D", text: "Barabas" },
              ],
            },
          ];

          for (const q of qList) {
            const [qRecord] = await db
              .insert(questions)
              .values({
                subUnitId: sub.id,
                stem: q.stem,
                correctOptionKey: q.correctKey,
                explanation: q.explanation,
              })
              .returning();

            for (const opt of q.opts) {
              await db.insert(options).values({
                questionId: qRecord.id,
                key: opt.key,
                text: opt.text,
              });
            }
          }
        }
      }
    } else if (u.unitNumber === 4) {
      // Postcolonial sub-units
      const subPost = [
        "Patrick White",
        "Chinua Achebe",
        "Wole Soyinka",
        "Margaret Atwood",
        "Derek Walcott",
      ];
      for (let i = 0; i < subPost.length; i++) {
        const [sub] = await db
          .insert(subUnits)
          .values({
            unitId: createdUnit.id,
            title: subPost[i],
            orderIndex: i + 1,
          })
          .returning();

        // Add questions for Patrick White
        if (subPost[i] === "Patrick White") {
          const pwQuestions = [
            {
              stem: "In what year was Patrick White awarded the Nobel Prize in Literature, becoming the first Australian author to receive this honour?",
              correctKey: "B",
              explanation: "Patrick White was awarded the Nobel Prize in Literature in 1973 for an epic and psychological narrative art.",
              opts: [
                { key: "A", text: "1968" },
                { key: "B", text: "1973" },
                { key: "C", text: "1979" },
                { key: "D", text: "1982" },
              ],
            },
            {
              stem: "Which prestigious Australian literary award did Patrick White win in its inaugural year (1957) for his novel 'Voss'?",
              correctKey: "B",
              explanation: "Patrick White won the inaugural Miles Franklin Literary Award in 1957 for Voss.",
              opts: [
                { key: "A", text: "The Stella Prize" },
                { key: "B", text: "The Miles Franklin Literary Award" },
                { key: "C", text: "The Prime Minister's Literary Award" },
                { key: "D", text: "The Victorian Premier's Literary Award" },
              ],
            },
            {
              stem: "Which real-life 19th-century German explorer, who vanished in the Australian interior in 1848, served as the historical starting point for 'Voss'?",
              correctKey: "A",
              explanation: "Ludwig Leichhardt's ill-fated 1848 expedition served as White's inspiration for Johann Ulrich Voss.",
              opts: [
                { key: "A", text: "Ludwig Leichhardt" },
                { key: "B", text: "Robert O'Hara Burke" },
                { key: "C", text: "William John Wills" },
                { key: "D", text: "Edward John Eyre" },
              ],
            },
            {
              stem: "What is the historical time setting of the expedition and narrative in Patrick White's 'Voss'?",
              correctKey: "B",
              explanation: "The novel is set primarily in colonial Australia during the 1840s, closing with a retrospective scene in Sydney in the 1860s.",
              opts: [
                { key: "A", text: "The gold rush era of the 1890s" },
                { key: "B", text: "Colonial Australia in the 1840s, with a retrospective conclusion in the 1860s" },
                { key: "C", text: "The arrival of the First Fleet in 1788" },
                { key: "D", text: "The federation era around 1901" },
              ],
            },
          ];

          for (const q of pwQuestions) {
            const [qRecord] = await db
              .insert(questions)
              .values({
                subUnitId: sub.id,
                stem: q.stem,
                correctOptionKey: q.correctKey,
                explanation: q.explanation,
              })
              .returning();

            for (const opt of q.opts) {
              await db.insert(options).values({
                questionId: qRecord.id,
                key: opt.key,
                text: opt.text,
              });
            }
          }
        }
      }
    } else {
      // General sub-units
      const subSample = ["Core Overview", "Major Works", "Critical Perspectives"];
      for (let i = 0; i < subSample.length; i++) {
        await db.insert(subUnits).values({
          unitId: createdUnit.id,
          title: subSample[i],
          orderIndex: i + 1,
        });
      }
    }
  }

  console.log("✅ MockExam Pro database seeding complete!");
}

if (require.main === module) {
  seedDatabase()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error("❌ Seeding error:", err);
      process.exit(1);
    });
}
