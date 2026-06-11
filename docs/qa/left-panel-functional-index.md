# Complete Functional Index of the Left Panel

Command Center left rail: `aside[data-testid="dashboard-left-panel"]` in `DashboardHomeClient.tsx`.  
Stack order: **IrontechLeftPaneControls** (Control Room) → **StrategicIntel**.

**Numbering:** sequential index starting at **0**, incrementing by 1 per feature.

---

## Block A — Control Room (`IrontechLeftPaneControls` → `ControlRoom`)

| # | Feature | Primary module |
|---|---------|----------------|
| 0 | **CONTROL ROOM header** (status dot + title) | `IrontechLeftPaneControls.tsx` |
| 1 | **Quick nav links** (Dashboard, Reports, Vault, Integrity hub, Settings) | `LEFT_PANE_NAV` |
| 2 | **Chaos Meter** (% neutralized, drill run/defeated counters) | `ControlRoom.tsx` |
| 3 | **Identity toggle** (ADMIN / CISO handshake) | `ControlRoom.tsx` |
| 4 | **Compliance overlay** toggle | `ControlRoom.tsx` |
| 5 | **Automated updates** toggle + channel count | `ControlRoom.tsx` |
| 6 | **Audit Verified** badge (notification config session) | `ControlRoom.tsx` |
| 7 | **THREATS_RESOLVED** inline tag (`AgentKillsInlineTag`) | `ControlRoom.tsx` |
| 8 | **Manage Endpoints** modal | `ControlRoom.tsx` |
| 9 | **Board prep · config churn** widget | `ConfigChangeWidget` |
| 10 | **Agent Status Pulse** (LIVE clock, 19-agent pill grid) | `AgentStatusPulseList` |
| 11 | **Pulse gestures** (single-click overlay, double-click cache flush, right-click log inspector) | `ControlRoom.tsx` |
| 12 | **19-Agent Workforce overlay** (modal roster) | `ControlRoom.tsx` |
| 13 | **Agent Log Inspector** (right rail, stream slice) | `ControlRoom.tsx` |
| 14 | **Review Queue** (HITL approve/reject, tenant-scoped) | `ControlRoom.tsx` |
| 15 | **Meta-Audit Console** (export / verify, RBAC-gated) | `ControlRoom.tsx` |
| 16 | **Simulation Bots A–D** (ATTBOT, KIMBOT, GRCBOT, Master Purge) | `ControlRoom.tsx` (sim mode) |
| 17 | **Chaos Deploy embed** (dropdown drills + HITL scenarios + L6 ransomware) | `IrontechChaosDeploy.tsx` |

---

## Block B — Strategic Intel (`StrategicIntel.tsx`)

| # | Feature | Primary module |
|---|---------|----------------|
| 18 | **Strategic Status bar** (STABLE / simulation count / stability timer) | `StrategicIntel.tsx` |
| 19 | **Ironwatch sidebar alert** (governance / Sentinel banner + dismiss) | `StrategicIntel.tsx` |
| 20 | **Strategic Intel / Agent Manager header** (static “Healthy”) | `StrategicIntel.tsx` |
| 21 | **Industry Profile** (show/hide, sector select, Defense CMMC badge) | `StrategicIntel.tsx` |
| 22 | **Risk Exposure** (GRC-Gold pivot, trend chart, `PublicSectorProgress`) | `StrategicIntel.tsx` |
| 23 | **Analyst Maturation** (mastered/total, % bar, sector certification) | `StrategicIntel.tsx` |
| 24 | **Threat library** (live drill launch + deep-dive modal) | `StrategicIntel.tsx` |
| 25 | **Active Agents showcase** (Ironcore / Ironsight / Ironintel live cards) | `WorkforceShowcaseGrid.tsx` |
| 26 | **Live Intelligence Stream** (Expert Mode–gated terminal) | `StrategicIntel.tsx` |
| 27 | **Expert Mode stream coupling** (Header toggle → poll + resubscribe; gates #26) | `Header.tsx`, `useResilienceIntelPoll.ts` |
| 28 | **Secure Terminal** (`kimbot` / `grcbot` / `purg`, Irongate gate) | `StrategicIntel.tsx` |
| 29 | **TTL controls** (hours stepper + SET + countdown display) | `StrategicIntel.tsx` |
| 30 | **Sentinel instruction input + RUN SENTINEL SWEEP** | `StrategicIntel.tsx` |
| 31 | **SentinelSweepModal** (read-only checklist + GRC Gold authorize path) | `SentinelSweepModal.tsx` |

---

## Block C — Alternate left-rail mode

| # | Feature | Primary module |
|---|---------|----------------|
| 32 | **Auditor View** left panel (replaces Control Room + Strategic Intel) | `DashboardHomeClient.tsx` |

---

## Quick reference (titles only)

0. CONTROL ROOM header  
1. Quick nav links  
2. Chaos Meter  
3. Identity toggle  
4. Compliance overlay  
5. Automated updates  
6. Audit Verified  
7. THREATS_RESOLVED inline tag  
8. Manage Endpoints  
9. Board prep · config churn  
10. Agent Status Pulse  
11. Pulse gestures  
12. 19-Agent Workforce overlay  
13. Agent Log Inspector  
14. Review Queue  
15. Meta-Audit Console  
16. Simulation Bots A–D  
17. Chaos Deploy embed  
18. Strategic Status bar  
19. Ironwatch sidebar alert  
20. Strategic Intel / Agent Manager header  
21. Industry Profile  
22. Risk Exposure  
23. Analyst Maturation  
24. Threat library  
25. Active Agents showcase  
26. Live Intelligence Stream  
27. Expert Mode stream coupling  
28. Secure Terminal  
29. TTL controls  
30. Sentinel instruction input + RUN SENTINEL SWEEP  
31. SentinelSweepModal  
32. Auditor View left panel  

**Total features indexed:** 33 (0–32).
