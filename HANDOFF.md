# FURLOW Development Handoff

## Project Overview

FURLOW (**F**lexible **U**ser **R**ules for **L**ive **O**nline **W**orkers) is a declarative Discord bot framework that allows building bots using YAML specifications. The project is a TypeScript monorepo using pnpm workspaces and Turborepo.

## Current State: BUILD PASSING, 592 TESTS

As of 2026-02-03, all 9 packages build successfully with comprehensive test coverage:

| Package | Status | DTS | Tests | Notes |
|---------|--------|-----|-------|-------|
| `@furlow/schema` | ✅ Pass | ✅ | - | Type definitions and JSON schemas |
| `@furlow/storage` | ✅ Pass | ✅ | 41 | SQLite, PostgreSQL, Memory adapters |
| `@furlow/core` | ✅ Pass | ✅ | 242 | Parser, expression engine, actions, flows |
| `@furlow/discord` | ✅ Pass | ✅ | 53 | Discord.js wrapper, voice, interactions |
| `@furlow/pipes` | ✅ Pass | ✅ | 114 | HTTP, WebSocket, Webhook integrations |
| `@furlow/testing` | ✅ Pass | ✅ | 142 | Mocks, fixtures, E2E tests, bot lifecycle |
| `@furlow/builtins` | ✅ Pass | ❌ | - | 14 builtin modules (DTS disabled) |
| `@furlow/dashboard` | ✅ Pass | ✅ | - | Express server + React client |
| `furlow` (CLI) | ✅ Pass | ✅ | - | Command-line interface |

**Total Tests: 592**

## Work Completed This Session

### 1. Expression Caching (Performance)

**File: `packages/core/src/expression/evaluator.ts`**

Added LRU caching for compiled expressions to improve performance:
- `LRUCache<K, V>` class with configurable max size
- Cache statistics tracking (hits, misses, evaluations, hit rate)
- Methods: `getStats()`, `clearCache()`
- 14 new tests in `packages/core/src/expression/__tests__/caching.test.ts`

### 2. New Expression Transforms

**File: `packages/core/src/expression/transforms.ts`**

Added commonly needed string/array transforms:
- `includes(search)` - Check if string/array contains value
- `startsWith(prefix)` - Check string prefix
- `endsWith(suffix)` - Check string suffix
- `contains(search)` - Alias for includes

### 3. CLI Validate Command Enhancement

**File: `apps/cli/src/commands/validate.ts`**

Enhanced with colored output and helpful hints:
- Colored error/warning output with chalk
- `ERROR_HINTS` map for common validation errors
- Suggestions for missing best practices (identity.name, presence, intents)
- Warnings for empty actions arrays, missing descriptions
- Detailed summary with error/warning counts

### 4. Comprehensive Test Suite

Created extensive E2E and integration tests:

#### E2E Spec Tests (`packages/testing/src/__tests__/e2e-spec.test.ts`)
- **26 tests** covering: spec loading, command execution, event handlers, flow execution, state configuration, component definitions, error handling, expression evaluation

#### Bot Lifecycle Tests (`packages/testing/src/__tests__/bot-lifecycle.test.ts`)
- **12 tests** with mock Discord client simulating full bot lifecycle
- Tests: startup, command handling, event handling, component handling, expression interpolation

#### Comprehensive Bot Tests (`packages/testing/src/__tests__/bot-comprehensive.test.ts`)
- **46 tests** covering real-world bot scenarios:

| Bot Type | Tests | Scenarios |
|----------|-------|-----------|
| Moderation Bot | 6 | warn, kick, ban, timeout, context menus |
| Welcome Bot | 3 | member join/leave, subcommands |
| Ticket System | 4 | create, buttons, modals, selects |
| Leveling System | 5 | XP tracking, rank, leaderboard |
| Reaction Roles | 3 | button roles, select menu roles |
| Starboard | 2 | configure, star reactions |
| Polls | 3 | create, vote, end |
| Giveaways | 3 | start, end, enter |
| Auto-Responder | 3 | triggers, management |
| Music Bot | 5 | play, skip, queue, controls, volume |
| Utility Bot | 4 | serverinfo, userinfo, ping, stats |
| Wildcard Handlers | 3 | button/select/modal wildcards |
| Complex Flows | 2 | multi-step setup, verification |

### 5. Mock Discord Implementation

Created comprehensive Discord.js mock in test files:
- `MockUser`, `MockMember`, `MockGuild`, `MockChannel`, `MockMessage`
- `MockVoiceChannel`, `MockThreadChannel`
- `MockCommandInteraction`, `MockButtonInteraction`, `MockSelectMenuInteraction`
- `MockModalSubmitInteraction`, `MockUserContextMenuInteraction`, `MockMessageContextMenuInteraction`
- `MockAutocompleteInteraction`
- Full simulation of Discord events and interactions

### 6. Bug Fixes

- **Ajv Schema Validation**: Added `validateSchema: false` to fix draft-2020-12 meta-schema error
- **Bot Runtime**: Fixed subcommand handling for commands without top-level actions
- **Option Extraction**: Extended option name list for comprehensive coverage
- **Expression Evaluation**: Fixed timeout duration expression evaluation

### 7. Documentation Updates

- **README.md**: Updated acronym to "Flexible User Rules for Live Online Workers"
- **CHANGELOG.md**: Created comprehensive v0.1.0 release documentation

## Test Coverage Summary

```
@furlow/core:     242 tests (expression, actions, flows, parser, state, caching)
@furlow/testing:  142 tests (E2E specs, bot lifecycle, comprehensive scenarios)
@furlow/pipes:    114 tests (HTTP, WebSocket, Webhook integration)
@furlow/discord:   53 tests (client, interactions, wildcards)
@furlow/storage:   41 tests (SQLite, PostgreSQL, memory adapters)
─────────────────────────────────────────────────────────────────────
Total:            592 tests
```

## Known Issues (Non-Blocking)

### Duplicate Key Warnings in Builtins

Several builtin modules have duplicate `action` keys in object literals:
- `src/auto-responder/index.ts:64,66`
- `src/giveaways/index.ts:145,147`
- `src/polls/index.ts:166,168`
- `src/reaction-roles/index.ts:125,127,182,184,188,190`
- `src/reminders/index.ts:51,53`

These are actual code bugs where `batch` actions incorrectly have nested `action` properties.

### Schema Type Mismatches

The `@furlow/schema` types define strict action types, but builtins use expression strings. DTS is disabled for builtins to work around this.

## Architecture Reference

```
furlow/
├── apps/
│   ├── cli/                  # `furlow` CLI tool
│   └── dashboard/            # Web dashboard (Express + React)
├── packages/
│   ├── schema/               # TypeScript types & JSON schemas
│   ├── storage/              # Database adapters (SQLite, Postgres, Memory)
│   ├── core/                 # Runtime engine
│   │   ├── parser/           # YAML loading & validation
│   │   ├── expression/       # Jexl evaluator + 50+ functions + caching
│   │   ├── actions/          # Action registry & executor
│   │   ├── flows/            # Flow engine (conditionals, loops)
│   │   ├── state/            # Variable/table/cache management
│   │   └── ...
│   ├── discord/              # Discord.js adapter
│   │   ├── client/           # Client wrapper
│   │   ├── interactions/     # Commands, buttons, modals
│   │   └── voice/            # Audio playback & recording
│   ├── pipes/                # External integrations (HTTP, WS, Webhook)
│   ├── builtins/             # 14 pre-built modules
│   └── testing/              # Test utilities & comprehensive tests
```

## Implementation Plan Status

| Phase | Description | Status |
|-------|-------------|--------|
| Phase 1 | Foundation (monorepo, schema, parser, expression) | ✅ Complete |
| Phase 2 | Discord Integration (client, gateway, interactions) | ✅ Complete |
| Phase 3 | State & Flows (storage, state manager, flow engine) | ✅ Complete |
| Phase 4 | Actions & Pipes (100+ actions, HTTP/WS pipes) | ✅ Complete |
| Phase 5 | Voice, Video & Scheduler | ✅ Complete |
| Phase 6 | Builtins (all 14 modules) | ✅ Complete |
| Phase 7 | Canvas & Image Generation | ⏳ Stubbed |
| Phase 8 | Dashboard & Web UI | ✅ Basic Complete |
| Phase 9 | CLI & Documentation | ⏳ CLI Complete, Docs Pending |
| Phase 10 | Polish & Release | ⏳ In Progress |

### Sprint 7 (Polish & Release) Progress

- [x] Expression caching with LRU
- [x] CLI validate improvements
- [x] CHANGELOG.md
- [x] Comprehensive test suite (592 tests)
- [ ] Documentation (Getting Started, CLI Reference, etc.)
- [ ] Example bots
- [ ] npm publish workflow

## Next Steps

### High Priority

1. **Fix Duplicate Key Bugs in Builtins**
   - Review batch action usage across all builtins
   - Ensure proper structure: `{ action: 'batch', items: [...], each: { ... } }`

2. **Documentation**
   - Getting Started guide
   - CLI command reference
   - Expression language reference
   - Actions reference (all 100+)
   - Builtin documentation (14 modules)

3. **Example Bots**
   - Simple bot (ping, hello)
   - Moderation bot
   - Music bot
   - Full-featured bot

### Medium Priority

4. **Canvas Implementation**
   - Welcome card generator
   - Rank card generator
   - Layer system for custom generators

5. **Dashboard Enhancements**
   - Guild settings editor
   - Moderation viewer
   - Real-time bot status

## Commands Reference

```bash
# Install dependencies
pnpm install

# Build all packages
pnpm run build

# Run all tests
pnpm run test

# Run specific package tests
pnpm --filter @furlow/core test
pnpm --filter @furlow/testing test

# Run specific test file
pnpm --filter @furlow/testing test bot-comprehensive

# Development mode (watch)
pnpm run dev

# Lint
pnpm run lint

# Type check
pnpm run typecheck

# Clean all builds
pnpm run clean
```

## Key Files for Context

| File | Purpose |
|------|---------|
| `/tsconfig.base.json` | Base TypeScript config |
| `/turbo.json` | Turborepo task configuration |
| `/packages/core/src/expression/evaluator.ts` | Jexl expression engine with LRU caching |
| `/packages/core/src/expression/transforms.ts` | 50+ expression transforms |
| `/packages/core/src/actions/registry.ts` | Action registration system |
| `/packages/discord/src/client/index.ts` | Discord.js wrapper |
| `/packages/testing/src/__tests__/bot-comprehensive.test.ts` | Full bot scenario tests |
| `/apps/cli/src/commands/validate.ts` | Enhanced validation command |

## Dependencies to Note

- `discord.js` ^14.14.0 - Discord API
- `@discordjs/voice` ^0.17.0 - Voice support
- `jexl` - Expression language (custom type declarations)
- `better-sqlite3` - SQLite storage
- `vitest` - Test framework

---

## Contact / Resources

- **Plan file**: `/Users/obsidian/.claude/plans/soft-twirling-stream.md`
- **Spec reference**: See README.md for full FURLOW YAML specification
- **Changelog**: `/CHANGELOG.md`
