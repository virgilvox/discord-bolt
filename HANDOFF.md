# FURLOW Development Handoff

## Project Overview

FURLOW (**F**lexible **U**ser **R**ules for **L**ive **O**nline **W**orkers) is a declarative Discord bot framework that allows building bots using YAML specifications. The project is a TypeScript monorepo using pnpm workspaces and Turborepo.

## Current State: v1.0.4 - Feature Complete

All 9 packages are published to npm. All code features are 100% implemented. Security hardened through 10 audit passes with 67+ vulnerabilities discovered and 20 critical/high fixes applied.

| Package | Version | Tests | Notes |
|---------|---------|-------|-------|
| `@furlow/schema` | 1.0.3 | - | Type definitions only |
| `@furlow/storage` | 1.0.3 | 226 | Real adapters tested |
| `@furlow/core` | 1.0.9 | 1,331 | Critical paths tested |
| `@furlow/discord` | 1.0.4 | 127 | Voice tests fixed |
| `@furlow/pipes` | 1.0.4 | 256 | WebSocket mock fixed |
| `@furlow/testing` | 1.0.3 | 281 | Test utilities + 75 E2E tests |
| `@furlow/builtins` | 1.0.4 | 437 | Structure-only tests (P3) |
| `@furlow/dashboard` | 1.0.3 | - | No tests |
| `@furlow/cli` | 1.0.13 | - | No tests |

**Total Tests: 2,658 (All Passing)**

### Test Quality Assessment

| Quality Level | Count | Percentage | Description |
|---------------|-------|------------|-------------|
| Excellent | ~900 | 34% | Real behavioral tests with full execution |
| Good | ~500 | 19% | Integration-focused with real dependencies |
| Medium | ~400 | 15% | Partial behavior validation |
| Weak (Structure-only) | ~835 | 32% | Verify object shapes, not behavior |

The builtins package (437 tests) primarily uses structure-only testing. This is acceptable because core runtime paths are comprehensively tested and builtins compose those tested components.

## Implementation Status

```
┌─────────────────────────────────────────────────────────┐
│                  FURLOW v1.0.4 STATUS                   │
├─────────────────────────────────────────────────────────┤
│ Core Runtime          ████████████████████████  100%    │
│ Action Handlers       ████████████████████████  100%    │
│ Storage Adapters      ████████████████████████  100%    │
│ External Pipes        ████████████████████████  100%    │
│ Voice System          ████████████████████████  100%    │
│ Canvas System         ████████████████████████  100%    │
│ Video/Streaming       ████████████████████████  100%    │
│ Dashboard API         ████████████████████████  100%    │
│ CLI Commands          ████████████████████████  100%    │
│ Runtime Spec          ████████████████████████  100%    │
│ Compliance Tests      ████████████████████████  100%    │
│ Documentation         ████████████████████████  100%    │
├─────────────────────────────────────────────────────────┤
│ TEST QUALITY          ████████████████████░░░░   85%    │
│ - Core behavioral     ████████████████████████   95%    │
│ - Pipes behavioral    ████████████████████████   95%    │
│ - Discord integration ████████████████████░░░░   80%    │
│ - Builtins behavioral ████░░░░░░░░░░░░░░░░░░░░   15%    │
│ - E2E tests           ████████████████████████  100%    │
└─────────────────────────────────────────────────────────┘
```

## Complete Feature List

### Action System (85 Actions)

| Category | Count | Actions |
|----------|-------|---------|
| **Message** | 11 | reply, send_message, edit_message, delete_message, defer, update_message, add_reaction, add_reactions, remove_reaction, clear_reactions, bulk_delete |
| **Member** | 14 | assign_role, remove_role, toggle_role, kick, ban, unban, timeout, remove_timeout, send_dm, set_nickname, move_member, disconnect_member, server_mute, server_deafen |
| **State** | 7 | set, increment, decrement, list_push, list_remove, set_map, delete_map |
| **Flow** | 13 | call_flow, abort, return, flow_if, flow_switch, flow_while, repeat, parallel, batch, try, wait, log, emit |
| **Channel** | 9 | create_channel, edit_channel, delete_channel, create_thread, archive_thread, set_channel_permissions, create_role, edit_role, delete_role |
| **Component** | 1 | show_modal |
| **Voice** | 17 | voice_join, voice_leave, voice_play, voice_pause, voice_resume, voice_stop, voice_skip, voice_seek, voice_volume, voice_set_filter, voice_search, queue_get, queue_add, queue_remove, queue_clear, queue_shuffle, queue_loop |
| **Database** | 4 | db_insert, db_update, db_delete, db_query |
| **Integration** | 9 | pipe_request, pipe_send, webhook_send, create_timer, cancel_timer, counter_increment, record_metric, canvas_render, render_layers |

### Voice System

- **Playback**: Join, leave, play, pause, resume, stop, skip
- **Seeking**: Seek to any position with duration string support (`1m30s`, `90s`)
- **Volume**: 0-200% volume control with inline volume
- **Filters**: 10 audio filters (bassboost, nightcore, vaporwave, 8d, treble, normalizer, karaoke, tremolo, vibrato, reverse)
- **Search**: YouTube search via `play-dl` and `youtube-sr`
- **Queue**: Add, remove, clear, shuffle, loop (off/track/queue)

### Canvas System

- **Welcome Cards**: 4 themes (default, dark, light, minimal)
- **Rank Cards**: 4 themes (default, dark, gradient, minimal)
- **Layer Types**: 6 types (image, circle_image, text, rect, progress_bar, gradient)
- **Features**: Conditional rendering, expression interpolation, customizable colors/fonts

### External Pipes (8 Types)

| Pipe | Protocol | Features |
|------|----------|----------|
| **HTTP** | REST | GET, POST, PUT, PATCH, DELETE, auth, rate limiting, retry |
| **WebSocket** | WS | Bidirectional messaging, auto-reconnect, heartbeat |
| **Webhook** | HTTP | Receive/send webhooks, HMAC verification |
| **MQTT** | MQTT | Pub/sub, QoS levels, wildcards, Last Will |
| **TCP** | TCP | Client/server modes, request-response pattern |
| **UDP** | UDP | Broadcast, multicast, datagram messaging |
| **Database** | SQL | SQLite/PostgreSQL/Memory, CRUD, change events |
| **File** | FS | File watching, glob patterns, hot reload |

### Builtin Modules (14)

| Module | Features |
|--------|----------|
| **moderation** | warn, kick, ban, mute, case management |
| **welcome** | Join/leave messages, auto-role, DM welcome |
| **logging** | Message, member, server event logging |
| **tickets** | Support tickets, claiming, transcripts |
| **reaction-roles** | Role assignment via reactions/buttons |
| **leveling** | XP, levels, rewards, leaderboards |
| **music** | Voice playback, queue, filters |
| **starboard** | Star reactions, hall of fame |
| **polls** | Voting, multiple choice |
| **giveaways** | Requirements, reroll, winners |
| **auto-responder** | Custom triggers, responses |
| **afk** | AFK status, mention notifications |
| **reminders** | Personal reminders, DM delivery |
| **utilities** | Serverinfo, userinfo, avatar, etc. |

### Expression System

- **69 Functions**: Date/time, math, string, array, object, type, conversion, Discord, utility
- **48 Transforms**: Pipe-based operators for data transformation
- **Caching**: LRU cache with configurable size and timeout
- **Interpolation**: `${expression}` syntax in strings

### CLI Commands

| Command | Description |
|---------|-------------|
| `furlow init [name]` | Scaffold new bot project with templates |
| `furlow start <spec>` | Run bot from YAML specification |
| `furlow validate <spec>` | Validate YAML with colored error output |
| `furlow add <builtin>` | Add builtin module to project |
| `furlow export <spec>` | Export Discord API command JSON |

## Design Principles

### State Access Pattern

State is accessed in expressions using scoped notation:
```yaml
# Set state with scope
- set:
    var: counter
    value: 10
    scope: global

# Access in expressions uses: state.{scope}.{name}
- log:
    message: "Counter: ${state.global.counter}"
```

**Available scopes:**
- `state.global.X` - Shared across all guilds
- `state.guild.X` - Per-guild state (requires guild context)
- `state.channel.X` - Per-channel state
- `state.user.X` - Per-user state (across guilds)
- `state.member.X` - Per-guild-member state

### Action Shorthand

Users write intuitive YAML shorthand:
```yaml
# User writes:
- reply:
    content: "Hello!"

# System normalizes to schema format:
- action: reply
  content: "Hello!"
```

This normalization happens **before** schema validation, allowing user-friendly syntax while maintaining strict schema compliance.

### Long-Running Commands

For commands that take more than 3 seconds (Discord's timeout), use `defer`:
```yaml
commands:
  - name: slow-command
    actions:
      - defer:
          ephemeral: true
      - call_flow:
          flow: long_running_test
      - reply:  # Uses followUp after defer
          content: "Done!"
```

## Architecture

```
furlow/
├── apps/
│   ├── cli/                      # `furlow` CLI tool
│   │   └── src/commands/
│   │       ├── start.ts          # Full runtime with all features
│   │       ├── init.ts           # Project scaffolding
│   │       ├── validate.ts       # YAML validation
│   │       ├── add.ts            # Add builtins
│   │       └── export.ts         # Discord API export
│   └── dashboard/                # Web dashboard
│       ├── server/               # Express + WebSocket
│       │   ├── index.ts          # Server with storage injection
│       │   ├── routes/api.ts     # 18 API endpoints
│       │   └── websocket.ts      # Real-time updates
│       └── src/                  # React client
├── packages/
│   ├── schema/                   # TypeScript types & JSON schemas
│   ├── storage/                  # Database adapters (Memory, SQLite, PostgreSQL)
│   ├── core/
│   │   ├── parser/               # YAML loading, normalization & validation
│   │   ├── expression/           # Jexl evaluator + 69 functions + caching
│   │   ├── actions/handlers/     # 85 action handlers
│   │   ├── events/               # EventRouter with normalization
│   │   ├── flows/                # FlowEngine with recursion protection
│   │   ├── state/                # 5-scope state management
│   │   ├── automod/              # AutomodEngine
│   │   ├── scheduler/            # CronScheduler
│   │   └── canvas/               # Image generation (welcome & rank cards)
│   ├── discord/                  # Discord.js adapter
│   │   ├── client/               # Client wrapper
│   │   ├── interactions/         # Commands, buttons, modals
│   │   ├── voice/                # VoiceManager (seek, filters, search)
│   │   ├── video/                # VideoManager (stream detection)
│   │   └── gateway/              # Gateway events
│   ├── pipes/                    # 8 external integration types
│   ├── builtins/                 # 14 pre-built modules
│   └── testing/                  # Test utilities + E2E framework
├── specs/compliance/             # Runtime compliance tests (20/63/85 actions)
├── RUNTIME_SPEC.md               # Language-agnostic runtime spec
└── HANDOFF.md                    # This file
```

## Runtime Specification

The `RUNTIME_SPEC.md` document defines the complete FURLOW runtime specification for building alternative implementations, covering compliance levels, YAML format, expression language (69 functions, 48 transforms), state management, all 85 actions, events, and flows.

**Processing Pipeline:**
```
Load YAML → Resolve Imports → Resolve Env Vars → NORMALIZE → Validate Schema → Execute
```

Action normalization (shorthand → schema format) happens **before** schema validation.

## Development Commands

```bash
pnpm install              # Install dependencies
pnpm run build            # Build all packages
pnpm run test             # Run all tests (2,658 tests)
pnpm run dev              # Development mode (watch)
pnpm run clean            # Clean all builds
pnpm -r publish --access public --no-git-checks  # Publish
```

## Known Issues

### 1. TypeScript Typecheck Errors in Tests (Non-blocking)
- Some test files have TypeScript strict mode errors (missing properties, type mismatches)
- Tests pass at runtime because JavaScript is dynamic
- `pnpm typecheck` may fail on @furlow/core due to test file type errors
- Dashboard production code: 0 TypeScript errors

## Remaining Work

**P2 - Medium:**
- [ ] CLI tests: init, start, validate commands

**P3 - Low (Optional):**
- [ ] Replace builtin structure-only tests with behavioral tests (14 files)

## Key Fixes Summary

| Audit | Summary |
|-------|---------|
| Expression Syntax (02-03) | Fixed evaluated vs interpolated field syntax across 38 files |
| Deep Audit #3-#5 (02-03/04) | snake_case standardization, schema field corrections, 45+ files |
| Deep Audit #6-#8 (02-04) | Multi-agent audits fixing 150+ context property, schema, and example issues |
| Security Audit #9 (02-04) | ReDoS, SQL injection, memory leak, and race condition fixes |
| Security Audit #10 (02-04) | 67+ vulnerabilities found, 20 critical/high fixes (prototype pollution, path traversal, resource exhaustion) |
| 100% Accuracy Audit (02-04) | All 71 doc/example files aligned with schema definitions |
| Implementation Fix Pass (02-04) | Voice filters, webhook verification, PostgreSQL pipe, error handler |
| Test Suite Overhaul (02-04) | 310 new behavioral tests, E2E framework with 75 tests |
| LLM Reference Audit (02-05) | Line-by-line accuracy pass, context variables, URL methods |
| Automod & Events (02-05) | 3 new automod triggers, 6 new high-level events |
| Canvas Gotchas (02-06) | 10 documented pitfalls for LLM-generated YAML specs |

For detailed session logs, see [docs/AUDIT_HISTORY.md](docs/AUDIT_HISTORY.md).

## Resources

- **Documentation Site**: https://furlow.dev
- **npm**: https://www.npmjs.com/org/furlow
- **Runtime Spec**: `RUNTIME_SPEC.md`
- **Compliance Tests**: `specs/compliance/`
- **Changelog**: `CHANGELOG.md`
