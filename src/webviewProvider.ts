import * as vscode from "vscode";
import * as path from "path";
import { TypingSessionManager } from "./services/TypingSessionManager";
import { StorageService } from "./services/StorageService";
import { SessionConfig, SessionState } from "./models/SessionModel";
import {
  CustomParagraph,
  ExtensionSettings,
  TypingSession,
  TypingStats,
} from "./models/TypingModel";

export type WebviewMessage =
  | { type: "getParagraphs" }
  | { type: "startSession"; payload: SessionConfig }
  | { type: "endSession" }
  | { type: "pauseSession" }
  | { type: "resumeSession" }
  | { type: "keystroke"; payload: { character: string } }
  | { type: "getSessionHistory" }
  | { type: "getSettings" }
  | { type: "updateSettings"; payload: Partial<ExtensionSettings> }
  | { type: "saveParagraph"; payload: CustomParagraph }
  | { type: "deleteParagraph"; payload: { id: string } };

export type ExtensionMessage =
  | { type: "paragraphsLoaded"; payload: CustomParagraph[] }
  | { type: "sessionStarted"; payload: { sessionId: string } }
  | { type: "sessionUpdate"; payload: SessionState }
  | {
      type: "sessionCompleted";
      payload: { session: TypingSession; stats: TypingStats };
    }
  | { type: "sessionHistoryLoaded"; payload: TypingSession[] }
  | { type: "settingsLoaded"; payload: ExtensionSettings }
  | { type: "error"; payload: { message: string; details?: any } };

export class TypeshWebViewProvider implements vscode.WebviewViewProvider {
  public static readonly viewType = "typesh.typingTest";

  // _view indicates our whole webview
  private _view?: vscode.WebviewView;
  private currentManager: TypingSessionManager | null = null;

  constructor(
    private readonly context: vscode.ExtensionContext,
    private readonly storageService: StorageService
  ) {
    this.handleMessage = this.handleMessage.bind(this);
  }

  public resolveWebviewView(
    webviewView: vscode.WebviewView,
    context: vscode.WebviewViewResolveContext,
    token: vscode.CancellationToken
  ): Thenable<void> | void {
    this._view = webviewView;
  }

  //  Message Handler
  //  Each message type corresponds to a user action in our webview/react app
  private async handleMessage(message: WebviewMessage): Promise<void> {
    if (!this._view) return;

    try {
      switch (message.type) {
        case "getParagraphs":
          await this.handleGetParagraphs();
          break;

        case "startSession":
          await this.handleStartSession(message.payload);
          break;

        case "endSession":
          await this.handleEndSession();
          break;

        case "pauseSession":
          this.handlePauseSession();
          break;

        case "resumeSession":
          this.handleResumeSession();
          break;

        case "keystroke":
          this.handleKeystroke(message.payload.character);
          break;

        case "getSessionHistory":
          await this.handleGetSessionHistory();
          break;

        case "getSettings":
          await this.handleGetSettings();
          break;

        case "updateSettings":
          await this.handleUpdateSettings(message.payload);
          break;

        case "saveParagraph":
          await this.handleSaveParagraph(message.payload);
          break;

        case "deleteParagraph":
          await this.handleDeleteParagraph(message.payload.id);
          break;

        default:
          // We write a default to let us know if any non written case was found in message
          const _exhaustive: never = message;
          console.warn("Unhandled message type: ", message);
      }
    } catch (error) {
      this.sendMessage({
        type: "error",
        payload: {
          message:
            error instanceof Error ? error.message : "Unknown error occurred",
          details: error,
        },
      });
      console.error("WebviewProvider error:", error);
    }
  }

  private async handleGetParagraphs(): Promise<void> {
    const paragraphs = await this.storageService.getCustomParagraphs();
    this.sendMessage({
      type: "paragraphsLoaded",
      payload: paragraphs,
    });
  }

  private async handleStartSession(
    sessionConfig: SessionConfig
  ): Promise<void> {}

  private async handlePauseSession(): Promise<void> {}

  private async handleResumeSession(): Promise<void> {}

  private async handleKeystroke(key: string): Promise<void> {}

  private async handleGetSessionHistory(): Promise<void> {}

  private async handleGetSettings(): Promise<void> {}

  private async handleUpdateSettings(
    settings: Partial<ExtensionSettings>
  ): Promise<void> {}

  private async handleEndSession(): Promise<void> {}

  private async handleSaveParagraph(
    paragraph: CustomParagraph
  ): Promise<void> {}

  private async handleDeleteParagraph(id: string): Promise<void> {
    const deleted = await this.storageService.deleteCustomParagraph(id);

    if (!deleted) {
      throw new Error("Failed to delete paragraph");
    }

    await this.handleGetParagraphs();
  }
  private sendMessage(message: ExtensionMessage): void {}
}
