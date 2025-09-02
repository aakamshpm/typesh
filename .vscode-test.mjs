import { defineConfig } from "@vscode/test-cli";

export default defineConfig({
  files: "out/test/**/*.test.js",
  version: "stable",
  launchArgs: ["--disable-extensions", "--disable-workspace-trust"],
  extensionDevelopmentPath: ".",
  mocha: {
    timeout: 60000,
    slow: 5000,
  },
});
