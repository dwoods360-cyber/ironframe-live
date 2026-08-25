#!/usr/bin/env node
/**
 * Generate MP3 chapters for 3M interview prep player.
 * Requires: Python `edge-tts` (pip install edge-tts)
 *
 * Usage:
 *   node scripts/dev/generate-3m-interview-audio.mjs
 *   node scripts/dev/generate-3m-interview-audio.mjs --id q01
 */

import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "../..");
const PREP_DIR = path.join(ROOT, "docs/interview-prep/3m");
const MANIFEST_PATH = path.join(PREP_DIR, "manifest.json");
const AUDIO_DIR = path.join(PREP_DIR, "audio");

function readManifest() {
  const raw = fs.readFileSync(MANIFEST_PATH, "utf8");
  return JSON.parse(raw);
}

function runPythonEdgeTts({ text, voice, outPath }) {
  return new Promise((resolve, reject) => {
    const args = [
      "-m",
      "edge_tts",
      "--voice",
      voice,
      "--text",
      text,
      "--write-media",
      outPath,
    ];
    const child = spawn("python", args, { stdio: "inherit", shell: false });
    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`edge_tts exited ${code} for ${outPath}`));
    });
  });
}

async function main() {
  const onlyId = process.argv.includes("--id")
    ? process.argv[process.argv.indexOf("--id") + 1]
    : null;

  const manifest = readManifest();
  const voice = manifest.voice || "en-US-GuyNeural";
  fs.mkdirSync(AUDIO_DIR, { recursive: true });

  const chapters = onlyId
    ? manifest.chapters.filter((c) => c.id === onlyId)
    : manifest.chapters;

  if (chapters.length === 0) {
    console.error("No chapters matched.");
    process.exit(1);
  }

  console.log(`Generating ${chapters.length} chapter(s) with voice ${voice}…`);

  for (const chapter of chapters) {
    const outPath = path.join(AUDIO_DIR, `${chapter.id}.mp3`);
    if (fs.existsSync(outPath) && !process.argv.includes("--force")) {
      console.log(`Skip (exists): ${chapter.id}.mp3`);
      continue;
    }
    console.log(`→ ${chapter.id}.mp3 — ${chapter.title}`);
    await runPythonEdgeTts({ text: chapter.text, voice, outPath });
  }

  console.log("\nDone. Open docs/interview-prep/3m/player.html in a browser.");
  console.log("Tip: npx serve docs/interview-prep/3m  (or open player after audio/ is populated)");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
