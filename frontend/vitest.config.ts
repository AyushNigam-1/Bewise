// vitest.config.ts
import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, process.cwd(), "");

    return {
        plugins: [react()],
        test: {
            slowTestThreshold: 15000,
            globals: true,
            environment: "jsdom",
            setupFiles: ["./vitest.setup.ts"],
            env,
            exclude: ["tests/**", "node_modules/**"],
        },
        resolve: {
            alias: { "@": path.resolve(__dirname, "./src") },
        },
    };
});