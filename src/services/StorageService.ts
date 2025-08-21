import * as vscode from "vscode";
import {
  CustomParagraph,
  ExtensionSettings,
  TypingSession,
} from "../models/TypingModel";

export class StorageService {
  private static readonly KEYS = {
    SESSIONS: "typingSessions",
    PARAGRAPHS: "customParagraphs",
    SETTINGS: "extensionSettings",
    DEFAULT_PARAGRAPHS: "defaultParagraphs",
  } as const;

  constructor(private context: vscode.ExtensionContext) {}

  // Session Management //

  public async saveSession(session: TypingSession): Promise<void> {
    try {
      this.validateSession(session);

      const sessions = await this.getAllSessions();
      sessions.push(session);

      // Keep only last 100 session in storage
      const limitedSessions = sessions.slice(-100);
      await this.context.globalState.update(
        StorageService.KEYS.SESSIONS,
        limitedSessions
      );
    } catch (error) {
      vscode.window.showErrorMessage(`Failed to save typing session: ${error}`);
      throw error;
    }
  }

  public async getAllSessions(): Promise<TypingSession[]> {
    try {
      const sessions = this.context.globalState.get(
        StorageService.KEYS.SESSIONS,
        []
      );
      return Array.isArray(sessions) ? sessions : [];
    } catch (error) {
      vscode.window.showErrorMessage(
        `Failed to retrieve typing sessions:${error} `
      );
      return [];
    }
  }

  public async getSessionById(id: string): Promise<TypingSession | undefined> {
    try {
      this.validateSessionId(id);
      const sessions = await this.getAllSessions();
      return sessions.find((s) => s.id === id);
    } catch (error) {
      vscode.window.showErrorMessage(`Failed to retrieve session: ${error}`);
      return undefined;
    }
  }

  public async deleteSessionById(id: string): Promise<boolean> {
    try {
      this.validateSessionId(id);

      const sessions = await this.getAllSessions();
      const initialLength = sessions.length;

      const filteredSessions = sessions.filter((s) => s.id !== id);

      if (filteredSessions.length === initialLength) return false; // Session with the ID provided was not found and deleted

      await this.context.globalState.update(
        StorageService.KEYS.SESSIONS,
        filteredSessions
      );

      return true;
    } catch (error) {
      vscode.window.showErrorMessage(`Failed to delete session: ${error}`);
      return false;
    }
  }

  private validateSessionId(id: string): void {
    if (!id || typeof id !== "string" || id.trim() === "")
      throw new Error("Session ID must be non-empty string");
  }

  private validateSession(session: TypingSession): void {
    if (!session) throw new Error("Session cannot be null or undefined");

    if (!session.id || typeof session.id !== "string")
      throw new Error("Session must have valid ID");
  }

  // Paragraph management //
  public async getCustomParagraphs(): Promise<CustomParagraph[]> {
    try {
      const paragraphs = this.context.globalState.get(
        StorageService.KEYS.PARAGRAPHS,
        []
      );
      return Array.isArray(paragraphs) ? paragraphs : [];
    } catch (error) {
      vscode.window.showErrorMessage(`Failed to retreive paragraphs: ${error}`);
      return [];
    }
  }

  public async saveCustomParagraph(paragraph: CustomParagraph): Promise<void> {
    try {
      if (!this.validateParagraph(paragraph)) {
        throw new Error("Invalid paragraph data");
      }

      const paragraphs = await this.getCustomParagraphs();
      const existingIndex = paragraphs.findIndex((p) => p.id === paragraph.id);

      if (existingIndex >= 0) {
        paragraphs[existingIndex] = paragraph; // Update existing
      } else {
        paragraphs.push(paragraph); // Add new
      }
      await this.context.globalState.update(
        StorageService.KEYS.PARAGRAPHS,
        paragraphs
      );
    } catch (error) {
      vscode.window.showErrorMessage(`Failed to save paragraph: ${error}`);
      throw error;
    }
  }

  public async deleteCustomParagraph(id: string): Promise<boolean> {
    try {
      if (!id || typeof id !== "string" || id.trim() === "")
        throw new Error("Paragraph ID cannot be empty");

      const paragraphs = await this.getCustomParagraphs();
      const initialLength = paragraphs.length;

      const filteredParagraphs = paragraphs.filter((p) => p.id !== id);

      if (filteredParagraphs.length === initialLength) return false;

      return true;
    } catch (error) {
      vscode.window.showErrorMessage(`Failed to delete paragraph: ${error}`);
      return false;
    }
  }

  private validateParagraph(paragraph: any): paragraph is CustomParagraph {
    if (!paragraph || typeof paragraph !== "object") {
      return false;
    }

    if (!paragraph.id || typeof paragraph.id !== "string") {
      return false;
    }

    if (!paragraph.title || typeof paragraph.title !== "string") {
      return false;
    }

    if (!paragraph.content || typeof paragraph.content !== "string") {
      return false;
    }

    if (
      paragraph.difficulty &&
      !["easy", "medium", "hard"].includes(paragraph.difficulty)
    ) {
      return false;
    }

    return true;
  }

  // Settings Management //
  public async saveSettings(settings: ExtensionSettings): Promise<void> {
    try {
      if (!settings) throw new Error("Settings canont be null");

      if (!this.validateSettings(settings))
        throw new Error("Invalid settings provided");

      await this.context.globalState.update(
        StorageService.KEYS.SETTINGS,
        settings
      );
    } catch (error) {
      vscode.window.showErrorMessage(`Failed to save settings: ${error}`);
      throw error;
    }
  }

  public async getSettings(): Promise<ExtensionSettings> {
    try {
      const storedSettings = this.context.globalState.get(
        StorageService.KEYS.SETTINGS,
        []
      );

      if (!storedSettings) return this.createDefaultSettings();

      if (this.validateSettings(storedSettings)) return storedSettings;

      console.warn("Storage settings are invalid, using defaults");
      vscode.window.showErrorMessage(
        "Setting were corrupted and hae been reset to defaults"
      );

      const defaultSettings = this.createDefaultSettings();
      await this.saveSettings(defaultSettings);

      return defaultSettings;
    } catch (error) {
      vscode.window.showErrorMessage(`Failed to get settings: ${error}`);
      return this.createDefaultSettings();
    }
  }

  public async updateSettings(
    settings: Partial<ExtensionSettings>
  ): Promise<void> {
    const currentSettings = await this.getSettings();
    const updatedSettings = { ...currentSettings, ...settings };

    await this.context.globalState.update(
      StorageService.KEYS.SETTINGS,
      updatedSettings
    );
  }

  private createDefaultSettings(): ExtensionSettings {
    return {
      defaultTimer: 60,
      showRealTimeStats: true,
      theme: "auto",
    };
  }

  private validateSettings(settings: any): settings is ExtensionSettings {
    if (!settings || typeof settings !== "object") {
      return false;
    }

    // Check required properties and their types
    if (
      typeof settings.defaultTimer !== "number" ||
      settings.defaultTimer <= 0
    ) {
      return false;
    }

    if (typeof settings.showRealTimeStats !== "boolean") {
      return false;
    }

    if (!["light", "dark", "auto"].includes(settings.theme)) {
      return false;
    }

    return true;
  }

  public async resetSettings(): Promise<boolean> {
    try {
      const defaultSettings = this.createDefaultSettings();
      await this.saveSettings(defaultSettings);

      vscode.window.showInformationMessage(
        "Settings have been reset to defaults"
      );
      return true;
    } catch (error) {
      vscode.window.showErrorMessage(`Failed to reset settings: ${error}`);
      return false;
    }
  }

  // Initialize default paragraphs (call once on first run)
  public async initializeDefaultParagraphs(): Promise<boolean> {
    try {
      const isFirstRun = this.context.globalState.get("isFirstRun", true);

      if (!isFirstRun) {
        return false;
      }

      const defaultParagraphs = this.getDefaultParagraphs();

      await this.context.globalState.update(
        StorageService.KEYS.DEFAULT_PARAGRAPHS,
        defaultParagraphs
      );
      await this.context.globalState.update("isFirstRun", false);

      vscode.window.showInformationMessage(
        "Default paragraphs initialized successfully"
      );
      return true;
    } catch (error) {
      vscode.window.showErrorMessage(
        `Failed to initialize default paragraphs: ${error}`
      );
      return false;
    }
  }

  private getDefaultParagraphs(): CustomParagraph[] {
    const now = new Date().toISOString();
    return [
      {
        id: "default-1",
        title: "Basic English",
        content:
          "The quick brown fox jumps over the lazy dog. This pangram contains all letters of the alphabet and is commonly used for typing practice.",
        dateAdded: new Date(now),
        difficulty: "easy",
        category: "Basic",
      },
      {
        id: "default-2",
        title: "Programming Concepts",
        content:
          "function calculateTypingSpeed(startTime, endTime, correctChars) { const timeInMinutes = (endTime - startTime) / 60000; return Math.round(correctChars / 5 / timeInMinutes); }",
        dateAdded: new Date(now),
        difficulty: "medium",
        category: "Programming",
      },
      {
        id: "default-3",
        title: "Advanced Text",
        content:
          "In the realm of software development, precision and speed are paramount. Developers must maintain accuracy while implementing complex algorithms, debugging intricate issues, and collaborating with diverse teams.",
        dateAdded: new Date(now),
        difficulty: "hard",
        category: "Professional",
      },
    ];
  }
}
