/**
 * Build a single-file mobile interview ebook (embedded MP3, no server required).
 * Usage: node scripts/dev/build-3m-interview-ebook.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "../..");
const PREP = path.join(ROOT, "docs/interview-prep/3m");
const MANIFEST = path.join(PREP, "manifest.json");
const AUDIO_DIR = path.join(PREP, "audio");
const OUT = path.join(PREP, "3m-interview-ebook-mobile.html");

const manifest = JSON.parse(fs.readFileSync(MANIFEST, "utf8"));

const chapters = manifest.chapters.map((ch) => {
  const mp3 = path.join(AUDIO_DIR, `${ch.id}.mp3`);
  if (!fs.existsSync(mp3)) {
    throw new Error(`Missing ${mp3} — run npm run interview:3m:audio first`);
  }
  const b64 = fs.readFileSync(mp3).toString("base64");
  return {
    id: ch.id,
    title: ch.title,
    text: ch.text,
    audio: `data:audio/mpeg;base64,${b64}`,
  };
});

const payload = JSON.stringify({
  title: manifest.title,
  subtitle: manifest.subtitle,
  chapters,
});

const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover" />
  <meta name="apple-mobile-web-app-capable" content="yes" />
  <meta name="apple-mobile-web-app-title" content="3M Interview Prep" />
  <title>3M Interview Prep — Mobile Ebook</title>
  <style>
    :root {
      --bg: #0d1117;
      --paper: #161b22;
      --text: #e6edf3;
      --muted: #8b949e;
      --accent: #c8102e;
      --bar-h: 88px;
      --safe-b: env(safe-area-inset-bottom, 0px);
    }
    * { box-sizing: border-box; -webkit-tap-highlight-color: transparent; }
    html, body { margin: 0; height: 100%; background: var(--bg); color: var(--text); font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
    .app { display: flex; flex-direction: column; min-height: 100%; min-height: 100dvh; }
    header {
      padding: 0.75rem 1rem 0.5rem;
      padding-top: max(0.75rem, env(safe-area-inset-top));
      background: var(--paper);
      border-bottom: 1px solid #30363d;
      position: sticky; top: 0; z-index: 10;
    }
    header h1 { font-size: 0.85rem; margin: 0 0 0.2rem; font-weight: 700; }
    header p { margin: 0 0 0.5rem; font-size: 0.65rem; color: var(--muted); }
    select {
      width: 100%; font-size: 1rem; padding: 0.65rem;
      border-radius: 10px; border: 1px solid #30363d;
      background: var(--bg); color: var(--text);
    }
    main {
      flex: 1; overflow-y: auto; -webkit-overflow-scrolling: touch;
      padding: 1rem 1rem calc(var(--bar-h) + var(--safe-b) + 1rem);
    }
    .chapter-label { font-size: 0.7rem; color: var(--accent); font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; margin-bottom: 0.35rem; }
    .chapter-title { font-size: 1.15rem; font-weight: 700; line-height: 1.35; margin: 0 0 1rem; }
    .chapter-body { font-size: 1.05rem; line-height: 1.65; color: #c9d1d9; white-space: pre-wrap; }
    .hint { margin-top: 1.5rem; padding: 0.75rem; border-radius: 8px; background: rgba(200,16,46,0.1); border: 1px solid rgba(200,16,46,0.25); font-size: 0.75rem; color: var(--muted); line-height: 1.45; }
    .player {
      position: fixed; left: 0; right: 0; bottom: 0; z-index: 20;
      background: var(--paper); border-top: 1px solid #30363d;
      padding: 0.5rem 0.75rem calc(0.5rem + var(--safe-b));
    }
    .progress { width: 100%; height: 4px; background: #30363d; border-radius: 2px; margin-bottom: 0.5rem; overflow: hidden; }
    .progress > div { height: 100%; width: 0%; background: var(--accent); transition: width 0.1s linear; }
    .times { display: flex; justify-content: space-between; font-size: 0.65rem; color: var(--muted); margin-bottom: 0.4rem; font-variant-numeric: tabular-nums; }
    .controls { display: grid; grid-template-columns: 1fr 1fr 1.2fr 1fr 1fr; gap: 0.4rem; }
    button {
      min-height: 48px; border: none; border-radius: 10px;
      background: #21262d; color: var(--text);
      font-size: 0.72rem; font-weight: 700; cursor: pointer;
      touch-action: manipulation;
    }
    button:active { transform: scale(0.97); }
    button.primary { background: var(--accent); color: #fff; font-size: 0.85rem; }
    button:disabled { opacity: 0.35; }
  </style>
</head>
<body>
  <div class="app">
    <header>
      <h1 id="bookTitle">3M Interview Prep</h1>
      <p id="bookSub">Mobile ebook · offline audio</p>
      <select id="chapterSelect" aria-label="Chapter"></select>
    </header>
    <main>
      <div class="chapter-label" id="metaLabel"></div>
      <h2 class="chapter-title" id="chapterTitle"></h2>
      <div class="chapter-body" id="chapterBody"></div>
      <div class="hint">Tip: Save this file to your phone (Files / Downloads). Open in Safari or Chrome. Add to Home Screen for one-tap access. All audio is embedded — no internet needed.</div>
    </main>
    <div class="player">
      <div class="progress"><div id="progressBar"></div></div>
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
  <script>
    const BOOK = ${payload};
    let idx = 0;
    const audio = document.getElementById("audio");
    const sel = document.getElementById("chapterSelect");
    const fmt = (s) => {
      if (!isFinite(s) || s < 0) return "0:00";
      const m = Math.floor(s / 60), sec = Math.floor(s % 60);
      return m + ":" + String(sec).padStart(2, "0");
    };
    document.getElementById("bookTitle").textContent = BOOK.title;
    document.getElementById("bookSub").textContent = BOOK.subtitle + " · " + BOOK.chapters.length + " chapters";
    BOOK.chapters.forEach((c, i) => {
      const o = document.createElement("option");
      o.value = String(i);
      o.textContent = c.title;
      sel.appendChild(o);
    });
    function render(i, autoplay) {
      idx = Math.max(0, Math.min(i, BOOK.chapters.length - 1));
      const ch = BOOK.chapters[idx];
      sel.value = String(idx);
      document.getElementById("metaLabel").textContent = "Chapter " + (idx + 1) + " of " + BOOK.chapters.length;
      document.getElementById("chapterTitle").textContent = ch.title;
      document.getElementById("chapterBody").textContent = ch.text;
      window.scrollTo({ top: 0, behavior: "smooth" });
      audio.pause();
      audio.src = ch.audio;
      audio.load();
      document.getElementById("btnPlay").textContent = "▶ Play";
      if (autoplay) audio.play().catch(() => {});
    }
    function syncPlayBtn() {
      document.getElementById("btnPlay").textContent = audio.paused ? "▶ Play" : "⏸ Pause";
    }
    audio.addEventListener("timeupdate", () => {
      if (!audio.duration) return;
      document.getElementById("progressBar").style.width = (100 * audio.currentTime / audio.duration) + "%";
      document.getElementById("timeCur").textContent = fmt(audio.currentTime);
    });
    audio.addEventListener("loadedmetadata", () => {
      document.getElementById("timeTot").textContent = fmt(audio.duration);
    });
    audio.addEventListener("play", syncPlayBtn);
    audio.addEventListener("pause", syncPlayBtn);
    audio.addEventListener("ended", () => {
      if (idx < BOOK.chapters.length - 1) render(idx + 1, true);
    });
    document.getElementById("btnPlay").onclick = () => {
      if (audio.paused) audio.play(); else audio.pause();
    };
    document.getElementById("btnBack").onclick = () => {
      audio.currentTime = Math.max(0, audio.currentTime - 5);
    };
    document.getElementById("btnFwd").onclick = () => {
      if (audio.duration) audio.currentTime = Math.min(audio.duration, audio.currentTime + 10);
    };
    document.getElementById("btnPrev").onclick = () => render(idx - 1, true);
    document.getElementById("btnNext").onclick = () => render(idx + 1, true);
    sel.onchange = () => render(Number(sel.value), true);
    render(0, false);
  </script>
</body>
</html>`;

fs.writeFileSync(OUT, html, "utf8");
const mb = (fs.statSync(OUT).size / (1024 * 1024)).toFixed(2);
console.log(JSON.stringify({ ok: true, path: OUT, sizeMb: mb, chapters: chapters.length }, null, 2));
