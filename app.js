// app.js — Pulse, a Slack market-intelligence agent.
//
// Two ways to run this:
//   npm run dry-run   → prints a sample briefing to your terminal. No Slack
//                       account or keys needed. Use this to see output today.
//   npm start         → connects to Slack (needs the tokens in .env) and posts
//                       a briefing when someone runs /pulse or @-mentions the bot.

import "dotenv/config";
import { fetchBriefingItems, briefingAsText, briefingAsBlocks } from "./src/briefing.js";

const isDryRun = process.argv.includes("--dry-run");

if (isDryRun) {
  // ---- Local preview: no Slack connection, just print to the terminal. ----
  const topic = "Anthropic, OpenAI";
  const { items, live, source, mcpServer, mcpToolUses } = await fetchBriefingItems(topic);
  console.log("\n" + briefingAsText(topic, items) + "\n");
  if (source === "mcp") {
    console.log(
      `✅ Dry run complete — retrieved via MCP server "${mcpServer}" ` +
        `(${mcpToolUses} mcp_tool_use call${mcpToolUses === 1 ? "" : "s"}). ` +
        `This is what Pulse will post into Slack.`,
    );
  } else if (source === "web_search") {
    console.log(
      "✅ Dry run complete (live web results via web_search fallback — set TAVILY_API_KEY " +
        "in .env to retrieve via the MCP server instead).",
    );
  } else {
    console.log(
      "✅ Dry run complete (sample data — set ANTHROPIC_API_KEY in .env for live results).",
    );
  }
  process.exit(0);
}

// ---- Live mode: connect to Slack via Bolt (Socket Mode = no public URL). ----
const { default: bolt } = await import("@slack/bolt");
const { App } = bolt;

const required = ["SLACK_BOT_TOKEN", "SLACK_APP_TOKEN", "SLACK_SIGNING_SECRET"];
const missing = required.filter((k) => !process.env[k]);
if (missing.length) {
  console.error(
    `\n❌ Missing env vars: ${missing.join(", ")}\n` +
      `   Copy .env.example to .env and fill these in (see README).\n` +
      `   Or run "npm run dry-run" to preview a briefing with no setup.\n`,
  );
  process.exit(1);
}

const app = new App({
  token: process.env.SLACK_BOT_TOKEN,
  appToken: process.env.SLACK_APP_TOKEN,
  signingSecret: process.env.SLACK_SIGNING_SECRET,
  socketMode: true,
});

// Respond to the /pulse slash command.
app.command("/pulse", async ({ command, ack, respond }) => {
  await ack(); // acknowledge within 3s; the briefing follows via response_url
  const topic = command.text?.trim() || "your tracked topics";
  const { items } = await fetchBriefingItems(topic);
  await respond({
    response_type: "in_channel",
    blocks: briefingAsBlocks(topic, items),
    text: briefingAsText(topic, items), // fallback for notifications
  });
});

// Respond when the bot is @-mentioned.
app.event("app_mention", async ({ event, say }) => {
  const topic = "your tracked topics";
  const { items } = await fetchBriefingItems(topic);
  await say({
    thread_ts: event.ts,
    blocks: briefingAsBlocks(topic, items),
    text: briefingAsText(topic, items),
  });
});

(async () => {
  await app.start();
  console.log("⚡️ Pulse is running and connected to Slack (Socket Mode).");
})();
