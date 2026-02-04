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

## Available Pipes

| Pipe | Description | Use Case |
|------|-------------|----------|
| [HTTP](./http.md) | REST API client | External APIs, web services |
| [WebSocket](./websocket.md) | Bidirectional real-time | Live data, chat systems |
| [Webhook](./webhook.md) | Incoming/outgoing webhooks | GitHub, Stripe, Slack |
| [MQTT](./mqtt.md) | IoT message broker | Sensors, home automation |
| [TCP/UDP](./tcp-udp.md) | Raw socket communication | Game servers, custom protocols |
| [Database](./database.md) | Reactive database | Leaderboards, preferences |
| [File](./file.md) | File system watcher | Hot reload, log monitoring |

See [Examples](./examples.md) for complete real-world integrations.

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

## Installation

```bash
npm install @furlow/pipes
# or
pnpm add @furlow/pipes
```

The pipes package is included automatically when you install the main `furlow` package.
