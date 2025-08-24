import {
  ErrorFound,
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
  ): ErrorPattern[] {
    const allignedErrors = this.findAllignedErrors(targetText, inputText);

    const errorMap = new Map<
      string,
      {
        frequency: number;
        positions: number[];
        mistakes: Set<string>;
        errorType: "substitution" | "deletion" | "insertion";
      }
    >();

    allignedErrors.forEach((error) => {
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
      errorData.positions.push(error.positition);
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

  private static calculatePureRhythemConsistency(
    rhythemIntervals: number[]
  ): number {
    if (rhythemIntervals.length < 3) {
      return 85; // Because less then 3 would be very low rhythem count
    }

    const sortedIntervals = [...rhythemIntervals].sort((a, b) => a - b);
    const q1 = sortedIntervals[Math.floor(sortedIntervals.length * 0.25)];
    const q3 = sortedIntervals[Math.floor(sortedIntervals.length * 0.75)];

    const iqr = q3 - q1;

    let filteredIntervals = rhythemIntervals;
    if (rhythemIntervals.length >= 5 && iqr > 0) {
      const lowerBound = q1 - 1.5 * iqr;
      const upperBound = q3 + 1.5 * iqr;

      filteredIntervals = rhythemIntervals.filter(
        (interval) => interval >= lowerBound && interval <= upperBound
      );
    }

    // fallback to original intervals if too much of data was filtered out
    if (filteredIntervals.length < rhythemIntervals.length * 0.5) {
      filteredIntervals = rhythemIntervals;
    } // if even half of rhythem intervals is not in filtered, we take the original intervals

    const mean =
      filteredIntervals.reduce((sum, interval) => sum + interval, 0) /
      filteredIntervals.length;
    const variance =
      filteredIntervals.reduce(
        (sum, interval) => sum + Math.pow(interval - mean, 2),
        0
      ) / filteredIntervals.length;
    const standardDeviation = Math.sqrt(variance);

    const coefficientOfVariation = mean > 0 ? standardDeviation / mean : 0;
    const rythmScore = Math.max(0, 100 * Math.exp(-2 * coefficientOfVariation));

    return rythmScore;
  }

  private static calculateHesitationPenalty(
    hesitationCount: number,
    totalIntervals: number
  ): number {
    if (totalIntervals === 0) return 0;

    const hesitationRatio = hesitationCount / totalIntervals;

    const basePenalty = hesitationRatio * 30;
    const progressivePenalty = Math.pow(hesitationRatio, 0.5) * 15;

    return Math.min(40, basePenalty + progressivePenalty);
  }

  private static calculatePausePenalty(
    pauseCount: number,
    totalIntervals: number
  ): number {
    if (totalIntervals === 0) return 0;

    const pauseRatio = pauseCount / totalIntervals;

    const pausePenalty = pauseRatio * 15;

    return Math.min(20, pausePenalty);
  }

  private static findAllignedErrors(
    target: string,
    input: string
  ): Array<ErrorFound> {
    const errors: ErrorFound[] = [];

    let targetIndex = 0;
    let inputIndex = 0;

    while (targetIndex < target.length || inputIndex < input.length) {
      if (targetIndex >= target.length) {
        errors.push({
          expectedChar: target[targetIndex],
          actualChar: null,
          positition: targetIndex,
          type: "deletion" as const,
        });
        targetIndex++;
        inputIndex++;
      } else if (target[targetIndex] === input[inputIndex]) {
        targetIndex++;
        inputIndex++;
      } else {
        const nextTargetInInput = input.indexOf(
          target[targetIndex],
          inputIndex + 1
        );
        const nextInputInTarget = target.indexOf(
          input[inputIndex],
          targetIndex + 1
        );

        if (
          nextTargetInInput !== -1 &&
          (nextInputInTarget === -1 ||
            nextTargetInInput - inputIndex < nextInputInTarget - targetIndex)
        ) {
          errors.push({
            expectedChar: null,
            actualChar: input[inputIndex],
            positition: targetIndex,
            type: "insertion" as const,
          });
          inputIndex++;
        } else if (nextInputInTarget !== -1) {
          errors.push({
            expectedChar: target[targetIndex],
            actualChar: null,
            positition: targetIndex,
            type: "deletion" as const,
          });
          targetIndex++;
        } else {
          errors.push({
            expectedChar: target[targetIndex],
            actualChar: input[inputIndex],
            positition: targetIndex,
            type: "substitution" as const,
          });
          targetIndex++;
          inputIndex++;
        }
      }
    }
    return errors;
  }
}
