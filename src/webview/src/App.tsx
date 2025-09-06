function App() {
  return (
    <div className="min-h-screen bg-[var(--vscode-editor-background)] text-[var(--vscode-editor-foreground)] p-4">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold text-primary mb-4">typesh</h1>
        <div className="bg-[var(--vscode-input-background)] p-4 rounded-lg border border-[var(--vscode-input-border)]">
          <p className="typing-text">
            Welcome to typesh The quick brown fox jumps over the lazy dog.
          </p>
        </div>
        <div className="mt-4 flex gap-4">
          <button className="bg-primary text-black px-4 py-2 rounded hover:bg-primary/80 transition-colors">
            Start Test
          </button>
          <button className="border border-[var(--vscode-button-border)] px-4 py-2 rounded hover:bg-[var(--vscode-button-hoverBackground)] transition-colors">
            Settings
          </button>
        </div>
      </div>
    </div>
  );
}

export default App;
