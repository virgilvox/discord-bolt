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
          - db_query:
              table: scores
              order_by: "score DESC"
              limit: 5
              as: top_five
          - set:
              scope: global
              var: "top_scores"
              value: "${top_five}"

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
      - db_insert:
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
      - db_insert:
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
      - db_query:
          table: user_prefs
          where:
            user_id: "${user.id}"
            key: "${options.key}"
          select:
            - value
          as: pref_result
      - reply:
          content: "${pref_result[0]?.value ?? 'Not set'}"
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
      - db_query:
          table: events
          as: stats_result
      - reply:
          content: "Total: ${stats_result.length}, Today: ${stats_result.filter(e => e.created_at > Date.now() - 86400000).length}"
```

### Upsert Pattern

```yaml
commands:
  - name: update-profile
    options:
      - name: bio
        type: string
    actions:
      - db_update:
          table: profiles
          where:
            user_id: "${user.id}"
          data:
            user_id: "${user.id}"
            bio: "${options.bio}"
            updated_at: "${now()}"
          upsert: true
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
      # Note: For transactions, use db_update actions in sequence
      # The storage adapter handles atomicity when possible
      - db_update:
          table: wallets
          where:
            user_id: "${user.id}"
          data:
            balance: "${state.user.balance - options.amount}"
      - db_update:
          table: wallets
          where:
            user_id: "${options.to.id}"
          data:
            balance: "${state.user.balance + options.amount}"
      - reply:
          content: "Transferred ${options.amount} to ${options.to.username}"
```
