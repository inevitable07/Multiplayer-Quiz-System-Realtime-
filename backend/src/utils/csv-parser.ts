/**
 * CSV Question Parser
 * Parses CSV files with structure: question, option1, option2, option3, option4, answer
 */

export interface ParsedQuestion {
  question: string;
  options: Array<{ label: string; text: string }>;
  correctAnswer: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

/**
 * Validate Parsed Questions
 * Ensures all questions meet format requirements
 * 
 * @param questions - Array of parsed questions
 * @returns Validation result with errors if any
 */
export function validateQuestions(questions: ParsedQuestion[]): ValidationResult {
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
    const uniqueOptions = new Set(q.options.map(o => o.text));
    if (uniqueOptions.size !== 4) {
      errors.push(`Question ${i + 1}: Options must be unique`);
    }

    // Check if answer is valid for the options
    const answerIndex = q.correctAnswer.charCodeAt(0) - 65; // A=0, B=1, C=2, D=3
    if (answerIndex >= q.options.length) {
      errors.push(
        `Question ${i + 1}: Answer ${q.correctAnswer} is outside valid options range`
      );
    }
  }

  return { valid: errors.length === 0, errors };
}


/**
 * Parse CSV Buffer into Questions
 * 
 * Expected CSV Format:
 * question,option1,option2,option3,option4,answer
 * "What is 2+2?","2","3","4","5","C"
 * 
 * @param buffer - File buffer containing CSV data
 * @returns Array of parsed questions
 */
export async function parseCsvFile(buffer: Buffer): Promise<ParsedQuestion[]> {
  try {
    const text = buffer.toString("utf-8");

    console.log("=== CSV Parsing Debug ===");
    console.log("Total text length:", text.length);
    console.log("First 500 chars:", text.substring(0, 500));

    // Split by newlines and filter empty lines
    const lines = text
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line.length > 0);

    console.log("Total lines:", lines.length);

    if (lines.length < 2) {
      console.error("❌ CSV file appears empty or has only headers");
      return [];
    }

    // Check for header row (skip if present)
    const headerLine = lines[0].toLowerCase();
    const hasHeader =
      headerLine.includes("question") || headerLine.includes("option");
    const dataLines = hasHeader ? lines.slice(1) : lines;

    console.log("Data lines to parse:", dataLines.length);

    const questions: ParsedQuestion[] = [];
    let failedCount = 0;

    for (let i = 0; i < dataLines.length; i++) {
      const parsed = parseQuestionLine(dataLines[i], i + 1);

      if (parsed) {
        questions.push(parsed);
        console.log(
          `✅ Q${i + 1} parsed: "${parsed.question.substring(0, 50)}..." Answer: ${parsed.correctAnswer}`
        );
      } else {
        failedCount++;
        console.log(`❌ Q${i + 1} failed to parse`);
        console.log("Line content:", dataLines[i].substring(0, 300));
      }
    }

    console.log(`\nTotal questions parsed: ${questions.length}`);
    console.log(`Failed to parse: ${failedCount}`);
    console.log("===========================\n");

    return questions;
  } catch (error) {
    console.error("Error parsing CSV file:", error);
    throw new Error("Failed to parse CSV file");
  }
}

/**
 * Parse Single CSV Line into Question
 * Handles CSV quoting and escaping properly
 * 
 * @param line - Single CSV line
 * @param lineNumber - Line number for debugging
 * @returns ParsedQuestion or null if invalid
 */
function parseQuestionLine(line: string, lineNumber: number): ParsedQuestion | null {
  try {
    // Parse CSV line handling quotes and commas properly
    const fields = parseCSVLine(line);

    console.log(`\n📝 Parsing line ${lineNumber}: ${fields.length} fields`);

    // Expected: question(0), option1(1), option2(2), option3(3), option4(4), answer(5)
    if (fields.length < 6) {
      console.error(
        `❌ Not enough fields: ${fields.length} (expected 6). Line: ${line.substring(0, 100)}`
      );
      return null;
    }

    const question = fields[0]?.trim();
    const option1 = fields[1]?.trim();
    const option2 = fields[2]?.trim();
    const option3 = fields[3]?.trim();
    const option4 = fields[4]?.trim();
    const answerLetter = fields[5]?.trim().toUpperCase();

    // Validation
    if (!question || question.length < 3) {
      console.error("❌ Question too short or missing");
      return null;
    }

    if (!option1 || !option2 || !option3 || !option4) {
      console.error("❌ Missing option text");
      return null;
    }

    if (!["A", "B", "C", "D"].includes(answerLetter)) {
      console.error(`❌ Invalid answer letter: ${answerLetter}`);
      return null;
    }

    return {
      question,
      options: [
        { label: "A", text: option1 },
        { label: "B", text: option2 },
        { label: "C", text: option3 },
        { label: "D", text: option4 },
      ],
      correctAnswer: answerLetter,
    };
  } catch (error) {
    console.error(`❌ Error parsing line ${lineNumber}:`, error);
    return null;
  }
}

/**
 * Parse CSV Line Handling Quotes and Escapes
 * Properly handles quoted fields with commas inside
 * 
 * Example:
 * "Question with, comma","Option A","Option B","Option C","Option D","A"
 * 
 * @param line - CSV line to parse
 * @returns Array of field values
 */
function parseCSVLine(line: string): string[] {
  const fields: string[] = [];
  let currentField = "";
  let insideQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    const nextChar = line[i + 1];

    if (char === '"') {
      if (insideQuotes && nextChar === '"') {
        // Escaped quote: ""
        currentField += '"';
        i++; // Skip next quote
      } else {
        // Toggle quote state
        insideQuotes = !insideQuotes;
      }
    } else if (char === "," && !insideQuotes) {
      // Field separator (only if not in quotes)
      fields.push(currentField.trim());
      currentField = "";
    } else {
      currentField += char;
    }
  }

  // Add last field
  if (currentField || fields.length > 0) {
    fields.push(currentField.trim());
  }

  return fields;
}
