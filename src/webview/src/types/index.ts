import { SessionConfig, SessionState } from "../../../models/SessionModel";
import {
  CustomParagraph,
  ExtensionSettings,
  TypingSession,
  TypingStats,
} from "../../../models/TypingModel";

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

export type WebviewMessage =
  | { type: "getParagraphs" }
  | { type: "startSession"; payload: SessionConfig }
  | { type: "endSession" }
  | { type: "pauseSession" }
  | { type: "resumeSession" }
  | { type: "keystroke"; payload: { character: string } }
  | { type: "getSessionHistory" }
  | { type: "getSettings" }
  | { type: "updateSettings"; payload: Partial<ExtensionSettings> }
  | { type: "saveParagraph"; payload: CustomParagraph }
  | { type: "deleteParagraph"; payload: { id: string } };

export type ExtensionMessage =
  | { type: "paragraphsLoaded"; payload: CustomParagraph[] }
  | { type: "sessionStarted"; payload: { sessionId: string } }
  | { type: "sessionUpdate"; payload: SessionState }
  | {
      type: "sessionCompleted";
      payload: { session: TypingSession; stats: TypingStats };
    }
  | { type: "sessionHistoryLoaded"; payload: TypingSession[] }
  | { type: "settingsLoaded"; payload: ExtensionSettings }
  | { type: "error"; payload: { message: string; details?: any } };
