import { Keystroke } from "../../models/TypingModel";

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
        // we go back to prev position and skip backspace as a count for totalKeyPresses
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

export function calculateCharacterStats(
  targetText: string,
  userInput: string
): {
  correct: number;
  incorrect: number;
  extra: number;
  missed: number;
} {
  const minLength = Math.min(targetText.length, userInput.length);
  let correct = 0;
  let incorrect = 0;

  for (let i = 0; i < minLength; i++) {
    if (targetText[i] === userInput[i]) correct++;
    else incorrect++;
  }

  const extra = Math.max(0, userInput.length - targetText.length);
  const missed = Math.max(0, targetText.length - userInput.length);

  return {
    correct,
    incorrect,
    extra,
    missed,
  };
}

export function calculateCorrectWords(
  targetText: string,
  userInput: string
): number {
  if (!targetText.trim() || !userInput.trim()) return 0;

  const targetWords = targetText.trim().split(/\s+/);
  const userWords = targetText.trim().split(/\s+/);

  let correctWords = 0;

  const minWordCount = Math.min(targetWords.length, userWords.length);

  for (let i = 0; i < minWordCount; i++)
    if (targetWords[i] === userWords[i]) correctWords++;

  return correctWords;
}

export function countAllTypedCharacters(keystrokes: Keystroke[]): number {
  let totalTypedChars = 0;

  for (const keystroke of keystrokes)
    if (keystroke.key !== "\b") totalTypedChars++;

  //Note: We don't count backspaces as "typed" characters

  return totalTypedChars;
}

export function calculateCorrectedErrors(
  keystrokes: Keystroke[],
  targetText: string
): number {
  let position = 0;
  let currentInput = "";
  let correctedErrors = 0;

  for (const keystroke of keystrokes) {
    if (keystroke.key === "\b") {
      if (currentInput.length > 0) {
        // here removedChar is the key to be removed
        const removedChar = currentInput[currentInput.length - 1];
        currentInput = currentInput.slice(0, -1);
        position = Math.max(0, position - 1); // decrement the position after the char was deleted

        // check if removed char was actually wrong
        if (
          position < targetText.length &&
          removedChar !== targetText[position]
        )
          correctedErrors++;
      }
    } else {
      // if not backspace, it would be a regular character and we can proceed incrementing the position
      currentInput += keystroke;
      position++;
    }
  }

  return correctedErrors;
}
