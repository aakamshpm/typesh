import { SessionConfig, SessionState } from "../models/SessionModel";
import { Keystroke, TypingSession } from "../models/TypingModel";
import { calculateCorrectWords } from "./components/calculations";
import { calculateWPM } from "./components/wpmCalculator";

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
    if (character === "\b" || character === "Backspace") {
      if (this.state.currentInput.length > 0) {
        this.state.currentInput = this.state.currentInput.slice(0, -1);
        this.state.currentPosition = Math.max(
          0,
          this.state.currentPosition - 1
        );
      }
    } else {
      this.state.currentInput += character;
      this.state.currentPosition++;
    }

    // check if session should end based on mode in each keystroke
    this.checkCompletionConditions();

    this.onKeystroke?.(keystroke, { ...this.state });
    this.notifyProgress();

    return true;
  }

  private checkCompletionConditions(): void {
    switch (this.config.mode) {
      case "words":
        const wordCount = this.state.currentInput.trim().split(/\s+/).length;
        if (wordCount >= this.config.target) this.endSession();
        break;
      case "quote":
        if (this.state.currentInput.length >= this.config.targetText.length)
          this.endSession();
        break;
      case "time": // time mode is automatically handled by timer, although we need to add a check if user completed typing within the given timestamp
        if (this.state.currentInput.length >= this.config.targetText.length)
          this.endSession();
        break;
    }
  }

  // Utility methods of UI //
  public getElapsedTime(): number {
    if (!this.state.startTime) return 0;

    let endTime: Date;
    if (this.state.isPaused && this.pausedAt) endTime = new Date(this.pausedAt);
    else if (this.state.endTime) endTime = new Date(this.state.endTime);
    else endTime = new Date();

    return (endTime.getTime() - this.state.startTime.getTime()) / 1000;
  }

  // retreive remaining time in time mode
  public getRemainingTime(): number {
    if (this.config.mode !== "time") return 0;

    return Math.max(0, this.config.target - this.getElapsedTime());
  }

  public getProgress(): number {
    switch (this.config.mode) {
      case "time":
        const elapsed = this.getElapsedTime();
        return Math.min(100, (elapsed / this.config.target) * 100);

      case "words":
        const wordCount = this.state.currentInput.trim().split(/\s+/).length;
        return Math.min(100, (wordCount / this.config.target) * 100);

      case "quote":
        return Math.min(
          100,
          (this.state.currentInput.length / this.config.targetText.length) * 100
        );

      default:
        return 0;
    }
  }

  public getCurrentWPM(): number {
    const elapsed = this.getElapsedTime();
    if (elapsed === 0) return 0;

    const correctWords = calculateCorrectWords(
      this.config.targetText,
      this.state.currentInput
    );
    const timeInMinutes = elapsed / 60;

    return calculateWPM(correctWords, timeInMinutes);
  }
}
