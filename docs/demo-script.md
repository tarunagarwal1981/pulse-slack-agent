# Pulse — Demo Video Script (~2 minutes)

Target length: **1:45–2:15**. Record at 1080p. Keep Slack and a terminal window
ready. Do a live MCP run just before recording so results are warm.

Legend: **[SCREEN]** = what to show · **🎙️** = what to say.

---

## 0:00–0:15 — Hook / the problem
**[SCREEN]** Your face cam or a title card: "Pulse — market intel, in Slack."
🎙️ "Every team wants to keep up with their market — competitors, funding,
regulation — but nobody has time to search the web all day. So I built Pulse:
a Slack agent that brings cited market briefings to where your team already
works."

## 0:15–0:35 — The core action (`/pulse`)
**[SCREEN]** A Slack channel. Type `/pulse Nvidia, AMD` and hit enter. Wait for
the briefing to appear (~10s — you can cut the wait in editing).
🎙️ "I just type slash-pulse and the topics I care about. Pulse goes out, finds
the most important recent news, and posts a clean briefing right in the
channel — each item with a headline, a source link, and a one-line 'why this
matters.'"

**[SCREEN]** Scroll slowly through the posted briefing so each item is readable.

## 0:35–0:55 — The second trigger (`@mention`, threaded)
**[SCREEN]** In the same channel type `@Pulse Tesla, Rivian`. Then click into the
thread reply that appears.
🎙️ "I can also just mention it in a thread — same live briefing, delivered as a
threaded reply so it doesn't clutter the channel."

## 0:55–1:25 — The differentiator: it retrieves via an MCP server
**[SCREEN]** Switch to a terminal. Run `npm run dry-run`. Let the last line show:
`✅ retrieved via MCP server "tavily" (2 mcp_tool_use calls)`.
🎙️ "Here's what's under the hood. Pulse doesn't just call a model — it retrieves
live news *through an MCP server*, using the Anthropic MCP connector to attach a
search MCP server to the model call. This line is the proof: the response
carries mcp_tool_use blocks. Then Claude Haiku summarizes what matters. It's
fast — about ten seconds — and reliable, with an automatic fallback if the MCP
server is ever down."

**[SCREEN]** Optional: briefly show `src/briefing.js` — the `mcp_servers` +
`mcp_toolset` block — for 2–3 seconds.

## 1:25–1:45 — Who it's for + adapts to any vertical
**[SCREEN]** Back to the Slack briefing.
🎙️ "Pulse is built for any team that needs to stay on top of a market —
founders, sales, marketing, strategy. And because you just change the topics,
the exact same agent adapts to any vertical — shipping, healthcare, finance,
you name it."

## 1:45–2:00 — Close
**[SCREEN]** Title card with the repo URL:
`github.com/tarunagarwal1981/pulse-slack-agent`
🎙️ "That's Pulse — market intelligence, in Slack, powered by an MCP server.
Thanks for watching."

---

### Recording tips
- Pre-warm a run so the live `/pulse` returns quickly; trim dead air in editing.
- If a live run ever falls back to web_search on camera, just re-run — it's
  reliably MCP now (~11s), but have a backup take.
- Keep secrets off screen: don't show your `.env` or the Slack app admin pages
  with tokens visible.
- Captions help judges skimming on mute — consider burning in subtitles.
