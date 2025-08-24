import { ErrorFound } from "../../models/TypingModel";

export function analyzeErrorPatterns(errors: ErrorFound[]): {
  mostCommonErrors: { char: string; count: number }[];
  errorFrequency: number;
} {
  const errorCounts = new Map<string, number>();

  errors.forEach((error) => {
    if (error.expectedChar && error.actualChar) {
      const errorKey = `${error.expectedChar}->${error.actualChar}`;
      errorCounts.set(errorKey, (errorCounts.get(errorKey) || 0) + 1);
    }
  });

  const mostCommonErrors = Array.from(errorCounts.entries())
    .map(([char, count]) => ({ char, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  const errorFrequency = errors.length;

  return {
    mostCommonErrors,
    errorFrequency,
  };
}
