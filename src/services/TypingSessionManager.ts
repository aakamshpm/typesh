import { SessionConfig, SessionState } from "../models/SessionModel";
import { Keystroke, TypingSession } from "../models/TypingModel";

export class TypingSessionManager {
  private config: SessionConfig;
  private state: SessionState;
  private sessionTimer: NodeJS.Timeout | null = null;
  private pausedAt: number | null = null;
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

  public pauseSession(): void {
    if (!this.state.isActive || this.state.isPaused) return;

    this.state.isPaused = true;
    this.pausedAt = Date.now();
    this.clearTimer();
    this.notifyProgress();
  }

  public resumeSession(): void {
    if (!this.state.isActive || !this.state.isPaused) return;

    this.state.isPaused = false;
    this.lastKeystrokeTime = Date.now();

    if (this.config.mode === "time") this.resumeTimerWithRemaining();

    this.pausedAt = null; // clear paused at time if the mode is not timer mode

    this.notifyProgress();
  }

  public endSession(): void {
    if (!this.state.isActive || this.state.isCompleted) return;

    this.state.isCompleted = true;
    this.state.isActive = false;
    this.state.endTime = new Date();
    this.clearTimer();

    const session: TypingSession = {
      id: this.config.sessionId,
      keystrokes: [...this.state.keystrokes],
      targetText: this.config.targetText,
      userInput: this.state.currentInput,
      startTime: this.state.startTime,
      endTime: this.state.endTime,
      timerDuration: this.config.target,
      isCompleted: true,
    };

    this.onSessionEnd?.(session);
    this.notifyProgress();
  }

  private startTimer(): void {
    this.clearTimer();

    this.sessionTimer = setTimeout(() => {
      this.endSession();
    }, this.config.target * 1000);
  }

  private clearTimer(): void {
    if (this.sessionTimer) {
      clearTimeout(this.sessionTimer);
      this.sessionTimer = null;
    }
  }

  private notifyProgress(): void {
    this.onProgress?.({ ...this.state });
  }

  private resumeTimerWithRemaining(): void {
    if (!this.state.startTime || !this.pausedAt) return;

    const timeUsedBeforePause =
      (this.pausedAt - this.state.startTime.getTime()) / 1000;
    const remainingTime = Math.max(0, this.config.target - timeUsedBeforePause);

    if (remainingTime > 0) {
      this.sessionTimer = setTimeout(() => {
        this.endSession();
      }, remainingTime * 1000);
    } else this.endSession(); // ending session because time was already up when paused
  }

  public processKeyStroke(character: string): boolean {
    if (!this.state.isActive || this.state.isPaused || this.state.isCompleted)
      return false;

    const now = Date.now();
    const timeSinceLast =
      this.state.keystrokes.length === 0 ? 0 : now - this.lastKeystrokeTime;

    const keystroke: Keystroke = {
      key: character,
      timestamp: now,
      timeSinceLast,
    };

    this.state.keystrokes.push(keystroke);
    this.lastKeystrokeTime = now;
  }
}
