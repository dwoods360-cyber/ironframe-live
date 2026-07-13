#!/usr/bin/env node
/**
 * Optional webhook alert when scheduled acorp production smoke fails.
 * Set GitHub secret PRODUCTION_SMOKE_ALERT_WEBHOOK (Slack incoming webhook,
 * Discord webhook, or any JSON POST endpoint accepting `text` / `content`).
 */
const webhook = process.env.PRODUCTION_SMOKE_ALERT_WEBHOOK?.trim();
if (!webhook) {
  console.log("PRODUCTION_SMOKE_ALERT_WEBHOOK not set — relying on GitHub failure notifications only.");
  process.exit(0);
}

const runUrl =
  process.env.GITHUB_SERVER_URL &&
  process.env.GITHUB_REPOSITORY &&
  process.env.GITHUB_RUN_ID
    ? `${process.env.GITHUB_SERVER_URL}/${process.env.GITHUB_REPOSITORY}/actions/runs/${process.env.GITHUB_RUN_ID}`
    : "https://github.com";

const branch = process.env.GITHUB_REF_NAME?.trim() || "main";
const message = `acorp production smoke FAILED on ${branch} — audit-trail + Command Post checks against acorp.ironframegrc.com. Run: ${runUrl}`;

const payload = {
  text: message,
  content: message,
};

const response = await fetch(webhook, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(payload),
});

if (!response.ok) {
  const body = await response.text().catch(() => "");
  console.error(`Alert webhook returned ${response.status}: ${body.slice(0, 500)}`);
  process.exit(1);
}

console.log("Production smoke failure alert delivered.");
