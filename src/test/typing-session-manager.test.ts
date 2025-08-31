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
    assert.strictEqual(state.currentInput, "tex");
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

  test("should calculate progress correctly", () => {
    const quoteManager = new TypingSessionManager({
      mode: "quote",
      target: 0,
      targetText: "hello",
    });

    quoteManager.startSession();

    assert.strictEqual(
      quoteManager.getProgress(),
      0,
      "Initial progress must be 0%"
    );

    quoteManager.processKeystroke("h");
    quoteManager.processKeystroke("e");
    // now the progress will be at 40%
    assert.strictEqual(
      quoteManager.getProgress(),
      40,
      "Progrss should be 40% after 'he'"
    );

    // Complete the text
    quoteManager.processKeystroke("l");
    quoteManager.processKeystroke("l");
    quoteManager.processKeystroke("o");
    assert.strictEqual(
      quoteManager.getProgress(),
      100,
      "Progress should be 100% when complete"
    );
  });

  test("should calculate WPM correctly", () => {
    const manager = new TypingSessionManager({
      mode: "time",
      target: 60,
      targetText: "The quick brown fox jumps over the lazy dog.", // ~45 characters
    });

    manager.startSession();

    const text = "The quick brown fox";
    for (const char of text) {
      manager.processKeystroke(char);
    }

    const wpm = manager.getCurrentWPM();

    assert.ok(typeof wpm === "number", "WPM should be a number");
    assert.ok(wpm >= 0, "WPM should be non-negative");
    assert.ok(!isNaN(wpm), "WPM should not be NaN");

    // For a reasonable typing speed, WPM should be in a realistic range
    // (This is a rough check - actual values depend on timing)
    assert.ok(wpm < 1000, "WPM should be realistic (less than 1000)");
  });

  test("should handle pause and resume correctly", () => {
    const manager = new TypingSessionManager({
      mode: "time",
      target: 60,
      targetText: "test text",
    });

    manager.startSession();
    manager.processKeystroke("t");

    manager.pauseSession();
    let state = manager.getCurrentState();
    assert.strictEqual(state.isPaused, true, "Session should be paused");
    assert.strictEqual(
      state.isActive,
      true,
      "Session should still be active when paused"
    );

    // Try to process keystroke while paused
    const pausedKeystroke = manager.processKeystroke("e");
    assert.strictEqual(
      pausedKeystroke,
      false,
      "Keystroke should be rejected when paused"
    );

    // Resume the session
    manager.resumeSession();
    state = manager.getCurrentState();
    assert.strictEqual(
      state.isPaused,
      false,
      "Session should not be paused after resume"
    );
    assert.strictEqual(
      state.isActive,
      true,
      "Session should be active after resume"
    );

    // Now keystrokes should work again
    const resumedKeystroke = manager.processKeystroke("e");
    assert.strictEqual(
      resumedKeystroke,
      true,
      "Keystroke should be accepted after resume"
    );

    state = manager.getCurrentState();
    assert.strictEqual(
      state.currentInput,
      "te",
      "Input should continue from where it left off"
    );
  });

  test("should handle invalid keystrokes gracefully", () => {
    const manager = new TypingSessionManager({
      mode: "time",
      target: 60,
      targetText: "test",
    });

    // Try to process keystroke before starting session
    const result = manager.processKeystroke("a");
    assert.strictEqual(
      result,
      false,
      "Keystroke should be rejected when session not active"
    );

    // Start session and try empty keystroke
    manager.startSession();
    const emptyResult = manager.processKeystroke("");
    assert.strictEqual(
      emptyResult,
      false,
      "Empty keystroke should be rejected"
    );

    // Try null/undefined (this might throw, which is OK)
    try {
      manager.processKeystroke(null as any);
      assert.fail("Should have thrown for null keystroke");
    } catch (error) {
      assert.ok(error, "Should throw for invalid input");
    }
  });

  test("should complete session in time mode when timer expires", () => {
    const manager = new TypingSessionManager({
      mode: "time",
      target: 1, // 1 second for quick test
      targetText: "This is a test sentence for time mode completion.",
    });

    let sessionCompleted = false;
    let completedSession: TypingSession | null = null;

    manager.onSessionComplete((session) => {
      sessionCompleted = true;
      completedSession = session;
    });

    manager.startSession();

    // Type some characters
    "This is a test".split("").forEach((char) => {
      manager.processKeystroke(char);
    });

    // Wait for timer to expire (1 second)
    return new Promise<void>((resolve) => {
      setTimeout(() => {
        // Session should complete automatically when timer expires
        assert.strictEqual(
          sessionCompleted,
          true,
          "Session should complete when timer expires"
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

        resolve();
      }, 1100); // Wait slightly longer than 1 second
    });
  });

  test("should handle configuration validation correctly", () => {
    // Test empty target text
    assert.throws(() => {
      new TypingSessionManager({
        mode: "time",
        target: 60,
        targetText: "",
      });
    }, /targetText cannot be empty/);

    // Test whitespace-only target text
    assert.throws(() => {
      new TypingSessionManager({
        mode: "time",
        target: 60,
        targetText: "   ",
      });
    }, /targetText cannot be empty/);

    // Test negative target
    assert.throws(() => {
      new TypingSessionManager({
        mode: "words",
        target: -1,
        targetText: "hello world",
      });
    }, /target must be positive/);

    // Test zero target for words mode
    assert.throws(() => {
      new TypingSessionManager({
        mode: "words",
        target: 0,
        targetText: "hello world",
      });
    }, /target must be positive/);

    // Valid configurations should work
    const validManager = new TypingSessionManager({
      mode: "time",
      target: 30,
      targetText: "Valid text",
    });
    assert.ok(
      validManager.getSessionId(),
      "Valid config should create manager"
    );
  });

  test("should track elapsed and remaining time correctly", () => {
    // Test non-time mode first
    const quoteManager = new TypingSessionManager({
      mode: "quote",
      target: 0,
      targetText: "test text",
    });

    // For non-time modes, remaining time should be 0
    assert.strictEqual(
      quoteManager.getElapsedTime(),
      0,
      "Elapsed time should be 0 before start"
    );
    assert.strictEqual(
      quoteManager.getRemainingTime(),
      0,
      "Remaining time should be 0 for non-time mode"
    );

    // Now test time mode
    const timeManager = new TypingSessionManager({
      mode: "time",
      target: 10, // 10 seconds
      targetText: "test text",
    });

    // Before starting time mode, elapsed should be 0, remaining should be target (10)
    assert.strictEqual(
      timeManager.getElapsedTime(),
      0,
      "Elapsed time should be 0 before start"
    );
    assert.strictEqual(
      timeManager.getRemainingTime(),
      10,
      "Remaining time should equal target before start"
    );

    timeManager.startSession();

    // Immediately after start, elapsed should be very small, remaining should be close to target
    const elapsedAfterStart = timeManager.getElapsedTime();
    const remainingAfterStart = timeManager.getRemainingTime();

    assert.ok(
      elapsedAfterStart >= 0,
      "Elapsed time should be non-negative after start"
    );
    assert.ok(
      elapsedAfterStart < 1,
      "Elapsed time should be very small after start"
    );
    assert.ok(
      remainingAfterStart > 9,
      "Remaining time should be close to target after start"
    );
    assert.ok(
      remainingAfterStart <= 10,
      "Remaining time should not exceed target"
    );

    // Simulate some time passing (by waiting)
    return new Promise<void>((resolve) => {
      setTimeout(() => {
        const elapsedAfterWait = timeManager.getElapsedTime();
        const remainingAfterWait = timeManager.getRemainingTime();

        assert.ok(
          elapsedAfterWait >= 0.5,
          "Elapsed time should increase after waiting"
        );
        assert.ok(
          remainingAfterWait <= 9.5,
          "Remaining time should decrease after waiting"
        );
        assert.strictEqual(
          Math.round(elapsedAfterWait + remainingAfterWait),
          10,
          "Elapsed + remaining should equal target time"
        );

        resolve();
      }, 500); // Wait 500ms
    });
  });

  test("should reset session correctly", () => {
    const manager = new TypingSessionManager({
      mode: "quote",
      target: 0,
      targetText: "hello world",
    });

    manager.startSession();

    // Type some characters and verify state
    manager.processKeystroke("h");
    manager.processKeystroke("e");
    manager.processKeystroke("l");

    let state = manager.getCurrentState();
    assert.strictEqual(state.currentInput, "hel", "Input should be 'hel'");
    assert.strictEqual(state.currentPosition, 3, "Position should be 3");
    assert.strictEqual(state.keystrokes.length, 3, "Should have 3 keystrokes");
    assert.ok(state.startTime, "Should have start time");
    assert.strictEqual(state.isActive, true, "Session should be active");

    // Reset the session
    manager.resetSession();

    // Verify all state is reset
    state = manager.getCurrentState();
    assert.strictEqual(
      state.isActive,
      false,
      "Session should not be active after reset"
    );
    assert.strictEqual(
      state.isPaused,
      false,
      "Session should not be paused after reset"
    );
    assert.strictEqual(
      state.isCompleted,
      false,
      "Session should not be completed after reset"
    );
    assert.strictEqual(
      state.currentInput,
      "",
      "Input should be empty after reset"
    );
    assert.strictEqual(
      state.currentPosition,
      0,
      "Position should be 0 after reset"
    );
    assert.strictEqual(
      state.keystrokes.length,
      0,
      "Keystrokes should be empty after reset"
    );
    assert.strictEqual(
      state.startTime,
      null,
      "Start time should be null after reset"
    );
    assert.strictEqual(
      state.endTime,
      null,
      "End time should be null after reset"
    );

    // Verify session can be restarted
    manager.startSession();
    state = manager.getCurrentState();
    assert.strictEqual(
      state.isActive,
      true,
      "Session should be active after restart"
    );
    assert.ok(state.startTime, "Should have new start time after restart");
  });
});
