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
    // Create keystrokes that actually make mistakes during typing
    const keystrokes: Keystroke[] = [
      { key: "h", timestamp: 1000, timeSinceLast: 0 },
      { key: "e", timestamp: 1100, timeSinceLast: 100 },
      { key: "x", timestamp: 1200, timeSinceLast: 100 }, // Wrong character 'x' instead of 'l'
      { key: "l", timestamp: 1300, timeSinceLast: 100 },
      { key: "o", timestamp: 1400, timeSinceLast: 100 },
      { key: " ", timestamp: 1500, timeSinceLast: 100 },
      { key: "w", timestamp: 1600, timeSinceLast: 100 },
      { key: "o", timestamp: 1700, timeSinceLast: 100 },
      { key: "r", timestamp: 1800, timeSinceLast: 100 },
      { key: "l", timestamp: 1900, timeSinceLast: 100 },
      { key: "d", timestamp: 2000, timeSinceLast: 100 },
    ];

    const session = createMockSession({
      targetText: "hello world",
      userInput: "hexlo world", // Final input with the wrong character
      keystrokes,
    });

    const stats = TypingAnalyzer.analyzeSession(session);

    assert.strictEqual(stats.errorCount, 1);

    // Accuracy should be less than 100% but still high (10 out of 11 correct)
    assert.ok(stats.accuracy < 100);
    assert.ok(stats.accuracy > 85);

    assert.strictEqual(stats.characterStats.correct, 10);
    assert.strictEqual(stats.characterStats.incorrect, 1);
    assert.strictEqual(stats.characterStats.missed, 0);
    assert.strictEqual(stats.characterStats.extra, 0);
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

  test("should detect corrected errors correctly", () => {
    const keystrokes: Keystroke[] = [
      { key: "h", timestamp: 1000, timeSinceLast: 0 },
      { key: "x", timestamp: 1100, timeSinceLast: 100 }, // Wrong
      { key: "\b", timestamp: 1200, timeSinceLast: 100 }, // Correction
      { key: "e", timestamp: 1300, timeSinceLast: 100 },
      { key: "y", timestamp: 1400, timeSinceLast: 100 }, // Wrong
      { key: "\b", timestamp: 1500, timeSinceLast: 100 }, // Correction
      { key: "l", timestamp: 1600, timeSinceLast: 100 },
      { key: "l", timestamp: 1700, timeSinceLast: 100 },
      { key: "o", timestamp: 1800, timeSinceLast: 100 },
    ];

    const session = createMockSession({
      targetText: "hello",
      userInput: "hello",
      keystrokes,
    });

    const stats = TypingAnalyzer.analyzeSession(session);

    assert.strictEqual(stats.errorCount, 0);

    assert.strictEqual(stats.correctedErrors, 2);
  });

  test("should calculate consistency score correctly", () => {
    // Consistent typing
    const consistentKeystrokes = createMockKeystrokes("hello", 1000);

    const consistentSession = createMockSession({
      targetText: "hello",
      userInput: "hello",
      keystrokes: consistentKeystrokes,
    });

    const consistentStats = TypingAnalyzer.analyzeSession(consistentSession);
    assert.ok(consistentStats.consistencyScore > 80);

    // Inconsistent typing
    const inconsistentKeystrokes: Keystroke[] = [
      { key: "h", timestamp: 1000, timeSinceLast: 0 },
      { key: "e", timestamp: 1100, timeSinceLast: 100 },
      { key: "l", timestamp: 1300, timeSinceLast: 200 }, // Longer pause
      { key: "l", timestamp: 1500, timeSinceLast: 200 }, // Another pause
      { key: "o", timestamp: 1600, timeSinceLast: 100 },
    ];

    const inconsistentSession = createMockSession({
      targetText: "hello",
      userInput: "hello",
      keystrokes: inconsistentKeystrokes,
    });

    const inconsistentStats =
      TypingAnalyzer.analyzeSession(inconsistentSession);
    assert.ok(
      inconsistentStats.consistencyScore < consistentStats.consistencyScore
    );
  });

  test("should calculate gross WPM correctly", () => {
    const keystrokes = createMockKeystrokes("hello world this is a test"); // 25 characters
    const session = createMockSession({
      targetText: "hello world this is a test",
      userInput: "hello world this is a test",
      keystrokes,
    });

    const stats = TypingAnalyzer.analyzeSession(session);

    // 25 characters = 5 words, in 1 minute = 5 gross WPM
    assert.strictEqual(stats.grossWPM, 5);
  });
});
