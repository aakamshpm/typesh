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

    const keypressAnalysis = this.analyzeKeypressAccuracy(
      keystrokes,
      targetText
    );

    const totalChars = userInput.length;
    const correctChars = this.calculateCorrectChars(targetText, userInput);
    const errorCount = this.levenshteinDistance(targetText, userInput);

    // Calculate accuracy based on target text length for consistency
    const accuracy = keypressAnalysis.accuracy;

    const timeInMinutes = Math.max(
      0.01,
      (endTime.getTime() - startTime.getTime()) / 60000
    ); // Prevent division by zero
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
      grossWPM,
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

    // For correct characters, we need to consider the minimum length and subtract the edit distance from it
    const minLength = Math.min(target.length, input.length);
    const correctedChars = Math.max(0, minLength - editDistance);
    return correctedChars;
  }

  private static levenshteinDistance(target: string, input: string): number {
    const targetLen = target.length;
    const inputLen = input.length;

    // Create a matrix
    const matrix = Array(targetLen + 1)
      .fill(null)
      .map(() => Array(inputLen + 1).fill(0));

    // Initialize: convert empty string to target prefixes (filling the first row)
    for (let i = 0; i <= targetLen; i++) {
      matrix[i][0] = i;
    }
    // Initialize: convert input prefixes to empty string (filling the first column)
    for (let j = 0; j <= inputLen; j++) {
      matrix[0][j] = j;
    }

    // Fill the rest of the matrix
    for (let i = 1; i <= targetLen; i++) {
      for (let j = 1; j <= inputLen; j++) {
        const substitutionCost = target[i - 1] === input[j - 1] ? 0 : 1;

        matrix[i][j] = Math.min(
          matrix[i - 1][j] + 1, // deletion
          matrix[i][j - 1] + 1, // insertion
          matrix[i - 1][j - 1] + substitutionCost // substitution
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

    const rhythmIntervals = intervals.filter((interval) => interval <= 400);
    const hesitationIntervals = intervals.filter(
      (interval) => interval > 400 && interval <= 2000
    );
    const longPauseIntervals = intervals.filter((interval) => interval > 2000);

    const rhythmScore = this.calculatePureRhythmConsistency(rhythmIntervals);

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
      rhythmScore - hesitationPenalty - pausePenalty
    );

    return Math.round(overallConsistency * 100) / 100;
  }

  private static analyzeErrorPatterns(
    targetText: string,
    inputText: string,
    keystrokes: Keystroke[]
  ): ErrorPattern[] {
    if (!targetText || !inputText) {
      return [];
    }

    const alignedErrors = this.findAlignedErrors(targetText, inputText);

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

  private static calculatePureRhythmConsistency(
    rhythmIntervals: number[]
  ): number {
    if (rhythmIntervals.length < 3) {
      return 85; // Because less than 3 would be very low rhythm count
    }

    const sortedIntervals = [...rhythmIntervals].sort((a, b) => a - b);
    const q1Index = Math.floor(sortedIntervals.length * 0.25);
    const q3Index = Math.floor(sortedIntervals.length * 0.75);

    const q1 = sortedIntervals[q1Index];
    const q3 = sortedIntervals[q3Index];

    const iqr = q3 - q1;

    let filteredIntervals = rhythmIntervals;
    if (rhythmIntervals.length >= 5 && iqr > 0) {
      const lowerBound = q1 - 1.5 * iqr;
      const upperBound = q3 + 1.5 * iqr;

      filteredIntervals = rhythmIntervals.filter(
        (interval: number) => interval >= lowerBound && interval <= upperBound
      );
    }

    // fallback to original intervals if too much of data was filtered out
    if (filteredIntervals.length < rhythmIntervals.length * 0.5) {
      filteredIntervals = rhythmIntervals;
    } // if even half of rhythm intervals is not in filtered, we take the original intervals

    const mean =
      filteredIntervals.reduce(
        (sum: number, interval: number) => sum + interval,
        0
      ) / filteredIntervals.length;
    const variance =
      filteredIntervals.reduce(
        (sum: number, interval: number) => sum + Math.pow(interval - mean, 2),
        0
      ) / filteredIntervals.length;
    const standardDeviation = Math.sqrt(variance);

    const coefficientOfVariation = mean > 0 ? standardDeviation / mean : 0;
    const rhythmScore = Math.max(
      0,
      100 * Math.exp(-2 * coefficientOfVariation)
    );

    return rhythmScore;
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

  private static findAlignedErrors(
    target: string,
    input: string
  ): Array<ErrorFound> {
    const errors: ErrorFound[] = [];

    let targetIndex = 0;
    let inputIndex = 0;

    while (targetIndex < target.length || inputIndex < input.length) {
      if (targetIndex >= target.length) {
        // We've reached the end of target but still have input characters (insertion)
        errors.push({
          expectedChar: null,
          actualChar: input[inputIndex],
          position: targetIndex,
          type: "insertion" as const,
        });
        inputIndex++;
      } else if (inputIndex >= input.length) {
        // We've reached the end of input but still have target characters (deletion)
        errors.push({
          expectedChar: target[targetIndex],
          actualChar: null,
          position: targetIndex,
          type: "deletion" as const,
        });
        targetIndex++;
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
            position: targetIndex,
            type: "insertion" as const,
          });
          inputIndex++;
        } else if (nextInputInTarget !== -1) {
          errors.push({
            expectedChar: target[targetIndex],
            actualChar: null,
            position: targetIndex,
            type: "deletion" as const,
          });
          targetIndex++;
        } else {
          errors.push({
            expectedChar: target[targetIndex],
            actualChar: input[inputIndex],
            position: targetIndex,
            type: "substitution" as const,
          });
          targetIndex++;
          inputIndex++;
        }
      }
    }
    return errors;
  }

  private static analyzeKeypressAccuracy(
    keystrokes: Keystroke[],
    targetText: string
  ): {
    totalKeypresses: number;
    correctKeypresses: number;
    accuracy: number;
  } {
    let position = 0;
    let correctKeypresses = 0;
    let totalKeypresses = 0;

    for (const keystroke of keystrokes) {
      if (keystroke.key === "\b") {
        if (position > 0) position--;
        continue;
      }
      totalKeypresses++;

      if (
        position < targetText.length &&
        keystroke.key === targetText[position]
      ) {
        correctKeypresses++;
      }

      position++;
    }
    const accuracy =
      totalKeypresses > 0 ? (correctKeypresses / totalKeypresses) * 100 : 100;

    return {
      totalKeypresses,
      correctKeypresses,
      accuracy,
    };
  }
}
