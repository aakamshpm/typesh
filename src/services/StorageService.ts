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
      const paragraphs = await this.getCustomParagraphs();
      paragraphs.push(paragraph);
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
}
