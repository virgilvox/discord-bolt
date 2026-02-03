# Changelog

All notable changes to FURLOW will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.0] - 2026-02-03

### Added

#### Core Framework
- **YAML-based bot specification** - Define Discord bots declaratively without code
- **Expression language** - Jexl-based expressions with 50+ built-in functions
- **Pipe transforms** - String manipulation (`upper`, `lower`, `truncate`, `replace`, etc.)
- **Expression caching** - LRU cache for compiled expressions with performance stats
- **Action registry** - 100+ actions for Discord operations
- **Flow engine** - Reusable action sequences with parameters and control flow
- **State management** - Scoped variables (global, guild, channel, user, member)
- **Event routing** - Gateway event handling with conditions

#### Packages
- `@furlow/core` - Runtime engine (parser, evaluator, actions, flows, state)
- `@furlow/discord` - Discord.js v14 adapter (client, gateway, interactions, voice)
- `@furlow/schema` - JSON Schema definitions and TypeScript types
- `@furlow/storage` - Database adapters (SQLite, PostgreSQL, memory)
- `@furlow/builtins` - 14 pre-built bot components
- `@furlow/pipes` - External integrations (HTTP, WebSocket, webhooks)
- `@furlow/testing` - Test utilities and mocks
- `furlow` (CLI) - Command-line interface

#### Builtins
- **Moderation** - Warn, kick, ban, mute with escalation system
- **Welcome** - Welcome/goodbye messages with embeds and auto-roles
- **Logging** - Message, member, voice, and moderation event logging
- **Tickets** - Support ticket system with transcripts
- **Reaction Roles** - Button and reaction-based role assignment
- **Leveling** - XP system with level rewards and rank cards
- **Music** - Voice playback with queue, filters, and playlists
- **Starboard** - Star reactions to highlight messages
- **Polls** - Voting system with anonymous and timed options
- **Giveaways** - Giveaway system with requirements
- **Auto-responder** - Pattern-based automatic responses
- **AFK** - Away status with mention detection
- **Reminders** - Personal reminders with DM delivery
- **Utilities** - Server info, user info, avatar, and more

#### CLI Commands
- `furlow init` - Scaffold a new bot project
- `furlow start` - Run the bot in production
- `furlow dev` - Development mode with hot reload
- `furlow validate` - Validate YAML specification
- `furlow add` - Add builtin modules
- `furlow build` - Bundle for deployment

#### Dashboard
- React-based web dashboard
- Discord OAuth2 authentication
- Guild overview and statistics
- Settings editor by section
- Moderation case viewer
- Leveling leaderboard
- WebSocket real-time updates

#### Pipes
- **HTTP** - REST API integration with auth and rate limiting
- **WebSocket** - Bidirectional communication with reconnection
- **Webhook** - Incoming webhooks with HMAC verification
- **Database** - External database connections
- **MQTT** - IoT messaging protocol
- **TCP/UDP** - Raw socket connections
- **File** - Filesystem watching

#### Canvas
- Image generation for welcome and rank cards
- Layer system (image, text, shapes, progress bars)
- Custom generator definitions

#### Documentation
- Getting Started guide
- CLI Reference
- Expression Language reference (50+ functions)
- Actions Reference (100+ actions)
- Events Reference
- Builtin documentation (moderation, welcome, leveling)

#### Examples
- Simple bot - Basic commands
- Moderation bot - Full moderation setup
- Music bot - Voice playback with favorites
- Full-featured bot - 11 builtins combined

### Technical Details

#### Architecture
- Monorepo with pnpm workspaces and Turborepo
- TypeScript 5.3+ with strict mode
- ESM modules throughout
- discord.js v14 for Discord API
- Vitest for testing (443 tests)
- tsup for bundling

#### Storage
- SQLite (better-sqlite3) for single-server bots
- PostgreSQL for multi-server deployments
- In-memory adapter for testing

#### Expression Functions
Categories: Math, String, Date/Time, Array, Logic, Discord, Format

Notable functions:
- `now()`, `timestamp()`, `duration()` - Time operations
- `random()`, `range()`, `clamp()` - Math utilities
- `if()`, `coalesce()`, `switch()` - Conditionals
- `json()`, `entries()`, `keys()` - Object manipulation

#### State Scopes
- `global` - Shared across all guilds
- `guild` - Per-guild storage
- `channel` - Per-channel storage
- `user` - Per-user (follows across guilds)
- `member` - Per-user-per-guild

### Dependencies
- Node.js 20+ LTS required
- discord.js ^14.0.0
- jexl for expressions
- yaml for parsing
- ajv for schema validation
- better-sqlite3 / pg for storage

---

## Future Plans

### 0.2.0 (Planned)
- Plugin system for custom actions
- Dashboard improvements
- More canvas generators
- i18n support
- Audit logging

### 0.3.0 (Planned)
- Cluster support
- Sharding
- Redis storage adapter
- Rate limit management
- Analytics dashboard
