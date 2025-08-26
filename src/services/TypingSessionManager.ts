import { SessionConfig, SessionState } from "../models/SessionModel";
import { Keystroke, TypingSession } from "../models/TypingModel";

export class TypingSessionManager {
  private config: SessionConfig;
  private state: SessionState;
  private sessionTimer: NodeJS.Timeout | null = null;
  private lastKeystrokeTime: number = 0;

  private onSessionEnd?: (session: TypingSession) => void;
  private onProgress?: (state: SessionState) => void;
  private onKeystroke?: (keystroke: Keystroke, state: SessionState) => void;

  constructor(config: Omit<SessionConfig, "sessionId">) {
    this.config = {
      ...config,
      sessionId: crypto.randomUUID(),
    };
    this.state = this.initializeState();
  }

  private initializeState(): SessionState {
    return {
      isActive: false,
      isPaused: false,
      isCompleted: false,
      startTime: null,
      endTime: null,
      currentInput: "",
      currentPosition: 0,
      keystrokes: [],
    };
  }

  private getCurrentState(): SessionState {
    return { ...this.state };
  }

  private getConfig(): SessionConfig {
    return { ...this.config };
  }

  private getSessionId(): string {
    return this.config.sessionId;
  }
}
