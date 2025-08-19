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

  public async saveSession(session: TypingSession): Promise<void> {
    try {
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
    return this.context.globalState.get(StorageService.KEYS.SESSIONS, []);
  }
}
