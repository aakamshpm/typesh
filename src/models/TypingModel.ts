export interface TypingSession {
  id: string;
  startTime: Date;
  endTime: Date;
  targetText: string;
  userInput: string;
  keystrokes: Keystroke[];
  timerDuration: number; // seconds
  isCompleted: boolean;
}

export interface Keystroke {
  key: string;
  timestamp: number;
  isCorrect: boolean;
  position: number;
  timeSinceLast: number;
}

export interface TypingStats {
  wpm: number;
  accuracy: number;
  errorCount: number;
  correctChars: number;
  totalChars: number;
  consistencyScore: number;
  errorPatterns: ErrorPattern[];
}

export interface ErrorPattern {
  character: string;
  frequency: string;
  positiona: number[];
  commonMistakes: string[]; // misspelled character
}
