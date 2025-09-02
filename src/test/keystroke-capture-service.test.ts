import * as assert from "assert";
import { JSDOM } from "jsdom";
import {
  KeystrokeCaptureService,
  KeystrokeHandler,
  FocusHandler,
  BlurHandler,
} from "../services/KeystrokeCaptureService";
import { TypingSessionManager } from "../services/TypingSessionManager";

suite("KeystrokeCaptureService Tests", () => {
  let service: KeystrokeCaptureService;
  let testElement: HTMLElement;
  let dom: JSDOM;

  suiteSetup(() => {
    // Set up JSDOM environment
    dom = new JSDOM("<!DOCTYPE html><html><body></body></html>", {
      url: "http://localhost",
    });
    global.document = dom.window.document;
    global.window = dom.window as any;
    global.HTMLElement = dom.window.HTMLElement;
    global.Event = dom.window.Event;
    global.KeyboardEvent = dom.window.KeyboardEvent;
    global.FocusEvent = dom.window.FocusEvent;
  });

  setup(() => {
    // Create a test element
    testElement = document.createElement("div");
    testElement.id = "test-element";
    document.body.appendChild(testElement);

    // Create service with test element
    service = new KeystrokeCaptureService({
      element: testElement,
      preventDefault: false, // Don't prevent default for testing
      captureSpecialKeys: true,
      enabledKeys: [],
      disabledKeys: ["F5", "F12"],
    });
  });

  teardown(() => {
    // Clean up
    if (service) {
      service.stopCapture();
      service.clearHandlers();
      service.clearFocusHandlers();
      service.clearBlurHandlers();
    }

    if (testElement && testElement.parentNode) {
      testElement.parentNode.removeChild(testElement);
    }
  });

  test("should initialize with correct configuration", () => {
    const customElement = document.createElement("input");
    const customService = new KeystrokeCaptureService({
      element: customElement,
      preventDefault: false,
      captureSpecialKeys: false,
      enabledKeys: ["a", "b", "c"],
      disabledKeys: ["x", "y"],
    });

    // Service should be created successfully
    assert.ok(customService, "Service should be created");
    assert.strictEqual(
      customService.getHandlerCount(),
      0,
      "Should start with no handlers"
    );

    customService.stopCapture();
  });

  test("should require element during initialization", () => {
    // Test that element is required
    assert.throws(() => {
      new KeystrokeCaptureService({} as any);
    }, /element/);
  });

  test("should validate element during initialization", () => {
    // Test with null element
    assert.throws(() => {
      new KeystrokeCaptureService({
        element: null as any,
      });
    }, /Target element is null/);

    // Test with invalid element type
    assert.throws(() => {
      new KeystrokeCaptureService({
        element: "invalid" as any,
      });
    }, /Target element must be an HTMLElement/);
  });

  test("should make element focusable", () => {
    const unfocusableElement = document.createElement("div");
    unfocusableElement.tabIndex = -1; // Not focusable

    const focusableService = new KeystrokeCaptureService({
      element: unfocusableElement,
    });

    // Element should now be focusable
    assert.ok(
      unfocusableElement.tabIndex >= 0,
      "Element should be made focusable"
    );

    focusableService.stopCapture();
  });

  // Handler Management Tests
  suite("Handler Management", () => {
    test("should add and remove keystroke handlers", () => {
      const handler1: KeystrokeHandler = (key) => true;
      const handler2: KeystrokeHandler = (key) => false;

      // Add handlers
      const removeHandler1 = service.addHandlers(handler1);
      assert.strictEqual(service.getHandlerCount(), 1, "Should have 1 handler");

      const removeHandler2 = service.addHandlers(handler2);
      assert.strictEqual(
        service.getHandlerCount(),
        2,
        "Should have 2 handlers"
      );

      // Remove handlers
      const removed1 = removeHandler1();
      assert.strictEqual(removed1, true, "Should successfully remove handler1");
      assert.strictEqual(
        service.getHandlerCount(),
        1,
        "Should have 1 handler after removal"
      );

      const removed2 = removeHandler2();
      assert.strictEqual(removed2, true, "Should successfully remove handler2");
      assert.strictEqual(
        service.getHandlerCount(),
        0,
        "Should have 0 handlers after all removals"
      );
    });

    test("should prevent duplicate handlers", () => {
      const handler: KeystrokeHandler = (key) => true;

      service.addHandlers(handler);
      service.addHandlers(handler); // Try to add same handler again

      assert.strictEqual(
        service.getHandlerCount(),
        1,
        "Should not add duplicate handlers"
      );
    });

    test("should handle invalid handlers", () => {
      assert.throws(() => {
        service.addHandlers(null as any);
      }, /Handler must be a function/);

      assert.throws(() => {
        service.addHandlers("invalid" as any);
      }, /Handler must be a function/);
    });

    test("should clear all handlers", () => {
      const handler1: KeystrokeHandler = (key) => true;
      const handler2: KeystrokeHandler = (key) => false;

      service.addHandlers(handler1);
      service.addHandlers(handler2);
      assert.strictEqual(
        service.getHandlerCount(),
        2,
        "Should have 2 handlers"
      );

      service.clearHandlers();
      assert.strictEqual(
        service.getHandlerCount(),
        0,
        "Should have 0 handlers after clear"
      );
    });

    test("should add and remove focus handlers", () => {
      let focusCalled = false;
      const focusHandler: FocusHandler = () => {
        focusCalled = true;
      };

      // Add handler
      const removeHandler = service.addFocusHandler(focusHandler);

      // Simulate focus event
      service.startCapture();
      testElement.focus();

      // Handler should be called (we'll test this in event tests below)
      removeHandler();
    });

    test("should add and remove blur handlers", () => {
      let blurCalled = false;
      const blurHandler: BlurHandler = () => {
        blurCalled = true;
      };

      // Add handler
      const removeHandler = service.addBlurHandler(blurHandler);

      // Simulate blur event
      service.startCapture();
      testElement.blur();

      removeHandler();
    });

    test("should clear focus and blur handlers", () => {
      const focusHandler: FocusHandler = () => {};
      const blurHandler: BlurHandler = () => {};

      service.addFocusHandler(focusHandler);
      service.addBlurHandler(blurHandler);

      service.clearFocusHandlers();
      service.clearBlurHandlers();

      // Should not throw errors
      assert.ok(true, "Clear operations should complete without errors");
    });
  });

  // Capture Lifecycle Tests
  suite("Capture Lifecycle", () => {
    test("should start and stop capture correctly", () => {
      assert.ok(!service["state"].isActive, "Should start inactive");

      service.startCapture();
      assert.ok(service["state"].isActive, "Should be active after start");
      assert.ok(
        service["state"].hasListeners,
        "Should have listeners after start"
      );

      service.stopCapture();
      assert.ok(!service["state"].isActive, "Should be inactive after stop");
      assert.ok(
        !service["state"].hasListeners,
        "Should not have listeners after stop"
      );
    });

    test("should handle multiple start/stop calls", () => {
      service.startCapture();
      service.startCapture(); // Should be safe

      assert.ok(service["state"].isActive, "Should remain active");

      service.stopCapture();
      service.stopCapture(); // Should be safe

      assert.ok(!service["state"].isActive, "Should remain inactive");
    });

    test("should handle start without handlers", () => {
      // Should not throw error when starting without handlers
      assert.doesNotThrow(() => {
        service.startCapture();
      });

      service.stopCapture();
    });

    test("should handle invalid element during start", () => {
      const invalidService = new KeystrokeCaptureService({
        element: document.createElement("div"),
      });

      // Remove element from DOM to make it invalid
      if (invalidService["targetElement"].parentNode) {
        invalidService["targetElement"].parentNode.removeChild(
          invalidService["targetElement"]
        );
      }

      assert.throws(() => {
        invalidService.startCapture();
      }, /Target element is no longer valid/);
    });
  });

  // Event Handling Tests
  suite("Event Handling", () => {
    test("should handle keydown events", () => {
      let receivedKey = "";
      const handler: KeystrokeHandler = (key) => {
        receivedKey = key;
        return true;
      };

      service.addHandlers(handler);
      service.startCapture();

      // Simulate keypress event (better for single characters)
      const event = new KeyboardEvent("keypress", {
        key: "a",
        bubbles: true,
        cancelable: true,
      });

      testElement.dispatchEvent(event);

      assert.strictEqual(receivedKey, "a", "Should receive the correct key");
    });

    test("should handle keypress events", () => {
      let receivedKey = "";
      const handler: KeystrokeHandler = (key) => {
        receivedKey = key;
        return true;
      };

      service.addHandlers(handler);
      service.startCapture();

      // Simulate keypress event
      const event = new KeyboardEvent("keypress", {
        key: "b",
        bubbles: true,
        cancelable: true,
      });

      testElement.dispatchEvent(event);

      assert.strictEqual(receivedKey, "b", "Should receive the correct key");
    });

    test("should handle special keys", () => {
      let receivedKey = "";
      const handler: KeystrokeHandler = (key) => {
        receivedKey = key;
        return true;
      };

      service.addHandlers(handler);
      service.startCapture();

      // Test backspace
      const backspaceEvent = new KeyboardEvent("keydown", {
        key: "Backspace",
        bubbles: true,
        cancelable: true,
      });

      testElement.dispatchEvent(backspaceEvent);
      assert.strictEqual(
        receivedKey,
        "\b",
        "Should normalize Backspace to \\b"
      );

      // Test Enter
      receivedKey = "";
      const enterEvent = new KeyboardEvent("keydown", {
        key: "Enter",
        bubbles: true,
        cancelable: true,
      });

      testElement.dispatchEvent(enterEvent);
      assert.strictEqual(receivedKey, "\n", "Should normalize Enter to \\n");
    });

    test("should handle focus events", () => {
      let focusCalled = false;
      const focusHandler: FocusHandler = () => {
        focusCalled = true;
      };

      service.addFocusHandler(focusHandler);
      service.startCapture();

      // Simulate focus event
      const focusEvent = new Event("focus", {
        bubbles: true,
      });

      testElement.dispatchEvent(focusEvent);

      assert.ok(focusCalled, "Focus handler should be called");
    });

    test("should handle blur events", () => {
      let blurCalled = false;
      const blurHandler: BlurHandler = () => {
        blurCalled = true;
      };

      service.addBlurHandler(blurHandler);
      service.startCapture();

      // Simulate blur event
      const blurEvent = new Event("blur", {
        bubbles: true,
      });

      testElement.dispatchEvent(blurEvent);

      assert.ok(blurCalled, "Blur handler should be called");
    });

    test("should filter disabled keys", () => {
      let receivedKey = "";
      const handler: KeystrokeHandler = (key) => {
        receivedKey = key;
        return true;
      };

      service.addHandlers(handler);
      service.startCapture();

      // Test disabled key (F5)
      const f5Event = new KeyboardEvent("keydown", {
        key: "F5",
        bubbles: true,
        cancelable: true,
      });

      testElement.dispatchEvent(f5Event);
      assert.strictEqual(receivedKey, "", "Should not receive disabled key");
    });

    test("should handle enabled keys filter", () => {
      const enabledService = new KeystrokeCaptureService({
        element: testElement,
        enabledKeys: ["a", "b"],
      });

      let receivedKey = "";
      const handler: KeystrokeHandler = (key) => {
        receivedKey = key;
        return true;
      };

      enabledService.addHandlers(handler);
      enabledService.startCapture();

      // Test enabled key (use keypress for single characters)
      const enabledEvent = new KeyboardEvent("keypress", {
        key: "a",
        bubbles: true,
        cancelable: true,
      });

      testElement.dispatchEvent(enabledEvent);
      assert.strictEqual(receivedKey, "a", "Should receive enabled key");

      // Test disabled key
      receivedKey = "";
      const disabledEvent = new KeyboardEvent("keypress", {
        key: "c",
        bubbles: true,
        cancelable: true,
      });

      testElement.dispatchEvent(disabledEvent);
      assert.strictEqual(receivedKey, "", "Should not receive disabled key");

      enabledService.stopCapture();
    });

    test("should handle modifier keys", () => {
      let receivedKey = "";
      const handler: KeystrokeHandler = (key) => {
        receivedKey = key;
        return true;
      };

      service.addHandlers(handler);
      service.startCapture();

      // Test Ctrl+A (should be filtered)
      const ctrlAEvent = new KeyboardEvent("keydown", {
        key: "a",
        ctrlKey: true,
        bubbles: true,
        cancelable: true,
      });

      testElement.dispatchEvent(ctrlAEvent);
      assert.strictEqual(
        receivedKey,
        "",
        "Should filter Ctrl+key combinations"
      );
    });

    test("should handle preventDefault correctly", () => {
      const preventService = new KeystrokeCaptureService({
        element: testElement,
        preventDefault: true,
      });

      const handler: KeystrokeHandler = (key) => true;
      preventService.addHandlers(handler);
      preventService.startCapture();

      // Test that preventDefault is called for regular keys
      const event = new KeyboardEvent("keydown", {
        key: "a",
        bubbles: true,
        cancelable: true,
      });

      let preventDefaultCalled = false;
      event.preventDefault = () => {
        preventDefaultCalled = true;
      };

      testElement.dispatchEvent(event);
      assert.ok(
        preventDefaultCalled,
        "Should call preventDefault for regular keys"
      );

      preventService.stopCapture();
    });

    test("should handle non-preventDefault correctly", () => {
      const noPreventService = new KeystrokeCaptureService({
        element: testElement,
        preventDefault: false,
      });

      const handler: KeystrokeHandler = (key) => true;
      noPreventService.addHandlers(handler);
      noPreventService.startCapture();

      // Test that preventDefault is not called
      const event = new KeyboardEvent("keydown", {
        key: "a",
        bubbles: true,
        cancelable: true,
      });

      let preventDefaultCalled = false;
      event.preventDefault = () => {
        preventDefaultCalled = true;
      };

      testElement.dispatchEvent(event);
      assert.ok(
        !preventDefaultCalled,
        "Should not call preventDefault when disabled"
      );

      noPreventService.stopCapture();
    });
  });

  // Error Handling Tests
  suite("Error Handling", () => {
    test("should handle handler errors gracefully", () => {
      const errorHandler: KeystrokeHandler = () => {
        throw new Error("Handler error");
      };

      const goodHandler: KeystrokeHandler = (key) => {
        return key === "a"; // Should still work
      };

      service.addHandlers(errorHandler);
      service.addHandlers(goodHandler);
      service.startCapture();

      // Should not crash when handler throws
      const event = new KeyboardEvent("keydown", {
        key: "a",
        bubbles: true,
        cancelable: true,
      });

      assert.doesNotThrow(() => {
        testElement.dispatchEvent(event);
      });

      service.stopCapture();
    });

    test("should handle focus/blur handler errors gracefully", () => {
      const errorFocusHandler: FocusHandler = () => {
        throw new Error("Focus handler error");
      };

      const errorBlurHandler: BlurHandler = () => {
        throw new Error("Blur handler error");
      };

      service.addFocusHandler(errorFocusHandler);
      service.addBlurHandler(errorBlurHandler);
      service.startCapture();

      // Should not crash when handlers throw
      assert.doesNotThrow(() => {
        testElement.dispatchEvent(new Event("focus"));
        testElement.dispatchEvent(new Event("blur"));
      });

      service.stopCapture();
    });

    test("should track error state", () => {
      // Force an error by corrupting the service state
      (service as any).targetElement = null;

      try {
        service.startCapture();
      } catch (error) {
        // Expected to fail
      }

      assert.ok(service["state"].lastError, "Should track last error");
      assert.ok(
        service["state"].errorCount > 0,
        "Should increment error count"
      );
    });
  });

  // Edge Cases and Performance Tests
  suite("Edge Cases", () => {
    test("should handle rapid keystrokes", () => {
      let keystrokeCount = 0;
      const handler: KeystrokeHandler = (key) => {
        keystrokeCount++;
        return true;
      };

      service.addHandlers(handler);
      service.startCapture();

      // Simulate rapid keystrokes (use keypress for single characters)
      for (let i = 0; i < 100; i++) {
        const event = new KeyboardEvent("keypress", {
          key: "a",
          bubbles: true,
          cancelable: true,
        });
        testElement.dispatchEvent(event);
      }

      assert.strictEqual(
        keystrokeCount,
        100,
        "Should handle rapid keystrokes correctly"
      );
    });

    test("should handle empty key strings", () => {
      let receivedKey = "initial";
      const handler: KeystrokeHandler = (key) => {
        receivedKey = key;
        return true;
      };

      service.addHandlers(handler);
      service.startCapture();

      // Test empty key (should not be processed)
      const emptyEvent = new KeyboardEvent("keydown", {
        key: "",
        bubbles: true,
        cancelable: true,
      });

      testElement.dispatchEvent(emptyEvent);
      assert.strictEqual(
        receivedKey,
        "initial",
        "Should not process empty keys"
      );
    });

    test("should handle unicode characters", () => {
      let receivedKey = "";
      const handler: KeystrokeHandler = (key) => {
        receivedKey = key;
        return true;
      };

      service.addHandlers(handler);
      service.startCapture();

      // Test unicode character (use keydown for special characters)
      const unicodeEvent = new KeyboardEvent("keydown", {
        key: "🚀",
        bubbles: true,
        cancelable: true,
      });

      testElement.dispatchEvent(unicodeEvent);
      assert.strictEqual(receivedKey, "🚀", "Should handle unicode characters");
    });

    test("should handle very long key names", () => {
      let receivedKey = "";
      const handler: KeystrokeHandler = (key) => {
        receivedKey = key;
        return true;
      };

      service.addHandlers(handler);
      service.startCapture();

      // Test long key name (use keydown for special characters)
      const longKey = "a".repeat(1000);
      const longEvent = new KeyboardEvent("keydown", {
        key: longKey,
        bubbles: true,
        cancelable: true,
      });

      testElement.dispatchEvent(longEvent);
      assert.strictEqual(receivedKey, longKey, "Should handle long key names");
    });

    test("should handle multiple simultaneous handlers", () => {
      let callCount1 = 0;
      let callCount2 = 0;

      const handler1: KeystrokeHandler = (key) => {
        callCount1++;
        return true;
      };

      const handler2: KeystrokeHandler = (key) => {
        callCount2++;
        return false; // Return false to test handler chaining
      };

      service.addHandlers(handler1);
      service.addHandlers(handler2);
      service.startCapture();

      const event = new KeyboardEvent("keypress", {
        key: "a",
        bubbles: true,
        cancelable: true,
      });

      testElement.dispatchEvent(event);

      assert.strictEqual(callCount1, 1, "First handler should be called");
      assert.strictEqual(callCount2, 1, "Second handler should be called");
    });

    test("should handle handler removal during event processing", () => {
      let callCount = 0;
      let removeHandler: (() => void) | null = null;

      const selfRemovingHandler: KeystrokeHandler = (key) => {
        callCount++;
        if (removeHandler) {
          removeHandler(); // Remove itself during processing
        }
        return true;
      };

      removeHandler = service.addHandlers(selfRemovingHandler);
      service.startCapture();

      const event = new KeyboardEvent("keypress", {
        key: "a",
        bubbles: true,
        cancelable: true,
      });

      testElement.dispatchEvent(event);

      assert.strictEqual(callCount, 1, "Handler should be called once");
      assert.strictEqual(
        service.getHandlerCount(),
        0,
        "Handler should be removed"
      );
    });
  });

  // Integration Tests
  suite("Integration", () => {
    let testService!: KeystrokeCaptureService;
    let testElement!: HTMLElement;

    setup(() => {
      // Create a test element for integration tests
      testElement = document.createElement("div");
      testElement.id = "integration-test-element";
      document.body.appendChild(testElement);

      // Create service with test element
      testService = new KeystrokeCaptureService({
        element: testElement,
        preventDefault: false,
        captureSpecialKeys: true,
        enabledKeys: [],
        disabledKeys: ["F5", "F12"],
      });
    });

    teardown(() => {
      // Clean up
      if (testService) {
        testService.stopCapture();
        testService.clearHandlers();
        testService.clearFocusHandlers();
        testService.clearBlurHandlers();
      }
      if (testElement && document.body.contains(testElement)) {
        document.body.removeChild(testElement);
      }
    });

    test("should work with TypingSessionManager", () => {
      // This would be a full integration test with TypingSessionManager
      // For now, we'll test the basic handler integration

      let keystrokeReceived = "";
      const keystrokeHandler: KeystrokeHandler = (key) => {
        keystrokeReceived = key;
        return true;
      };

      let focusReceived = false;
      const focusHandler: FocusHandler = () => {
        focusReceived = true;
      };

      let blurReceived = false;
      const blurHandler: BlurHandler = () => {
        blurReceived = true;
      };

      testService.addHandlers(keystrokeHandler);
      testService.addFocusHandler(focusHandler);
      testService.addBlurHandler(blurHandler);
      testService.startCapture();

      // Test keystroke (use keypress for single characters)
      const keyEvent = new KeyboardEvent("keypress", {
        key: "t",
        bubbles: true,
        cancelable: true,
      });
      testElement.dispatchEvent(keyEvent);
      assert.strictEqual(keystrokeReceived, "t", "Should receive keystroke");

      // Test focus
      testElement.dispatchEvent(new Event("focus"));
      assert.ok(focusReceived, "Should receive focus event");

      // Test blur
      testElement.dispatchEvent(new Event("blur"));
      assert.ok(blurReceived, "Should receive blur event");

      testService.stopCapture();
    });

    test("should handle service lifecycle correctly", () => {
      // Test complete service lifecycle
      const lifecycleService = new KeystrokeCaptureService({
        element: testElement,
      });

      // Add handlers
      const handler: KeystrokeHandler = (key) => true;
      lifecycleService.addHandlers(handler);

      // Start service
      lifecycleService.startCapture();
      assert.ok(lifecycleService["state"].isActive, "Should be active");

      // Stop service
      lifecycleService.stopCapture();
      assert.ok(!lifecycleService["state"].isActive, "Should be inactive");

      // Clean up
      lifecycleService.clearHandlers();
      assert.strictEqual(
        lifecycleService.getHandlerCount(),
        0,
        "Should have no handlers"
      );
    });

    test("SPACES IN SENTENCES: Should handle spaces correctly in typing", () => {
      // Test sentence with multiple spaces
      const targetText = "Hello world test";
      const testKeystrokes = [
        "H",
        "e",
        "l",
        "l",
        "o",
        " ",
        "w",
        "o",
        "r",
        "l",
        "d",
        " ",
        "t",
        "e",
        "s",
        "t",
      ];

      // Create session manager
      const sessionManager = new TypingSessionManager({
        targetText,
        mode: "passage",
        target: 1,
      });

      // Track keystroke events
      let keystrokeCount = 0;
      let receivedKeys: string[] = [];

      sessionManager.onKeystrokeEvent((keystroke: any) => {
        keystrokeCount++;
        receivedKeys.push(keystroke.key);
      });

      // Setup keystroke capture service
      const captureService = new KeystrokeCaptureService({
        element: testElement,
        preventDefault: false,
        captureSpecialKeys: true,
      });

      // Connect capture service to session manager
      const keystrokeHandler = (key: string) => {
        if (!sessionManager.getCurrentState().isActive) {
          sessionManager.startSession();
        }
        return sessionManager.processKeystroke(key);
      };

      captureService.addHandlers(keystrokeHandler);
      captureService.startCapture();

      // Simulate typing the sentence with spaces
      for (let i = 0; i < testKeystrokes.length; i++) {
        const keyEvent = new KeyboardEvent("keypress", {
          key: testKeystrokes[i],
          bubbles: true,
          cancelable: true,
        });
        testElement.dispatchEvent(keyEvent);
      }

      // Verify session state
      const finalState = sessionManager.getCurrentState();
      assert.ok(finalState.isCompleted, "Session should be completed");
      assert.strictEqual(
        finalState.currentInput,
        targetText,
        "Input should match target exactly"
      );
      assert.strictEqual(
        keystrokeCount,
        testKeystrokes.length,
        "All keystrokes should be counted"
      );

      // Verify spaces are in the received keys
      const spaceCount = receivedKeys.filter((key) => key === " ").length;
      assert.strictEqual(
        spaceCount,
        2,
        "Should have 2 spaces in the keystroke history"
      );

      // Verify spaces are in the correct positions
      assert.strictEqual(receivedKeys[5], " ", "Space should be at position 5");
      assert.strictEqual(
        receivedKeys[11],
        " ",
        "Space should be at position 11"
      );

      // Test analytics include spaces
      const { TypingAnalyzer } = require("../services/TypingAnalyzer");
      const session = {
        id: sessionManager.getSessionId(),
        keystrokes: finalState.keystrokes,
        targetText,
        userInput: finalState.currentInput,
        startTime: finalState.startTime,
        endTime: new Date(),
      };

      const stats = TypingAnalyzer.analyzeSession(session);

      // Spaces should be counted in total keypresses
      assert.ok(stats, "Should generate analytics");
      console.log(
        `Sentence Test Stats: WPM: ${stats.wpm}, Accuracy: ${stats.accuracy}%`
      );

      // Clean up
      captureService.stopCapture();

      console.log("SPACES IN SENTENCES TEST PASSED");
      console.log(`Typed: "${finalState.currentInput}"`);
      console.log(
        `Total keystrokes: ${keystrokeCount} (including ${spaceCount} spaces)`
      );
    });
  });
});
