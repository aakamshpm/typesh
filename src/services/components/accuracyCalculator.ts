import { Keystroke } from "../../models/TypingModel";

export function calculateCorrectChars(keystrokes: Keystroke[]): number {
  return keystrokes.filter((k) => k.isCorrect).length;
}

export function analyzeKeypressAccuracy(
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
      if (position > 0) {
        position--;
      }
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
