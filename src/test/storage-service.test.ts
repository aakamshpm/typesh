import * as assert from "assert";
import * as vscode from "vscode";
import { StorageService } from "../services/StorageService";
import {
  TypingSession,
  CustomParagraph,
  ExtensionSettings,
} from "../models/TypingModel";

suite("StorageService Tests", () => {
  let storageService: StorageService;
  let mockStorage: Map<string, any>;

  // Mock VS Code extension context with working storage
  const createMockGlobalState = () => {
    mockStorage = new Map<string, any>();
    return {
      get: (key: string, defaultValue: any) => {
        return mockStorage.get(key) ?? defaultValue;
      },
      update: (key: string, value: any) => {
        mockStorage.set(key, value);
        return Promise.resolve();
      },
    };
  };

  setup(() => {
    const mockExtensionContext = {
      globalState: createMockGlobalState(),
    } as unknown as vscode.ExtensionContext;

    storageService = new StorageService(mockExtensionContext);
  });

  function createMockSession(
    overrides: Partial<TypingSession> = {}
  ): TypingSession {
    return {
      id: "test-session-" + Date.now(),
      startTime: new Date(Date.now() - 60000),
      endTime: new Date(),
      targetText: "The quick brown fox jumps over the lazy dog.",
      userInput: "The quick brown fox jumps over the lazy dog.",
      keystrokes: [],
      timerDuration: 60,
      isCompleted: true,
      ...overrides,
    };
  }

  function createMockParagraph(
    overrides: Partial<CustomParagraph> = {}
  ): CustomParagraph {
    return {
      id: "test-paragraph-" + Date.now(),
      title: "Test Paragraph",
      content: "This is a test paragraph for typing practice.",
      dateAdded: new Date(),
      difficulty: "easy",
      category: "Test",
      ...overrides,
    };
  }

  function createMockSettings(
    overrides: Partial<ExtensionSettings> = {}
  ): ExtensionSettings {
    return {
      defaultTimer: 60,
      showRealTimeStats: true,
      theme: "auto",
      ...overrides,
    };
  }

  // Session Management Tests
  test("should save and retrieve typing sessions", async () => {
    const session = createMockSession();

    await storageService.saveSession(session);

    // Retrieve all sessions
    const sessions = await storageService.getAllSessions();
    assert.ok(sessions.length > 0, "Should have at least one session");

    // Find our saved session
    const savedSession = sessions.find((s) => s.id === session.id);
    assert.ok(savedSession, "Should find the saved session");
    assert.strictEqual(savedSession!.targetText, session.targetText);
  });

  test("should retrieve session by ID", async () => {
    const session = createMockSession();

    await storageService.saveSession(session);

    const retrievedSession = await storageService.getSessionById(session.id);
    assert.ok(retrievedSession, "Should retrieve session by ID");
    assert.strictEqual(retrievedSession!.id, session.id);
  });

  test("should return undefined for non-existent session ID", async () => {
    const retrievedSession = await storageService.getSessionById(
      "non-existent-id"
    );
    assert.strictEqual(retrievedSession, undefined);
  });

  test("should delete session by ID", async () => {
    const session = createMockSession();

    await storageService.saveSession(session);

    // Verify session exists
    const beforeDelete = await storageService.getSessionById(session.id);
    assert.ok(beforeDelete, "Session should exist before deletion");

    const deleteResult = await storageService.deleteSessionById(session.id);
    assert.strictEqual(
      deleteResult,
      true,
      "Should return true for successful deletion"
    );

    // Verify session is deleted
    const afterDelete = await storageService.getSessionById(session.id);
    assert.strictEqual(
      afterDelete,
      undefined,
      "Session should not exist after deletion"
    );
  });

  test("should return false when deleting non-existent session", async () => {
    const deleteResult = await storageService.deleteSessionById(
      "non-existent-id"
    );
    assert.strictEqual(
      deleteResult,
      false,
      "Should return false for non-existent session"
    );
  });

  test("should handle session validation errors", async () => {
    try {
      await storageService.saveSession(null as any);
      assert.fail("Should throw error for null session");
    } catch (error) {
      assert.ok((error as Error).message.includes("Session cannot be null"));
    }

    try {
      await storageService.saveSession({} as TypingSession);
      assert.fail("Should throw error for invalid session");
    } catch (error) {
      assert.ok(
        (error as Error).message.includes("Session must have valid ID")
      );
    }
  });

  // Paragraph Management Tests
  test("should save and retrieve custom paragraphs", async () => {
    const paragraph = createMockParagraph();

    await storageService.saveCustomParagraph(paragraph);

    const paragraphs = await storageService.getCustomParagraphs();
    assert.ok(paragraphs.length > 0, "Should have at least one paragraph");

    const savedParagraph = paragraphs.find((p) => p.id === paragraph.id);
    assert.ok(savedParagraph, "Should find the saved paragraph");
    assert.strictEqual(savedParagraph!.title, paragraph.title);
    assert.strictEqual(savedParagraph!.content, paragraph.content);
  });

  test("should update existing paragraph", async () => {
    const paragraph = createMockParagraph();

    // Save initial paragraph
    await storageService.saveCustomParagraph(paragraph);

    // Update paragraph
    const updatedParagraph = {
      ...paragraph,
      title: "Updated Title",
      content: "Updated content for testing.",
    };

    await storageService.saveCustomParagraph(updatedParagraph);

    // Verify update
    const paragraphs = await storageService.getCustomParagraphs();
    const savedParagraph = paragraphs.find((p) => p.id === paragraph.id);
    assert.strictEqual(savedParagraph!.title, "Updated Title");
    assert.strictEqual(savedParagraph!.content, "Updated content for testing.");
  });

  test("should delete custom paragraph", async () => {
    const paragraph = createMockParagraph();

    await storageService.saveCustomParagraph(paragraph);

    // Verify paragraph exists
    let paragraphs = await storageService.getCustomParagraphs();
    assert.ok(
      paragraphs.some((p) => p.id === paragraph.id),
      "Paragraph should exist"
    );

    const deleteResult = await storageService.deleteCustomParagraph(
      paragraph.id
    );
    assert.strictEqual(
      deleteResult,
      true,
      "Should return true for successful deletion"
    );

    // Verify paragraph is deleted
    paragraphs = await storageService.getCustomParagraphs();
    assert.ok(
      !paragraphs.some((p) => p.id === paragraph.id),
      "Paragraph should not exist after deletion"
    );
  });

  test("should handle paragraph validation", async () => {
    try {
      await storageService.saveCustomParagraph(null as any);
      assert.fail("Should throw error for null paragraph");
    } catch (error) {
      assert.ok((error as Error).message.includes("Invalid paragraph data"));
    }

    try {
      await storageService.saveCustomParagraph({} as CustomParagraph);
      assert.fail("Should throw error for invalid paragraph");
    } catch (error) {
      assert.ok((error as Error).message.includes("Invalid paragraph data"));
    }
  });

  // Settings Management Tests
  test("should save and retrieve settings", async () => {
    const settings = createMockSettings();

    await storageService.saveSettings(settings);

    const retrievedSettings = await storageService.getSettings();
    assert.strictEqual(retrievedSettings.defaultTimer, settings.defaultTimer);
    assert.strictEqual(
      retrievedSettings.showRealTimeStats,
      settings.showRealTimeStats
    );
    assert.strictEqual(retrievedSettings.theme, settings.theme);
  });

  test("should update settings", async () => {
    const initialSettings = createMockSettings();
    await storageService.saveSettings(initialSettings);

    // Update specific settings
    await storageService.updateSettings({
      defaultTimer: 120,
      theme: "dark",
    });

    const updatedSettings = await storageService.getSettings();
    assert.strictEqual(updatedSettings.defaultTimer, 120);
    assert.strictEqual(updatedSettings.theme, "dark");
    assert.strictEqual(
      updatedSettings.showRealTimeStats,
      initialSettings.showRealTimeStats
    ); // Should remain unchanged
  });

  test("should reset settings to defaults", async () => {
    // Save custom settings
    await storageService.saveSettings(
      createMockSettings({
        defaultTimer: 120,
        theme: "dark",
        showRealTimeStats: false,
      })
    );

    // Reset settings
    const resetResult = await storageService.resetSettings();
    assert.strictEqual(
      resetResult,
      true,
      "Should return true for successful reset"
    );

    const defaultSettings = await storageService.getSettings();
    assert.strictEqual(defaultSettings.defaultTimer, 60);
    assert.strictEqual(defaultSettings.showRealTimeStats, true);
    assert.strictEqual(defaultSettings.theme, "auto");
  });

  test("should handle settings validation", async () => {
    try {
      await storageService.saveSettings(null as any);
      assert.fail("Should throw error for null settings");
    } catch (error) {
      assert.ok((error as Error).message.includes("Settings canont be null"));
    }

    try {
      await storageService.saveSettings({} as ExtensionSettings);
      assert.fail("Should throw error for invalid settings");
    } catch (error) {
      assert.ok((error as Error).message.includes("Invalid settings provided"));
    }
  });

  // Integration Tests
  test("should create session from stored paragraph", async () => {
    const paragraph = createMockParagraph({
      content: "This is a test paragraph for integration testing.",
    });

    await storageService.saveCustomParagraph(paragraph);

    const paragraphs = await storageService.getCustomParagraphs();
    const retrievedParagraph = paragraphs.find((p) => p.id === paragraph.id);
    assert.ok(retrievedParagraph, "Should retrieve the saved paragraph");

    // Create session from paragraph
    const session = createMockSession({
      targetText: retrievedParagraph!.content,
      userInput: retrievedParagraph!.content, // assuming user typed perfectly
    });

    await storageService.saveSession(session);

    const sessions = await storageService.getAllSessions();
    const savedSession = sessions.find((s) => s.id === session.id);
    assert.ok(savedSession, "Should find session created from paragraph");
    assert.strictEqual(savedSession!.targetText, paragraph.content);
  });

  test("should handle multiple sessions and storage limits", async () => {
    // Create and save multiple sessions
    const sessions = [];
    for (let i = 0; i < 5; i++) {
      const session = createMockSession({
        id: `bulk-session-${i}`,
        targetText: `Test content ${i}`,
      });
      sessions.push(session);
      await storageService.saveSession(session);
    }

    // Verify all sessions are saved
    const allSessions = await storageService.getAllSessions();
    assert.ok(allSessions.length >= 5, "Should have at least 5 sessions");

    // Verify we can retrieve each session
    for (const session of sessions) {
      const retrieved = await storageService.getSessionById(session.id);
      assert.ok(retrieved, `Should retrieve session ${session.id}`);
    }
  });

  test("should handle concurrent paragraph operations", async () => {
    const paragraph1 = createMockParagraph({
      id: "concurrent-1",
      title: "Concurrent Test 1",
    });
    const paragraph2 = createMockParagraph({
      id: "concurrent-2",
      title: "Concurrent Test 2",
    });

    await storageService.saveCustomParagraph(paragraph1);
    await storageService.saveCustomParagraph(paragraph2);

    const paragraphs = await storageService.getCustomParagraphs();
    assert.ok(
      paragraphs.some((p) => p.id === "concurrent-1"),
      "Should find first paragraph"
    );
    assert.ok(
      paragraphs.some((p) => p.id === "concurrent-2"),
      "Should find second paragraph"
    );
  });
});
