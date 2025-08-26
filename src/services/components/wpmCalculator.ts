export function calculateWPM(
  correctWords: number,
  timeInMinutes: number
): number {
  if (timeInMinutes < 0) return 0;

  return Math.round(correctWords / timeInMinutes);
}

export function calculateGrossWPM(
  totalTypedChars: number,
  timeInMinutes: number
): number {
  if (timeInMinutes <= 0) return 0;

  const words = totalTypedChars / 5;
  return Math.round(words / timeInMinutes);
}
