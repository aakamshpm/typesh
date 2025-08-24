import { TypingSession, TypingStats, ErrorFound } from "../models/TypingModel";
import {
  levenshteinDistance,
  findAlignedErrors,
} from "./components/stringUtils";
import { calculateWPM, calculateGrossWPM } from "./components/wpmCalculator";
import {
  calculateCorrectChars,
  analyzeKeypressAccuracy,
} from "./components/accuracyCalculator";
import {
  calculateConsistencyScore,
  calculatePureRhythmConsistency,
  calculateHesitationPenalty,
  calculatePausePenalty,
} from "./components/consistencyAnalyzer";
import { analyzeErrorPatterns } from "./components/errorAnalyzer";

export class TypingAnalyzer {
  public static analyzeSession(session: TypingSession): TypingStats {
    const { keystrokes, targetText, userInput, startTime, endTime } = session;

    const totalChars = userInput.length;
    const correctChars = calculateCorrectChars(keystrokes);
    const errorCount = levenshteinDistance(targetText, userInput);

    const accuracy = analyzeKeypressAccuracy(keystrokes);

    const timeInMinutes = Math.max(
      0.01,
      (endTime.getTime() - startTime.getTime()) / 60000
    );
    const wpm = calculateWPM(correctChars, timeInMinutes);
    const grossWPM = calculateGrossWPM(totalChars, timeInMinutes);

    const consistencyScore = calculateConsistencyScore(keystrokes);

    const errors: ErrorFound[] = findAlignedErrors(targetText, userInput);
    const errorPatternsResult = analyzeErrorPatterns(errors);

    return {
      wpm,
      grossWPM,
      accuracy,
      errorCount,
      correctChars,
      totalChars,
      consistencyScore,
      errorPatterns: [],
    };
  }
}
