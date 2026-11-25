export interface ParsedOption {
  key: "A" | "B" | "C" | "D";
  text: string;
}

export interface ParsedQuestion {
  stem: string;
  options: ParsedOption[];
  correctOptionKey: "A" | "B" | "C" | "D";
  explanation?: string;
  rawText?: string;
  lineNumber?: number;
  errors?: string[];
}

export interface ParseResult {
  questions: ParsedQuestion[];
  totalParsed: number;
  validCount: number;
  invalidCount: number;
  elapsedMs: number;
}

/**
 * Universal High-Throughput Plain-Text Question Parser
 * Supports:
 * - Stems: "Q: ...", "Q. ...", "1. ...", "Question 1: ..." with multi-line stems
 * - Options: "A) ...", "(A) ...", "A. ...", "(a) ..."
 * - Answer: "Ans: B", "Ans: (B)", "Answer: B", "ANS : B"
 * - Explanation: "Explanation: ...", "Exp: ...", or multi-line explanation until next Q
 */
export function parseQuestionText(text: string): ParseResult {
  const startTime = performance.now();
  const questions: ParsedQuestion[] = [];

  if (!text || text.trim() === "") {
    return {
      questions: [],
      totalParsed: 0,
      validCount: 0,
      invalidCount: 0,
      elapsedMs: 0,
    };
  }

  // Normalize line endings
  const normalized = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  const rawLines = normalized.split("\n");

  // Group into question blocks based on question start marker
  // Markers: Q:, Q., Question \d+:, \d+\., \d+\)
  const questionStartRegex = /^(?:Q\s*[:.]|Question\s*\d*\s*[:.]|\d{1,4}\s*[.)]\s+)(.*)$/i;
  
  // Or fallback: any block separated by double newlines where options A-D exist
  interface Block {
    startLine: number;
    lines: string[];
  }

  const blocks: Block[] = [];
  let currentBlock: Block | null = null;

  for (let i = 0; i < rawLines.length; i++) {
    const line = rawLines[i];
    const trimmed = line.trim();

    // Check if line indicates a new question start
    const isExplicitQStart = questionStartRegex.test(trimmed);

    if (isExplicitQStart) {
      if (currentBlock && currentBlock.lines.length > 0) {
        blocks.push(currentBlock);
      }
      currentBlock = {
        startLine: i + 1,
        lines: [line],
      };
    } else {
      if (currentBlock) {
        currentBlock.lines.push(line);
      } else if (trimmed.length > 0) {
        // Start block if we encounter text before explicit marker
        currentBlock = {
          startLine: i + 1,
          lines: [line],
        };
      }
    }
  }

  if (currentBlock && currentBlock.lines.length > 0) {
    blocks.push(currentBlock);
  }

  // Process each block into a ParsedQuestion
  for (const block of blocks) {
    const parsed = parseSingleBlock(block.lines, block.startLine);
    if (parsed) {
      questions.push(parsed);
    }
  }

  const validCount = questions.filter((q) => !q.errors || q.errors.length === 0).length;
  const invalidCount = questions.length - validCount;
  const elapsedMs = Math.round((performance.now() - startTime) * 100) / 100;

  return {
    questions,
    totalParsed: questions.length,
    validCount,
    invalidCount,
    elapsedMs,
  };
}

function parseSingleBlock(lines: string[], startLine: number): ParsedQuestion | null {
  const blockText = lines.join("\n").trim();
  if (!blockText) return null;

  const errors: string[] = [];
  let stem = "";
  const optionsMap = new Map<"A" | "B" | "C" | "D", string>();
  let correctOptionKey: "A" | "B" | "C" | "D" | null = null;
  let explanation = "";

  // Regular expressions for options & answer
  // Requires explicit delimiter: 'A)', '(A)', 'A.', 'A:' (never bare whitespace)
  const optionRegex = /^\s*(?:\(([A-Da-d])\)|([A-Da-d])\s*[).:\-])\s*(.*)$/;
  const answerRegex = /^(?:Ans(?:wer)?\s*[:.：=]\s*|\(?Ans\)?\s*[:.：=]?\s*)\(?\s*([A-Da-d])\s*\)?(.*)$/i;
  const explanationRegex = /^(?:Explanation|Exp|Rationale|Note)\s*[:.：=]\s*(.*)$/i;

  let state: "stem" | "options" | "explanation" = "stem";
  const stemLines: string[] = [];
  const explanationLines: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i];
    const line = rawLine.trim();
    if (!line) continue;

    // Check for Answer Line
    const ansMatch = line.match(answerRegex);
    if (ansMatch) {
      correctOptionKey = ansMatch[1].toUpperCase() as "A" | "B" | "C" | "D";
      if (ansMatch[2] && ansMatch[2].trim()) {
        const remaining = ansMatch[2].trim();
        // Check if explanation is attached to answer line
        const inlineExpMatch = remaining.match(/^(?:Explanation|Exp|Rationale)?\s*[:.：=]?\s*(.*)$/i);
        if (inlineExpMatch && inlineExpMatch[1]) {
          explanationLines.push(inlineExpMatch[1].trim());
          state = "explanation";
        }
      }
      continue;
    }

    // Check for Explanation Line
    const expMatch = line.match(explanationRegex);
    if (expMatch) {
      state = "explanation";
      if (expMatch[1]) {
        explanationLines.push(expMatch[1].trim());
      }
      continue;
    }

    if (state === "explanation") {
      explanationLines.push(line);
      continue;
    }

    // Check for Option Line (e.g. "A) 1968" or "A. 1968" or "(A) 1968")
    const optMatch = line.match(optionRegex);
    if (optMatch) {
      state = "options";
      const key = (optMatch[1] || optMatch[2]).toUpperCase() as "A" | "B" | "C" | "D";
      let text = optMatch[3].trim();

      // Check if another option is inline on the same line (e.g., "(a) Option 1 (b) Option 2" or "A) Opt 1 B) Opt 2")
      // Delimiter MUST be explicit: "(B)" or "B)" with closing parenthesis
      const inlineMatches = [...text.matchAll(/\s+(?:\(([B-Db-d])\)|([B-Db-d])\))\s+/g)];
      if (inlineMatches.length > 0) {
        let lastPos = 0;
        let currentKey = key;

        for (const m of inlineMatches) {
          const matchIndex = m.index!;
          const chunk = text.substring(lastPos, matchIndex).trim();
          optionsMap.set(currentKey, chunk);

          currentKey = (m[1] || m[2]).toUpperCase() as "A" | "B" | "C" | "D";
          lastPos = matchIndex + m[0].length;
        }

        const remainingChunk = text.substring(lastPos).trim();
        optionsMap.set(currentKey, remainingChunk);
      } else {
        optionsMap.set(key, text);
      }
      continue;
    }

    if (state === "stem") {
      // Clean leading "Q:", "Q.", "1." from first line
      if (stemLines.length === 0) {
        const cleanStem = line.replace(/^(?:Q\s*[:.]|Question\s*\d*\s*[:.]|\d{1,4}\s*[.)]\s*)/i, "").trim();
        stemLines.push(cleanStem || line);
      } else {
        stemLines.push(line);
      }
    } else if (state === "options") {
      // If we are in options state and line doesn't match an option prefix,
      // it could be a continuation of the previous option
      const lastKey = Array.from(optionsMap.keys()).pop();
      if (lastKey) {
        optionsMap.set(lastKey, `${optionsMap.get(lastKey)} ${line}`);
      }
    }
  }

  stem = stemLines.join(" ").trim();
  explanation = explanationLines.join(" ").trim();

  // Validate Stem
  if (!stem) {
    errors.push("Missing question stem text.");
  }

  // Validate Options
  const requiredKeys: ("A" | "B" | "C" | "D")[] = ["A", "B", "C", "D"];
  const formattedOptions: ParsedOption[] = [];

  for (const k of requiredKeys) {
    const optText = optionsMap.get(k);
    if (!optText) {
      errors.push(`Missing option ${k}.`);
    } else {
      formattedOptions.push({ key: k, text: optText });
    }
  }

  // Validate Correct Answer Key
  if (!correctOptionKey) {
    errors.push("Missing correct answer key (e.g. 'Ans: B').");
  } else if (!requiredKeys.includes(correctOptionKey)) {
    errors.push(`Invalid answer key '${correctOptionKey}'. Must be A, B, C, or D.`);
  }

  return {
    stem,
    options: formattedOptions,
    correctOptionKey: correctOptionKey || "A",
    explanation: explanation || undefined,
    rawText: blockText,
    lineNumber: startLine,
    errors: errors.length > 0 ? errors : undefined,
  };
}
