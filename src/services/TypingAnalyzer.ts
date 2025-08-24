import {
  ErrorPattern,
  Keystroke,
  TypingSession,
  TypingStats,
} from "../models/TypingModel";

export class TypingAnalyzer {
  public static analyzeSession(session: TypingSession): TypingStats {
    const { keystrokes, targetText, userInput, startTime, endTime } = session;

    const totalChars = userInput.length;
    const correctChars = this.calculateCorrectChars(targetText, userInput);
    const errorCount = this.levenshteinDistance(targetText, userInput);
    const accuracy = totalChars > 0 ? (correctChars / totalChars) * 100 : 0;

    const timeInMinutes = (endTime.getTime() - startTime.getTime()) / 60000;
    const wpm = this.calculateWPM(correctChars, timeInMinutes);
    const grossWPM = this.calculateGrossWPM(totalChars, timeInMinutes);

    const consistencyScore = this.calculateConsistencyScore(keystrokes);
    const errorPatterns = this.analyzeErrorPatterns(
      targetText,
      userInput,
      keystrokes
    );

    return {
      wpm,
      grossWPM, // <-- Add this new field
      accuracy: Math.round(accuracy * 100) / 100,
      errorCount,
      correctChars,
      totalChars,
      consistencyScore,
      errorPatterns,
    };
  }

  private static calculateCorrectChars(target: string, input: string): number {
    const editDistance = this.levenshteinDistance(target, input);

    const correctedChars = Math.max(0, target.length - editDistance);
    return correctedChars;
  }

  private static levenshteinDistance(target: string, input: string): number {
    const targetLen = target.length;
    const inputLen = input.length;

    // Create a matrix
    const matrix = Array(targetLen + 1)
      .fill(null)
      .map(() => Array(inputLen + 1).fill(0));

    // Initialize: convert empty string to input prefixes (filling the first row)
    for (let j = 0; j <= targetLen; j++) {
      matrix[0][j] = j;
    }
    // Initialize: convert target prefixes to empty string (filling the first cplumn)
    for (let i = 0; i <= inputLen; i++) {
      matrix[i][0] = i;
    }

    // Fill the rest of the matrix
    for (let i = 1; i <= targetLen; i++) {
      for (let j = 1; j <= inputLen; j++) {
        const substitutionCost = target[i - 1] === input[j - 1] ? 0 : 1;

        matrix[i][j] = Math.min(
          matrix[i - 1][j] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j - 1] + substitutionCost
        );
      }
    }

    return matrix[targetLen][inputLen];
  }

  private static calculateWPM(
    correctedChars: number,
    timeInMinutes: number
  ): number {
    if (timeInMinutes <= 0) return 0;

    const words = correctedChars / 5;
    return Math.round(words / timeInMinutes);
  }

  private static calculateGrossWPM(
    totalChars: number,
    timeInMinutes: number
  ): number {
    if (timeInMinutes <= 0) return 0;

    const words = totalChars / 5;
    return Math.round(words / timeInMinutes);
  }

  private static calculateConsistencyScore(keystrokes: Keystroke[]): number {
    if (keystrokes.length < 5) return 100;

    const intervals = keystrokes
      .slice(1)
      .map((stroke) => stroke.timeSinceLast)
      .filter((interval) => interval > 0);

    if (intervals.length === 0) return 100;

    const rhythemIntervals = intervals.filter((interval) => interval <= 400);
    const hesitationIntervals = intervals.filter(
      (interval) => interval > 400 && interval <= 2000
    );
    const longPauseIntervals = intervals.filter((interval) => interval > 2000);

    const rhythemScore = this.calculatePureRhythemConsistency(rhythemIntervals);

    const totalIntervals = intervals.length;

    const hesitationPenalty = this.calculateHesitationPenalty(
      hesitationIntervals.length,
      totalIntervals
    );
    const pausePenalty = this.calculatePausePenalty(
      longPauseIntervals.length,
      totalIntervals
    );

    const overallConsistency = Math.max(
      0,
      rhythemScore - hesitationPenalty - pausePenalty
    );

    return Math.round(overallConsistency * 100) / 100;
  }

  private static analyzeErrorPatterns(
    targetText: string,
    inputText: string,
    keystrokes: Keystroke[]
  ): ErrorPattern[] {}

  private static calculatePureRhythemConsistency(
    rhythemIntervals: number[]
  ): number {}

  private static calculateHesitationPenalty(
    hesitationCount: number,
    totalIntervals: number
  ): number {}

  private static calculatePausePenalty(
    pauseCount: number,
    totalIntervals: number
  ): number {}
}
