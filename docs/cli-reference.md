# FURLOW CLI Reference

The FURLOW CLI provides commands for creating, running, and managing FURLOW Discord bots.

## Installation

```bash
# Global installation
npm install -g furlow

# Or with pnpm
pnpm add -g furlow
```

## Commands

### `furlow init`

Create a new FURLOW bot project.

```bash
furlow init [name]
```

**Arguments:**
- `name` - Project name (defaults to current directory)

**Options:**
| Option | Description | Default |
|--------|-------------|---------|
| `-t, --template <template>` | Template to use | `simple` |
| `--no-git` | Skip git initialization | - |
| `--no-install` | Skip dependency installation | - |

**Templates:**
- `simple` - Basic bot with ping command
- `moderation` - Bot with moderation features
- `music` - Bot with music playback
- `full` - Full-featured bot with multiple builtins

**Examples:**

```bash
# Create a new bot in current directory
furlow init

# Create a bot named "my-bot"
furlow init my-bot

# Create from moderation template
furlow init my-bot --template moderation

# Skip git and npm install
furlow init my-bot --no-git --no-install
```

---

### `furlow start`

Start the FURLOW bot in production mode.

```bash
furlow start [path]
```

**Arguments:**
- `path` - Path to project directory or furlow.yaml (defaults to current directory)

**Options:**
| Option | Description | Default |
|--------|-------------|---------|
| `-e, --env <file>` | Path to environment file | `.env` |
| `--no-validate` | Skip schema validation | - |

**Examples:**

```bash
# Start bot in current directory
furlow start

# Start bot from specific directory
furlow start ./my-bot

# Start with custom env file
furlow start -e .env.production

# Start without validation (faster startup)
furlow start --no-validate
```

**Environment Variables:**

The bot requires these environment variables (typically in `.env`):

| Variable | Required | Description |
|----------|----------|-------------|
| `DISCORD_TOKEN` | Yes | Discord bot token |
| `DISCORD_CLIENT_ID` | Yes | Discord application client ID |
| `DATABASE_URL` | No | Database connection URL |

---

### `furlow dev`

Start the bot in development mode with hot reload.

```bash
furlow dev [path]
```

**Arguments:**
- `path` - Path to project directory or furlow.yaml (defaults to current directory)

**Options:**
| Option | Description | Default |
|--------|-------------|---------|
| `-e, --env <file>` | Path to environment file | `.env` |
| `--no-validate` | Skip schema validation | - |

**Features:**
- Watches for file changes
- Automatically reloads bot when YAML files change
- Shows validation errors inline
- Faster feedback during development

**Examples:**

```bash
# Development mode in current directory
furlow dev

# Development mode with specific env file
furlow dev -e .env.development
```

---

### `furlow validate`

Validate a FURLOW specification file.

```bash
furlow validate <path>
```

**Arguments:**
- `path` - Path to furlow.yaml or directory to validate

**Options:**
| Option | Description | Default |
|--------|-------------|---------|
| `--strict` | Enable strict validation | - |

**Validation Checks:**
- YAML syntax errors
- JSON Schema compliance
- Required field presence
- Type correctness
- Reference validity (channels, roles, flows)
- Expression syntax

**Examples:**

```bash
# Validate current directory
furlow validate .

# Validate specific file
furlow validate ./my-bot/furlow.yaml

# Strict validation (all warnings are errors)
furlow validate . --strict
```

**Output Example:**

```
✓ Syntax valid
✓ Schema valid
✓ References valid

furlow.yaml is valid!
```

Or with errors:

```
✗ Schema Error: commands[0].name is required
  at furlow.yaml:15:5

✗ Reference Error: Unknown flow "welcome_user"
  at furlow.yaml:23:12

Found 2 errors, 0 warnings
```

---

### `furlow add`

Add a builtin module to your project.

```bash
furlow add <builtin>
```

**Arguments:**
- `builtin` - Name of the builtin to add

**Options:**
| Option | Description |
|--------|-------------|
| `--list` | List all available builtins |

**Available Builtins:**

| Builtin | Description |
|---------|-------------|
| `moderation` | Warnings, kicks, bans, mutes, case system |
| `welcome` | Welcome/leave messages, auto-roles |
| `leveling` | XP system with levels and rewards |
| `logging` | Audit logging to channels |
| `tickets` | Support ticket system |
| `reaction-roles` | Role assignment via reactions/buttons |
| `music` | Voice channel music playback |
| `starboard` | Highlight popular messages |
| `polls` | Voting and polls |
| `giveaways` | Timed giveaways |
| `auto-responder` | Automatic message responses |
| `afk` | AFK status tracking |
| `reminders` | User reminders |
| `utilities` | Server info, user info, avatar commands |

**Examples:**

```bash
# List available builtins
furlow add --list

# Add moderation builtin
furlow add moderation

# Add multiple builtins
furlow add moderation
furlow add welcome
furlow add leveling
```

This command:
1. Adds the builtin configuration to your `furlow.yaml`
2. Creates any required state definitions
3. Shows next steps for configuration

---

### `furlow build`

Bundle the bot for deployment.

```bash
furlow build [path]
```

**Arguments:**
- `path` - Path to project directory (defaults to current directory)

**Options:**
| Option | Description | Default |
|--------|-------------|---------|
| `-o, --output <dir>` | Output directory | `dist` |

**Features:**
- Resolves all imports into a single file
- Validates the complete configuration
- Optimizes for production
- Creates a deployment-ready bundle

**Examples:**

```bash
# Build current project
furlow build

# Build to specific directory
furlow build -o ./deploy

# Build specific project
furlow build ./my-bot -o ./my-bot/dist
```

**Output Structure:**

```
dist/
├── furlow.yaml      # Bundled configuration
├── package.json     # Minimal package.json
└── .env.example     # Environment template
```

---

## Global Options

These options are available for all commands:

| Option | Description |
|--------|-------------|
| `-V, --version` | Display version number |
| `-h, --help` | Display help for command |

## Exit Codes

| Code | Description |
|------|-------------|
| 0 | Success |
| 1 | General error |
| 2 | Validation error |
| 3 | Configuration error |

## Configuration Files

### furlow.yaml

The main configuration file. See [Getting Started](./getting-started.md) for format details.

### .env

Environment variables file. Never commit this to version control.

```env
DISCORD_TOKEN=your-bot-token
DISCORD_CLIENT_ID=your-client-id
DATABASE_URL=sqlite:./data/bot.db
```

### .furlowrc

Optional CLI configuration file (JSON or YAML):

```yaml
# Default template for init
defaultTemplate: moderation

# Default env file path
envFile: .env.local

# Strict validation by default
strictValidation: true
```

## Troubleshooting

### "DISCORD_TOKEN is required"

Make sure your `.env` file exists and contains your bot token:

```env
DISCORD_TOKEN=your-token-here
```

### "Schema validation failed"

Run `furlow validate` to see detailed error messages. Common issues:
- Missing required fields
- Wrong option types
- Invalid action names

### "Permission denied" on global install

Use sudo or fix npm permissions:

```bash
sudo npm install -g furlow
# or
npm config set prefix ~/.npm-global
export PATH=~/.npm-global/bin:$PATH
```

### Hot reload not working

Make sure you're using `furlow dev` (not `furlow start`) and that your YAML files are being saved properly.
