// briefing.js
// Builds the market-intelligence briefing that Pulse posts into Slack.
//
// fetchBriefingItems() asks Claude (Haiku) to find recent news on the given
// topics and return, per item, a headline, the source URL, and a one-sentence
// "why this matters". The Block Kit / text formatters below turn those items
// into what Slack renders.
//
// HOW PULSE RETRIEVES (three layers, picked automatically):
//   1. MCP server  — if a search MCP server is configured (TAVILY_API_KEY or
//      MCP_SERVER_URL), Claude retrieves through it via the Anthropic MCP
//      connector. This is the project's "MCP server integration" for the
//      Slack Agent Builder Challenge, and the response carries mcp_tool_use
//      blocks as proof the MCP server was actually used.
//   2. web_search  — fallback when no MCP server is configured but an Anthropic
//      key is present. Uses Claude's built-in web search tool.
//   3. sample data — fallback when ANTHROPIC_API_KEY is missing, so
//      `npm run dry-run` still works with zero setup.

import Anthropic from "@anthropic-ai/sdk";

// Cheapest capable model — briefings are simple summarization work.
const MODEL = "claude-haiku-4-5";
const MAX_ITEMS = 5;

// Beta flag that enables the Messages API MCP connector.
const MCP_BETA = "mcp-client-2025-11-20";

// The MCP connector runs the whole search loop server-side in one call, so cap
// both the model's search count (prompt) and the wall-clock per request.
// maxRetries is set to 0 on the client below: the SDK retries timeouts by
// default, which would multiply this wall-clock by 3 before failing over.
const MAX_SEARCHES = 1;
const REQUEST_TIMEOUT_MS = 45000;

/**
 * Resolves the search MCP server to attach to the Claude call, or null if none
 * is configured. Prefers an explicit MCP_SERVER_URL; otherwise builds the
 * Tavily remote MCP URL from TAVILY_API_KEY.
 * @returns {{url: string, name: string} | null}
 */
function resolveMcpServer() {
  const name = process.env.MCP_SERVER_NAME || "tavily";
  if (process.env.MCP_SERVER_URL) {
    return { url: process.env.MCP_SERVER_URL, name };
  }
  if (process.env.TAVILY_API_KEY) {
    const key = encodeURIComponent(process.env.TAVILY_API_KEY);
    return { url: `https://mcp.tavily.com/mcp/?tavilyApiKey=${key}`, name };
  }
  return null;
}

/**
 * A single briefing item.
 * @typedef {Object} BriefingItem
 * @property {string} headline   - short title
 * @property {string} soWhat     - one line: why this matters
 * @property {string} source     - publication / site name
 * @property {string} url        - link to the source
 */

/** Fallback content so the dry-run works before any API key is set. */
/** @type {BriefingItem[]} */
const sampleItems = [
  {
    headline: "Competitor ships an AI agent marketplace",
    soWhat: "Signals the category is heating up — expect pricing pressure within a quarter.",
    source: "TechCrunch",
    url: "https://techcrunch.com/",
  },
  {
    headline: "New funding round in your space ($40M Series B)",
    soWhat: "A well-funded rival can now outspend on sales — watch their hiring pages.",
    source: "Bloomberg",
    url: "https://www.bloomberg.com/",
  },
  {
    headline: "Regulator opens consultation on AI disclosure rules",
    soWhat: "Could become a compliance requirement; early movers can market trust.",
    source: "Reuters",
    url: "https://www.reuters.com/",
  },
];

/**
 * Fetches a live, cited briefing for the given topics.
 * Retrieval path is chosen automatically (MCP server → web_search → sample).
 * @param {string} topic
 * @returns {Promise<{items: BriefingItem[], live: boolean, source: "mcp"|"web_search"|"sample", mcpServer: string|null, mcpToolUses: number}>}
 */
export async function fetchBriefingItems(topic) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return { items: sampleItems, live: false, source: "sample", mcpServer: null, mcpToolUses: 0 };
  }

  // maxRetries: 0 — don't let the SDK retry timeouts (that tripled wall-clock
  // to ~3.5 min before failing over). We handle failure via the fallback below.
  const client = new Anthropic({ maxRetries: 0 }); // reads ANTHROPIC_API_KEY from env
  const mcp = resolveMcpServer();

  const system =
    "You are a market-intelligence analyst. Make exactly ONE search that covers all of " +
    "the user's topics at once (e.g. search all topic names together), then STOP searching " +
    "and answer from those results. Do not run a separate search per topic. Prefer " +
    "reputable, primary sources from the last few weeks.";

  const prompt =
    `Find the most important recent news about: ${topic}.\n\n` +
    `Run ONE combined search for all of those topics, then ` +
    `return ONLY a JSON array (no prose, no markdown code fences) of at most ${MAX_ITEMS} ` +
    `items, ordered by importance. Spread coverage across all the topics rather than ` +
    `clustering on one, and skip near-duplicate stories. Each item must be an object with exactly these keys:\n` +
    `  "headline": a short title (max ~12 words)\n` +
    `  "url": the source URL\n` +
    `  "source": the publication or site name\n` +
    `  "soWhat": one sentence on why this matters to someone tracking this space\n`;

  let response;
  let usedMcp = false;
  if (mcp) {
    try {
      response = await runWithMcp(client, system, prompt, mcp);
      usedMcp = true;
    } catch (err) {
      console.error(
        `MCP retrieval via "${mcp.name}" failed (${err.message}); falling back to web_search.`,
      );
      response = await runWithWebSearch(client, system, prompt);
    }
  } else {
    response = await runWithWebSearch(client, system, prompt);
  }

  const items = parseItems(response);
  const ok = items.length > 0;
  return {
    items: ok ? items.slice(0, MAX_ITEMS) : sampleItems,
    live: ok,
    source: ok ? (usedMcp ? "mcp" : "web_search") : "sample",
    mcpServer: usedMcp ? mcp.name : null,
    mcpToolUses: countMcpToolUses(response),
  };
}

/** Retrieves via a remote search MCP server (Anthropic MCP connector). */
async function runWithMcp(client, system, prompt, mcp) {
  const params = {
    model: MODEL,
    max_tokens: 2048,
    betas: [MCP_BETA],
    system,
    mcp_servers: [{ type: "url", url: mcp.url, name: mcp.name }],
    tools: [{ type: "mcp_toolset", mcp_server_name: mcp.name }],
  };
  const opts = { timeout: REQUEST_TIMEOUT_MS };
  let messages = [{ role: "user", content: prompt }];
  let response = await client.beta.messages.create({ ...params, messages }, opts);

  // Server-side tool loop; if it pauses, resume it.
  let guard = 0;
  while (response.stop_reason === "pause_turn" && guard++ < 4) {
    messages = [
      { role: "user", content: prompt },
      { role: "assistant", content: response.content },
    ];
    response = await client.beta.messages.create({ ...params, messages }, opts);
  }
  return response;
}

/** Retrieves via Claude's built-in web_search tool (fallback when no MCP server). */
async function runWithWebSearch(client, system, prompt) {
  const params = {
    model: MODEL,
    max_tokens: 2048,
    system,
    tools: [{ type: "web_search_20250305", name: "web_search", max_uses: MAX_ITEMS }],
  };
  const opts = { timeout: REQUEST_TIMEOUT_MS };
  let messages = [{ role: "user", content: prompt }];
  let response = await client.messages.create({ ...params, messages }, opts);

  let guard = 0;
  while (response.stop_reason === "pause_turn" && guard++ < 4) {
    messages = [
      { role: "user", content: prompt },
      { role: "assistant", content: response.content },
    ];
    response = await client.messages.create({ ...params, messages }, opts);
  }
  return response;
}

/** Counts mcp_tool_use blocks in the response — proof the MCP server was used. */
function countMcpToolUses(response) {
  return (response.content || []).filter((b) => b.type === "mcp_tool_use").length;
}

/** Pulls the JSON array out of Claude's text blocks and normalizes it. */
function parseItems(response) {
  const text = (response.content || [])
    .filter((b) => b.type === "text")
    .map((b) => b.text)
    .join("\n");

  const start = text.indexOf("[");
  const end = text.lastIndexOf("]");
  if (start === -1 || end === -1 || end < start) return [];

  let parsed;
  try {
    parsed = JSON.parse(text.slice(start, end + 1));
  } catch {
    return [];
  }
  if (!Array.isArray(parsed)) return [];

  return parsed
    .filter((it) => it && it.headline && it.url)
    .map((it) => ({
      headline: clean(it.headline),
      url: String(it.url),
      source: it.source ? clean(it.source) : hostOf(it.url),
      soWhat: it.soWhat ? clean(it.soWhat) : "",
    }));
}

/** Removes the web-search citation tags (<cite ...>...</cite>) Claude embeds in text. */
function clean(value) {
  return String(value)
    .replace(/<\/?cite\b[^>]*>/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/** Derives a readable site name from a URL when the model omits "source". */
function hostOf(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "source";
  }
}

/**
 * Returns the briefing as plain text (used for the --dry-run console preview).
 * @param {string} topic
 * @param {BriefingItem[]} items
 */
export function briefingAsText(topic, items = sampleItems) {
  const lines = [];
  lines.push(`📊  PULSE BRIEFING — ${topic}`);
  lines.push("");
  items.forEach((it, i) => {
    lines.push(`${i + 1}. ${it.headline}`);
    if (it.soWhat) lines.push(`   Why it matters: ${it.soWhat}`);
    lines.push(`   Source: ${it.source} — ${it.url}`);
    lines.push("");
  });
  lines.push("— Pulse");
  return lines.join("\n");
}

/**
 * Returns the briefing as Slack Block Kit blocks (the rich format Slack renders).
 * @param {string} topic
 * @param {BriefingItem[]} items
 */
export function briefingAsBlocks(topic, items = sampleItems) {
  const blocks = [
    {
      type: "header",
      text: { type: "plain_text", text: `📊 Pulse Briefing — ${topic}`, emoji: true },
    },
    { type: "divider" },
  ];

  items.forEach((it) => {
    const why = it.soWhat ? `\n${it.soWhat}` : "";
    blocks.push({
      type: "section",
      text: {
        type: "mrkdwn",
        text: `*<${it.url}|${it.headline}>*${why}\n_${it.source}_`,
      },
    });
  });

  blocks.push({ type: "divider" });
  blocks.push({
    type: "context",
    elements: [{ type: "mrkdwn", text: "Pulse · live web results via Claude" }],
  });

  return blocks;
}
