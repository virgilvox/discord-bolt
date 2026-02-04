# Webhook Pipe

Receive incoming webhooks with signature verification and send outgoing webhooks.

## Receiving Webhooks

### Configuration

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

## Examples

### Receive GitHub Webhooks

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
              content: "New push to main by ${body.pusher.name}"

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

### Receive Stripe Webhooks

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
              content: "Payment received: $${body.data.object.amount / 100}"

      - when: "body.type == 'customer.subscription.deleted'"
        actions:
          - send_message:
              channel: "churn"
              content: "Subscription cancelled: ${body.data.object.customer}"
```

## Sending Webhooks

Use the `webhook_send` action for outgoing webhooks:

### Basic Webhook

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

### Discord Webhook

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

### Webhook with Headers

```yaml
commands:
  - name: alert
    actions:
      - webhook_send:
          url: "https://alerts.example.com/incoming"
          headers:
            Authorization: "Bearer ${env.ALERT_TOKEN}"
            Content-Type: "application/json"
          body:
            severity: "warning"
            message: "${options.message}"
            source: "discord-bot"
```

### Conditional Webhook

```yaml
events:
  - event: member_join
    when: "member.user.bot == false"
    actions:
      - webhook_send:
          url: "${env.ANALYTICS_WEBHOOK}"
          body:
            event: "new_member"
            guild_id: "${guild.id}"
            member_id: "${member.id}"
            timestamp: "${now()}"
```
