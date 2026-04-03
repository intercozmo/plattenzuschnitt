# AGENTS.md

This file defines the operating conventions for agent-based tasks in this repository. It is intended for automated and human-backed agents that participate in building, testing, and shipping code for the Plattenzuschnitt project.

Note: If a Cursor rules file (.cursor/rules) or Copilot instructions (.github/copilot-instructions.md) exists, these guidelines should be complemented by those rules. This document will be updated to reflect such rules when present.

1) Build, lint, and test commands
- Install dependencies: (choose your package manager)
  - npm install
  - yarn install
  - pnpm install
- Build the project: produce production assets
  - npm run build
  - yarn build
  - pnpm build
- Linting: enforce code quality and style
  - npm run lint
  - yarn lint
  - pnpm lint
- Auto-fix lint issues (where safe):
  - npm run lint:fix
  - yarn lint:fix
  - pnpm lint --fix
- Type checking (TypeScript):
  - npm run typecheck
  - yarn typecheck
  - pnpm typecheck
- Testing (unit/integration):
  - npm test
  - yarn test
  - pnpm test
- Run a single test by pattern (works with Jest and Vitest):
  - npm test -- -t "ComponentName should do something"      # Jest-like pattern syntax
  - npx vitest run -t "ComponentName should do something"     # Vitest syntax
- Run tests with coverage:
  - npm test -- --coverage
- Quick npm script hints:
  - npm run test:ci   # CI-friendly test, often with no interactive prompts
  - npm run check    # alias that may run lint + typecheck + tests

2) Code style guidelines
- Language and framework expectations
  - Primary stack: TypeScript, React 18, Vite, Tailwind CSS, Zustand.
  - Prefer functional components over class components.
  - Use explicit return types for public API surfaces when possible.

- Imports and modules
  - Import order: builtin modules, external libraries, then internal/project modules.
  - Group related imports together; avoid long, monolithic import blocks.
  - Use absolute imports for app code (e.g., @app/components/Button) or configured path aliases.
  - Avoid relative path imports for deeply nested files where a path alias exists.
  - No unused imports; remove dead code during refactors.

- Formatting and style
  - Follow Prettier defaults (2-space indentation, single quotes, semicolons allowed as per config).
  - Trailing commas in multi-line comma-separated lists (ESModule imports, object literals, etc.).
  - End files with a newline; avoid trailing whitespace.
  - Prefer explicit types over any where possible; avoid implicit any via noImplicitAny.

- Naming conventions
  - Components: PascalCase (e.g., InlineTable, StockTable).
  - Functions/variables: camelCase (e.g., renderCell, computeBounds).
  - Types/interfaces: PascalCase with a T suffix for aliases is optional; prefer descriptive names.
  - Props interfaces: named Interfaces like IInlineTableProps or InlineTableProps.

- Types and API design
  - Prefer union or discriminated types for clear error handling.
  - Use Readonly<> for props to communicate immutability when appropriate.
  - Export only necessary API surface; keep implementation details private.

- Error handling
  - Do not swallow errors; wrap and annotate errors with context (operation, input key fields).
  - Use consistent error types; define a central errors.ts with exported Error classes.
  - UI layer should present user-friendly messages; log technical details to console or telemetry.

- Testing philosophy
  - Tests are the truth; prefer deterministic tests with explicit inputs/expected outputs.
  - Unit tests for small units; integration tests for critical app flows.
  - Avoid brittle snapshot tests; prefer asserting on DOM structure and data.
  - Accessibility tests where applicable (aria-labels, roles, keyboard interactions).

- React performance and patterns
  - Use useMemo and useCallback to memoize heavy calculations and handlers.
  - Prefer virtualization for large lists/tables; lazy render where appropriate.
  - Clean up subscriptions/effects in useEffect return when necessary.

- Data persistence and security
  - LocalStorage usage should be bounded; avoid storing sensitive data in plaintext.
  - Validate and sanitize inputs at boundaries; guard against XSS vectors.

- Git and code review hygiene
  - Commit messages should be imperative: "Add feature X", "Fix bug Y", "Refactor Z".
  - PRs should include tests, docs, and clear rationale in the description.
  - Do not commit secrets (.env, credentials.json, etc.). Use environment configs per env.

- Platform and environment rules
  - Ensure builds are reproducible across dev machines (lockfile integrity, exact node/npm versions).
  - CI should run lint, typecheck, and tests on push/PR.

- Cursor rules (if present)
  - No Cursor rules found in this repository at the moment. If added later, integrate them here.

- Copilot instructions (if present)
  - No explicit Copilot instructions detected in this repository. If they exist, append here.

3) How to extend AGENTS.md
- Add new sections for any new tools or frameworks introduced in the repo.
- Document any custom scripts or utilities used by agents.
- Include a changelog section for major agent policy updates.

4) Quick references
- Build: npm run build | yarn build | pnpm build
- Lint: npm run lint | yarn lint | pnpm lint
- Test: npm test | yarn test | pnpm test
- Typecheck: npm run typecheck | yarn typecheck | pnpm typecheck
- Format: npm run format | yarn format | pnpm format

5) Maintenance notes
- This file should be reviewed at the start of each sprint and updated as tooling evolves.
- Prefer minimal, explicit changes to avoid drift between agents and codebase.
