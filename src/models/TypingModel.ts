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
  timeSinceLast: number;
  isCorrect: boolean;
  position: number;
}

export interface TypingStats {
  wpm: number;
  grossWPM: number;
  accuracy: number;
  errorCount: number;
  correctChars: number;
  totalChars: number;
  consistencyScore: number;
  errorPatterns: ErrorPattern[];

  characterStats: {
    correct: number;
    incorrect: number;
    extra: number;
    missed: number;
  };
}

export interface ErrorPattern {
  character: string;
  frequency: number;
  positions: number[];
  commonMistakes: string[]; // misspelled character
  errorType?: "substitution" | "deletion" | "insertion";
}

export interface ErrorFound {
  expectedChar: string | null;
  actualChar: string | null;
  position: number;
  type: "substitution" | "deletion" | "insertion";
}

export interface CustomParagraph {
  id: string;
  title: string;
  content: string;
  dateAdded: Date;
  difficulty?: "easy" | "medium" | "hard";
  category?: string;
}

export interface ExtensionSettings {
  defaultTimer: number;
  showRealTimeStats: boolean;
  theme: "light" | "dark" | "auto";
}
