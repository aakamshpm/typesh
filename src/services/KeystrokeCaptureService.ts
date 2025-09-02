const SERVICE_NAME = "KeystrokeCaptureService";
export type KeystrokeHandler = (key: string, event?: KeyboardEvent) => boolean;
export type FocusHandler = () => void;
export type BlurHandler = () => void;

export interface CaptureOptions {
  element: HTMLElement;
  preventDefault?: boolean;
  captureSpecialKeys?: boolean;
  enabledKeys?: string[];
  disabledKeys?: string[];
}

interface CaptureState {
  isActive: boolean;
  hasListeners: boolean;
  lastError: Error | null;
  errorCount: number;
}

export class KeystrokeCaptureService {
  private targetElement: HTMLElement;
  private options: Required<CaptureOptions>;
  private state: CaptureState;
  private handlers: Set<KeystrokeHandler> = new Set(); // using sets to prevent duplicates of handlers
  private focusHandlers: Set<FocusHandler> = new Set();
  private blurHandlers: Set<BlurHandler> = new Set();

  private boundKeyDownHandler: (event: KeyboardEvent) => void;
  private boundKeyPressHandler: (event: KeyboardEvent) => void;
  private boundFocusHandler: () => void;
  private boundBlurHandler: () => void;

  constructor(options: CaptureOptions) {
    try {
      this.options = {
        element: options.element,
        preventDefault: options.preventDefault ?? true,
        captureSpecialKeys: options.captureSpecialKeys ?? true,
        enabledKeys: options.enabledKeys || [],
        disabledKeys: options.disabledKeys || ["F5", "F12", "Tab", "F1"],
      };

      this.targetElement = this.options.element;
      this.state = {
        isActive: false,
        hasListeners: false,
        lastError: null,
        errorCount: 0,
      };

      this.boundKeyDownHandler = this.handleKeyDown.bind(this);
      this.boundKeyPressHandler = this.handleKeyPress.bind(this);
      this.boundFocusHandler = this.handleFocus.bind(this);
      this.boundBlurHandler = this.handleBlur.bind(this);

      this.validateAndSetupElement();

      console.log(`${SERVICE_NAME}: Initialized successfully`, {
        element: this.targetElement.tagName,
        options: this.options,
      });
    } catch (error) {
      console.error(`${SERVICE_NAME}: Initialization failed: ${error}`);
      throw new Error(
        `Failed to initialize keystroke capture: ${(error as Error).message}`
      );
    }
  }

  private validateAndSetupElement(): void {
    if (!this.targetElement)
      throw new Error("Target element is null or undefined");

    if (!(this.targetElement instanceof HTMLElement))
      throw new Error("Target element must be an HTMLElement");

    this.ensureElementFocusable(); // if the element is not focused, make sure its focused
  }

  private ensureElementFocusable(): void {
    try {
      if (this.targetElement.tabIndex < 0) this.targetElement.tabIndex = 0;

      if (!this.targetElement.style.outline)
        this.targetElement.style.outline = "none"; // removing default focus outline
    } catch (error) {
      console.warn(
        `${SERVICE_NAME}: Could not make element focusable: `,
        error
      );
    }
  }

  // Handlers //
  public addHandlers(handler: KeystrokeHandler): () => void {
    try {
      if (!handler || typeof handler !== "function")
        throw new Error("Handler must be a function");

      this.handlers.add(handler);
      console.log(
        `${SERVICE_NAME}: Handler added. Total handlers: ${this.handlers.size}`
      );

      // return a cleanup function to unsubscribe the activity
      return () => this.removeHandler(handler);
    } catch (error) {
      console.error(`${SERVICE_NAME}: Failed to add handler:`, error);
      throw error;
    }
  }

  public removeHandler(handler: KeystrokeHandler): boolean {
    try {
      const wasRemoved = this.handlers.delete(handler);

      if (wasRemoved) {
        console.log(
          `${SERVICE_NAME}: Handler removed. Remaining: ${this.handlers.size}`
        );
      } else {
        console.warn(
          `${SERVICE_NAME}: Attempted to remove non-existent handler`
        );
      }
      return wasRemoved;
    } catch (error) {
      console.error(`${SERVICE_NAME}: Failed to remove handler:`, error);
      return false;
    }
  }

  public clearHandlers(): void {
    try {
      const handlerCount = this.handlers.size;
      this.handlers.clear();

      console.log(`${SERVICE_NAME}: Cleared ${handlerCount} handlers`);
    } catch (error) {
      console.error(`${SERVICE_NAME}: Failed to clear handlers:`, error);
    }
  }

  // get current handler count (debugging fn)
  public getHandlerCount(): number {
    return this.handlers.size;
  }

  // Focus/Blur Handlers //
  public addFocusHandler(handler: FocusHandler): () => void {
    try {
      if (!handler || typeof handler !== "function")
        throw new Error("Focus handler must be a function");

      this.focusHandlers.add(handler);
      console.log(
        `${SERVICE_NAME}: Focus handler added. Total focus handlers: ${this.focusHandlers.size}`
      );

      return () => this.removeFocusHandler(handler);
    } catch (error) {
      console.error(`${SERVICE_NAME}: Failed to add focus handler:`, error);
      throw error;
    }
  }

  public removeFocusHandler(handler: FocusHandler): boolean {
    try {
      const wasRemoved = this.focusHandlers.delete(handler);

      if (wasRemoved) {
        console.log(
          `${SERVICE_NAME}: Focus handler removed. Remaining: ${this.focusHandlers.size}`
        );
      } else {
        console.warn(
          `${SERVICE_NAME}: Attempted to remove non-existent focus handler`
        );
      }
      return wasRemoved;
    } catch (error) {
      console.error(`${SERVICE_NAME}: Failed to remove focus handler:`, error);
      return false;
    }
  }

  public addBlurHandler(handler: BlurHandler): () => void {
    try {
      if (!handler || typeof handler !== "function")
        throw new Error("Blur handler must be a function");

      this.blurHandlers.add(handler);
      console.log(
        `${SERVICE_NAME}: Blur handler added. Total blur handlers: ${this.blurHandlers.size}`
      );

      return () => this.removeBlurHandler(handler);
    } catch (error) {
      console.error(`${SERVICE_NAME}: Failed to add blur handler:`, error);
      throw error;
    }
  }

  public removeBlurHandler(handler: BlurHandler): boolean {
    try {
      const wasRemoved = this.blurHandlers.delete(handler);

      if (wasRemoved) {
        console.log(
          `${SERVICE_NAME}: Blur handler removed. Remaining: ${this.blurHandlers.size}`
        );
      } else {
        console.warn(
          `${SERVICE_NAME}: Attempted to remove non-existent blur handler`
        );
      }
      return wasRemoved;
    } catch (error) {
      console.error(`${SERVICE_NAME}: Failed to remove blur handler:`, error);
      return false;
    }
  }

  public clearFocusHandlers(): void {
    try {
      const handlerCount = this.focusHandlers.size;
      this.focusHandlers.clear();

      console.log(`${SERVICE_NAME}: Cleared ${handlerCount} focus handlers`);
    } catch (error) {
      console.error(`${SERVICE_NAME}: Failed to clear focus handlers:`, error);
    }
  }

  public clearBlurHandlers(): void {
    try {
      const handlerCount = this.blurHandlers.size;
      this.blurHandlers.clear();

      console.log(`${SERVICE_NAME}: Cleared ${handlerCount} blur handlers`);
    } catch (error) {
      console.error(`${SERVICE_NAME}: Failed to clear blur handlers:`, error);
    }
  }

  public startCapture(): void {
    try {
      if (this.state.isActive) {
        console.warn(`${SERVICE_NAME}: Capture already active`);
        return;
      }

      if (this.handlers.size === 0)
        console.warn(
          `${SERVICE_NAME}: No handlers registered, capture not started`
        );

      if (!this.isElementValid())
        throw new Error("Target element is no longer valid");

      this.attachEventListeners();
      this.focusTargetElement();

      this.state.isActive = true;
      this.state.lastError = null;

      console.log(`${SERVICE_NAME}: Capture started successfully`);
    } catch (error) {
      this.handleStartupError(error as Error);
      throw error;
    }
  }

  public stopCapture(): void {
    try {
      if (!this.state.isActive) {
        console.log(`${SERVICE_NAME}: Capture already stopped`);
        return;
      }

      this.detachEventListeners();

      this.state.isActive = false;

      console.log(`${SERVICE_NAME}: Capture stopped successfully`);
    } catch (error) {
      console.error(`${SERVICE_NAME}: Error during stop:`, error);

      // Fail-safe: Force the state to be inactive even if cleanup failed
      this.state.isActive = false;
      this.state.hasListeners = false;
    }
  }

  private isElementValid(): boolean {
    try {
      return (
        this.targetElement &&
        this.targetElement.isConnected &&
        document.contains(this.targetElement)
      );
    } catch (error) {
      console.error(`${SERVICE_NAME}: Element validation failed: ${error}`);
      return false;
    }
  }

  private attachEventListeners(): void {
    try {
      if (this.state.hasListeners) this.detachEventListeners();

      this.targetElement.addEventListener("keydown", this.boundKeyDownHandler, {
        passive: false,
      });

      this.targetElement.addEventListener(
        "keypress",
        this.boundKeyPressHandler,
        { passive: false }
      );

      this.targetElement.addEventListener("focus", this.boundFocusHandler);
      this.targetElement.addEventListener("blur", this.boundBlurHandler);

      this.state.hasListeners = true;

      console.log(`${SERVICE_NAME}: Event listeners attached`);
    } catch (error) {
      console.error(`${SERVICE_NAME}: Failed to attach listeners:`, error);
      throw new Error(
        `Failed to attach event listeners: ${(error as Error).message}`
      );
    }
  }

  private detachEventListeners(): void {
    try {
      if (!this.state.hasListeners) {
        return;
      }

      this.targetElement.removeEventListener(
        "keydown",
        this.boundKeyDownHandler
      );
      this.targetElement.removeEventListener(
        "keypress",
        this.boundKeyPressHandler
      );
      this.targetElement.removeEventListener("focus", this.boundFocusHandler);
      this.targetElement.removeEventListener("blur", this.boundBlurHandler);

      this.state.hasListeners = false;

      console.log(`${SERVICE_NAME}: Event listeners detached`);
    } catch (error) {
      console.error(`${SERVICE_NAME}: Failed to detach listeners:`, error);
    }
  }

  private focusTargetElement(): void {
    try {
      if (
        this.isElementValid() &&
        typeof this.targetElement.focus === "function"
      ) {
        this.targetElement.focus();
        console.log(`${SERVICE_NAME}: Target Element focused`);
      }
    } catch (error) {
      console.warn(`${SERVICE_NAME}: Could not focus element:`, error);
    }
  }

  private handleStartupError(error: Error): void {
    this.state.lastError = error;
    this.state.errorCount++;
    this.state.isActive = false;

    console.error(`${SERVICE_NAME}: Startup failed:`, {
      error: error.message,
      errorCount: this.state.errorCount,
    });

    // Clean up if partially initialized
    try {
      this.detachEventListeners();
    } catch (cleanupError) {
      console.error(
        `${SERVICE_NAME}: Cleanup after startup error failed:`,
        cleanupError
      );
    }
  }

  private handleKeyDown(event: KeyboardEvent): void {
    if (!this.state.isActive) return;

    if (!this.shouldProcessKey(event)) return;

    const normalizedKey = this.normalizeKey(event);

    // Dispatch keystroke for all keys that pass the filter
    this.dispatchKeystroke(normalizedKey, event);

    if (this.shouldPreventDefault(event)) {
      event.preventDefault();
    }
  }

  private handleKeyPress(event: KeyboardEvent): void {
    if (!this.state.isActive) {
      return;
    }

    const key = event.key;
    if (key.length === 1) {
      if (this.shouldProcessKey(event)) {
        this.dispatchKeystroke(key, event);
      }
    }

    if (this.shouldPreventDefault(event)) {
      event.preventDefault();
    }
  }

  private handleFocus(): void {
    if (!this.state.isActive) return;

    console.log(`${SERVICE_NAME}: Element gained focus`);

    // Dispatch to all registered focus handlers
    this.focusHandlers.forEach((handler) => {
      try {
        handler();
      } catch (error) {
        console.error(`${SERVICE_NAME}: A focus handler failed:`, error);
      }
    });
  }

  private handleBlur(): void {
    if (!this.state.isActive) return;

    console.log(`${SERVICE_NAME}: Element lost focus`);

    // Dispatch to all registered blur handlers
    this.blurHandlers.forEach((handler) => {
      try {
        handler();
      } catch (error) {
        console.error(`${SERVICE_NAME}: A blur handler failed:`, error);
      }
    });
  }

  private dispatchKeystroke(key: string, event: KeyboardEvent): void {
    console.log(
      `${SERVICE_NAME}: Dispatching key '${key === "\b" ? "Backspace" : key}'`
    );

    // Loop through every registered handler.
    this.handlers.forEach((handler) => {
      try {
        handler(key, event);
      } catch (error) {
        console.error(
          `${SERVICE_NAME}: A handler failed to process a keystroke:`,
          {
            key: key,
            error: error,
          }
        );
      }
    });
  }

  private shouldProcessKey(event: KeyboardEvent): boolean {
    if (event.ctrlKey || event.altKey || event.metaKey) return false;

    if (!event.key) return false;

    if (this.options.disabledKeys.includes(event.key)) return false;

    if (
      this.options.enabledKeys.length > 0 &&
      !this.options.enabledKeys.includes(event.key)
    )
      return false;

    return true;
  }

  private normalizeKey(event: KeyboardEvent): string {
    switch (event.key) {
      case "Backspace":
        return "\b";
      case "Enter":
        return "\n";
      default:
        return event.key; // For all other keys, use their standard name
    }
  }

  private isSpecialKey(key: string): boolean {
    return key === "\b" || key === "\n";
  }

  private shouldPreventDefault(event: KeyboardEvent): boolean {
    // If the user has disabled preventDefault globally, then never prevent it.
    if (!this.options.preventDefault) {
      return false;
    }

    if (event.key === "Backspace" || event.key === " ") {
      return true;
    }

    if (event.key.length === 1) {
      return true;
    }

    return false;
  }
}
