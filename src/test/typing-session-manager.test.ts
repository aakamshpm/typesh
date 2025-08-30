import * as assert from "assert";
import { TypingSessionManager } from "../services/TypingSessionManager";

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
  });
});
