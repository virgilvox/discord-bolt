# HTTP Pipe

Make REST API calls with authentication, rate limiting, and retry support.

## Configuration

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `base_url` | string | required | Base URL for all requests |
| `auth` | object | - | Authentication configuration |
| `headers` | object | - | Default headers for all requests |
| `rate_limit` | object | - | Rate limiting configuration |
| `timeout` | string | `"30s"` | Request timeout |
| `retry` | object | - | Retry configuration |

## Authentication Types

| Type | Description | Required Fields |
|------|-------------|-----------------|
| `none` | No authentication | - |
| `bearer` | Bearer token auth | `token` |
| `basic` | Basic auth | `username`, `password` |
| `header` | Custom header auth | `token`, `header_name` (optional) |

### Bearer Token

```yaml
pipes:
  api:
    type: http
    base_url: "https://api.example.com"
    auth:
      type: bearer
      token: "${env.API_TOKEN}"
```

### Basic Auth

```yaml
pipes:
  api:
    type: http
    base_url: "https://api.example.com"
    auth:
      type: basic
      username: "${env.API_USER}"
      password: "${env.API_PASS}"
```

### Custom Header

```yaml
pipes:
  api:
    type: http
    base_url: "https://api.example.com"
    auth:
      type: header
      token: "${env.API_KEY}"
      header_name: "X-API-Key"  # Default is "Authorization"
```

## Rate Limiting

| Option | Type | Description |
|--------|------|-------------|
| `requests` | number | Max requests per window |
| `per` | string | Time window (e.g., `"1m"`, `"1h"`) |
| `retry_after` | boolean | Respect Retry-After header |

```yaml
pipes:
  github_api:
    type: http
    base_url: "https://api.github.com"
    rate_limit:
      requests: 60
      per: "1h"
      retry_after: true
```

## Retry Configuration

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `attempts` | number | `0` | Max retry attempts |
| `delay` | string | `"1s"` | Delay between retries |

Retries only occur on 5xx errors or network failures.

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

## Examples

### Basic GET Request

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

### Authenticated POST

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

### PUT/PATCH/DELETE

```yaml
commands:
  - name: update-issue
    actions:
      - pipe:
          name: github_api
          method: PATCH
          path: "/repos/myorg/myrepo/issues/${options.number}"
          body:
            state: "closed"

  - name: delete-comment
    actions:
      - pipe:
          name: github_api
          method: DELETE
          path: "/repos/myorg/myrepo/issues/comments/${options.id}"
```

### Storing Response

```yaml
commands:
  - name: fetch-user
    actions:
      - pipe:
          name: api
          method: GET
          path: "/users/${options.id}"
          as: user_data  # Store result in variable
      - reply:
          content: "User: ${user_data.name} (${user_data.email})"
```
