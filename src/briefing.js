// briefing.js
// Builds the market-intelligence briefing that Pulse posts into Slack.
//
// RIGHT NOW this returns hardcoded sample content so we can test the Slack
// plumbing and the formatting first. In a later step we'll replace the
// `sampleItems` with real results from the Real-Time Search API + Claude.

/**
 * A single briefing item. This is the shape we'll eventually fill from
 * live web search + a Claude summary.
 * @typedef {Object} BriefingItem
 * @property {string} headline   - short title
 * @property {string} soWhat     - one line: why this matters
 * @property {string} source     - publication / site name
 * @property {string} url        - link to the source
 */

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
    lines.push(`   Why it matters: ${it.soWhat}`);
    lines.push(`   Source: ${it.source} — ${it.url}`);
    lines.push("");
  });
  lines.push("— Pulse · replace this sample with live search results next.");
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
    blocks.push({
      type: "section",
      text: {
        type: "mrkdwn",
        text: `*<${it.url}|${it.headline}>*\n${it.soWhat}\n_${it.source}_`,
      },
    });
  });

  blocks.push({ type: "divider" });
  blocks.push({
    type: "context",
    elements: [
      { type: "mrkdwn", text: "Pulse · sample data — live search wired up in a later step." },
    ],
  });

  return blocks;
}
