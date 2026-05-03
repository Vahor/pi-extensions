# Agent Guidelines for pi-extensions

[pi](https://pi.dev) extensions monorepo. Builds pi extensions as publishable npm packages.

Always start by making a plan for your changes. Gather requirements, read the issue and comments.

## Build/Test/Lint Commands

- **Install**: `bun install`
- **Build**: `bun run build` (builds all packages, target: node ESM for extensions, bun for shared lib)
- **Format**: `bun run format` (Biome with tab indentation, double quotes)
- **Typecheck**: `bun run typecheck` (all packages)
- **Test**: `bun test` (per package, uses Bun test runner; tests in `__tests__/` alongside source)
- **Watch**: `bun run dev` (builds all packages in watch mode)
- **Adding changesets**:
  ```bash
  cat > .changeset/your-changeset.md <<'EOF'
  ---
  "@vahor/pi-hooks": patch
  ---

  message content
  EOF
  ```

## Code Style

- **Formatter**: Biome with tab indentation, double quotes for JS/TS
- **Imports**: Auto-organize imports enabled, use `import type` for type-only imports
- **Types**: Strict TypeScript, ESM (`"type": "module"`), prefer explicit return types
- **Naming**: camelCase for variables/functions, PascalCase for types/interfaces, kebab-case for files
- **Error handling**: Use Effect-TS `Schema` for config validation, `Effect.try` for parse/IO errors
- **Comments**: Avoid unless clarifying complex logic; JSDoc on public APIs

## Architecture

- **Monorepo**: Bun workspace, packages under `packages/`, shared libs under `lib/`
- **Packages**: Each has its own `package.json`, `tsconfig.json`, `build`/`typecheck`/`test` scripts
- **Pi discovery**: Extensions use `pi.extensions` in `package.json` → `["./dist/index.js"]`
- **Config pattern**: Global (`~/.pi/agent/<file>`) merged with project (`.pi/<file>`), project overrides

### @vahor/pi-hooks

Pi extension that runs shell commands on lifecycle events.
- Entry point: `packages/pi-hooks/src/index.ts`
- Events: 26 pi lifecycle events defined in `src/events.ts`
- Config: `.pi/hooks.json` (project) or `~/.pi/agent/hooks.json` (global)
- Config validation: Effect-TS Schema with custom error messages
- Runner: sequential execution, errors shown as UI notifications with exit code + truncated output
- Config schema: `{ hooks: { [event]: Array<string | { command, cwd?, timeout?, print? }> } }`

### @vahor/shared

Internal library, not published independently.
- Entry point: `lib/shared/src/config/index.ts`
- Exports: `readConfig`, `readSettings`, `parseConfig`, `mergeSettings`, path helpers, error types (`ParseError`, `ValidationError`)
- Config merge: shallow merge with deep merge for nested objects
- Built for `bun` runtime (unlike packages which target node)

## Development Workflow

### Adding a new pi extension package

1. Create `packages/<name>/` with:
   - `package.json` with `pi.extensions` pointing to `./dist/index.js`
   - `tsconfig.json`
   - `src/index.ts` exporting a default function `(pi: ExtensionAPI) => void`
2. Add `build`, `typecheck`, `test` scripts
3. Run `bun install` from root

### Adding a new shared library

1. Create `lib/<name>/` with its own `package.json` and build config
2. Reference as workspace dependency: `"@vahor/shared": "workspace:*"`
3. Add an export map in `package.json`

### Guidelines

- **Never assume file contents**: Always read files before using or modifying them.
- **Check existing implementations**: Search the codebase for similar patterns before adding new ones.
- **Effect-TS patterns**: Use `Effect.gen` for generators, `Schema` for validation, tagged errors (`_tag` property).
- **Pi extension API**: Extensions export a default function receiving `ExtensionAPI`. See [`@mariozechner/pi-coding-agent` docs](https://pi.dev) for the full API.
- **Config files**: Follow the established merge pattern (global + project override).
- **Remove unused code**: Clean up after feature completion, use `bun run format` to detect issues.
- **Changesets**: Create a changeset when making a PR (patch for 0.x.x).
- **Never commit to main**: Create a branch with the issue/feature name instead.
