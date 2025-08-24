import { ErrorFound, ErrorPattern, Keystroke } from "../../models/TypingModel";
import { findAlignedErrors } from "./stringUtils";

export function analyzeErrorPatterns(
  targetText: string,
  inputText: string,
  keystrokes: Keystroke[]
): ErrorPattern[] {
  if (!targetText || !inputText) {
    return [];
  }

  const alignedErrors = findAlignedErrors(targetText, inputText);

  const errorMap = new Map<
    string,
    {
      frequency: number;
      positions: number[];
      mistakes: Set<string>;
      errorType: "substitution" | "deletion" | "insertion";
    }
  >();

  alignedErrors.forEach((error: ErrorFound) => {
    const key = error.expectedChar || "_MISSING_";

    if (!errorMap.has(key)) {
      errorMap.set(key, {
        frequency: 0,
        positions: [],
        mistakes: new Set(),
        errorType: error.type,
      });
    }

    const errorData = errorMap.get(key)!;
    errorData.frequency++;
    errorData.positions.push(error.position);
    errorData.mistakes.add(error.actualChar || "_DELETED_");
  });

  return Array.from(errorMap.entries())
    .map(([character, data]) => ({
      character: character === "_MISSING_" ? "" : character,
      frequency: data.frequency,
      positions: data.positions,
      commonMistakes: Array.from(data.mistakes),
      errorType: data.errorType,
    }))
    .sort((a, b) => b.frequency - a.frequency)
    .slice(0, 10);
}
