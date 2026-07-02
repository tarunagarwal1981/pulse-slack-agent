# Pulse — Devpost Submission Copy

Paste these into the matching Devpost fields. Track: **Slack Agent for
Organizations** (Marketplace-oriented), also valid as **New Slack Agent**.

---

## Tagline (one line)
Market-intelligence briefings, delivered in Slack — retrieved live through an MCP server.

## Elevator pitch (2–3 lines)
Pulse is a Slack agent that posts short, cited market/competitive briefings into
a channel on demand. Type `/pulse Nvidia, AMD` (or `@Pulse ...`) and it retrieves
the most important recent news through an **MCP server**, then Claude summarizes
*why each item matters* — in about ten seconds, with source links.

---

## Inspiration
Every team wants to stay on top of its market — competitors, funding, regulation,
launches — but nobody has time to comb the web all day, and the updates never
live where the team actually works. We wanted an agent that brings cited,
decision-ready market intel *into Slack*, on demand, with the "so what" already
written.

## What it does
- Runs in Slack two ways: the `/pulse <topics>` slash command (posts a briefing
  in-channel) and `@Pulse <topics>` (replies in a thread).
- Retrieves the most important recent news for the given topics **through an MCP
  server**, then uses Claude to write a one-line "why this matters" for each item.
- Posts a clean Block Kit briefing: headline, source link, and the takeaway —
  up to 5 items, ordered by importance, in ~10 seconds.
- General-purpose by design: change the topics and the **same agent adapts to any
  vertical** — shipping, healthcare, finance, policy, etc.

## How we built it
- **Slack:** Bolt for JavaScript in **Socket Mode** (no public URL needed),
  handling the `/pulse` command and `app_mention` events through one shared
  code path so results are identical across triggers.
- **MCP server integration (the required technology):** we retrieve via the
  **Anthropic Messages API MCP connector** — attaching a remote **search MCP
  server (Tavily)** to the model call with `mcp_servers` + an `mcp_toolset` tool.
  Claude runs the search through the MCP server; the response comes back with
  `mcp_tool_use` / `mcp_tool_result` blocks as proof the MCP server was used.
- **Summarization:** Claude Haiku (`claude-haiku-4-5`) turns raw results into the
  structured, cited briefing.
- **Resilience:** MCP → built-in web search → sample data, so a demo never breaks.

## Which required technology we used
**MCP server integration.** Retrieval is routed through an MCP server via the
Anthropic MCP connector — verifiable in the response's `mcp_tool_use` blocks, and
surfaced in our dry-run output: `retrieved via MCP server "tavily" (N mcp_tool_use calls)`.

## Challenges we ran into
- **The MCP connector runs the search loop server-side and unbounded.** Asking
  for a 5-item briefing made the model fire a separate search per topic and
  rabbit-hole past our timeout ~2 out of 3 runs. Fixing it to run **one combined
  search** made it reliable: 3/3 runs via MCP, ~11s each.
- **Silent 3.5-minute stalls.** The SDK retries timeouts by default, so one 70s
  timeout fired three times before failing over. Setting `maxRetries: 0` plus a
  tighter timeout removed the stall.
- **Small correctness bugs:** stripping web-search citation tags from text, and
  parsing the real topic out of `@mention` events (the raw text includes the bot
  user id).

## Accomplishments we're proud of
- A genuinely useful agent that a team would use daily, not a toy demo.
- Real, provable MCP integration — not just an LLM feature.
- Fast and reliable: ~10–12s, deterministic MCP path, graceful fallback.

## What we learned
- How the Anthropic MCP connector actually executes tools server-side, and how to
  keep an agentic retrieval loop bounded and fast.
- Slack Socket Mode is the fastest path from zero to a working agent — no public
  endpoint, no tunneling.

## What's next
- Scheduled daily briefings to a channel.
- Per-workspace saved topic lists and de-duplication across days.
- Publish to the Slack Marketplace as a subscription (recurring briefings =
  recurring value).

## Built with
`slack-bolt` · `socket-mode` · `anthropic` · `claude-haiku-4-5` · `mcp` ·
`model-context-protocol` · `tavily` · `node.js` · `javascript`

## Try it out / Repo
https://github.com/tarunagarwal1981/pulse-slack-agent
(Setup steps in the README; `npm run dry-run` shows a live briefing + the MCP proof line.)
