# LinkedIn page assets (Ironframe GRC)

**Canonical product logo (source of truth):**  
`public/assets/Ironframe_logo.svg` (also used on `/marketing`)

**Derived LinkedIn uploads (this folder only):**

| File | Use |
|------|-----|
| `Ironframe_GRC_LinkedIn_logo.png` | Company page logo (400×400 still) |
| `Ironframe_GRC_LinkedIn_cover.png` | Company page cover (1128×191); text shifted right for logo safe zone |
| `Ironframe_GRC_LinkedIn_profile_cover.png` | Personal profile cover (1584×396); text shifted right for photo safe zone |
| `Ironframe_GRC_LinkedIn_About.txt` | Company About paste |

Regenerate cover from repo root:

```bash
node scripts/dev/export-linkedin-cover.mjs
```

Do not keep copies on the Desktop — use this folder only.
