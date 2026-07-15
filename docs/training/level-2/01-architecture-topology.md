# Chapter 1 — System Architecture & Dual-Host Topology

> **Track:** LEVEL_2 · **Reading level:** 11th–12th grade plain English · **Release:** `v0.1.0-ga-epic17`  
> **Primary route:** `/integrity` · **Lab IDs:** ARCH-001

## Why this chapter matters

Ironframe app and IronBoard are two hosts. The app serves operators on port 3000. IronBoard serves the boardroom on port 8082. Knowing that split prevents wrong restarts and wrong API calls.

## Learning objectives

When you finish, you can:

- Name what runs on :3000 versus :8082.
- Trace shared-context read from the app.
- Explain fail-closed behavior when the bridge drops.

## How to get there

1. Review: Ironframe app at `http://127.0.0.1:3000` vs IronBoard at `http://127.0.0.1:8082`.
2. Trace `GET /api/board/shared-context` on the app host.
3. Trace `POST /api/documentation/execute` for docs sync into `app_documents`.
4. Confirm a dead bridge fails closed (often 502) instead of inventing data.

## Reference screenshot

![Chapter 1 — System Architecture & Dual-Host Topology](/docs/training/assets/level-2-01-architecture-topology.png)

*Captured near `/integrity`. Asset: `/docs/training/assets/level-2-01-architecture-topology.png`.*

source-file: public/docs/training/assets/level-2-01-architecture-topology.png

## Lab — Dual-host map (ARCH-001)

1. Draw two boxes: App :3000 and IronBoard :8082.
2. Write one arrow for shared-context read.
3. Write one arrow for documentation execute / sync.
4. Write what the operator should see if IronBoard is down.
5. Open `/integrity` and note whether board-dependent widgets look healthy.

## Check your understanding

- [ ] I can name both hosts and ports.
- [ ] I know shared-context is app-side read of board state.
- [ ] I expect fail-closed on disconnect — not silent fake data.

## Common mistakes

- Restarting only the Next app will not revive a dead :8082 board.
- Do not call localhost board URLs from production browser clients.

## Glossary

| Term | Plain meaning |
|------|---------------|
| **Dual-host** | App on :3000 and IronBoard on :8082 working as a pair. |
| **Shared context** | Payload the board and app use to stay aligned. |
| **Fail-closed** | Stop and error instead of guessing when a dependency is down. |

## Source anchors

- `docs/TAS.md`
- `docs/technical/architecture-and-api.md`
- `docs/technical/deployment-and-ops.md`
- `config/route-manifest.v0.1.0-ga-epic17.json`

## Next chapter

Continue to [`02-api-ingress-contracts.md`](./02-api-ingress-contracts.md).
