/** @type {import('tailwindcss').Config} */
export default {
  content: ["./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        primary: "#007acc", // VS Code blue
        correct: "#22c55e", // Green
        incorrect: "#ef4444", // Red
        extra: "#f59e0b", // Yellow/orange
        pending: "#6b7280", // Gray
      },
      fontFamily: {
        mono: [
          "var(--vscode-editor-font-family)",
          "JetBrains Mono",
          "Fira Code",
          "Consolas",
          "monospace",
        ],
      },
    },
  },
  plugins: [],
};
