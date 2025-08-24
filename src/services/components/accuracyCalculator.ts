import { Keystroke } from "../../models/TypingModel";

export function calculateCorrectChars(keystrokes: Keystroke[]): number {
  return keystrokes.filter((k) => k.isCorrect).length;
}

export function analyzeKeypressAccuracy(keystrokes: Keystroke[]): number {
  if (keystrokes.length === 0) return 100;

  const correctCount = keystrokes.filter((k) => k.isCorrect).length;
  return Math.round((correctCount / keystrokes.length) * 100);
}
