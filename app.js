// app.js — Pulse, a Slack market-intelligence agent.
//
// Two ways to run this:
//   npm run dry-run   → prints a sample briefing to your terminal. No Slack
//                       account or keys needed. Use this to see output today.
//   npm start         → connects to Slack (needs the tokens in .env) and posts
//                       a briefing when someone runs /pulse or @-mentions the bot.

import "dotenv/config";
import { briefingAsText, briefingAsBlocks } from "./src/briefing.js";

const isDryRun = process.argv.includes("--dry-run");

if (isDryRun) {
  // ---- Local preview: no Slack connection, just print to the terminal. ----
  console.log("\n" + briefingAsText("Anthropic, OpenAI") + "\n");
  console.log("✅ Dry run complete. This is what Pulse will post into Slack.");
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
  await ack();
  const topic = command.text?.trim() || "your tracked topics";
  await respond({
    response_type: "in_channel",
    blocks: briefingAsBlocks(topic),
    text: briefingAsText(topic), // fallback for notifications
  });
});

// Respond when the bot is @-mentioned.
app.event("app_mention", async ({ event, say }) => {
  const topic = "your tracked topics";
  await say({
    thread_ts: event.ts,
    blocks: briefingAsBlocks(topic),
    text: briefingAsText(topic),
  });
});

(async () => {
  await app.start();
  console.log("⚡️ Pulse is running and connected to Slack (Socket Mode).");
})();
