import { useCallback, useState } from "react";
import {
  CustomParagraph,
  ExtensionSettings,
  SessionConfig,
  SessionState,
  TypingSession,
  TypingStats,
} from "../types";

interface VSCodeAPI {
  postMessage: (message: any) => void;
  setState: (state: any) => void;
  getState: () => any;
}

declare global {
  interface Window {
    acquireVsCodeApi: () => VSCodeAPI;
  }
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

export const useVSCodeAPI = () => {
  const [vscode] = useState<VSCodeAPI>(() => {
    if (typeof window !== "undefined" && window.acquireVsCodeApi)
      return window.acquireVsCodeApi();

    return {
      postMessage: (message: any) => console.log("DEV: Message sent:", message),
      setState: (state: any) => console.log("DEV: State set:", state),
      getState: () => ({}),
    };
  });

  const sendMessage = useCallback(
    (type: string, payload?: any) => {
      const message: WebviewMessage = payload
        ? ({ type, payload } as any)
        : ({ type } as any);
      vscode.postMessage(message);
    },
    [vscode]
  );

  const handleMessage = useCallback(
    (callback: (data: ExtensionMessage) => void) => {
      const messageHandler = (event: MessageEvent<ExtensionMessage>) => {
        callback(event.data);
      };

      window.addEventListener("message", messageHandler);
      return () => window.removeEventListener("message", messageHandler);
    },
    []
  );

  return {
    sendMessage,
    handleMessage,
    setState: vscode.setState,
    getState: vscode.getState,
  };
};
