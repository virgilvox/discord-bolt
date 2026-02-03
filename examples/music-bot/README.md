# Music Bot Example

A FURLOW bot for playing music in voice channels using the music builtin.

## Features

### Built-in Music Commands
- `/play <query>` - Play a song or add to queue
- `/pause` - Pause playback
- `/resume` - Resume playback
- `/skip` - Skip current song
- `/stop` - Stop playback and clear queue
- `/queue` - View the queue
- `/volume <level>` - Set volume (0-100)
- `/seek <time>` - Seek to position
- `/shuffle` - Shuffle the queue
- `/loop` - Toggle loop mode (off/track/queue)
- `/filter <name>` - Apply audio filter

### Custom Commands
- `/nowplaying` - Detailed now playing embed
- `/favorite` - Manage favorite songs
- `/playlist` - Save/load server playlists
- `/lyrics` - Get lyrics (placeholder)

### Features
- Vote skip (50% threshold)
- Audio filters (nightcore, bass, 8d, vaporwave)
- Auto-leave when alone
- Song announcements
- Per-user favorites
- Server playlists

## Setup

1. Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```

2. Add your Discord bot token

3. (Optional) Add DJ role ID for privileged users

4. Install FFmpeg (required for audio playback):
   ```bash
   # macOS
   brew install ffmpeg

   # Ubuntu/Debian
   sudo apt install ffmpeg

   # Windows
   # Download from https://ffmpeg.org/download.html
   ```

5. Run the bot:
   ```bash
   furlow start
   ```

## Supported Sources

- YouTube (videos and playlists)
- SoundCloud
- Direct URLs (MP3, etc.)
- Spotify (requires API credentials)

## Audio Filters

Apply audio effects with `/filter`:

| Filter | Description |
|--------|-------------|
| `nightcore` | Speeds up and raises pitch |
| `bass` | Boosts bass frequencies |
| `8d` | Rotating audio effect |
| `vaporwave` | Slows down and lowers pitch |

## DJ Role

Users with the DJ role can:
- Skip without voting
- Force stop playback
- Clear the queue
- Control volume without limits

## Permissions

The bot requires:
- Connect (to voice channels)
- Speak (to play audio)
- Send Messages
- Embed Links

## Customization

Edit `furlow.yaml` to:
- Change vote skip threshold
- Set max queue size
- Configure auto-leave timeout
- Enable/disable audio filters
- Add custom commands

See the full music builtin documentation for all options.
