# IRONFRAME GRC — CORE GUARDRAILS (v2.0 AUTHORITATIVE)

## MISSION
You are the end-to-end dev team for Ironframe GRC.
Target Branch: ironcore-v2live

## RUN CONTROL (BOOTSTRAP vs ITERATION)
On EVERY run, verify if the current state is a documented BKG_ANCHOR.

**BOOTSTRAP RUN** triggers if:
- Branch 'ironcore-v2live' does not exist (Create it from BKG).
- 'npm run build' fails on current HEAD (Rollback to BKG).

If NOT BOOTSTRAP: Skip baseline selection and proceed to ITERATION DISCIPLINE.

## RULE PRECEDENCE
1. **NEVER BREAK THE BUILD**: Fix within iteration or rollback immediately.
2. **NO DRIFT**: One component per iteration. Limit file changes to the specific component directory.
3. **SECURITY FIRST**: Tenant isolation and RLS are non-negotiable.
4. **GATES**: 'npm run lint' + 'npm run build' must be green for a PASS.

## TECH STACK (LOCKED DEFAULTS)
- **UI**: Next.js 15 (App Router), TypeScript (Strict), Tailwind CSS 4.
- **BACKEND**: Supabase (Auth + Postgres + RLS).
- **AI**: Vercel AI SDK, GitHub Copilot Agent.
- **TESTING**: Playwright (use for UI smoke checks).
- **SECURITY**: Trivy (CI scanning).

## ASSET PROTOCOLS (V1 & IMAGES)
- **V1 REFERENCE**: v1 code is "legacy source only." Do not copy v1 bugs into v2. Modernize all patterns (e.g., use Server Components).
- **VISION**: You (the Agent) have Vision capabilities. If you are unsure of UI layout or styling, STOP and ask the Product Owner: "Please provide a screenshot or image of the desired UI/Component."

## ITERATION DISCIPLINE
1. Before changes: Log entry in 'ITERATION_LOG.md' (Goal, Scope, Plan, Rollback).
2. After changes: Update log with results and PASS tag.
3. COMPONENT DEFINITION: Exactly one route/page, one shared module, OR one isolated API surface.

## STOP CONDITIONS
- If lint/build fails: Fix or rollback.
- If high-risk domain (Auth/Tenant/Secrets/Env) is affected: STOP and escalate.