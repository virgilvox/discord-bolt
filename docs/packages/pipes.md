# @furlow/pipes

External integration pipes for connecting your Discord bot to APIs, real-time services, IoT devices, and more.

## What are Pipes?

Pipes are connectors that let your bot communicate with external systems. Whether you need to call REST APIs, receive webhooks, connect to MQTT brokers, or watch files for changes, pipes provide a consistent interface for all these integrations.

Use pipes when your bot needs to:
- Fetch data from external APIs (HTTP)
- Receive real-time updates (WebSocket, MQTT)
- Handle incoming webhooks (Webhook)
- Communicate with IoT devices (MQTT, TCP, UDP)
- React to file changes (File)
- Sync with databases (Database)

## Common Interface

All pipes implement a consistent interface:

| Method | Description |
|--------|-------------|
| `connect()` | Establish connection (where applicable) |
| `disconnect()` | Close connection and cleanup |
| `isConnected()` | Check if the pipe is ready |

## Response Format

All pipe operations return a `PipeResponse`:

| Field | Type | Description |
|-------|------|-------------|
| `success` | boolean | Whether the operation succeeded |
| `data` | any | Response data (if successful) |
| `error` | string | Error message (if failed) |
| `status` | number | HTTP status code (for HTTP/webhook pipes) |
| `headers` | object | Response headers (for HTTP pipes) |

---

## HTTP Pipe

Make REST API calls with authentication, rate limiting, and retry support.

### Configuration

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `base_url` | string | required | Base URL for all requests |
| `auth` | object | - | Authentication configuration |
| `headers` | object | - | Default headers for all requests |
| `rate_limit` | object | - | Rate limiting configuration |
| `timeout` | string | `"30s"` | Request timeout |
| `retry` | object | - | Retry configuration |

### Authentication Types

| Type | Description | Required Fields |
|------|-------------|-----------------|
| `none` | No authentication | - |
| `bearer` | Bearer token auth | `token` |
| `basic` | Basic auth | `username`, `password` |
| `header` | Custom header auth | `token`, `header_name` (optional) |

### Rate Limiting

| Option | Type | Description |
|--------|------|-------------|
| `requests` | number | Max requests per window |
| `per` | string | Time window (e.g., `"1m"`, `"1h"`) |
| `retry_after` | boolean | Respect Retry-After header |

### Retry Configuration

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `attempts` | number | `0` | Max retry attempts |
| `delay` | string | `"1s"` | Delay between retries |

Retries only occur on 5xx errors or network failures.

### Example: Basic GET Request

```yaml
pipes:
  weather_api:
    type: http
    base_url: "https://api.weather.example.com"
    headers:
      Accept: "application/json"

commands:
  - name: weather
    description: Get current weather
    options:
      - name: city
        type: string
        required: true
    actions:
      - pipe:
          name: weather_api
          method: GET
          path: "/current"
          params:
            city: "${options.city}"
      - reply:
          content: "Weather in ${options.city}: ${pipe_result.data.temp}°C"
```

### Example: Authenticated POST

```yaml
pipes:
  github_api:
    type: http
    base_url: "https://api.github.com"
    auth:
      type: bearer
      token: "${env.GITHUB_TOKEN}"
    headers:
      Accept: "application/vnd.github.v3+json"
      User-Agent: "FURLOW Bot"
    rate_limit:
      requests: 60
      per: "1h"

commands:
  - name: create-issue
    description: Create a GitHub issue
    options:
      - name: title
        type: string
        required: true
      - name: body
        type: string
    actions:
      - pipe:
          name: github_api
          method: POST
          path: "/repos/myorg/myrepo/issues"
          body:
            title: "${options.title}"
            body: "${options.body ?? 'No description'}"
      - reply:
          content: "Issue created: ${pipe_result.data.html_url}"
```

### Example: With Retry

```yaml
pipes:
  flaky_api:
    type: http
    base_url: "https://sometimes-fails.example.com"
    timeout: "10s"
    retry:
      attempts: 3
      delay: "2s"
```

---

## WebSocket Pipe

Bidirectional real-time communication with automatic reconnection and heartbeat support.

### Configuration

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `url` | string | required | WebSocket URL (ws:// or wss://) |
| `headers` | object | - | Headers for connection handshake |
| `reconnect` | object | - | Reconnection settings |
| `heartbeat` | object | - | Keep-alive configuration |
| `handlers` | array | - | Message handlers |

### Reconnection Settings

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `enabled` | boolean | `true` | Enable auto-reconnect |
| `delay` | string | `"5s"` | Delay between attempts |
| `max_attempts` | number | `10` | Max reconnection attempts |

### Heartbeat Settings

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `interval` | string | - | Time between heartbeats |
| `message` | string | `"ping"` | Heartbeat message content |

### Message Handlers

```yaml
handlers:
  - event: "message_type"    # Event name to match
    when: "data.type == 'chat'"  # Optional condition
    actions:
      - ...                  # Actions to execute
```

### Example: Real-Time Chat

```yaml
pipes:
  chat_server:
    type: websocket
    url: "wss://chat.example.com/ws"
    headers:
      Authorization: "Bearer ${env.CHAT_TOKEN}"
    reconnect:
      enabled: true
      delay: "5s"
      max_attempts: 10
    heartbeat:
      interval: "30s"
      message: '{"type":"ping"}'
    handlers:
      - event: message
        when: "data.type == 'new_message'"
        actions:
          - send_message:
              channel: "${state.chat_channel}"
              content: "**${data.user}**: ${data.text}"
```

### Example: Stock Price Updates

```yaml
pipes:
  stock_feed:
    type: websocket
    url: "wss://stream.example.com/stocks"
    handlers:
      - event: message
        when: "data.symbol == 'AAPL' && data.change > 5"
        actions:
          - send_message:
              channel: "stock-alerts"
              content: "🚀 AAPL moved ${data.change}%!"
```

### Request-Response Pattern

For WebSocket servers that use request-response:

```yaml
commands:
  - name: query
    actions:
      - pipe:
          name: chat_server
          send:
            type: "query"
            id: "${random_id()}"
            query: "${options.query}"
          wait_for: "response"
          timeout: "10s"
      - reply:
          content: "${pipe_result.data.result}"
```

---

## Webhook Pipe

Receive incoming webhooks with signature verification and send outgoing webhooks.

### Configuration (Receiving)

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `path` | string | required | URL path for webhook endpoint |
| `method` | string | `"POST"` | Expected HTTP method |
| `verification` | object | - | Signature verification settings |
| `handlers` | array | - | Webhook handlers |

### Verification Types

| Type | Description | Options |
|------|-------------|---------|
| `hmac` | HMAC signature | `secret`, `header`, `algorithm` |
| `token` | Simple token match | `secret`, `header` |
| `signature` | Custom signature | `secret`, `header` |

### HMAC Verification

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `secret` | string | required | HMAC secret key |
| `header` | string | `"x-signature"` | Header containing signature |
| `algorithm` | string | `"sha256"` | Hash algorithm (sha1, sha256, sha512) |

### Example: Receive GitHub Webhooks

```yaml
pipes:
  github_webhook:
    type: webhook
    path: "/webhooks/github"
    method: POST
    verification:
      type: hmac
      secret: "${env.GITHUB_WEBHOOK_SECRET}"
      header: "x-hub-signature-256"
      algorithm: sha256
    handlers:
      - event: push
        when: "body.ref == 'refs/heads/main'"
        actions:
          - send_message:
              channel: "deployments"
              content: "🚀 New push to main by ${body.pusher.name}"

      - event: pull_request
        when: "body.action == 'opened'"
        actions:
          - send_message:
              channel: "code-review"
              embed:
                title: "New PR: ${body.pull_request.title}"
                url: "${body.pull_request.html_url}"
                author:
                  name: "${body.pull_request.user.login}"
```

### Example: Receive Stripe Webhooks

```yaml
pipes:
  stripe_webhook:
    type: webhook
    path: "/webhooks/stripe"
    verification:
      type: hmac
      secret: "${env.STRIPE_WEBHOOK_SECRET}"
      header: "stripe-signature"
    handlers:
      - when: "body.type == 'payment_intent.succeeded'"
        actions:
          - send_message:
              channel: "sales"
              content: "💰 Payment received: $${body.data.object.amount / 100}"
```

### Sending Webhooks (WebhookSender)

For sending outgoing webhooks, use the `webhook_send` action:

```yaml
commands:
  - name: notify
    actions:
      - webhook_send:
          url: "https://hooks.slack.com/services/xxx"
          body:
            text: "Notification from Discord bot"
            channel: "#general"
```

### Example: Send Discord Webhook

```yaml
commands:
  - name: crosspost
    description: Post to another Discord channel
    actions:
      - webhook_send:
          url: "${env.DISCORD_WEBHOOK_URL}"
          discord: true
          content: "Cross-posted message"
          username: "FURLOW Bot"
          embeds:
            - title: "Announcement"
              description: "${options.message}"
              color: "#5865F2"
```

---

## MQTT Pipe

Connect to MQTT brokers for IoT integrations with full support for QoS levels, wildcards, and Last Will.

### Configuration

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `broker` | string | required | Broker hostname |
| `port` | number | `1883`/`8883` | Broker port |
| `protocol` | string | `"mqtt"` | Protocol (mqtt, mqtts, ws, wss) |
| `auth` | object | - | Authentication settings |
| `keepalive` | number | `60` | Keep-alive interval (seconds) |
| `clean` | boolean | `true` | Clean session on connect |
| `reconnect` | object | - | Reconnection settings |
| `will` | object | - | Last Will and Testament |
| `handlers` | array | - | Topic handlers |

### Authentication

| Option | Type | Description |
|--------|------|-------------|
| `username` | string | MQTT username |
| `password` | string | MQTT password |
| `clientId` | string | Custom client ID |

### QoS Levels

| Level | Name | Description |
|-------|------|-------------|
| `0` | At most once | Fire and forget, no guarantee |
| `1` | At least once | Guaranteed delivery, possible duplicates |
| `2` | Exactly once | Guaranteed single delivery |

### Last Will and Testament

Automatically published if the client disconnects unexpectedly:

| Option | Type | Description |
|--------|------|-------------|
| `topic` | string | Topic to publish to |
| `payload` | string | Message content |
| `qos` | number | QoS level (0, 1, 2) |
| `retain` | boolean | Retain message |

### Topic Wildcards

| Pattern | Description | Example |
|---------|-------------|---------|
| `+` | Single level | `sensors/+/temp` matches `sensors/room1/temp` |
| `#` | Multi level | `sensors/#` matches `sensors/room1/temp` and `sensors/room1/humidity` |

### Example: IoT Sensor Dashboard

```yaml
pipes:
  sensors:
    type: mqtt
    broker: "mqtt.example.com"
    port: 8883
    protocol: mqtts
    auth:
      username: "${env.MQTT_USER}"
      password: "${env.MQTT_PASS}"
    keepalive: 60
    will:
      topic: "bots/furlow/status"
      payload: '{"status":"offline"}'
      qos: 1
      retain: true
    handlers:
      # Temperature alerts
      - topic: "sensors/+/temperature"
        qos: 1
        when: "payload.value > 30"
        actions:
          - send_message:
              channel: "alerts"
              content: "🌡️ High temp in ${topic.split('/')[1]}: ${payload.value}°C"

      # All sensor data
      - topic: "sensors/#"
        qos: 0
        actions:
          - set:
              scope: global
              key: "sensor_${topic.replace(/\\//g, '_')}"
              value: "${payload}"
```

### Example: Publish to MQTT

```yaml
commands:
  - name: set-thermostat
    options:
      - name: temp
        type: integer
        required: true
    actions:
      - pipe:
          name: sensors
          publish:
            topic: "commands/thermostat/set"
            message:
              target: "${options.temp}"
              source: "discord"
            qos: 1
            retain: false
      - reply:
          content: "Thermostat set to ${options.temp}°C"
```

---

## TCP Pipe

Raw TCP socket communication for custom protocols, with client and server modes.

### Configuration

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `host` | string | required | Host to connect to (client) or bind (server) |
| `port` | number | required | Port number |
| `reconnect` | object | - | Reconnection settings (client mode) |
| `encoding` | string | `"utf8"` | Data encoding |
| `handlers` | array | - | Event handlers |

### Events

| Event | Description | Data |
|-------|-------------|------|
| `connected` | Connection established | - |
| `disconnected` | Connection closed | - |
| `data` | Data received | Buffer or string |
| `error` | Error occurred | Error object |
| `end` | Connection ended by remote | - |

### Example: Client Connection

```yaml
pipes:
  game_server:
    type: tcp
    host: "game.example.com"
    port: 7777
    encoding: utf8
    reconnect:
      enabled: true
      delay: "5s"
      max_attempts: 5
    handlers:
      - event: data
        actions:
          - set:
              scope: global
              key: "last_game_event"
              value: "${data}"
          - when: "data.includes('PLAYER_JOINED')"
            actions:
              - send_message:
                  channel: "game-events"
                  content: "New player joined the server!"
```

### Example: Send TCP Data

```yaml
commands:
  - name: rcon
    description: Send RCON command
    options:
      - name: command
        type: string
        required: true
    actions:
      - pipe:
          name: game_server
          send: "RCON ${options.command}\n"
      - reply:
          content: "Command sent"
```

### Example: TCP Server Mode

```yaml
pipes:
  tcp_server:
    type: tcp
    host: "0.0.0.0"
    port: 9000
    handlers:
      - event: connection
        actions:
          - log: "New client connected"
      - event: data
        actions:
          - when: "data.trim() == 'STATUS'"
            actions:
              - pipe:
                  name: tcp_server
                  send: "OK: ${guild.memberCount} members online"
```

### Request-Response Pattern

```yaml
commands:
  - name: query-server
    actions:
      - pipe:
          name: game_server
          request: "STATUS\n"
          timeout: "5s"
      - reply:
          content: "Server response: ${pipe_result.data}"
```

---

## UDP Pipe

Datagram communication with broadcast and multicast support.

### Configuration

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `host` | string | `"0.0.0.0"` | Host to bind to |
| `port` | number | required | Port number |
| `multicast` | string | - | Multicast group to join |
| `broadcast` | boolean | `false` | Enable broadcast |
| `handlers` | array | - | Message handlers |

### Example: Broadcast Discovery

```yaml
pipes:
  discovery:
    type: udp
    port: 5000
    broadcast: true
    handlers:
      - event: message
        when: "data.toString().startsWith('ANNOUNCE:')"
        actions:
          - set:
              scope: global
              key: "discovered_${rinfo.address}"
              value:
                address: "${rinfo.address}"
                port: "${rinfo.port}"
                name: "${data.toString().replace('ANNOUNCE:', '')}"

commands:
  - name: discover
    description: Discover local services
    actions:
      - pipe:
          name: discovery
          broadcast:
            data: "DISCOVER"
            port: 5000
      - wait: "2s"
      - reply:
          content: "Found ${Object.keys(state.global).filter(k => k.startsWith('discovered_')).length} services"
```

### Example: Multicast Group

```yaml
pipes:
  game_lobby:
    type: udp
    port: 7788
    multicast: "239.255.255.250"
    handlers:
      - event: message
        actions:
          - send_message:
              channel: "game-lobby"
              content: "Lobby update from ${rinfo.address}: ${data.toString()}"

commands:
  - name: lobby-message
    options:
      - name: message
        type: string
    actions:
      - pipe:
          name: game_lobby
          multicast:
            data: "${options.message}"
            port: 7788
```

---

## Database Pipe

Reactive database operations with change events for building real-time features.

### Configuration

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `adapter` | string | required | Database adapter (sqlite, postgres, memory) |
| `connection` | string/object | required | Connection string or config |
| `tables` | array | - | Tables to watch for changes |
| `handlers` | array | - | Change event handlers |

### Adapters

| Adapter | Description | Connection |
|---------|-------------|------------|
| `sqlite` | SQLite file database | File path or `:memory:` |
| `postgres` | PostgreSQL database | Connection string |
| `memory` | In-memory storage | - |

### CRUD Operations

| Method | Description |
|--------|-------------|
| `query(sql, params)` | Execute raw SQL query |
| `insert(table, data)` | Insert a row |
| `update(table, where, data)` | Update matching rows |
| `delete(table, where)` | Delete matching rows |

### Change Events

| Event | Description | Data |
|-------|-------------|------|
| `insert` | Row inserted | `{ type, table, data }` |
| `update` | Row updated | `{ type, table, data, oldData }` |
| `delete` | Row deleted | `{ type, table, data }` |
| `change` | Any change | Same as specific event |

### Example: Reactive Leaderboard

```yaml
pipes:
  scores:
    type: database
    adapter: sqlite
    connection: "./data/scores.db"
    tables:
      - scores
    handlers:
      - event: insert
        table: scores
        actions:
          - send_message:
              channel: "leaderboard"
              content: "🏆 New score: ${data.player} - ${data.score} points!"

      - event: change
        table: scores
        actions:
          - pipe:
              name: scores
              query: "SELECT * FROM scores ORDER BY score DESC LIMIT 5"
          - set:
              scope: global
              key: "top_scores"
              value: "${pipe_result.data}"

commands:
  - name: score
    description: Record a score
    options:
      - name: player
        type: string
        required: true
      - name: score
        type: integer
        required: true
    actions:
      - pipe:
          name: scores
          insert:
            table: scores
            data:
              player: "${options.player}"
              score: "${options.score}"
              timestamp: "${now()}"
      - reply:
          content: "Score recorded!"
```

### Example: User Preferences

```yaml
pipes:
  prefs:
    type: database
    adapter: memory

commands:
  - name: set-pref
    options:
      - name: key
        type: string
      - name: value
        type: string
    actions:
      - pipe:
          name: prefs
          insert:
            table: user_prefs
            data:
              user_id: "${user.id}"
              key: "${options.key}"
              value: "${options.value}"
      - reply:
          content: "Preference saved"

  - name: get-pref
    options:
      - name: key
        type: string
    actions:
      - pipe:
          name: prefs
          query: "SELECT value FROM user_prefs WHERE user_id = ? AND key = ?"
          params:
            - "${user.id}"
            - "${options.key}"
      - reply:
          content: "${pipe_result.data[0]?.value ?? 'Not set'}"
```

---

## File Pipe

Watch files and directories for changes to build hot-reload features, log watchers, and more.

### Configuration

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `paths` | array | required | Paths/globs to watch |
| `ignore` | array | - | Patterns to ignore |
| `persistent` | boolean | `true` | Keep process running |
| `usePolling` | boolean | `false` | Use polling (for network drives) |
| `handlers` | array | - | Event handlers |

### Events

| Event | Description | Data |
|-------|-------------|------|
| `add` | File added | `{ type, path, stats }` |
| `change` | File changed | `{ type, path, stats }` |
| `unlink` | File deleted | `{ type, path }` |
| `addDir` | Directory added | `{ type, path, stats }` |
| `unlinkDir` | Directory deleted | `{ type, path }` |
| `all` | Any event | Same as specific event |

### Stats Object

| Field | Type | Description |
|-------|------|-------------|
| `size` | number | File size in bytes |
| `mtime` | Date | Last modified time |
| `isDirectory` | boolean | Whether it's a directory |

### Example: Config Hot Reload

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
              content: "⚙️ Configuration reloaded from ${path}"
```

### Example: Log File Watcher

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

### Example: Upload Folder Monitor

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
              content: "📁 New file: ${path.split('/').pop()} (${Math.round(stats.size / 1024)}KB)"

      - event: unlink
        actions:
          - send_message:
              channel: "uploads"
              content: "🗑️ File deleted: ${path.split('/').pop()}"
```

---

## Using Multiple Pipes

You can define and use multiple pipes together:

```yaml
pipes:
  # External API
  api:
    type: http
    base_url: "https://api.example.com"

  # Real-time updates
  realtime:
    type: websocket
    url: "wss://api.example.com/ws"

  # Incoming webhooks
  webhooks:
    type: webhook
    path: "/hooks/incoming"

  # Local database
  db:
    type: database
    adapter: sqlite
    connection: "./data/bot.db"

commands:
  - name: sync
    actions:
      # Fetch from API
      - pipe:
          name: api
          method: GET
          path: "/data"
      # Store in database
      - pipe:
          name: db
          insert:
            table: synced_data
            data: "${pipe_result.data}"
      # Notify via WebSocket
      - pipe:
          name: realtime
          send:
            type: "sync_complete"
            count: "${pipe_result.data.length}"
```
