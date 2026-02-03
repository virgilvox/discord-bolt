# Moderation Bot Example

A FURLOW bot focused on server moderation using the built-in moderation system.

## Features

### Built-in Moderation Commands
- `/warn` - Warn a user
- `/kick` - Kick a user
- `/ban` - Ban a user
- `/mute` - Mute a user
- `/unmute` - Unmute a user
- `/warnings` - View warnings
- `/case` - View a moderation case
- `/cases` - List recent cases
- `/purge` - Bulk delete messages

### Custom Commands
- `/report` - Report a user to moderators
- `/quickmute` - Quick mute with preset durations
- `/lockdown` - Lock/unlock a channel
- `/massban` - Ban multiple users at once (admin)

### Automatic Features
- Warning escalation (auto-mute, kick, ban at thresholds)
- Anti mass-mention (auto-mute)
- Deleted message logging
- All moderation actions logged to channel

## Setup

1. Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```

2. Fill in all the required values in `.env`:
   - Bot token and client ID
   - Role IDs for moderators and admins
   - Channel IDs for logs and reports

3. Create the required channels in your Discord server:
   - Mod log channel (for mod actions)
   - Reports channel (for user reports)
   - Message log channel (for deleted messages)

4. Create the required roles:
   - Moderator role
   - Admin role

5. Run the bot:
   ```bash
   furlow start
   ```

## Warning Escalation

The bot automatically escalates punishments based on warning count:

| Warnings | Action |
|----------|--------|
| 3 | 1 hour mute |
| 5 | 24 hour mute |
| 7 | Kick |
| 10 | 7 day ban |
| 15 | Permanent ban |

## Permissions

The bot requires these Discord permissions:
- Manage Messages (for purge, auto-delete)
- Kick Members
- Ban Members
- Moderate Members (for timeouts)
- View Audit Log
- Send Messages
- Embed Links

## Customization

Edit `furlow.yaml` to:
- Change warning thresholds
- Add/remove mod roles
- Customize log embeds
- Add custom commands

See the [moderation builtin documentation](../../docs/builtins/moderation.md) for more options.
