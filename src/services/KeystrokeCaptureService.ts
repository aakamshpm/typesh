export type KeystrokeHandler = (key: string, event?: KeyboardEvent) => boolean;

export interface CaptureOptions {
  element?: HTMLElement;
  preventDefault?: boolean;
  captureSpecialKeys?: string;
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
  private targetElement = HTMLElement;
  private options: Required<CaptureOptions>;
  private state: CaptureState;
  private handlers: Set<KeystrokeHandler> = new Set();
}
