# 3M Senior PM — Interview audio prep

**Role:** Senior Project Manager, IT Infrastructure (Zero Trust & Network Security) · Maplewood, MN

## Files

| File | Purpose |
|------|---------|
| `manifest.json` | Chapter text + metadata for audio generation |
| `player.html` | Desktop audio player (needs local server) |
| `3m-interview-ebook-mobile.html` | Mobile HTML (embedded audio — may not play on all phones) |
| `3m-interview-prep.epub` | **Kindle / Apple Books** — read all answers |
| `3m-interview-audio-phone.zip` | **Phone audio** — 17 numbered MP3s, tap to play in Files |
| `audio/*.mp3` | Generated chapters (run script below) |
| `answer-book.md` | Full Q&A reference (paste from prep doc) |

## Quick start

### 1. Generate MP3 chapters (one-time, ~5 min)

From repo root:

```powershell
node scripts/dev/generate-3m-interview-audio.mjs
```

Single chapter:

```powershell
node scripts/dev/generate-3m-interview-audio.mjs --id q01
```

Regenerate all:

```powershell
node scripts/dev/generate-3m-interview-audio.mjs --force
```

Uses **Python edge-tts** (`pip install edge-tts`) — voice `en-US-GuyNeural`.

### 2. Open the player

```powershell
npx serve docs/interview-prep/3m -p 8765
```

Browser: **http://127.0.0.1:8765/player.html**

### 3. Phone player with controls (recommended)

Publish to `public/` and open over HTTPS (required for phone audio + controls):

```powershell
npm run interview:3m:publish
npm run dev
```

Local: **http://127.0.0.1:3000/interview-prep/3m/player.html**

Production (after deploy): **https://ironframegrc.com/interview-prep/3m/player.html**

Email yourself the link:

```powershell
npm run interview:3m:email-player
```

Controls: ▶ Play/Pause · −5s · +10s · ◀ Prev · Next ▶ · chapter dropdown · scrollable text.

Add to Home Screen on iPhone for one-tap access.

### 4. Kindle read + MP3 zip (offline fallback)

Build EPUB (read) + MP3 zip (listen):

```powershell
npm run interview:3m:kindle
npm run interview:3m:email-kindle
```

**EPUB → Kindle:** Email `3m-interview-prep.epub` to your Send-to-Kindle address, or import in the Kindle app.

**MP3 zip → iPhone:** Save zip → extract → tap `01-intro.mp3`, `02-q01.mp3`, etc. in **Files**. Native player — no browser.

Kindle e-readers are text-only. Use the MP3 zip for audio on your phone.

### 4. Mobile HTML ebook (fallback)

```powershell
npm run interview:3m:ebook
```

Single HTML file with embedded audio — some phones block this in the browser.

### 5. Download individual MP3s (desktop player)

- Use **↓ Download MP3** per chapter in the player, or  
- Copy the whole `docs/interview-prep/3m/audio` folder to your phone.

## Player controls

| Control | Action |
|---------|--------|
| ▶ Play / ⏸ Pause | Play/pause current chapter |
| −5s | Rewind 5 seconds |
| +10s | Forward 10 seconds |
| ◀ Prev / Next ▶ | Previous / next question |
| Dropdown | Jump to any chapter |
| 🔊 Browser voice | Fallback if MP3 not generated (no seek) |
| ↓ Download MP3 | Save current chapter |

## Chapters

- `intro` — How to use
- `q01`–`q15` — Primary interview answers
- `lifecycle` — Ironframe project lifecycle (45–60s)

## npm script (optional)

Add to your workflow:

```json
"interview:3m:audio": "node scripts/dev/generate-3m-interview-audio.mjs",
"interview:3m:ebook": "node scripts/dev/build-3m-interview-ebook.mjs",
"interview:3m:email-ebook": "node scripts/dev/send-3m-interview-ebook-email.mjs"
```

## Notes

- Primary answers only (~60–90s each). Hostile follow-ups stay in the written answer book — practice those by reading aloud.
- Voice is synthetic; for higher quality, re-record key chapters in your own voice using the transcript panel.
