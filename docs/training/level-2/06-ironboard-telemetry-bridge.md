# Chapter 6 — IronBoard Core Telemetry Bridge

> **Track:** LEVEL_2 · **Reading level:** 11th–12th grade plain English · **Release:** `v0.1.0-ga-epic17`  
> **Primary route:** `/cockpit` · **Lab IDs:** BRIDGE-001

## Why this chapter matters

Cockpit and board queries depend on live telemetry. When the bridge fails, the system should tell you — not invent board state.

## Learning objectives

When you finish, you can:

- Confirm IronBoard listens on :8082 in the lab.
- Hit shared-context on the app.
- Recognize disconnect / fail-closed signals.

## How to get there

1. Confirm IronBoard is up at `http://127.0.0.1:8082`.
2. Call or view `GET /api/board/shared-context` on :3000.
3. Open `/cockpit` and look for bridge status.
4. With trainer guidance, observe disconnect behavior (`CORE_TELEMETRY_DISCONNECTED` or equivalent).

## Reference screenshot

![Chapter 6 — IronBoard Core Telemetry Bridge](/docs/training/assets/level-2-06-ironboard-telemetry-bridge.png)

*Captured near `/cockpit`. Asset: `/docs/training/assets/level-2-06-ironboard-telemetry-bridge.png`.*

source-file: public/docs/training/assets/level-2-06-ironboard-telemetry-bridge.png

## Lab — Bridge up / bridge down (BRIDGE-001)

1. With board online, note cockpit or health status.
2. Ask the trainer to stop IronBoard briefly (or use a known down window).
3. Record the error or banner you see.
4. Restart IronBoard and confirm status recovers.
5. Write one sentence: why fail-closed is safer than a cached fantasy board.

## Check your understanding

- [ ] I can check :8082 health.
- [ ] I can find shared-context on the app.
- [ ] I can describe fail-closed bridge behavior.

## Common mistakes

- Do not point production browsers at 127.0.0.1 for IronBoard.
- A green app deploy does not prove the board is online.

## Glossary

| Term | Plain meaning |
|------|---------------|
| **Telemetry bridge** | Link that feeds live board/app context. |
| **Shared-context** | API payload that mirrors board posture into the app. |
| **Disconnect** | Bridge down — queries should fail closed. |

## Source anchors

- `docs/TAS.md`
- `docs/technical/architecture-and-api.md`
- `docs/technical/deployment-and-ops.md`
- `config/route-manifest.v0.1.0-ga-epic17.json`

## Next chapter

Continue to [`07-sustainability-ironbloom.md`](./07-sustainability-ironbloom.md).
