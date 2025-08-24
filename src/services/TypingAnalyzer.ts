import { TypingSession, TypingStats, ErrorFound } from "../models/TypingModel";
import { levenshteinDistance } from "./components/stringUtils";
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

    const keypressAnalysis = analyzeKeypressAccuracy(keystrokes, targetText);

    const totalChars = userInput.length;
    const correctChars = calculateCorrectChars(keystrokes);
    const errorCount = levenshteinDistance(targetText, userInput);

    const accuracy = keypressAnalysis.accuracy;

    const timeInMinutes = Math.max(
      0.01,
      (endTime.getTime() - startTime.getTime()) / 60000
    );
    const wpm = calculateWPM(correctChars, timeInMinutes);
    const grossWPM = calculateGrossWPM(totalChars, timeInMinutes);

    const consistencyScore = calculateConsistencyScore(keystrokes);

    const errorPatterns = analyzeErrorPatterns(
      targetText,
      userInput,
      keystrokes
    );

    return {
      wpm,
      grossWPM,
      accuracy: Math.round(accuracy * 100) / 100,
      errorCount,
      correctChars,
      totalChars,
      consistencyScore,
      errorPatterns,
    };
  }
}
