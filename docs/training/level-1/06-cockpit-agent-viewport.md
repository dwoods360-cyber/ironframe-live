# Chapter 6 — Cockpit & 19-Agent Workforce Viewport

> **Track:** LEVEL_1 · **Reading level:** 11th grade · **Release:** `v0.1.0-ga-epic17`  
> **Primary route:** `/cockpit` · **Lab IDs:** AGENT-001

> **Design partners:** use `https://{slug}.ironframegrc.com` and your client-owned login. Start from the [Operator Packet](/docs/user-manuals/design-partner-operator-packet) and [LEVEL1-PARTNER-INDEX](/docs/training/LEVEL1-PARTNER-INDEX). Localhost / student-credential steps are instructor-only.

## Why this chapter matters

The Cockpit shows how automated agents help intake and track threats. You learn to read the viewport — not to reconfigure agents.

## Learning objectives

When you finish, you can:

- Open `/cockpit` and find agent coordination panels.
- Tell intake threats from confirmed threats when both appear.
- Note IronBoard bridge status if it is shown.

## How to get there

1. Open `/cockpit`.
2. Find the agent or workforce panels.
3. Look for intake versus confirmed threat views.
4. If an IronBoard bridge indicator appears, write its status.

## Reference screenshot

![Chapter 6 — Cockpit & 19-Agent Workforce Viewport](/docs/training/assets/level-1-06-cockpit-agent-viewport.png)

*Captured near `/cockpit`. Asset: `/docs/training/assets/level-1-06-cockpit-agent-viewport.png`.*

source-file: public/docs/training/assets/level-1-06-cockpit-agent-viewport.png

## Lab — Read the workforce viewport (AGENT-001)

1. Open `/cockpit`.
2. Count how many agent or workforce tiles/panels you can see.
3. Write one intake item and one confirmed item if both exist.
4. Note any offline or bridge warning.
5. In one sentence: what is the operator's job here versus the agents' job?

## Check your understanding

- [ ] I can open `/cockpit`.
- [ ] I can describe intake vs confirmed in plain words.
- [ ] I know agents assist; humans still own approvals when required.

## Common mistakes

- Do not treat agent output as final auditor evidence without review.
- If the board bridge is down, note it — do not invent status.

## Glossary

| Term | Plain meaning |
|------|---------------|
| **Cockpit** | Workforce and threat coordination screen at `/cockpit`. |
| **Intake** | New or unverified threat material entering the pipeline. |
| **IronBoard bridge** | Link that feeds boardroom context when online. |

## Source anchors

- `docs/TAS.md`
- `docs/qa/complete-feature-glossary.md`
- `config/route-manifest.v0.1.0-ga-epic17.json`
- `docs/user-manuals/glossary.md`

## Next chapter

Continue to [`07-board-report-readiness.md`](./07-board-report-readiness.md).
