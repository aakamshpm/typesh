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

  public getCurrentState(): SessionState {
    return { ...this.state };
  }

  public getConfig(): SessionConfig {
    return { ...this.config };
  }

  public getSessionId(): string {
    return this.config.sessionId;
  }

  public onSessionComplete(callback: (session: TypingSession) => void): void {
    this.onSessionEnd = callback;
  }

  public onProgressUpdate(callback: (state: SessionState) => void): void {
    this.onProgress = callback;
  }

  public onKeystrokeEvent(
    callback: (keystroke: Keystroke, state: SessionState) => void
  ): void {
    this.onKeystroke = callback;
  }

  public startSession(): void {
    if (this.state.isActive) return; // Guard against double-start

    this.state.isActive = true;
    this.state.startTime = new Date();
    this.lastKeystrokeTime = Date.now();

    if (this.config.mode === "time") this.startTimer();

    this.notifyProgress();
  }
}
