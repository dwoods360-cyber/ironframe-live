# Changes log

Summary of recent edits from the Active Risks / Audit Intelligence session.

---

## 2026-02-28

### Section rename: ACTIVE RISKS

- **`app/components/ActiveRisksClient.tsx`**
  - Section heading: `ACTIVE THREATS & RISKS` → **`ACTIVE RISKS`**.

- **`app/components/ActiveRisks.tsx`**
  - Comment: "ACTIVE THREATS & RISKS" → **"ACTIVE RISKS"** (baseline purge exclusion note).

### Audit Intelligence: hide GRCBOT / simulation cards

- **`app/components/AuditIntelligence.tsx`**
  - Filter sidebar list so GRCBOT/simulation entries never appear:
    - Exclude any entry with `log_type === "SIMULATION"`.
    - Exclude entries with `user_id === "GRCBOT"` or `metadata_tag` containing `"SIMULATION|GRCBOT"`.
  - Effect: **GRC Process Threat**, **GRC Acknowledge**, and **Vendor Artifact Submit** cards from the GRCBOT simulator are no longer shown in the Audit Intelligence sidebar.
  - Test Audit Entry and Manual Risk Registration injection left as-is (still run on mount when missing).

---

## Files touched (this session)

| File | Change |
|------|--------|
| `app/components/ActiveRisksClient.tsx` | Heading text → "ACTIVE RISKS" |
| `app/components/ActiveRisks.tsx` | Comment text → "ACTIVE RISKS" |
| `app/components/AuditIntelligence.tsx` | Exclude SIMULATION + GRCBOT from displayed audit list |

---

## Not changed

- **`app/utils/grcBotEngine.ts`** – Still writes GRCBOT events with `log_type: "SIMULATION"`; they are filtered at display only.
- **`app/utils/auditLogger.ts`** – No edits; `purgeSimulationAuditLogs()` remains available for clearing SIMULATION entries from storage if desired later.
