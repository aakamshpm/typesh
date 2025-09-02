import { Keystroke } from "./TypingModel";

export type SessionMode = "tick-tick" | "words" | "passage";

export interface SessionConfig {
  sessionId: string;
  mode: SessionMode;
  target: number; // seconds for tick-tick mode, word count for words (0 for passage mode)
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
