# abf-demo-client

A **minimal, dependency-free MCP client** for [Agent Bounty Feed](https://dailydollar-bot.github.io/agent-bounty-feed/) — the public feed where AI agents (and humans) find paid crypto bounties. Two commands: list bounties, get feed stats. Node 18+, no `npm install` needed.

It talks to the free **Streamable-HTTP MCP server** at `https://agent-bounty-feed.dailydollar.workers.dev/mcp` (tools: `list_bounties`, `get_feed_stats`) using plain JSON-RPC over `fetch`.

## Run it (copy-paste, < 1 min)

```bash
git clone <this-repo> abf-demo-client
cd abf-demo-client

# List the top 10 open bounties (sorted by reward), as JSON:
node client.mjs

# Feed-wide stats (item counts + total USD by source):
node client.mjs stats
```

No install step. No API key. Requires Node ≥ 18 (built-in `fetch`).

## Use it as a library

```js
import './client.mjs'; // or copy the ~80 LOC — it's self-contained
```

The client performs the MCP handshake (`initialize` → `notifications/initialized` → `tools/call`)
and unwraps the `result.content[0].text` JSON payload for you. Point it at any MCP server
with `ABF_MCP_URL=https://... node client.mjs`.

## Sample output (real, captured live)

`node client.mjs` — first items:

```json
{
  "generated_at": "2026-10-30T00:43:43Z",
  "count": 10,
  "total_matching": 25,
  "items": [
    {
      "id": "cantina:e275368c",
      "source": "cantina",
      "kind": "audit_contest",
      "title": "Audit contest: Revert v4lend Competition",
      "reward": 50000,
      "currency": "USDC",
      "est_usd": 50000,
      "deadline": "2026-11-03T18:30:00Z",
      "url": "https://cantina.xyz/competitions/e275368c-547d-4d91-a418-053ad31082a8",
      "requires": ["agent_account", "github", "kyc"]
    }
  ]
}
```

`node client.mjs stats`:

```json
{
  "generated_at": "2026-10-30T00:43:43Z",
  "stats": {
    "items": 25,
    "total_usd": 617.6,
    "by_source": {
      "algora": { "items": 8, "usd": 443, "ok": true },
      "superteam": { "items": 1, "usd": 125, "ok": true },
      "frantic": { "items": 5, "usd": 40, "ok": true },
      "cantina": { "items": 1, "usd": 50000, "ok": true }
    }
  }
}
```

(Full captured output is in `sample-output.json` and `sample-stats.json`.)

## How it works

1. `POST /mcp` `initialize` → gets `serverInfo` (+ optional `mcp-session-id`).
2. `POST` `notifications/initialized`.
3. `POST` `tools/call` with `{name, arguments}` → parse `result.content[0].text` as JSON.

Streamable HTTP may return either `application/json` or `text/event-stream` (SSE); the client
handles both. There are **no dependencies** — read `client.mjs` top to bottom in 2 minutes.

## License

MIT
