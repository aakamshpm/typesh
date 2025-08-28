const SERVICE_NAME = "KeystrokeCaptureService";
export type KeystrokeHandler = (key: string, event?: KeyboardEvent) => boolean;

export interface CaptureOptions {
  element?: HTMLElement;
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
  private handlers: Set<KeystrokeHandler> = new Set();

  constructor(options: CaptureOptions = {}) {
    try {
      this.options = {
        element: options.element || document.body,
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
}
