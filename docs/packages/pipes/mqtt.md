# MQTT Pipe

Connect to MQTT brokers for IoT integrations with full support for QoS levels, wildcards, and Last Will.

## Configuration

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

## Authentication

| Option | Type | Description |
|--------|------|-------------|
| `username` | string | MQTT username |
| `password` | string | MQTT password |
| `clientId` | string | Custom client ID |

## QoS Levels

| Level | Name | Description |
|-------|------|-------------|
| `0` | At most once | Fire and forget, no guarantee |
| `1` | At least once | Guaranteed delivery, possible duplicates |
| `2` | Exactly once | Guaranteed single delivery |

## Last Will and Testament

Automatically published if the client disconnects unexpectedly:

| Option | Type | Description |
|--------|------|-------------|
| `topic` | string | Topic to publish to |
| `payload` | string | Message content |
| `qos` | number | QoS level (0, 1, 2) |
| `retain` | boolean | Retain message |

## Topic Wildcards

| Pattern | Description | Example |
|---------|-------------|---------|
| `+` | Single level | `sensors/+/temp` matches `sensors/room1/temp` |
| `#` | Multi level | `sensors/#` matches `sensors/room1/temp` and `sensors/room1/humidity` |

## Examples

### IoT Sensor Dashboard

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
              content: "High temp in ${topic.split('/')[1]}: ${payload.value}°C"

      # All sensor data
      - topic: "sensors/#"
        qos: 0
        actions:
          - set:
              scope: global
              var: "sensor_${topic.replace(/\\//g, '_')}"
              value: "${payload}"
```

### Publish to MQTT

```yaml
commands:
  - name: set-thermostat
    options:
      - name: temp
        type: integer
        required: true
    actions:
      - pipe_send:
          pipe: sensors
          data:
            topic: "commands/thermostat/set"
            message:
              target: "${options.temp}"
              source: "discord"
            qos: 1
            retain: false
      - reply:
          content: "Thermostat set to ${options.temp}°C"
```

### Home Automation

```yaml
pipes:
  home:
    type: mqtt
    broker: "homeassistant.local"
    port: 1883
    auth:
      username: "${env.HA_USER}"
      password: "${env.HA_PASS}"
    handlers:
      - topic: "home/+/motion"
        when: "payload == 'ON'"
        actions:
          - send_message:
              channel: "security"
              content: "Motion detected in ${topic.split('/')[1]}"

commands:
  - name: lights
    options:
      - name: room
        type: string
      - name: state
        type: string
        choices: ["on", "off"]
    actions:
      - pipe_send:
          pipe: home
          data:
            topic: "home/${options.room}/light/set"
            message: "${options.state | upper}"
            qos: 1
```

### Device Status Monitoring

```yaml
pipes:
  devices:
    type: mqtt
    broker: "iot.example.com"
    handlers:
      - topic: "devices/+/status"
        actions:
          - set:
              scope: global
              var: "device_${topic.split('/')[1]}"
              value:
                status: "${payload.status}"
                last_seen: "${now()}"

      - topic: "devices/+/status"
        when: "payload.status == 'offline'"
        actions:
          - send_message:
              channel: "device-alerts"
              content: "Device ${topic.split('/')[1]} went offline!"
```
