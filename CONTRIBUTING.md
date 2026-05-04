# Contributing to pi-extensions

Thank you for your interest in contributing to `pi-extensions`! This guide will help you get started with the monorepo and prepare a pull request.

## Getting Started

### Prerequisites

- **Bun 1.3.13 or newer** - Used as package manager, build tool, and test runner.
- **pi**

### Development Setup

1. Fork and clone the repository:

   ```bash
   git clone https://github.com/Vahor/pi-extensions.git
   cd pi-extensions
   ```

2. Install dependencies:

   ```bash
   bun install
   ```

3. Verify the setup:

   ```bash
   bun run build
   bun run typecheck
   bun test
   ```

## Commands

From the repository root:

- `bun run build` - Build all packages.
- `bun run dev` - Build all packages in watch/dev mode.
- `bun run format` - Format and lint files with Biome.
- `bun run typecheck` - Run TypeScript type checking for all packages.
- `bun test` - Run all tests with Bun.

From a package directory:

- `bun run build` - Build that package.
- `bun run dev` - Build and run the extension locally with `pi -e ./dist/index.js`.
- `bun run typecheck` - Typecheck that package.
- `bun test` - Run package tests.

This repo uses the pinned workspace TypeScript version (`typescript@^6.0.3`) through local `tsc` scripts.

## Project Structure

```txt
packages/
├── pi-hooks/      # Run shell commands on pi lifecycle events
└── pi-keymap/     # Custom keyboard shortcuts with command execution

lib/
└── shared/        # Shared config, runner, and utility code
```

Each extension package declares pi discovery metadata in `package.json`:

```json
{
  "pi": {
    "extensions": ["./dist/index.js"]
  }
}
```

## Types of Contributions

### Adding or updating an extension

1. Check existing packages in `packages/` for implementation patterns.
2. Keep extension entrypoints in `src/index.ts` and export a default function receiving the pi `ExtensionAPI`.
3. Add or update tests in `src/__tests__/` when changing behavior.
4. Update the package README if user-facing configuration or behavior changes.
5. Run the package `dev` script to test the extension in pi when possible.

### Adding a new extension package

1. Create `packages/<name>/` with:
   - `package.json` including `pi.extensions` pointing to `./dist/index.js`
   - `tsconfig.json`
   - `src/index.ts`
   - `build`, `dev`, `typecheck`, and `test` scripts
2. Add tests alongside source in `src/__tests__/`.
3. Add the package to the root `README.md` package table.
4. Run `bun install` from the repository root.

### Shared utilities and configuration

Shared code lives in `lib/shared`. Prefer adding reusable config loading, command running, and data structure helpers there instead of duplicating logic across packages.

For configuration changes, follow the established pattern: global config under `~/.pi/agent/<file>` is merged with project config under `.pi/<file>`, with project values taking precedence.

### Bug fixes and features

- Open or reference an issue when the change is user-visible or changes behavior.
- Include reproduction steps for bugs.
- Add tests that demonstrate the fix or cover the new behavior.
- Update documentation and examples when behavior or configuration changes.

## Pull Request Process

1. **Create a branch** from `main`.
2. **Make your changes** following the existing package patterns.
3. **Add tests or examples** for your changes.
4. **Update documentation** if needed.
5. **Create a changeset** for package changes:

   ```bash
   bunx @changesets/cli
   ```

   Use a patch bump for most changes while packages are in `0.x.x`.

6. **Run quality checks** from the repository root:

   ```bash
   bun run format
   bun run typecheck
   bun test
   bun run build
   ```

7. **Open a pull request** with a descriptive title and link related issues.
8. **Review** CodeRabbit comments when available, then ask a maintainer for review.

## Release Process

This repository uses changesets for releases.

- Contributors should include a changeset for package changes.
- Maintainers handle versioning and publishing.
- Published extension packages are built from `packages/*` and published publicly to npm.
