# Database Pipe

Reactive database operations with change events for building real-time features.

## Configuration

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `adapter` | string | required | Database adapter (sqlite, postgres, memory) |
| `connection` | string/object | required | Connection string or config |
| `tables` | array | - | Tables to watch for changes |
| `handlers` | array | - | Change event handlers |

## Adapters

| Adapter | Description | Connection |
|---------|-------------|------------|
| `sqlite` | SQLite file database | File path or `:memory:` |
| `postgres` | PostgreSQL database | Connection string |
| `memory` | In-memory storage | - |

## CRUD Operations

| Method | Description |
|--------|-------------|
| `query(sql, params)` | Execute raw SQL query |
| `insert(table, data)` | Insert a row |
| `update(table, where, data)` | Update matching rows |
| `delete(table, where)` | Delete matching rows |

## Change Events

| Event | Description | Data |
|-------|-------------|------|
| `insert` | Row inserted | `{ type, table, data }` |
| `update` | Row updated | `{ type, table, data, oldData }` |
| `delete` | Row deleted | `{ type, table, data }` |
| `change` | Any change | Same as specific event |

## Examples

### Reactive Leaderboard

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
              content: "New score: ${data.player} - ${data.score} points!"

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

### User Preferences

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

### PostgreSQL Connection

```yaml
pipes:
  db:
    type: database
    adapter: postgres
    connection: "${env.DATABASE_URL}"
    # Or with object config:
    # connection:
    #   host: "localhost"
    #   port: 5432
    #   database: "mybot"
    #   user: "${env.DB_USER}"
    #   password: "${env.DB_PASS}"

commands:
  - name: stats
    actions:
      - pipe:
          name: db
          query: |
            SELECT
              COUNT(*) as total,
              COUNT(CASE WHEN created_at > NOW() - INTERVAL '24 hours' THEN 1 END) as today
            FROM events
      - reply:
          content: "Total: ${pipe_result.data[0].total}, Today: ${pipe_result.data[0].today}"
```

### Upsert Pattern

```yaml
commands:
  - name: update-profile
    options:
      - name: bio
        type: string
    actions:
      - pipe:
          name: db
          upsert:
            table: profiles
            where:
              user_id: "${user.id}"
            data:
              user_id: "${user.id}"
              bio: "${options.bio}"
              updated_at: "${now()}"
      - reply:
          content: "Profile updated!"
```

### Transactions

```yaml
commands:
  - name: transfer
    options:
      - name: to
        type: user
      - name: amount
        type: integer
    actions:
      - pipe:
          name: db
          transaction:
            - query: "UPDATE wallets SET balance = balance - ? WHERE user_id = ?"
              params: ["${options.amount}", "${user.id}"]
            - query: "UPDATE wallets SET balance = balance + ? WHERE user_id = ?"
              params: ["${options.amount}", "${options.to.id}"]
      - reply:
          content: "Transferred ${options.amount} to ${options.to.username}"
```
