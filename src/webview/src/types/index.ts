// Re-export existing types from backend models
export type {
  TypingSession,
  Keystroke,
  TypingStats,
  ErrorPattern,
  ErrorFound,
  CustomParagraph,
  ExtensionSettings,
} from "../../../models/TypingModel";

export type {
  SessionMode,
  SessionConfig,
  SessionState,
} from "../../../models/SessionModel";

export interface VSCodeAPI {
  postMessage: (message: any) => void;
  setState: (state: any) => void;
  getState: () => any;
}
