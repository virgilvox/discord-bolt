# FURLOW Next Steps Plan

## Priority 1: Fix Critical Bugs

### 1.1 Fix Duplicate Key Bugs in Builtins

**Problem**: Several builtin files have duplicate `action` keys in object literals, causing the second to overwrite the first.

**Files to fix**:
- `packages/builtins/src/auto-responder/index.ts` (lines 64, 66)
- `packages/builtins/src/giveaways/index.ts` (lines 145, 147)
- `packages/builtins/src/polls/index.ts` (lines 166, 168)
- `packages/builtins/src/reaction-roles/index.ts` (lines 125, 127, 182, 184, 188, 190)
- `packages/builtins/src/reminders/index.ts` (lines 51, 53)

**Fix pattern**: The `batch` action structure should be:
```typescript
// WRONG (current)
{
  action: 'batch',
  items: '${items}',
  action: { action: 'something', ... }  // duplicate key!
}

// CORRECT
{
  action: 'batch',
  items: '${items}',
  each: { action: 'something', ... }  // use 'each' for the nested action
}
```

**Verification**: Build should complete with no duplicate key warnings.

---

## Priority 2: Fix Type System Issues

### 2.1 Update Schema Types for Expression Support

**Problem**: Schema action types use concrete types (`number`, `boolean`) but builtins use expression strings (`'${args.count}'`).

**Solution**: Update schema types to allow expressions:

```typescript
// packages/schema/src/types/common.ts
export type Expression = string;
export type ExpressionOr<T> = Expression | T;

// packages/schema/src/types/actions.ts
export interface BanAction {
  action: 'ban';
  user: Expression;
  reason?: Expression;
  delete_message_days?: ExpressionOr<number>;  // Changed from just number
  // ...
}
```

**Files to update**:
- `packages/schema/src/types/common.ts` - Add `ExpressionOr<T>` type
- `packages/schema/src/types/actions.ts` - Update action interfaces

### 2.2 Fix @furlow/schema Import Resolution

**Problem**: tsup DTS generation fails to resolve `@furlow/schema` in pipes/discord packages, so we created local type duplicates.

**Investigation needed**:
1. Check if tsup's `external` config is correct
2. Verify TypeScript project references are set up properly
3. Check if `@furlow/schema` exports types correctly

**Files with local type duplicates to eventually remove**:
- `packages/pipes/src/types.ts` - HttpPipeConfig, WebhookPipeConfig, WebSocketPipeConfig
- `packages/discord/src/voice/index.ts` - VoiceConfig, AudioFilter, QueueLoopMode

### 2.3 Re-enable Builtins DTS Generation

**After fixing 2.1**:
1. Update `packages/builtins/tsup.config.ts` to set `dts: true`
2. Remove type assertion workarounds in `packages/builtins/src/moderation/index.ts`
3. Verify build passes with proper types

---

## Priority 3: Testing Infrastructure

### 3.1 Core Package Tests

**Location**: `packages/core/src/**/*.test.ts`

**Priority test areas**:
1. Expression evaluator (`expression/evaluator.test.ts`)
   - Test all 50+ built-in functions
   - Test expression interpolation
   - Test error handling for invalid expressions

2. Action registry (`actions/registry.test.ts`)
   - Test action registration
   - Test action execution
   - Test action validation

3. Flow engine (`flows/engine.test.ts`)
   - Test flow_if conditionals
   - Test flow_switch
   - Test loops (batch, repeat)
   - Test flow calls

4. State manager (`state/manager.test.ts`)
   - Test variable scopes (global, guild, user, member, channel)
   - Test table operations (CRUD)
   - Test cache with TTL

### 3.2 Discord Package Tests

**Location**: `packages/discord/src/**/*.test.ts`

**Priority test areas**:
1. Interaction handler - mock slash command handling
2. Voice manager - mock voice connections
3. Gateway manager - mock connection lifecycle

### 3.3 Integration Tests

**Location**: `packages/testing/tests/integration/`

Test complete flows:
1. Load YAML spec → Parse → Validate → Execute actions
2. Command registration → Interaction → Response
3. Event trigger → Flow execution → State mutation

---

## Priority 4: Documentation

### 4.1 User Documentation

| Document | Location | Content |
|----------|----------|---------|
| Getting Started | `docs/getting-started.md` | Installation, first bot, basic concepts |
| CLI Reference | `docs/cli-reference.md` | All CLI commands with examples |
| Expression Language | `docs/expression-language.md` | Syntax, contexts, all 50+ functions |
| Actions Reference | `docs/actions-reference.md` | All 100+ actions with parameters |
| Events Reference | `docs/events-reference.md` | All Discord events |
| Builtins Guide | `docs/builtins/` | One doc per builtin module |

### 4.2 API Documentation

- Set up TypeDoc generation
- Add JSDoc comments to public APIs
- Generate to `docs/api/`

---

## Priority 5: Feature Completion

### 5.1 Canvas Implementation

**Location**: `packages/core/src/canvas/`

Currently stubbed. Need to implement:
1. `renderer.ts` - Canvas rendering engine using `node-canvas`
2. `layers.ts` - Layer system (image, text, shapes, progress bars)
3. `generators/welcome.ts` - Welcome card generator
4. `generators/rank.ts` - Rank card generator

### 5.2 Dashboard Enhancements

**Location**: `apps/dashboard/`

Current state: Basic server + minimal React client

Needed:
1. Guild selection page
2. Settings editor per section
3. Moderation viewer (warnings, cases)
4. Real-time bot status via WebSocket
5. Music controls if voice enabled

---

## Execution Order

```
Week 1: Critical Fixes
├── Day 1-2: Fix duplicate key bugs in all builtins
├── Day 3-4: Update schema types for ExpressionOr<T>
└── Day 5: Re-enable builtins DTS, verify clean build

Week 2: Testing Foundation
├── Day 1-2: Expression evaluator tests
├── Day 3: Action registry tests
├── Day 4: Flow engine tests
└── Day 5: State manager tests

Week 3: Documentation
├── Day 1: Getting Started guide
├── Day 2: CLI Reference
├── Day 3: Expression Language guide
├── Day 4-5: Actions Reference (100+ actions)

Week 4: Feature Completion
├── Day 1-3: Canvas implementation
├── Day 4-5: Dashboard enhancements

Ongoing: Integration tests, API docs, polish
```

---

## Verification Checklist

Before considering the project "ready":

- [ ] Build passes with no warnings
- [ ] All 9 packages have DTS generation enabled
- [ ] No local type duplicates (all imports from @furlow/schema)
- [ ] Unit test coverage >80% on core package
- [ ] Integration tests pass
- [ ] Getting Started guide complete
- [ ] At least one example bot runs successfully
- [ ] CLI commands all functional (init, start, dev, validate)
