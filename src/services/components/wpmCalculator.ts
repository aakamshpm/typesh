export function calculateWPM(
  correctWords: number,
  timeInMinutes: number
): number {
  if (timeInMinutes < 0) return 0;

  return Math.round(correctWords / timeInMinutes);
}

export function calculateGrossWPM(
  totalChars: number,
  timeInMinutes: number
): number {
  if (timeInMinutes <= 0) return 0;

  const words = totalChars / 5;
  return Math.round(words / timeInMinutes);
}
