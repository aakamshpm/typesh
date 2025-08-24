import { ErrorFound } from "../../models/TypingModel";

export class StringAlgorithms {
  public static levenshteinDistance(target: string, input: string): number {
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

  public static findAlignedErrors(
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
}
