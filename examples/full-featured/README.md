# Full-Featured Bot Example

A comprehensive FURLOW bot showcasing multiple builtins working together for a complete community server.

## Features

This bot includes:

### Moderation
- Warn, kick, ban, mute commands
- Warning escalation (auto-mute at 3, ban at 10)
- Mod action logging
- DM notifications

### Welcome System
- Welcome messages with embeds
- Goodbye messages
- Auto-role assignment

### Leveling
- XP per message (15-25)
- Level-up announcements
- Role rewards at levels 5, 10, 25, 50
- XP boost for server boosters
- Rank cards

### Logging
- Message edits/deletes
- Member joins/leaves
- Moderation actions
- Voice channel activity
- Role changes

### Reaction Roles
- Button-based role selection
- Notification opt-in roles

### Tickets
- Support ticket system
- Staff-only access
- Transcripts on close

### Starboard
- Star reactions create highlights
- 3-star threshold

### Auto-Responder
- Greeting responses
- Custom triggers

### Other Features
- AFK system
- Reminders
- Suggestions with voting
- Giveaways
- Daily stats report
- Weekly leaderboard

## Setup

1. Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```

2. Create the required channels and categories in your Discord server

3. Create the required roles

4. Copy all IDs to your `.env` file

5. Run the bot:
   ```bash
   furlow start
   ```

## Required Server Structure

### Channels
- `#welcome` - Welcome/goodbye messages
- `#rules` - Server rules
- `#roles` - Self-assignable roles
- `#level-ups` - Level announcements
- `#starboard` - Starred messages
- `#suggestions` - User suggestions
- `#stats` - Daily stats

### Log Channels
- `#mod-logs` - Moderation actions
- `#message-logs` - Message edits/deletes
- `#member-logs` - Joins/leaves
- `#voice-logs` - Voice activity
- `#ticket-logs` - Ticket transcripts

### Categories
- Tickets (for support tickets)

### Roles
- Member (auto-assigned on join)
- Level 5, 10, 25, 50 (level rewards)
- Announcements, Events, Giveaways (self-assign)
- Support (ticket access)

## Permissions

The bot requires extensive permissions:
- Administrator (recommended for full functionality)

Or individually:
- Manage Roles
- Manage Channels
- Kick/Ban Members
- Moderate Members
- Manage Messages
- Send Messages
- Embed Links
- Add Reactions
- Read Message History
- Connect/Speak (voice)

## Customization

This example demonstrates the full power of FURLOW. You can:

- Remove builtins you don't need
- Adjust thresholds (XP, warnings, starboard)
- Change announcement formats
- Add custom commands
- Modify scheduled tasks

See the individual builtin documentation for all configuration options.

## File Structure

```
full-featured/
├── furlow.yaml      # Main configuration
├── .env             # Environment variables
├── .env.example     # Example environment file
└── README.md        # This file
```

For larger projects, you can split the configuration:

```
full-featured/
├── furlow.yaml      # Main config with imports
├── commands/
│   ├── moderation.yaml
│   ├── fun.yaml
│   └── admin.yaml
├── events/
│   └── logging.yaml
└── .env
```

## Performance Notes

- SQLite is used for storage (good for single-server bots)
- For multi-server bots, consider PostgreSQL
- Enable only the builtins you need
- Adjust logging verbosity as needed
