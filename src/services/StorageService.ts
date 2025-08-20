import * as vscode from "vscode";
import { TypingSession } from "../models/TypingModel";

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

  // TODO: check for better error handling if needed
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
      vscode.window.showErrorMessage(`  Failed to delete session: ${error}`);
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
}
