# Typing Speed Tester - Backend API Documentation

## Overview

This document provides a comprehensive overview of all backend services, models, and functions available in the Typing Speed Tester VS Code extension. This will help frontend developers understand what functionality is available without needing to dive into the implementation details.

## Table of Contents

1. [Core Services](#core-services)
2. [Models & Data Types](#models--data-types)
3. [Utility Components](#utility-components)
4. [Extension Integration](#extension-integration)
5. [Usage Examples](#usage-examples)
6. [Missing Features Analysis](#missing-features-analysis)

---

## Core Services

### 1. KeystrokeCaptureService

**Purpose**: Captures and processes keyboard events from HTML elements with comprehensive filtering and event handling.

#### Constructor

```typescript
new KeystrokeCaptureService(options: CaptureOptions)
```

#### Options Interface

```typescript
interface CaptureOptions {
  element: HTMLElement; // Target element for capturing keystrokes
  preventDefault?: boolean; // Default: true - Prevent default browser behavior
  captureSpecialKeys?: boolean; // Default: true - Capture special keys like Backspace, Enter
  enabledKeys?: string[]; // If specified, only these keys will be captured
  disabledKeys?: string[]; // Default: ["F5", "F12", "Tab", "F1"] - Keys to ignore
}
```

#### Handler Types

```typescript
type KeystrokeHandler = (key: string, event?: KeyboardEvent) => boolean;
type FocusHandler = () => void;
type BlurHandler = () => void;
```

#### Public Methods

##### Keystroke Handler Management

- `addHandlers(handler: KeystrokeHandler): () => void` - Add keystroke handler, returns cleanup function
- `removeHandler(handler: KeystrokeHandler): boolean` - Remove specific handler
- `clearHandlers(): void` - Remove all keystroke handlers
- `getHandlerCount(): number` - Get current handler count (debugging)

##### Focus/Blur Handler Management

- `addFocusHandler(handler: FocusHandler): () => void` - Add focus handler
- `removeFocusHandler(handler: FocusHandler): boolean` - Remove focus handler
- `addBlurHandler(handler: BlurHandler): () => void` - Add blur handler
- `removeBlurHandler(handler: BlurHandler): boolean` - Remove blur handler
- `clearFocusHandlers(): void` - Clear all focus handlers
- `clearBlurHandlers(): void` - Clear all blur handlers

##### Capture Lifecycle

- `startCapture(): void` - Start capturing keystrokes
- `stopCapture(): void` - Stop capturing keystrokes

#### Key Features

- **Automatic element focusing**: Makes target element focusable if needed
- **Event filtering**: Supports enabled/disabled key lists
- **Error handling**: Graceful error handling for invalid handlers
- **Special key normalization**: Converts special keys (Backspace → "\b", Enter → "\n")
- **Multiple handler support**: Uses Sets to prevent duplicate handlers
- **Comprehensive logging**: Detailed console logging for debugging

---

### 2. TypingSessionManager

**Purpose**: Manages typing sessions with different modes, timing, and progress tracking.

#### Constructor

```typescript
new TypingSessionManager(config: Omit<SessionConfig, "sessionId">)
```

#### Session Configuration

```typescript
interface SessionConfig {
  sessionId: string; // Auto-generated UUID
  mode: SessionMode; // "tick-tick" | "words" | "passage"
  target: number; // Seconds for tick-tick, word count for words, ignored for passage
  targetText: string; // Text to type
}
```

#### Session State

```typescript
interface SessionState {
  isActive: boolean; // Session is running
  isPaused: boolean; // Session is paused
  isCompleted: boolean; // Session has finished
  startTime: Date | null; // When session started
  endTime: Date | null; // When session ended
  currentInput: string; // User's current input
  currentPosition: number; // Current typing position
  keystrokes: Keystroke[]; // All keystroke data
}
```

#### Public Methods

##### Session Control

- `startSession(): void` - Start the typing session
- `pauseSession(): void` - Manually pause the session
- `resumeSession(): void` - Resume a paused session
- `endSession(): void` - End the session and trigger completion
- `resetSession(): void` - Reset session to initial state

##### Event Handling

- `handleFocus(): void` - Handle element focus (auto-resume if paused by blur)
- `handleBlur(): void` - Handle element blur (auto-pause active session)
- `processKeystroke(character: string): boolean` - Process a keystroke

##### Event Callbacks

- `onSessionComplete(callback: (session: TypingSession) => void): void` - Called when session ends
- `onProgressUpdate(callback: (state: SessionState) => void): void` - Called on state changes
- `onKeystrokeEvent(callback: (keystroke: Keystroke, state: SessionState) => void): void` - Called on each keystroke
- `onFocusEvent(callback: () => void): void` - Called on focus
- `onBlurEvent(callback: () => void): void` - Called on blur

##### State & Progress

- `getCurrentState(): SessionState` - Get current session state
- `getConfig(): SessionConfig` - Get session configuration
- `getSessionId(): string` - Get unique session ID
- `getElapsedTime(): number` - Get elapsed time in seconds
- `getRemainingTime(): number` - Get remaining time (tick-tick mode only)
- `getProgress(): number` - Get completion percentage (0-100)
- `getCurrentWPM(): number` - Get current words per minute

#### Session Modes

1. **tick-tick**: Time-based mode (e.g., 60 seconds)
2. **words**: Word count mode (e.g., type 50 words)
3. **passage**: Complete the entire text

#### Key Features

- **Auto-pause/resume**: Automatically pauses on blur, resumes on focus
- **Multiple completion conditions**: Different logic for each mode
- **Real-time statistics**: Live WPM calculation
- **Error recovery**: Handles state corruption and critical errors
- **Backspace support**: Proper handling of corrections

---

### 3. TypingAnalyzer

**Purpose**: Analyzes completed typing sessions and generates comprehensive statistics.

#### Static Methods

```typescript
TypingAnalyzer.analyzeSession(session: TypingSession): TypingStats
```

#### Generated Statistics

```typescript
interface TypingStats {
  wpm: number; // Net words per minute (correct words)
  grossWPM: number; // Gross words per minute (all typed chars)
  accuracy: number; // Accuracy percentage
  errorCount: number; // Total errors (Levenshtein distance)
  correctedErrors: number; // Errors fixed with backspace
  consistencyScore: number; // Typing rhythm consistency (0-100)
  errorPatterns: ErrorPattern[]; // Common error patterns
  characterStats: {
    // Character-level statistics
    correct: number;
    incorrect: number;
    extra: number;
    missed: number;
  };
}
```

#### Error Pattern Analysis

```typescript
interface ErrorPattern {
  character: string; // The character that was supposed to be typed
  frequency: number; // How often this error occurred
  positions: number[]; // Positions where errors occurred
  commonMistakes: string[]; // What was typed instead
  errorType?: "substitution" | "deletion" | "insertion";
}
```

#### Key Features

- **Comprehensive analysis**: Multiple accuracy calculation methods
- **Error pattern detection**: Identifies common typing mistakes
- **Consistency scoring**: Measures typing rhythm stability
- **Character-level stats**: Detailed character accuracy breakdown
- **Performance metrics**: Both net and gross WPM calculations

---

### 4. StorageService

**Purpose**: Manages persistent storage for sessions, custom paragraphs, and extension settings.

#### Constructor

```typescript
new StorageService(context: vscode.ExtensionContext)
```

#### Public Methods

##### Session Management

- `saveSession(session: TypingSession): Promise<void>` - Save a completed session
- `getAllSessions(): Promise<TypingSession[]>` - Get all saved sessions (max 100)
- `getSessionById(id: string): Promise<TypingSession | undefined>` - Get specific session
- `deleteSessionById(id: string): Promise<boolean>` - Delete a session

##### Custom Paragraph Management

- `getCustomParagraphs(): Promise<CustomParagraph[]>` - Get all custom paragraphs
- `saveCustomParagraph(paragraph: CustomParagraph): Promise<void>` - Save/update paragraph
- `deleteCustomParagraph(id: string): Promise<boolean>` - Delete paragraph

##### Settings Management

- `getSettings(): Promise<ExtensionSettings>` - Get current settings
- `saveSettings(settings: ExtensionSettings): Promise<void>` - Save settings
- `updateSettings(settings: Partial<ExtensionSettings>): Promise<void>` - Update specific settings
- `resetSettings(): Promise<boolean>` - Reset to default settings

##### Initialization

- `initializeDefaultParagraphs(): Promise<boolean>` - Initialize default content (first run)

#### Data Models

```typescript
interface CustomParagraph {
  id: string;
  title: string;
  content: string;
  dateAdded: Date;
  difficulty?: "easy" | "medium" | "hard";
  category?: string;
}

interface ExtensionSettings {
  defaultTimer: number; // Default timer duration in seconds
  showRealTimeStats: boolean; // Show live statistics
  theme: "light" | "dark" | "auto";
}
```

#### Key Features

- **Automatic validation**: Validates all data before storage
- **Error handling**: Comprehensive error handling with user notifications
- **Default content**: Provides default paragraphs and settings
- **Storage limits**: Automatically limits sessions to last 100
- **Data integrity**: Validates and recovers from corrupted data

---

## Models & Data Types

### Core Data Models

#### TypingSession

```typescript
interface TypingSession {
  id: string; // Unique session identifier
  startTime: Date | null; // Session start time
  endTime: Date | null; // Session end time
  targetText: string; // Text that should be typed
  userInput: string; // What the user actually typed
  keystrokes: Keystroke[]; // All keystroke data
  timerDuration: number; // Duration in seconds
  isCompleted: boolean; // Whether session was completed
}
```

#### Keystroke

```typescript
interface Keystroke {
  key: string; // The key that was pressed
  timestamp: number; // When it was pressed (milliseconds)
  timeSinceLast: number; // Time since previous keystroke
}
```

#### Error Analysis

```typescript
interface ErrorFound {
  expectedChar: string | null; // What should have been typed
  actualChar: string | null; // What was actually typed
  position: number; // Position in text
  type: "substitution" | "deletion" | "insertion";
}
```

---

## Utility Components

### 1. Calculations

**File**: `src/services/components/calculations.ts`

#### Functions

- `analyzeKeypressAccuracy(keystrokes: Keystroke[], targetText: string)` - Analyze keystroke accuracy
- `calculateCharacterStats(targetText: string, userInput: string)` - Character-level statistics
- `calculateCorrectWords(targetText: string, userInput: string): number` - Count correct words
- `countAllTypedCharacters(keystrokes: Keystroke[]): number` - Count non-backspace keystrokes
- `calculateCorrectedErrors(keystrokes: Keystroke[], targetText: string): number` - Count corrected errors

### 2. WPM Calculator

**File**: `src/services/components/wpmCalculator.ts`

#### Functions

- `calculateWPM(correctWords: number, timeInMinutes: number): number` - Net WPM
- `calculateGrossWPM(totalTypedChars: number, timeInMinutes: number): number` - Gross WPM

### 3. Consistency Analyzer

**File**: `src/services/components/consistencyAnalyzer.ts`

#### Functions

- `calculateConsistencyScore(keystrokes: Keystroke[]): number` - Overall consistency (0-100)
- `calculatePureRhythmConsistency(keystrokes: Keystroke[]): number` - Rhythm consistency
- `calculateHesitationPenalty(keystrokes: Keystroke[]): number` - Hesitation penalty
- `calculatePausePenalty(keystrokes: Keystroke[]): number` - Pause penalty

### 4. Error Analyzer

**File**: `src/services/components/errorAnalyzer.ts`

#### Functions

- `analyzeErrorPatterns(targetText: string, inputText: string, keystrokes: Keystroke[]): ErrorPattern[]` - Find error patterns

### 5. String Utilities

**File**: `src/services/components/stringUtils.ts`

#### Functions

- `levenshteinDistance(target: string, input: string): number` - Calculate edit distance
- `findAlignedErrors(target: string, input: string): Array<ErrorFound>` - Find and align errors

---

## Extension Integration

### Main Extension File

**File**: `src/extension.ts`

Currently contains only a basic "Hello World" command. This is where you'll register:

- Commands for starting typing tests
- Webview panels for the UI
- Status bar items
- Event handlers

### Current State

The extension entry point is minimal and needs expansion to integrate with the backend services.

---

## Usage Examples

### Basic Typing Session

```typescript
// Create keystroke capture service
const captureService = new KeystrokeCaptureService({
  element: typingElement,
  preventDefault: true,
  captureSpecialKeys: true,
});

// Create session manager
const sessionManager = new TypingSessionManager({
  mode: "tick-tick",
  target: 60, // 60 seconds
  targetText: "The quick brown fox jumps over the lazy dog.",
});

// Connect them
const unsubscribe = captureService.addHandlers((key) => {
  if (!sessionManager.getCurrentState().isActive) {
    sessionManager.startSession();
  }
  return sessionManager.processKeystroke(key);
});

// Handle session completion
sessionManager.onSessionComplete((session) => {
  const stats = TypingAnalyzer.analyzeSession(session);
  console.log(`WPM: ${stats.wpm}, Accuracy: ${stats.accuracy}%`);

  // Save session
  storageService.saveSession(session);
});

// Start capturing
captureService.startCapture();
```

### Real-time Statistics

```typescript
sessionManager.onProgressUpdate((state) => {
  const currentWPM = sessionManager.getCurrentWPM();
  const progress = sessionManager.getProgress();
  const remaining = sessionManager.getRemainingTime();

  // Update UI with live stats
  updateUI({
    wpm: currentWPM,
    progress: progress,
    timeRemaining: remaining,
    input: state.currentInput,
  });
});
```

### Custom Paragraphs

```typescript
// Add custom paragraph
const customParagraph: CustomParagraph = {
  id: crypto.randomUUID(),
  title: "Programming Practice",
  content:
    "function calculateWPM(chars, minutes) { return chars / 5 / minutes; }",
  dateAdded: new Date(),
  difficulty: "medium",
  category: "Programming",
};

await storageService.saveCustomParagraph(customParagraph);

// Get all paragraphs for selection
const paragraphs = await storageService.getCustomParagraphs();
```

---

## Missing Features Analysis

### Critical Missing Features for UI Implementation

1. **Command Registration**

   - No VS Code commands registered yet
   - Need commands for starting different test modes
   - Need commands for viewing results/statistics

2. **Webview Integration**

   - No webview panel creation
   - No communication between webview and extension
   - No HTML/CSS/JS for the typing interface

3. **Text Content Management**

   - No built-in text library beyond the 3 default paragraphs
   - No API for fetching random texts
   - No difficulty-based text selection

4. **User Interface Components**

   - No typing input area
   - No real-time statistics display
   - No results visualization
   - No settings panel

5. **Additional Session Modes**
   - Current modes are basic
   - No custom mode support
   - No competitive/challenge modes

### Recommended Implementation Priority

1. **High Priority**

   - Create webview panel for typing interface
   - Implement basic UI with input area and real-time stats
   - Register core commands (start test, view results)
   - Connect keystroke capture to webview

2. **Medium Priority**

   - Add more default text content
   - Implement settings UI
   - Add session history viewer
   - Create statistics dashboard

3. **Low Priority**
   - Advanced analytics and visualizations
   - Competitive features
   - Import/export functionality
   - Themes and customization

### Missing Utility Functions

1. **Text Processing**

   - Text difficulty calculation
   - Text categorization
   - Random text generation/selection

2. **UI Helpers**

   - Color coding for correct/incorrect characters
   - Progress indicators
   - Error highlighting

3. **Data Export**

   - Export sessions to CSV/JSON
   - Share results functionality
   - Progress tracking over time

4. **Performance Optimization**
   - Debouncing for real-time updates
   - Efficient DOM updates
   - Memory management for long sessions

---
