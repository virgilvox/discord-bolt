# WebSocket Pipe

Bidirectional real-time communication with automatic reconnection and heartbeat support.

## Configuration

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `url` | string | required | WebSocket URL (ws:// or wss://) |
| `headers` | object | - | Headers for connection handshake |
| `reconnect` | object | - | Reconnection settings |
| `heartbeat` | object | - | Keep-alive configuration |
| `handlers` | array | - | Message handlers |

## Reconnection Settings

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `enabled` | boolean | `true` | Enable auto-reconnect |
| `delay` | string | `"5s"` | Delay between attempts |
| `max_attempts` | number | `10` | Max reconnection attempts |

## Heartbeat Settings

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `interval` | string | - | Time between heartbeats |
| `message` | string | `"ping"` | Heartbeat message content |

## Message Handlers

```yaml
handlers:
  - event: "message_type"    # Event name to match
    when: "data.type == 'chat'"  # Optional condition
    actions:
      - ...                  # Actions to execute
```

## Examples

### Real-Time Chat

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

### Stock Price Updates

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
              content: "AAPL moved ${data.change}%!"
```

### Request-Response Pattern

For WebSocket servers that use request-response:

```yaml
commands:
  - name: query
    actions:
      - pipe_send:
          pipe: chat_server
          data:
            type: "query"
            id: "${random_id()}"
            query: "${options.query}"
          wait_for: "response"
          timeout: "10s"
      - reply:
          content: "${pipe_result.data.result}"
```

### Sending Messages

```yaml
commands:
  - name: broadcast
    actions:
      - pipe_send:
          pipe: chat_server
          data:
            type: "broadcast"
            message: "${options.message}"
            from: "${user.username}"
```

### Connection Events

```yaml
pipes:
  realtime:
    type: websocket
    url: "wss://api.example.com/ws"
    handlers:
      - event: open
        actions:
          - log: "WebSocket connected"
          - pipe_send:
              pipe: realtime
              data:
                type: "auth"
                token: "${env.WS_TOKEN}"

      - event: close
        actions:
          - send_message:
              channel: "bot-logs"
              content: "WebSocket disconnected"

      - event: error
        actions:
          - log:
              level: error
              message: "WebSocket error: ${error}"
```
