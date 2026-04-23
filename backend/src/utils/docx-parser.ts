import mammoth from "mammoth";

/**
 * Question parsed from DOCX
 */
export interface ParsedQuestion {
  question: string;
  options: string[];
  correctAnswer: string;
}

/**
 * Parse DOCX file and extract questions
 * Expected format:
 * Q1. Question text?
 * A. Option A
 * B. Option B
 * C. Option C
 * D. Option D
 * Answer: A
 *
 * Q2. ...
 */
export async function parseDocxFile(buffer: Buffer): Promise<ParsedQuestion[]> {
  try {
    // Extract text from DOCX using mammoth
    const result = await mammoth.extractRawText({ buffer });
    let text = result.value;

    console.log("=== DOCX Parsing Debug ===");
    console.log("Total text length:", text.length);
    console.log("First 500 chars:", text.substring(0, 500));

    // Split by "Q" followed by digits and period to identify questions
    // This regex matches: newline (or start of string) + optional spaces + Q + digits + period + space
    const questionBlocksWithoutFirstQ = text.split(/(?:^|\n)\s*Q\d+\.\s+/);
    
    console.log("Raw blocks from split:", questionBlocksWithoutFirstQ.length);
    console.log("First block (should be empty or prefix):", questionBlocksWithoutFirstQ[0].substring(0, 100));

    // If first block is empty or just whitespace, remove it
    if (questionBlocksWithoutFirstQ[0].trim() === "") {
      questionBlocksWithoutFirstQ.shift();
    }

    // Find all Q numbers to add back to questions
    const qMatches = text.match(/(?:^|\n)\s*Q(\d+)\.\s+/g);
    const questionNumbers = qMatches ? qMatches.map(m => parseInt(m.match(/\d+/)?.[0] || "0")) : [];
    
    console.log("Question numbers found:", questionNumbers);
    console.log("Total blocks after processing:", questionBlocksWithoutFirstQ.length);

    const questions: ParsedQuestion[] = [];

    for (let blockIndex = 0; blockIndex < questionBlocksWithoutFirstQ.length; blockIndex++) {
      const qNum = questionNumbers[blockIndex] || (blockIndex + 1);
      const parsed = parseQuestionBlock(questionBlocksWithoutFirstQ[blockIndex], qNum);
      if (parsed) {
        questions.push(parsed);
        console.log(`✅ Q${qNum} parsed successfully`);
      } else {
        console.log(`❌ Q${qNum} failed to parse`);
        console.log("Block content preview:", questionBlocksWithoutFirstQ[blockIndex].substring(0, 300));
      }
    }

    console.log("Total questions parsed:", questions.length);
    console.log("=========================");

    return questions;
  } catch (error) {
    console.error("Error parsing DOCX file:", error);
    throw new Error("Failed to parse DOCX file");
  }
}

/**
 * Parse individual question block
 */
function parseQuestionBlock(block: string, questionNumber: number): ParsedQuestion | null {
  try {
    const lines = block
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line.length > 0);

    console.log(`Q${questionNumber} lines:`, lines.length);
    console.log(`Q${questionNumber} sample lines:`, lines.slice(0, 7));

    if (lines.length < 6) {
      // Min: Q text + 4 options + Answer
      console.log(`Q${questionNumber} - Not enough lines (${lines.length} < 6)`);
      return null;
    }

    // First line is the question text
    const question = lines[0];

    if (!question || question.length < 3) {
      console.log(`Q${questionNumber} - Invalid question text`);
      return null;
    }

    // Extract options (A, B, C, D)
    const options: string[] = [];
    let answerLine = -1;

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i];

      // Check if it's an option (e.g., "A. Option text")
      if (/^[A-D]\.\s+/.test(line)) {
        const optionText = line.replace(/^[A-D]\.\s+/, "").trim();
        options.push(optionText);
      }

      // Check if it's the answer line (more lenient regex)
      // Matches "Answer: A", "answer: a", "Answer:A", etc.
      if (/^Answer:\s*[A-D]$/i.test(line)) {
        answerLine = i;
        break;
      }
    }

    // Validate we have exactly 4 options
    if (options.length !== 4) {
      console.log(`Q${questionNumber} - Wrong option count: ${options.length}`);
      console.log(`Q${questionNumber} options found:`, options);
      return null;
    }

    // Extract the correct answer
    if (answerLine === -1) {
      console.log(`Q${questionNumber} - No answer line found`);
      return null;
    }

    const answerMatch = lines[answerLine].match(/Answer:\s*([A-D])/i);
    if (!answerMatch) {
      console.log(`Q${questionNumber} - Failed to extract answer letter`);
      return null;
    }

    const correctAnswer = answerMatch[1].toUpperCase();

    console.log(
      `Q${questionNumber} ✅ Parsed: "${question.substring(0, 50)}..." Answer: ${correctAnswer}`
    );

    return {
      question: question.trim(),
      options,
      correctAnswer,
    };
  } catch (error) {
    console.error(`Q${questionNumber} - Parse error:`, error);
    return null;
  }
}

/**
 * Validate parsed questions
 */
export function validateQuestions(questions: ParsedQuestion[]): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (questions.length === 0) {
    errors.push("No valid questions found in the file");
    return { valid: false, errors };
  }

  for (let i = 0; i < questions.length; i++) {
    const q = questions[i];

    if (!q.question || q.question.length < 3) {
      errors.push(`Question ${i + 1}: Question text is too short`);
    }

    if (q.options.length !== 4) {
      errors.push(
        `Question ${i + 1}: Must have exactly 4 options, found ${q.options.length}`
      );
    }

    if (!["A", "B", "C", "D"].includes(q.correctAnswer)) {
      errors.push(`Question ${i + 1}: Invalid correct answer: ${q.correctAnswer}`);
    }

    // Check for duplicate options
    const uniqueOptions = new Set(q.options);
    if (uniqueOptions.size !== 4) {
      errors.push(`Question ${i + 1}: Options must be unique`);
    }

    // Check if answer is valid for the options
    const answerIndex = q.correctAnswer.charCodeAt(0) - 65; // A=0, B=1, C=2, D=3
    if (answerIndex >= q.options.length) {
      errors.push(
        `Question ${i + 1}: Answer ${q.correctAnswer} doesn't exist in options`
      );
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
