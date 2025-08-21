export class TypingAnalyzer {
  private static calculateCorrectChars(target: string, input: string): number {
    const editDistance = this.levenshteinDistance(target, input);

    const correctedChars = target.length - editDistance;
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
      for (let j = 1; j < inputLen; j++) {
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
}
