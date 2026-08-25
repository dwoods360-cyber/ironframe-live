/**
 * Publish 3M interview player to public/ for phone playback over HTTPS.
 * Usage: node scripts/dev/sync-3m-interview-public.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "../..");
const SRC = path.join(ROOT, "docs/interview-prep/3m");
const OUT = path.join(ROOT, "public/interview-prep/3m");
const MANIFEST = path.join(SRC, "manifest.json");
const AUDIO_SRC = path.join(SRC, "audio");
const AUDIO_OUT = path.join(OUT, "audio");

function escHtml(s) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

const manifest = JSON.parse(fs.readFileSync(MANIFEST, "utf8"));
const manifestInline = JSON.stringify(manifest);

const playerHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover" />
  <meta name="apple-mobile-web-app-capable" content="yes" />
  <meta name="apple-mobile-web-app-title" content="3M Interview" />
  <title>3M Interview Prep Player</title>
  <style>
    :root {
      --bg: #0d1117;
      --panel: #161b22;
      --text: #e6edf3;
      --muted: #8b949e;
      --accent: #c8102e;
      --bar: 92px;
      --safe-b: env(safe-area-inset-bottom, 0px);
      --safe-t: env(safe-area-inset-top, 0px);
    }
    * { box-sizing: border-box; -webkit-tap-highlight-color: transparent; }
    html, body { margin: 0; height: 100%; background: var(--bg); color: var(--text); font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
    .app { min-height: 100%; min-height: 100dvh; display: flex; flex-direction: column; }
    header {
      padding: calc(0.75rem + var(--safe-t)) 1rem 0.5rem;
      background: var(--panel);
      border-bottom: 1px solid #30363d;
      position: sticky; top: 0; z-index: 10;
    }
    header h1 { margin: 0 0 0.15rem; font-size: 0.9rem; font-weight: 700; }
    header p { margin: 0 0 0.5rem; font-size: 0.65rem; color: var(--muted); }
    select {
      width: 100%; font-size: 1rem; padding: 0.7rem;
      border-radius: 10px; border: 1px solid #30363d;
      background: var(--bg); color: var(--text);
    }
    main {
      flex: 1;
      overflow-y: auto;
      -webkit-overflow-scrolling: touch;
      padding: 1rem 1rem calc(var(--bar) + var(--safe-b) + 1.25rem);
    }
    .chapter-title { font-size: 1.1rem; font-weight: 700; line-height: 1.35; margin: 0 0 0.35rem; }
    .chapter-meta { font-size: 0.7rem; color: var(--muted); margin-bottom: 1rem; }
    .transcript { font-size: 1.05rem; line-height: 1.65; color: #c9d1d9; white-space: pre-wrap; }
    .player {
      position: fixed; left: 0; right: 0; bottom: 0; z-index: 20;
      background: var(--panel); border-top: 1px solid #30363d;
      padding: 0.45rem 0.65rem calc(0.45rem + var(--safe-b));
    }
    input[type="range"] { width: 100%; accent-color: var(--accent); margin: 0 0 0.35rem; }
    .times { display: flex; justify-content: space-between; font-size: 0.65rem; color: var(--muted); margin-bottom: 0.35rem; font-variant-numeric: tabular-nums; }
    .controls { display: grid; grid-template-columns: 1fr 1fr 1.25fr 1fr 1fr; gap: 0.35rem; }
    button {
      min-height: 52px; border: none; border-radius: 10px;
      background: #21262d; color: var(--text);
      font-size: 0.72rem; font-weight: 700;
      touch-action: manipulation;
    }
    button:active { transform: scale(0.96); }
    button.primary { background: var(--accent); color: #fff; font-size: 0.82rem; }
    .err { color: #f85149; font-size: 0.75rem; margin-top: 0.5rem; }
  </style>
</head>
<body>
  <div class="app">
    <header>
      <h1>${escHtml(manifest.title)}</h1>
      <p>${escHtml(manifest.subtitle)}</p>
      <select id="chapterSelect" aria-label="Chapter"></select>
    </header>
    <main>
      <h2 class="chapter-title" id="chapterTitle">Loading…</h2>
      <p class="chapter-meta" id="chapterMeta"></p>
      <div class="transcript" id="transcript"></div>
      <p class="err" id="statusErr" hidden></p>
    </main>
    <div class="player">
      <input type="range" id="seek" min="0" max="100" value="0" step="0.1" aria-label="Seek" />
      <div class="times"><span id="timeCur">0:00</span><span id="timeTot">0:00</span></div>
      <div class="controls">
        <button type="button" id="btnPrev">◀ Prev</button>
        <button type="button" id="btnBack">−5s</button>
        <button type="button" class="primary" id="btnPlay">▶ Play</button>
        <button type="button" id="btnFwd">+10s</button>
        <button type="button" id="btnNext">Next ▶</button>
      </div>
    </div>
  </div>
  <audio id="audio" playsinline preload="metadata"></audio>
  <script type="application/json" id="manifest-inline">${manifestInline.replace(/</g, "\\u003c")}</script>
  <script>
    let manifest = null;
    let idx = 0;
    const audio = document.getElementById("audio");
    const seek = document.getElementById("seek");
    const sel = document.getElementById("chapterSelect");
    const fmt = (s) => {
      if (!isFinite(s) || s < 0) return "0:00";
      const m = Math.floor(s / 60), sec = Math.floor(s % 60);
      return m + ":" + String(sec).padStart(2, "0");
    };
    function audioPath(id) { return "audio/" + id + ".mp3"; }
    function showErr(msg) {
      const el = document.getElementById("statusErr");
      el.hidden = !msg;
      el.textContent = msg || "";
    }
    function loadChapter(i, autoplay) {
      idx = Math.max(0, Math.min(i, manifest.chapters.length - 1));
      const ch = manifest.chapters[idx];
      sel.value = String(idx);
      document.getElementById("chapterTitle").textContent = ch.title;
      document.getElementById("chapterMeta").textContent = "Chapter " + (idx + 1) + " of " + manifest.chapters.length;
      document.getElementById("transcript").textContent = ch.text;
      window.scrollTo({ top: 0, behavior: "smooth" });
      showErr("");
      audio.pause();
      audio.src = audioPath(ch.id);
      audio.load();
      if (autoplay) {
        audio.play().catch(() => showErr("Tap Play to start audio (phone requires a tap)."));
      }
    }
    function syncPlay() {
      document.getElementById("btnPlay").textContent = audio.paused ? "▶ Play" : "⏸ Pause";
    }
    audio.addEventListener("timeupdate", () => {
      if (!audio.duration) return;
      seek.value = (100 * audio.currentTime / audio.duration);
      document.getElementById("timeCur").textContent = fmt(audio.currentTime);
    });
    audio.addEventListener("loadedmetadata", () => {
      document.getElementById("timeTot").textContent = fmt(audio.duration);
    });
    audio.addEventListener("play", syncPlay);
    audio.addEventListener("pause", syncPlay);
    audio.addEventListener("ended", () => {
      if (idx < manifest.chapters.length - 1) loadChapter(idx + 1, true);
    });
    audio.addEventListener("error", () => showErr("Audio failed to load. Redeploy or check network."));
    seek.addEventListener("input", () => {
      if (audio.duration) audio.currentTime = (seek.value / 100) * audio.duration;
    });
    document.getElementById("btnPlay").onclick = () => {
      if (audio.paused) audio.play().catch(() => showErr("Tap Play again."));
      else audio.pause();
    };
    document.getElementById("btnBack").onclick = () => { audio.currentTime = Math.max(0, audio.currentTime - 5); };
    document.getElementById("btnFwd").onclick = () => {
      if (audio.duration) audio.currentTime = Math.min(audio.duration, audio.currentTime + 10);
    };
    document.getElementById("btnPrev").onclick = () => loadChapter(idx - 1, true);
    document.getElementById("btnNext").onclick = () => loadChapter(idx + 1, true);
    sel.onchange = () => loadChapter(Number(sel.value), true);
    async function init() {
      try {
        const res = await fetch("manifest.json");
        manifest = await res.json();
      } catch {
        manifest = JSON.parse(document.getElementById("manifest-inline").textContent);
      }
      manifest.chapters.forEach((ch, i) => {
        const o = document.createElement("option");
        o.value = String(i);
        o.textContent = ch.title;
        sel.appendChild(o);
      });
      loadChapter(0, false);
    }
    init();
  </script>
</body>
</html>`;

fs.mkdirSync(AUDIO_OUT, { recursive: true });

if (!fs.existsSync(AUDIO_SRC)) {
  throw new Error(`Missing ${AUDIO_SRC} — run npm run interview:3m:audio first`);
}

for (const f of fs.readdirSync(AUDIO_SRC)) {
  if (!f.endsWith(".mp3")) continue;
  fs.copyFileSync(path.join(AUDIO_SRC, f), path.join(AUDIO_OUT, f));
}

fs.copyFileSync(MANIFEST, path.join(OUT, "manifest.json"));
fs.writeFileSync(path.join(OUT, "player.html"), playerHtml, "utf8");
fs.writeFileSync(
  path.join(OUT, "index.html"),
  `<!DOCTYPE html><html><head><meta http-equiv="refresh" content="0;url=player.html"/><title>3M Interview</title></head><body><a href="player.html">Open player</a></body></html>`,
  "utf8"
);

const mp3Count = fs.readdirSync(AUDIO_OUT).filter((f) => f.endsWith(".mp3")).length;
console.log(
  JSON.stringify(
    {
      ok: true,
      out: OUT,
      mp3Count,
      localUrl: "http://127.0.0.1:3000/interview-prep/3m/player.html",
      prodUrl: "https://ironframegrc.com/interview-prep/3m/player.html",
    },
    null,
    2
  )
);
