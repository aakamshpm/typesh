export function calculateWPM(
  correctedChars: number,
  timeInMinutes: number
): number {
  if (timeInMinutes <= 0) return 0;

  const words = correctedChars / 5;
  return Math.round(words / timeInMinutes);
}

export function calculateGrossWPM(
  totalChars: number,
  timeInMinutes: number
): number {
  if (timeInMinutes <= 0) return 0;

  const words = totalChars / 5;
  return Math.round(words / timeInMinutes);
}
