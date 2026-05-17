# @vahor/pi-keymap

## 0.0.12

### Patch Changes

- [#17](https://github.com/Vahor/pi-extensions/pull/17) [`dfc949a`](https://github.com/Vahor/pi-extensions/commit/dfc949a016527ebe03e3264dd513cf147fdb0b89) Thanks [@Vahor](https://github.com/Vahor)! - Publish packages with npm so README metadata appears on npm and pi.dev.

## 0.0.11

### Patch Changes

- [`0f85ece`](https://github.com/Vahor/pi-extensions/commit/0f85ece40f44b72d4a4fab2a142bddabd8efcf8b) Thanks [@Vahor](https://github.com/Vahor)! - Update which-key styling to remove bold keys and show a dim silent marker.

## 0.0.10

### Patch Changes

- [#14](https://github.com/Vahor/pi-extensions/pull/14) [`a940c9f`](https://github.com/Vahor/pi-extensions/commit/a940c9fa39cb4018a4b0ba99bd74c732519758c0) Thanks [@Vahor](https://github.com/Vahor)! - Updated the bash renderer.

- [#14](https://github.com/Vahor/pi-extensions/pull/14) [`a940c9f`](https://github.com/Vahor/pi-extensions/commit/a940c9fa39cb4018a4b0ba99bd74c732519758c0) Thanks [@Vahor](https://github.com/Vahor)! - Improve command flag display colors and mark silent rendered commands.

- [#14](https://github.com/Vahor/pi-extensions/pull/14) [`a940c9f`](https://github.com/Vahor/pi-extensions/commit/a940c9fa39cb4018a4b0ba99bd74c732519758c0) Thanks [@Vahor](https://github.com/Vahor)! - Updated colors/icons for interactive and context in the keymap menu.

- [#14](https://github.com/Vahor/pi-extensions/pull/14) [`a940c9f`](https://github.com/Vahor/pi-extensions/commit/a940c9fa39cb4018a4b0ba99bd74c732519758c0) Thanks [@Vahor](https://github.com/Vahor)! - Respect `print: false` when command output is also added to context.

- [#14](https://github.com/Vahor/pi-extensions/pull/14) [`a940c9f`](https://github.com/Vahor/pi-extensions/commit/a940c9fa39cb4018a4b0ba99bd74c732519758c0) Thanks [@Vahor](https://github.com/Vahor)! - Fix which-key leader mappings with Shift-letter keys so `shift+h` is treated as one key and displayed as `H`.

## 0.0.9

### Patch Changes

- [#12](https://github.com/Vahor/pi-extensions/pull/12) [`8dc1fd2`](https://github.com/Vahor/pi-extensions/commit/8dc1fd25b2ca7c9c0236bc042d65b4eae3d0a4d0) Thanks [@Vahor](https://github.com/Vahor)! - Merge global and project keymaps by key so project configs can override or add mappings without replacing the full global keymap list.

## 0.0.8

### Patch Changes

- [#10](https://github.com/Vahor/pi-extensions/pull/10) [`0d2bc35`](https://github.com/Vahor/pi-extensions/commit/0d2bc354343f7ca68f6e2d33c452bc307bc38300) Thanks [@Vahor](https://github.com/Vahor)! - Add generated JSON Schema specs for extension config files and create empty project config files with `$schema` when missing.

## 0.0.7

### Patch Changes

- [`5402d54`](https://github.com/Vahor/pi-extensions/commit/5402d549d6a4f440ff8ee9d56088c5c5ebfdadc1) Thanks [@Vahor](https://github.com/Vahor)! - Send prompt automatically when `send: true`

## 0.0.6

### Patch Changes

- [`7b81a15`](https://github.com/Vahor/pi-extensions/commit/7b81a152ebfb590b28a0279bdd162d3e937d1b16) Thanks [@Vahor](https://github.com/Vahor)! - Update pi peer dependencies and imports to the `@earendil-works/*` packages from `earendil-works/pi-mono`.

## 0.0.5

### Patch Changes

- [#5](https://github.com/Vahor/pi-extensions/pull/5) [`890bb92`](https://github.com/Vahor/pi-extensions/commit/890bb92a1b9c389f40a880ccc16892579aa1883c) Thanks [@Vahor](https://github.com/Vahor)! - Add an interactive command mode that suspends pi's TUI while terminal UI programs run.

- [#7](https://github.com/Vahor/pi-extensions/pull/7) [`7a74fe8`](https://github.com/Vahor/pi-extensions/commit/7a74fe8f3874383ff89dbfebbc740f7c546f3415) Thanks [@Vahor](https://github.com/Vahor)! - Add prompt keymaps that can send pre-defined prompts. With an editor to edit them if needed.

## 0.0.4

### Patch Changes

- [`47037e5`](https://github.com/Vahor/pi-extensions/commit/47037e5fbbd4bdb5c122ff04660fb8c00653de74) Thanks [@Vahor](https://github.com/Vahor)! - Add a command-level `context` option to inject command output into the agent context.

- [`47037e5`](https://github.com/Vahor/pi-extensions/commit/47037e5fbbd4bdb5c122ff04660fb8c00653de74) Thanks [@Vahor](https://github.com/Vahor)! - Default command `print` to true so successful command output is shown unless disabled.

- [`14430ae`](https://github.com/Vahor/pi-extensions/commit/14430ae5cfe6ba489d27fb8b89160c3ce8c96e99) Thanks [@Vahor](https://github.com/Vahor)! - Preserve keymap-level print defaults when running commands.

- [`14430ae`](https://github.com/Vahor/pi-extensions/commit/14430ae5cfe6ba489d27fb8b89160c3ce8c96e99) Thanks [@Vahor](https://github.com/Vahor)! - Prefix runner status and notifications with a unique command index.

## 0.0.3

### Patch Changes

- [`f3c3c66`](https://github.com/Vahor/pi-extensions/commit/f3c3c66b1a50294b03fd064c900cf751ba00a5f5) Thanks [@Vahor](https://github.com/Vahor)! - Add package metadata for npm publication.

  Switch extension builds to tsdown unbundled output without minification.

## 0.0.2

### Patch Changes

- [`388bd62`](https://github.com/Vahor/pi-extensions/commit/388bd62f22bbf1f8ce71349249aaada1383f2bfe) Thanks [@Vahor](https://github.com/Vahor)! - Gracefully disable extensions when config files are missing and harden config parsing/tests.
