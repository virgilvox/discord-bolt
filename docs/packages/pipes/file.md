# File Pipe

Watch files and directories for changes to build hot-reload features, log watchers, and more.

## Configuration

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `paths` | array | required | Paths/globs to watch |
| `ignore` | array | - | Patterns to ignore |
| `persistent` | boolean | `true` | Keep process running |
| `usePolling` | boolean | `false` | Use polling (for network drives) |
| `handlers` | array | - | Event handlers |

## Events

| Event | Description | Data |
|-------|-------------|------|
| `add` | File added | `{ type, path, stats }` |
| `change` | File changed | `{ type, path, stats }` |
| `unlink` | File deleted | `{ type, path }` |
| `addDir` | Directory added | `{ type, path, stats }` |
| `unlinkDir` | Directory deleted | `{ type, path }` |
| `all` | Any event | Same as specific event |

## Stats Object

| Field | Type | Description |
|-------|------|-------------|
| `size` | number | File size in bytes |
| `mtime` | Date | Last modified time |
| `isDirectory` | boolean | Whether it's a directory |

## Examples

### Config Hot Reload

```yaml
pipes:
  config_watch:
    type: file
    paths:
      - "./config/**/*.yaml"
      - "./config/**/*.json"
    ignore:
      - "**/node_modules/**"
      - "**/.git/**"
    handlers:
      - event: change
        actions:
          - log: "Config changed: ${path}"
          - flow: reload_config
          - send_message:
              channel: "bot-logs"
              content: "Configuration reloaded from ${path}"
```

### Log File Watcher

```yaml
pipes:
  log_watch:
    type: file
    paths:
      - "/var/log/myapp/*.log"
    usePolling: true  # For mounted volumes
    handlers:
      - event: change
        actions:
          # Read last lines of changed log
          - shell:
              command: "tail -n 5 ${path}"
          - when: "shell_result.includes('ERROR')"
            actions:
              - send_message:
                  channel: "error-alerts"
                  embed:
                    title: "Error in ${path}"
                    description: "```${shell_result}```"
                    color: "#ff0000"
```

### Upload Folder Monitor

```yaml
pipes:
  uploads:
    type: file
    paths:
      - "./uploads/**/*"
    ignore:
      - "**/*.tmp"
      - "**/.*"
    handlers:
      - event: add
        when: "stats && stats.size > 0"
        actions:
          - send_message:
              channel: "uploads"
              content: "New file: ${path.split('/').pop()} (${Math.round(stats.size / 1024)}KB)"

      - event: unlink
        actions:
          - send_message:
              channel: "uploads"
              content: "File deleted: ${path.split('/').pop()}"
```

### Development Hot Reload

```yaml
pipes:
  dev_watch:
    type: file
    paths:
      - "./src/**/*.ts"
      - "./src/**/*.yaml"
    ignore:
      - "**/*.test.ts"
      - "**/dist/**"
    handlers:
      - event: change
        actions:
          - log: "File changed: ${path}"
          - shell:
              command: "npm run build"
          - when: "shell_result.exitCode == 0"
            actions:
              - flow: reload_modules
              - send_message:
                  channel: "dev-logs"
                  content: "Rebuilt successfully"

      - event: add
        actions:
          - send_message:
              channel: "dev-logs"
              content: "New file created: ${path}"
```

### Backup Monitoring

```yaml
pipes:
  backups:
    type: file
    paths:
      - "/backups/**/*.sql.gz"
      - "/backups/**/*.tar.gz"
    handlers:
      - event: add
        actions:
          - set:
              scope: global
              key: "last_backup"
              value:
                path: "${path}"
                size: "${stats.size}"
                time: "${stats.mtime}"
          - send_message:
              channel: "backups"
              content: "New backup: ${path.split('/').pop()} (${Math.round(stats.size / 1024 / 1024)}MB)"

commands:
  - name: backup-status
    actions:
      - reply:
          content: |
            Last backup: ${state.global.last_backup?.path ?? 'None'}
            Size: ${state.global.last_backup?.size ? Math.round(state.global.last_backup.size / 1024 / 1024) + 'MB' : 'N/A'}
            Time: ${state.global.last_backup?.time ?? 'N/A'}
```

### Asset Processing

```yaml
pipes:
  assets:
    type: file
    paths:
      - "./assets/images/**/*.{png,jpg,gif}"
    handlers:
      - event: add
        actions:
          - shell:
              command: "convert ${path} -resize 800x600 ${path.replace(/\\.[^.]+$/, '_thumb$&')}"
          - log: "Created thumbnail for ${path}"

      - event: unlink
        actions:
          - shell:
              command: "rm -f ${path.replace(/\\.[^.]+$/, '_thumb$&')}"
          - log: "Removed thumbnail for ${path}"
```
