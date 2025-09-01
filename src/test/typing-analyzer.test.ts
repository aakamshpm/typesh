import * as assert from "assert";
import { TypingAnalyzer } from "../services/TypingAnalyzer";
import { TypingSession, Keystroke } from "../models/TypingModel";

function createMockSession(
  overrides: Partial<TypingSession> = {}
): TypingSession {
  const baseSession: TypingSession = {
    id: "test-session",
    startTime: new Date(Date.now() - 60000), // 1 minute ago
    endTime: new Date(),
    targetText: "hello world",
    userInput: "hello world",
    keystrokes: [],
    timerDuration: 60,
    isCompleted: true,
    ...overrides,
  };
  return baseSession;
}

function createMockKeystrokes(
  text: string,
  startTime: number = Date.now()
): Keystroke[] {
  const keystrokes: Keystroke[] = [];
  let currentTime = startTime;

  for (let i = 0; i < text.length; i++) {
    keystrokes.push({
      key: text[i],
      timestamp: currentTime,
      timeSinceLast: i === 0 ? 0 : 100, // considering 100ms as gap b/w each keystroke
    });

    currentTime += 100;
  }
  return keystrokes;
}

suite("Typing Analyzer tests", () => {
  test("should analyze perfect typing session correctly", () => {
    const keystrokes = createMockKeystrokes("hello world");
    const session = createMockSession({
      targetText: "hello world",
      userInput: "hello world",
      keystrokes,
    });

    const stats = TypingAnalyzer.analyzeSession(session);

    // verify WPM (here 2 words in 1 minute = 2 WPM)
    assert.strictEqual(stats.wpm, 2);
    assert.strictEqual(stats.accuracy, 100);
    assert.strictEqual(stats.errorCount, 0);

    // Verify character stats
    assert.strictEqual(stats.characterStats.correct, 11); // "hello world".length
    assert.strictEqual(stats.characterStats.incorrect, 0);
    assert.strictEqual(stats.characterStats.extra, 0);
    assert.strictEqual(stats.characterStats.missed, 0);
  });

  test("should handle typing errors correctly", () => {
    const keystrokes = createMockKeystrokes("helo world");
    const session = createMockSession({
      targetText: "hello world",
      userInput: "helo world",
      keystrokes,
    });

    const stats = TypingAnalyzer.analyzeSession(session);

    assert.strictEqual(stats.errorCount, 1);

    // Accuracy should be less than 100%
    assert.ok(stats.accuracy < 100);
    assert.ok(stats.accuracy > 90);

    assert.strictEqual(stats.characterStats.correct, 10);
    assert.strictEqual(stats.characterStats.incorrect, 1);
    assert.strictEqual(stats.characterStats.missed, 1);
  });

  test("should handle empty session gracefully", () => {
    const session = createMockSession({
      targetText: "",
      userInput: "",
      keystrokes: [],
    });

    const stats = TypingAnalyzer.analyzeSession(session);

    assert.strictEqual(stats.wpm, 0);
    assert.strictEqual(stats.accuracy, 100);
    assert.strictEqual(stats.errorCount, 0);
  });

  test("should handle very short sessions", () => {
    const startTime = Date.now();
    const session = createMockSession({
      startTime: new Date(startTime),
      endTime: new Date(startTime + 1000), // 1 second gap
      targetText: "hi",
      userInput: "hi",
      keystrokes: createMockKeystrokes("hi", startTime),
    });

    const stats = TypingAnalyzer.analyzeSession(session);

    // Should prevent division by zero, use minimum time
    assert.ok(stats.wpm >= 0);
    assert.ok(stats.grossWPM >= 0);
  });
});
