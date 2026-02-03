# Moderation Builtin

The moderation builtin provides comprehensive moderation tools including warnings, kicks, bans, mutes, and a case management system.

## Quick Start

```yaml
builtins:
  moderation:
    enabled: true
    log_channel: "mod-logs-channel-id"
```

## Configuration

```yaml
builtins:
  moderation:
    enabled: true

    # Logging
    log_channel: "123456789"           # Channel for mod action logs
    dm_on_action: true                 # DM users when actioned

    # Permissions
    mod_roles:                         # Roles that can use mod commands
      - "moderator-role-id"
      - "admin-role-id"

    # Warning escalation
    escalation:
      enabled: true
      thresholds:
        - warnings: 3
          action: mute
          duration: "1h"
        - warnings: 5
          action: mute
          duration: "1d"
        - warnings: 7
          action: kick
        - warnings: 10
          action: ban

    # Mute configuration
    mute:
      use_timeout: true                # Use Discord timeout (recommended)
      role: "muted-role-id"            # Or use mute role (legacy)
      default_duration: "1h"

    # Ban configuration
    ban:
      delete_messages: 7               # Days of messages to delete (0-7)

    # Appeals
    appeals:
      enabled: false
      channel: "appeals-channel-id"
```

## Commands

### `/warn`

Issues a warning to a user.

```
/warn user:@User reason:Spamming in chat
```

**Options:**
| Option | Type | Required | Description |
|--------|------|----------|-------------|
| `user` | User | Yes | User to warn |
| `reason` | String | No | Reason for warning |

**Permissions:** Moderate Members

### `/warnings`

View warnings for a user.

```
/warnings user:@User
```

**Options:**
| Option | Type | Required | Description |
|--------|------|----------|-------------|
| `user` | User | Yes | User to check |

### `/clearwarnings`

Clear all warnings for a user.

```
/clearwarnings user:@User reason:Appeal accepted
```

**Options:**
| Option | Type | Required | Description |
|--------|------|----------|-------------|
| `user` | User | Yes | User to clear |
| `reason` | String | No | Reason for clearing |

**Permissions:** Administrator

### `/kick`

Kicks a member from the server.

```
/kick user:@User reason:Rule violation
```

**Options:**
| Option | Type | Required | Description |
|--------|------|----------|-------------|
| `user` | User | Yes | User to kick |
| `reason` | String | No | Reason for kick |

**Permissions:** Kick Members

### `/ban`

Bans a user from the server.

```
/ban user:@User reason:Severe violation duration:7d
```

**Options:**
| Option | Type | Required | Description |
|--------|------|----------|-------------|
| `user` | User | Yes | User to ban |
| `reason` | String | No | Reason for ban |
| `duration` | String | No | Temp ban duration |
| `delete_messages` | Integer | No | Days of messages to delete |

**Permissions:** Ban Members

### `/unban`

Unbans a user.

```
/unban user:123456789 reason:Appeal accepted
```

**Options:**
| Option | Type | Required | Description |
|--------|------|----------|-------------|
| `user` | String | Yes | User ID to unban |
| `reason` | String | No | Reason for unban |

**Permissions:** Ban Members

### `/mute`

Mutes a member (prevents sending messages).

```
/mute user:@User duration:1h reason:Spamming
```

**Options:**
| Option | Type | Required | Description |
|--------|------|----------|-------------|
| `user` | User | Yes | User to mute |
| `duration` | String | No | Mute duration |
| `reason` | String | No | Reason for mute |

**Permissions:** Moderate Members

### `/unmute`

Unmutes a member.

```
/unmute user:@User reason:Time served
```

**Options:**
| Option | Type | Required | Description |
|--------|------|----------|-------------|
| `user` | User | Yes | User to unmute |
| `reason` | String | No | Reason for unmute |

**Permissions:** Moderate Members

### `/case`

View details of a specific moderation case.

```
/case id:123
```

**Options:**
| Option | Type | Required | Description |
|--------|------|----------|-------------|
| `id` | Integer | Yes | Case ID |

### `/cases`

View recent moderation cases.

```
/cases user:@User type:warn
```

**Options:**
| Option | Type | Required | Description |
|--------|------|----------|-------------|
| `user` | User | No | Filter by user |
| `moderator` | User | No | Filter by moderator |
| `type` | String | No | Filter by type (warn/kick/ban/mute) |

### `/reason`

Update the reason for a case.

```
/reason case:123 reason:Updated reason
```

**Options:**
| Option | Type | Required | Description |
|--------|------|----------|-------------|
| `case` | Integer | Yes | Case ID |
| `reason` | String | Yes | New reason |

**Permissions:** Moderate Members

### `/purge`

Bulk delete messages.

```
/purge amount:50 user:@User
```

**Options:**
| Option | Type | Required | Description |
|--------|------|----------|-------------|
| `amount` | Integer | Yes | Number to delete (1-100) |
| `user` | User | No | Filter by author |
| `contains` | String | No | Filter by content |
| `bots` | Boolean | No | Only bot messages |

**Permissions:** Manage Messages

### `/slowmode`

Set channel slowmode.

```
/slowmode duration:10s channel:#general
```

**Options:**
| Option | Type | Required | Description |
|--------|------|----------|-------------|
| `duration` | String | Yes | Slowmode duration (0 to disable) |
| `channel` | Channel | No | Channel (default: current) |

**Permissions:** Manage Channels

### `/lock` / `/unlock`

Lock or unlock a channel.

```
/lock channel:#general reason:Raid prevention
/unlock channel:#general
```

**Options:**
| Option | Type | Required | Description |
|--------|------|----------|-------------|
| `channel` | Channel | No | Channel (default: current) |
| `reason` | String | No | Reason |

**Permissions:** Manage Channels

## State

The moderation builtin creates these tables:

### `mod_cases`

| Column | Type | Description |
|--------|------|-------------|
| `id` | number | Auto-increment case ID |
| `guild_id` | string | Guild ID |
| `user_id` | string | Target user ID |
| `moderator_id` | string | Moderator user ID |
| `type` | string | warn, kick, ban, mute, unmute, unban |
| `reason` | string | Reason for action |
| `duration` | string | Duration (for temp actions) |
| `expires_at` | timestamp | When action expires |
| `created_at` | timestamp | When action was taken |

### `mod_active_mutes`

| Column | Type | Description |
|--------|------|-------------|
| `guild_id` | string | Guild ID |
| `user_id` | string | Muted user ID |
| `expires_at` | timestamp | When mute expires |
| `case_id` | number | Reference to case |

## Events

### `moderation_action`

Fired when any moderation action occurs.

**Context:**
| Variable | Type | Description |
|----------|------|-------------|
| `action` | string | Action type (warn/kick/ban/mute) |
| `target` | User | Target user |
| `moderator` | User | Moderator who acted |
| `reason` | string | Reason |
| `case_id` | number | Case ID |

```yaml
events:
  moderation_action:
    actions:
      - send_message:
          channel: "extra-logs"
          content: "${moderator.username} ${action}ed ${target.username}"
```

### `warning_threshold`

Fired when a user reaches a warning threshold.

**Context:**
| Variable | Type | Description |
|----------|------|-------------|
| `user` | User | The user |
| `count` | number | Total warnings |
| `threshold` | number | Threshold reached |
| `action` | string | Auto-action taken |

## Customization

### Custom Log Format

```yaml
builtins:
  moderation:
    log_embed:
      color: "#ff0000"
      title: "Moderation Action"
      fields:
        - name: "Action"
          value: "${action|upper}"
        - name: "User"
          value: "${target.mention} (${target.id})"
        - name: "Moderator"
          value: "${moderator.mention}"
        - name: "Reason"
          value: "${reason ?? 'No reason provided'}"
      footer:
        text: "Case #${case_id}"
      timestamp: true
```

### Custom DM Message

```yaml
builtins:
  moderation:
    dm_messages:
      warn: |
        You have received a warning in **${guild.name}**.
        Reason: ${reason ?? 'No reason provided'}

        This is warning #${warning_count}. Please review the server rules.

      mute: |
        You have been muted in **${guild.name}**.
        Duration: ${duration ?? 'Indefinite'}
        Reason: ${reason ?? 'No reason provided'}

      kick: |
        You have been kicked from **${guild.name}**.
        Reason: ${reason ?? 'No reason provided'}

        You may rejoin if you wish.

      ban: |
        You have been banned from **${guild.name}**.
        Reason: ${reason ?? 'No reason provided'}
```

## Examples

### Basic Setup

```yaml
builtins:
  moderation:
    enabled: true
    log_channel: "mod-logs"
    dm_on_action: true
```

### With Escalation

```yaml
builtins:
  moderation:
    enabled: true
    log_channel: "mod-logs"
    escalation:
      enabled: true
      thresholds:
        - warnings: 3
          action: mute
          duration: "30m"
        - warnings: 5
          action: mute
          duration: "6h"
        - warnings: 7
          action: kick
        - warnings: 10
          action: ban
          duration: "7d"
        - warnings: 15
          action: ban
```

### Staff Roles Configuration

```yaml
builtins:
  moderation:
    enabled: true
    log_channel: "mod-logs"
    mod_roles:
      - "trial-mod"      # Can warn and mute
      - "moderator"      # Can kick
      - "senior-mod"     # Can ban

    # Role-specific permissions
    permissions:
      trial-mod:
        - warn
        - mute
      moderator:
        - warn
        - mute
        - kick
      senior-mod:
        - warn
        - mute
        - kick
        - ban
```
