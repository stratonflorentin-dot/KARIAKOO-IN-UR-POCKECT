import { defineConfig, devices } from "@playwright/test";

// End-to-end tests run against the development server, because the role
// preview (needed to sign in as each demo role) only exists in development.
export default defineConfig({
  testDir: "./e2e",
  timeout: 60_000,
  expect: { timeout: 15_000 },
  fullyParallel: false,
  workers: 1,
  reporter: [["list"]],
  use: {
    baseURL: "http://localhost:3000",
    trace: "retain-on-failure",
  },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"] } },
    { name: "mobile", use: { ...devices["Pixel 7"] } },
  ],
  webServer: {
    command: "npm run dev",
    url: "http://localhost:3000/customer",
    reuseExistingServer: true,
    timeout: 180_000,
  },
});
