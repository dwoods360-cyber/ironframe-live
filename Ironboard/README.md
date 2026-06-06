# Ironboard

Standalone multi-product agentic corporate board workforce. Decoupled from **ironframe-live** SaaS Postgres — deliberations run in-memory via LangGraph.

## Agents

CEO → CFO → Compliance (CCO) → Legal → User Trainer → Technical Writer

## Deterministic runtime

All six agents instantiate with `temperature: 0.0` and `topP: 0.0` via `src/config/modelFactory.ts`.

## Vector namespaces

| Agent | Namespace |
|-------|-----------|
| User Trainer | `ironboard/secure/trainer/style-guides-v1` |
| Technical Writer | `ironboard/secure/writer/repo-snapshots-v1` |

## Content firewall

Trainer / Writer outputs pass through `src/validation/contentFirewall.ts` before `writeHubAssetSafely()` writes to `docs/`.

## Run

```bash
cd Ironboard
npm install
npm run deliberate
npm run typecheck
npm run test:validation
```

Initial flagship asset: **Ironframe SaaS App** (`ironframe-saas`, `GA_BASELINE`).

Financial fields use **whole-integer USD cents** (`bigint` / digit strings). CFO baselines: Medshield `1110000000`, Vaultbank `590000000`, Gridcore `470000000`.
