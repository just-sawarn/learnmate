import { defineConfig } from "@playwright/test";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const PORT = 3100;

export default defineConfig({
  testDir: "e2e",
  timeout: 15 * 60_000,
  expect: { timeout: 90_000 },
  workers: 1,
  retries: 0,
  reporter: [["list"]],
  use: {
    baseURL: `http://localhost:${PORT}`,
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
  },
  webServer: {
    command: `npm run build && PORT=${PORT} node .output/server/index.mjs`,
    url: `http://localhost:${PORT}/signin`,
    reuseExistingServer: true,
    timeout: 5 * 60_000,
  },
});
