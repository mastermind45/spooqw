import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Ignore Node.js server files
    "api-server/**",
    "mock-server.js",
    // Ignore test files for lint (they use vitest globals)
    "__tests__/**",
    "e2e/**",
    "*.config.ts",
  ]),
]);

export default eslintConfig;
