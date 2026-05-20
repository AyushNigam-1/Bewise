const { defineConfig } = require("cypress");

module.exports = defineConfig({
  viewportWidth: 1280,
  viewportHeight: 720,
  e2e: {
    baseUrl: "http://localhost:3000", // Points to your Next.js dev server
    setupNodeEvents(on, config) {
      on("before:browser:launch", (browser = {}, launchOptions) => {
        if (browser.family === "chromium" && browser.name !== "electron") {
          launchOptions.args.push("--start-maximized");
        }
        if (browser.name === "electron") {
          launchOptions.preferences.maximized = true;
        }
        return launchOptions;
      });
      // implement node event listeners here if needed later
    },
  },
});
