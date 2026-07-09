# Deploying Pulse (always-on, so judges can test anytime)

Pulse runs in **Socket Mode**, so it needs no public URL — it just needs to be a
long-running process somewhere that stays awake. These steps put it on
**Railway**, which deploys straight from GitHub and stays always-on (its trial
credit easily covers the hackathon judging window; a tiny Node process costs
cents/day).

## Railway (recommended)

1. Go to https://railway.app and sign in with GitHub.
2. **New Project → Deploy from GitHub repo → `pulse-slack-agent`.** Railway
   auto-detects Node and runs `npm start`.
3. Open the service → **Variables** → add all of these (same values as your
   local `.env`):
   - `ANTHROPIC_API_KEY`
   - `TAVILY_API_KEY`
   - `SLACK_BOT_TOKEN`
   - `SLACK_APP_TOKEN`
   - `SLACK_SIGNING_SECRET`
   (Railway sets `PORT` automatically — the health endpoint uses it.)
4. Deploy. Watch the logs for `⚡️ Pulse is running and connected to Slack`.
5. Test in Slack: `/pulse Tesla, Rivian`. Because it's now hosted, it responds
   even when your laptop is off.

> Keep your **local** `npm start` stopped once it's hosted — two instances both
> connected in Socket Mode will each try to answer and you'll get duplicate
> replies.

## Give the judges test access (required)

The rules require test access to your Slack sandbox for:
- `slackhack@salesforce.com`
- `testing@devpost.com`

In your Slack workspace: **Invite people** → add both email addresses (Slack's
free plan allows this). Make sure Pulse is installed and invited to a channel
they can see, so they can run `/pulse`.

## Alternatives
- **Fly.io** — genuinely cheap always-on; needs the `fly` CLI and a card. Good
  if you prefer it. Deploy a single 256MB machine running `npm start`.
- **Render** — its *free* web service spins down after ~15 min idle, so a
  Socket Mode app can drop offline. Only use Render on a paid Background Worker.
- **Keep it local** — run `npm start` on your machine during judging. Zero
  hosting, but Pulse is offline whenever your laptop is.
