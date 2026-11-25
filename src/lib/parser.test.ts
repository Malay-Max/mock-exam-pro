import { parseQuestionText } from "./parser";

const sampleInput = `
Q: In what year was Patrick White awarded the Nobel Prize in Literature, becoming the first Australian author to receive this honour?
A) 1968
B) 1973
C) 1979
D) 1982
Ans: B
Explanation: Patrick White was awarded the Nobel Prize in 1973.

Q: Which prestigious Australian literary award did Patrick White win in its inaugural year (1957) for his novel 'Voss'?
A) The Stella Prize
B) The Miles Franklin Literary Award
C) The Prime Minister's Literary Award
D) The Victorian Premier's Literary Award
Ans: B
Explanation: Patrick White won the inaugural Miles Franklin Award.

Q: Which real-life 19th-century German explorer, who vanished in the Australian interior in 1848, served as the historical starting point for 'Voss'?
A) Ludwig Leichhardt
B) Robert O'Hara Burke
C) William John Wills
D) Edward John Eyre
Ans: A

Q: What is the historical time setting of the expedition and narrative in Patrick White's 'Voss'?
A) The gold rush era of the 1890s
B) Colonial Australia in the 1840s, with a retrospective conclusion in the 1860s
C) The arrival of the First Fleet in 1788
D) The federation era around 1901
Ans: B
`;

function runTests() {
  console.log("🧪 Testing Question Parser...");

  // Test 1: User's sample questions
  const res = parseQuestionText(sampleInput);
  console.log(`Parsed ${res.questions.length} questions in ${res.elapsedMs}ms`);
  console.log(`Valid: ${res.validCount}, Invalid: ${res.invalidCount}`);

  if (res.questions.length !== 4) {
    throw new Error(`Expected 4 questions, got ${res.questions.length}`);
  }
  if (res.validCount !== 4) {
    throw new Error(`Expected all 4 questions to be valid, but had errors: ${JSON.stringify(res.questions.map(q => q.errors))}`);
  }

  // Validate Q1
  const q1 = res.questions[0];
  if (q1.correctOptionKey !== "B") throw new Error("Q1 correct option should be B");
  if (q1.options.length !== 4) throw new Error("Q1 options length should be 4");
  if (!q1.explanation?.includes("1973")) throw new Error("Q1 explanation missing 1973");

  // Validate Q3 (no explanation provided)
  const q3 = res.questions[2];
  if (q3.correctOptionKey !== "A") throw new Error("Q3 correct option should be A");

  // Validate Q4 Option B long text with 'with a retrospective'
  const q4 = res.questions[3];
  const q4OptB = q4.options.find(o => o.key === "B");
  console.log("Q4 Option B:", q4OptB?.text);
  if (!q4OptB?.text.includes("retrospective conclusion")) {
    throw new Error(`Q4 Option B was cut off! Got: ${q4OptB?.text}`);
  }

  console.log("✅ Basic format tests passed!");

  // Test 2: KPI Benchmark: 500 questions throughput < 1.5s (1500ms)
  const repeated = Array(125).fill(sampleInput).join("\n\n"); // 125 * 4 = 500 questions
  const benchRes = parseQuestionText(repeated);
  console.log(`⚡ KPI Benchmark: Parsed ${benchRes.totalParsed} questions in ${benchRes.elapsedMs}ms`);

  if (benchRes.totalParsed !== 500) {
    throw new Error(`Expected 500 questions in benchmark, got ${benchRes.totalParsed}`);
  }
  if (benchRes.elapsedMs > 1500) {
    throw new Error(`Benchmark failed: took ${benchRes.elapsedMs}ms, exceeded 1500ms target`);
  }

  console.log(`🚀 KPI TARGET EXCEEDED: 500 Qs parsed in ${benchRes.elapsedMs}ms (target was < 1500ms)`);
}

runTests();
