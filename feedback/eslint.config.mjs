import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    rules: {
      // React's useActionState requires a fixed (prevState, formData)
      // signature even when an action doesn't need one of them (e.g.
      // app/b/[slug]/actions.ts) — the leading-underscore convention
      // marks that as intentional, not dead code.
      "@typescript-eslint/no-unused-vars": [
        "warn",
        { argsIgnorePattern: "^_" },
      ],
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Plain, dependency-free Node.js CommonJS tooling (M0) — not part
    // of the Next.js app, intentionally uses require().
    "scripts/**",
  ]),
]);

export default eslintConfig;
