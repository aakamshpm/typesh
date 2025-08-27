import { TypingSession, TypingStats } from "../models/TypingModel";
import { levenshteinDistance } from "./components/stringUtils";
import { calculateWPM, calculateGrossWPM } from "./components/wpmCalculator";
import {
  analyzeKeypressAccuracy,
  calculateCharacterStats,
  calculateCorrectWords,
  countAllTypedCharacters,
} from "./components/calculations";
import { calculateConsistencyScore } from "./components/consistencyAnalyzer";
import { analyzeErrorPatterns } from "./components/errorAnalyzer";

export class TypingAnalyzer {
  public static analyzeSession(session: TypingSession): TypingStats {
    const { keystrokes, targetText, userInput, startTime, endTime } = session;

    const keypressAnalysis = analyzeKeypressAccuracy(keystrokes, targetText);

    const errorCount = levenshteinDistance(targetText, userInput);

    const accuracy = keypressAnalysis.accuracy;

    const timeInMinutes = Math.max(
      0.01,
      (endTime!.getTime() - startTime!.getTime()) / 60000
    );

    const correctWords = calculateCorrectWords(targetText, userInput);
    const wpm = calculateWPM(correctWords, timeInMinutes);

    const allTypedChars = countAllTypedCharacters(keystrokes);
    const grossWPM = calculateGrossWPM(allTypedChars, timeInMinutes);

    const consistencyScore = calculateConsistencyScore(keystrokes);

    const errorPatterns = analyzeErrorPatterns(
      targetText,
      userInput,
      keystrokes
    );

    const characterStats = calculateCharacterStats(targetText, userInput);

    return {
      wpm,
      grossWPM,
      accuracy: Math.round(accuracy * 100) / 100,
      errorCount,
      consistencyScore,
      errorPatterns,
      characterStats,
    };
  }
}
