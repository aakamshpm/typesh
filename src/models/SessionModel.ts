import { Keystroke } from "./TypingModel";

export type SessionMode = "time" | "words" | "quote";

export interface SessionConfig {
  sessionId: string;
  mode: SessionMode;
  target: number; // seconds for time mode, word count for words
  targetText: string;
}

export interface SessionState {
  isActive: boolean;
  isPaused: boolean;
  isCompleted: boolean;
  startTime: Date | null;
  endTime: Date | null;
  currentInput: string;
  currentPosition: number;
  keystrokes: Keystroke[];
}
