# Pulse — a Slack market-intelligence agent

Pulse posts short, cited market/competitive briefings into a Slack channel.
Built for the Slack Agent Builder Challenge.

![Example Pulse briefing posted in Slack](docs/briefing-example.svg)

*Example: `/pulse Nvidia, AMD` → a cited briefing posted in the channel (illustrative).*

**How it works:** when someone runs `/pulse <topics>` or @-mentions the bot,
Pulse retrieves recent news through a **search MCP server** (via the Anthropic
MCP connector), asks Claude to summarize *what matters*, and posts a clean
briefing back into the channel.

```
Slack message  →  Pulse  →  [MCP search server] + [Claude summary]  →  briefing posted to Slack
```

Change the topics and the same agent adapts to any vertical — tech, shipping,
healthcare, finance, policy.

## MCP server integration

Pulse satisfies the challenge rule "use at least one of {Slack AI, MCP server
integration, Real-Time Search}" via **MCP**. When a search MCP server is
configured (a free `TAVILY_API_KEY`, or any `MCP_SERVER_URL`), Pulse attaches it
to the Claude call with the Messages API MCP connector and retrieves through it —
the response contains `mcp_tool_use` blocks as proof. If no MCP server is
configured it falls back to Claude's built-in web search, then to sample data, so
it never hard-fails.

The `--dry-run` mode prints which path ran, e.g.
`retrieved via MCP server "tavily" (2 mcp_tool_use calls)`.

## Quick start (no accounts needed)

```bash
npm install
npm run dry-run
```

This prints a briefing to the terminal — the exact content Pulse posts into
Slack. With `ANTHROPIC_API_KEY` + `TAVILY_API_KEY` set it runs live via MCP;
with no keys it prints sample data.

## Configuration

Copy `.env.example` to `.env` and fill in:

| Variable | Purpose | Required for |
|----------|---------|--------------|
| `ANTHROPIC_API_KEY` | Claude summaries (and web-search fallback) | Live briefings |
| `TAVILY_API_KEY` | Turns on MCP retrieval (Tavily's remote MCP server) | MCP path |
| `SLACK_BOT_TOKEN` | Post messages (`xoxb-…`) | Running in Slack |
| `SLACK_APP_TOKEN` | Socket Mode connection (`xapp-…`) | Running in Slack |
| `SLACK_SIGNING_SECRET` | Request verification | Running in Slack |

`MCP_SERVER_URL` / `MCP_SERVER_NAME` optionally point Pulse at any other remote
(URL-based) search MCP server instead of Tavily.

## Running in Slack

Pulse uses **Socket Mode**, so it needs no public URL. One-time Slack app setup:

1. Create a Slack app at https://api.slack.com/apps → **Create New App** →
   **From scratch**, in a workspace you can install apps to.
2. **Socket Mode** → enable it, and create an App-Level Token with the
   `connections:write` scope → this is `SLACK_APP_TOKEN` (`xapp-…`).
3. **Slash Commands** → create `/pulse` (usage hint: `Anthropic, OpenAI`). With
   Socket Mode on, leave the Request URL blank.
4. **OAuth & Permissions** → add Bot Token Scopes: `commands`, `chat:write`,
   `app_mentions:read`.
5. **Event Subscriptions** → enable, and subscribe to the bot event
   `app_mention`.
6. **Install App** → Install to Workspace. Copy the Bot User OAuth Token
   (`xoxb-…`) into `SLACK_BOT_TOKEN`, and the Signing Secret from **Basic
   Information** into `SLACK_SIGNING_SECRET`.

Then:

```bash
npm start
```

In Slack, invite the bot to a channel (`/invite @Pulse`) and run
`/pulse Tesla, Rivian`, or `@Pulse Tesla, Rivian` to get a threaded reply.

## Project layout

| File | What it does |
|------|--------------|
| `app.js` | Entry point: `--dry-run` preview, or connect to Slack and handle `/pulse` + `app_mention`. Both triggers share one code path. |
| `src/briefing.js` | Retrieval (MCP server → web search → sample), Claude summary, and Slack Block Kit formatting. |
| `.env.example` | Template for keys. Copy to `.env`. |

## Tech stack

Slack Bolt (Socket Mode) · Anthropic Claude (`claude-haiku-4-5`) · Messages API
MCP connector · Tavily MCP server · Node.js.

## Roadmap

- [x] Live retrieval via a search MCP server (Anthropic MCP connector), with fallback
- [x] Claude-written "why it matters" per item, cited
- [ ] Scheduled daily briefings to a channel
- [ ] Saved per-workspace topic lists, de-duplicated across days
- [ ] Slack Marketplace listing
