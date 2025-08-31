import * as assert from "assert";
import { TypingSessionManager } from "../services/TypingSessionManager";
import { TypingSession } from "../models/TypingModel";

suite("TypingSessionManager Tests", () => {
  test("should initialize with correct configuration", () => {
    const manager = new TypingSessionManager({
      mode: "time",
      target: 60,
      targetText: "The quick brown fox jumps over the lazy dog",
    });

    const config = manager.getConfig();

    assert.strictEqual(config.mode, "time", "Mode should be time");
    assert.strictEqual(config.target, 60, "Target should be 60 seconds");
    assert.strictEqual(
      config.targetText,
      "The quick brown fox jumps over the lazy dog",
      "Target text should match"
    );
    assert.ok(config.sessionId, "Session ID should be generated");
    assert.ok(
      typeof config.sessionId === "string",
      "Session Id should be a string"
    );
    assert.ok(config.sessionId.length > 0, "Session ID should not be empty");
  });

  test("should manage session lifecycle correctly", () => {
    const manager = new TypingSessionManager({
      mode: "time",
      target: 60,
      targetText: "test",
    });

    let state = manager.getCurrentState();
    assert.strictEqual(state.isActive, false, "Session should start inactive");
    assert.strictEqual(
      state.isPaused,
      false,
      "Session should not be paused at starting"
    );
    assert.strictEqual(
      state.isCompleted,
      false,
      "Session should not be completed before starting"
    );

    // Start the session
    manager.startSession();
    state = manager.getCurrentState();
    assert.strictEqual(
      state.isActive,
      true,
      "Session should be active after starting it"
    );
    assert.ok(state.startTime, "Start time should be set");
    assert.ok(
      state.startTime instanceof Date,
      "Start time should be a Date instance"
    );

    // End the session
    manager.endSession();
    state = manager.getCurrentState();
    assert.strictEqual(
      state.isActive,
      false,
      "Session should be inactive after ending"
    );
    assert.strictEqual(
      state.isCompleted,
      true,
      "Session should be completed after ending"
    );
    assert.ok(state.endTime, "End time should be set");
  });

  test("should process keystrokes accurately", () => {
    const manager = new TypingSessionManager({
      mode: "quote",
      target: 0,
      targetText: "hello",
    });

    manager.startSession();

    const result1 = manager.processKeystroke("h");
    const result2 = manager.processKeystroke("e");
    const result3 = manager.processKeystroke("l");
    const result4 = manager.processKeystroke("l");
    const result5 = manager.processKeystroke("o");

    assert.strictEqual(result1, true, "First keystroke should be processed");
    assert.strictEqual(result2, true, "Second keystroke should be processed");
    assert.strictEqual(result3, true, "Third keystroke should be processed");
    assert.strictEqual(result4, true, "Fourth keystroke should be processed");
    assert.strictEqual(result5, true, "Fifth keystroke should be processed");

    const state = manager.getCurrentState();
    assert.strictEqual(
      state.currentInput,
      "hello",
      "Input should match typed text"
    );
    assert.strictEqual(
      state.currentPosition,
      5,
      "Position should be at end of text"
    );
    assert.strictEqual(
      state.keystrokes.length,
      5,
      "Should have 5 keystrokes recorded"
    );

    const firstKeystroke = state.keystrokes[0];
    assert.strictEqual(firstKeystroke.key, "h", "First keystroke should be h");
    assert.ok(
      typeof firstKeystroke.timestamp === "number",
      "Timestamp should be a number"
    );
    assert.ok(firstKeystroke.timestamp > 0, "Timestamp should be positive");
  });

  test("should handle backspace correctly", () => {
    const manager = new TypingSessionManager({
      mode: "quote",
      target: 0,
      targetText: "test",
    });

    manager.startSession();

    manager.processKeystroke("t");
    manager.processKeystroke("e");
    manager.processKeystroke("x");

    let state = manager.getCurrentState();
    assert.strictEqual(state.currentInput, "tex"),
      assert.strictEqual(state.currentPosition, 3);

    const backspaceResult = manager.processKeystroke("\b");
    assert.strictEqual(backspaceResult, true);

    state = manager.getCurrentState();
    assert.strictEqual(state.currentInput, "te");
    assert.strictEqual(state.currentPosition, 2);
  });

  test("should complete session when target is reached in quote mode", () => {
    const manager = new TypingSessionManager({
      mode: "quote",
      target: 0, // Not used in quote mode
      targetText: "hi", // 2 characters
    });

    let sessionCompleted = false;
    let completedSession: TypingSession | null = null;

    // Set up completion callback
    manager.onSessionComplete((session) => {
      sessionCompleted = true;
      completedSession = session;
    });

    manager.startSession();

    // Type the complete text
    manager.processKeystroke("h");
    manager.processKeystroke("i");

    // Session should complete automatically
    assert.strictEqual(
      sessionCompleted,
      true,
      "Session should complete when text is finished"
    );

    const state = manager.getCurrentState();
    assert.strictEqual(
      state.isCompleted,
      true,
      "Session state should be completed"
    );
    assert.strictEqual(
      state.isActive,
      false,
      "Session should be inactive when completed"
    );

    // Verify the completed session data
    assert.ok(completedSession, "Completed session should be available");
    assert.strictEqual(
      (completedSession as TypingSession).id,
      manager.getSessionId(),
      "Session ID should match"
    );
    assert.strictEqual(
      (completedSession as TypingSession).userInput,
      "hi",
      "User input should be recorded"
    );
    assert.strictEqual(
      (completedSession as TypingSession).targetText,
      "hi",
      "Target text should be recorded"
    );
    assert.ok(
      (completedSession as TypingSession).endTime,
      "End time should be recorded"
    );
  });

  test("should complete session in words mode", () => {
    const manager = new TypingSessionManager({
      mode: "words",
      target: 2,
      targetText: "hello world test",
    });

    let sessionCompleted = false;
    let completedSession: TypingSession | null = null;

    manager.onSessionComplete((session) => {
      sessionCompleted = true;
      completedSession = session;
    });

    manager.startSession();

    "hello ".split("").forEach((char) => manager.processKeystroke(char));

    assert.strictEqual(
      sessionCompleted,
      false,
      "Should not complete after 1 word"
    );

    "world".split("").forEach((char) => manager.processKeystroke(char));

    // Should complete now (2 words reached)
    assert.strictEqual(sessionCompleted, true, "Should complete after 2 words");

    const state = manager.getCurrentState();
    assert.strictEqual(
      state.isCompleted,
      true,
      "Session state should be completed"
    );
    assert.strictEqual(
      state.isActive,
      false,
      "Session should be inactive when completed"
    );

    // Verify the completed session data
    assert.ok(completedSession, "Completed session should be available");
    assert.strictEqual(
      (completedSession as TypingSession).id,
      manager.getSessionId(),
      "Session ID should match"
    );
    assert.strictEqual(
      (completedSession as TypingSession).userInput,
      "hello world",
      "User input should be recorded"
    );
    assert.strictEqual(
      (completedSession as TypingSession).targetText,
      "hello world test",
      "Target text should be recorded"
    );
    assert.ok(
      (completedSession as TypingSession).endTime,
      "End time should be recorded"
    );
  });
});
