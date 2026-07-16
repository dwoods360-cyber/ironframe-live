# Governance Frame → Google Docs

Local TypeScript utility that creates (and optionally refreshes) the Google Drive / Google Docs editorial structure for research paper **GF-2026-001**.

Repository Markdown under `docs/governance-frame/research-papers/GF-2026-001-evolution-of-grc/` remains canonical. Google Docs are collaborative editorial copies.

## Drive structure

```text
Governance Frame/
└── Research Papers/
    └── GF-2026-001 — Evolution of GRC/
        ├── 01 — Master Manuscript
        ├── 02 — Reference Ledger
        ├── 03 — Source Verification Ledger
        ├── 04 — Revision History
        └── 05 — Editorial Review Notes
```

The script is idempotent: exact-name lookup under the expected parent prevents duplicate folders/docs.

## Environment variables

| Variable | Purpose |
|---|---|
| `GOOGLE_OAUTH_CLIENT_FILE` | Path to OAuth Desktop client JSON (`installed` or `web`) |
| `GOOGLE_OAUTH_TOKEN_FILE` | Path to saved token JSON (created on first auth) |

Required OAuth scopes:

- `https://www.googleapis.com/auth/documents`
- `https://www.googleapis.com/auth/drive.file`

Enable **Google Drive API** and **Google Docs API** on the GCP project that owns the OAuth client.

## Commands

Dry-run (no Google API calls):

```bash
npm run governance-frame:google-docs -- --dry-run
```

Live create (default mode):

```bash
GOOGLE_OAUTH_CLIENT_FILE=./secrets/google-oauth-client.json \
GOOGLE_OAUTH_TOKEN_FILE=./secrets/google-oauth-token.json \
  npm run governance-frame:google-docs -- --mode=create
```

Replace content only for Docs previously recorded in `.state/GF-2026-001.json`:

```bash
... npm run governance-frame:google-docs -- --mode=replace
```

Append with a dated sync marker:

```bash
... npm run governance-frame:google-docs -- --mode=append
```

Write Master Manuscript ID into repository frontmatter (`googleDocId` only):

```bash
... npm run governance-frame:google-docs -- --mode=create --write-metadata
```

## Modes

| Mode | Behavior |
|---|---|
| `create` (default) | Create missing Docs; leave existing Docs unchanged |
| `replace` | Clear and rebuild only Docs owned by this utility (state file) |
| `append` | Append content with a dated synchronization marker |

## State file

Created document IDs are stored at:

`scripts/governance-frame/google-docs/.state/GF-2026-001.json`

Do not commit `.state/`.

## Security

- Never commit OAuth client JSON, token JSON, or `.state/`
- Do not log secrets or tokens
- Do not create public sharing permissions
- Utility only creates/updates files inside the Governance Frame folder tree it manages
