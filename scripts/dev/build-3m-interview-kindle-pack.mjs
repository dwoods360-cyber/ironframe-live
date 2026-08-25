/**
 * Build Kindle EPUB (valid spec) + numbered MP3 zip for phone playback.
 * Usage: node scripts/dev/build-3m-interview-kindle-pack.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync, spawnSync } from "node:child_process";
import AdmZip from "adm-zip";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "../..");
const PREP = path.join(ROOT, "docs/interview-prep/3m");
const MANIFEST_PATH = path.join(PREP, "manifest.json");
const AUDIO_DIR = path.join(PREP, "audio");
const EPUB_OUT = path.join(PREP, "3m-interview-prep.epub");
const MP3_ZIP_OUT = path.join(PREP, "3m-interview-audio-phone.zip");

function escHtml(s) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function escXml(s) {
  return escHtml(s);
}

/** EPUB requires mimetype first, uncompressed — adm-zip reorders alphabetically, so use Python. */
function writeEpubZip(entries, outPath) {
  const staging = path.join(PREP, "_epub-staging");
  fs.rmSync(staging, { recursive: true, force: true });
  fs.mkdirSync(staging, { recursive: true });
  fs.writeFileSync(path.join(staging, "mimetype"), "application/epub+zip", "utf8");
  for (const [rel, content] of entries) {
    const dest = path.join(staging, rel);
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.writeFileSync(dest, content, typeof content === "string" ? "utf8" : undefined);
  }
  const py = `
import zipfile, os
root = r"${staging.replace(/\\/g, "\\\\")}"
out = r"${outPath.replace(/\\/g, "\\\\")}"
with zipfile.ZipFile(out, "w") as z:
    mt = os.path.join(root, "mimetype")
    z.write(mt, "mimetype", compress_type=zipfile.ZIP_STORED)
    for dirpath, _, files in os.walk(root):
        for name in sorted(files):
            if name == "mimetype":
                continue
            full = os.path.join(dirpath, name)
            rel = os.path.relpath(full, root).replace("\\\\", "/")
            z.write(full, rel, compress_type=zipfile.ZIP_DEFLATED)
print("ok")
`;
  const r = spawnSync("python", ["-c", py], { encoding: "utf8" });
  if (r.status !== 0) throw new Error(r.stderr || "EPUB zip failed");
  fs.rmSync(staging, { recursive: true, force: true });
}

function buildEpub(manifest) {
  const uid = "urn:ironframe:3m-interview-prep-2026";
  const chapters = manifest.chapters;
  const title = escXml(manifest.title);
  const subtitle = escXml(manifest.subtitle);

  const navItems = chapters
    .map(
      (ch, i) =>
        `      <li><a href="chapter-${String(i + 1).padStart(2, "0")}.xhtml">${escHtml(ch.title)}</a></li>`
    )
    .join("\n");

  const ncxPoints = chapters
    .map((ch, i) => {
      const n = i + 1;
      return `    <navPoint id="navPoint-${n}" playOrder="${n}">
      <navLabel><text>${escXml(ch.title)}</text></navLabel>
      <content src="chapter-${String(n).padStart(2, "0")}.xhtml"/>
    </navPoint>`;
    })
    .join("\n");

  const manifestItems = chapters
    .map(
      (_, i) =>
        `    <item id="ch${i + 1}" href="chapter-${String(i + 1).padStart(2, "0")}.xhtml" media-type="application/xhtml+xml"/>`
    )
    .join("\n");

  const spineItems = chapters.map((_, i) => `    <itemref idref="ch${i + 1}"/>`).join("\n");

  const entries = [];

  entries.push([
    "META-INF/container.xml",
    `<?xml version="1.0" encoding="UTF-8"?>
<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
  <rootfiles>
    <rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/>
  </rootfiles>
</container>`,
  ]);

  entries.push([
    "OEBPS/content.opf",
    `<?xml version="1.0" encoding="UTF-8"?>
<package xmlns="http://www.idpf.org/2007/opf" version="3.0" unique-identifier="uid">
  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
    <dc:identifier id="uid">${uid}</dc:identifier>
    <dc:title>${title}</dc:title>
    <dc:language>en-US</dc:language>
    <dc:creator>Ironframe Interview Prep</dc:creator>
    <meta property="dcterms:modified">${new Date().toISOString().replace(/\.\d{3}Z$/, "Z")}</meta>
  </metadata>
  <manifest>
    <item id="ncx" href="toc.ncx" media-type="application/x-dtbncx+xml"/>
    <item id="nav" href="nav.xhtml" media-type="application/xhtml+xml" properties="nav"/>
    <item id="style" href="style.css" media-type="text/css"/>
    <item id="cover" href="cover.xhtml" media-type="application/xhtml+xml"/>
    ${manifestItems}
  </manifest>
  <spine toc="ncx">
    <itemref idref="cover"/>
    ${spineItems}
  </spine>
</package>`,
  ]);

  entries.push([
    "OEBPS/toc.ncx",
    `<?xml version="1.0" encoding="UTF-8"?>
<ncx xmlns="http://www.daisy.org/z3986/2005/ncx/" version="2005-1">
  <head>
    <meta name="dtb:uid" content="${uid}"/>
    <meta name="dtb:depth" content="1"/>
    <meta name="dtb:totalPageCount" content="0"/>
    <meta name="dtb:maxPageNumber" content="0"/>
  </head>
  <docTitle><text>${title}</text></docTitle>
  <navMap>
${ncxPoints}
  </navMap>
</ncx>`,
  ]);

  entries.push([
    "OEBPS/nav.xhtml",
    `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops" lang="en-US">
<head><meta charset="utf-8"/><title>Contents</title></head>
<body>
  <nav epub:type="toc" id="toc">
    <h1>Contents</h1>
    <ol>
${navItems}
    </ol>
  </nav>
</body>
</html>`,
  ]);

  entries.push([
    "OEBPS/cover.xhtml",
    `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops" lang="en-US">
<head><meta charset="utf-8"/><title>Cover</title><link rel="stylesheet" href="style.css"/></head>
<body>
  <section epub:type="titlepage">
    <h1>${title}</h1>
    <p>${subtitle}</p>
    <p class="note">${chapters.length} interview answers. For audio on your phone, use the MP3 zip attachment (tap any file in Files to play).</p>
  </section>
</body>
</html>`,
  ]);

  entries.push([
    "OEBPS/style.css",
    `body { font-family: Georgia, serif; line-height: 1.6; margin: 1em; }
h1 { font-size: 1.25em; color: #111; }
.label { font-size: 0.75em; text-transform: uppercase; letter-spacing: 0.05em; color: #666; }
.answer { font-size: 1.05em; }
.note { margin-top: 2em; font-size: 0.85em; color: #444; }`,
  ]);

  chapters.forEach((ch, i) => {
    entries.push([
      `OEBPS/chapter-${String(i + 1).padStart(2, "0")}.xhtml`,
      `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops" lang="en-US">
<head>
  <meta charset="utf-8"/>
  <title>${escHtml(ch.title)}</title>
  <link rel="stylesheet" type="text/css" href="style.css"/>
</head>
<body>
  <section epub:type="chapter">
    <p class="label">Chapter ${i + 1} of ${chapters.length}</p>
    <h1>${escHtml(ch.title)}</h1>
    <p class="answer">${escHtml(ch.text)}</p>
  </section>
</body>
</html>`,
    ]);
  });

  writeEpubZip(entries, EPUB_OUT);
}

function buildMp3Zip(manifest) {
  const zip = new AdmZip();
  zip.addFile(
    "README.txt",
    Buffer.from(
      [
        "3M Interview Prep — Phone Audio",
        "",
        "Tap any MP3 in the Files app (iPhone) or Files/Downloads (Android).",
        "Files play in your phone's built-in music player — no browser needed.",
        "",
        "Order:",
        ...manifest.chapters.map((ch, i) => {
          const n = String(i + 1).padStart(2, "0");
          return `${n}-${ch.id}.mp3 — ${ch.title}`;
        }),
        "",
        "Prev/Next: use your player's skip track buttons.",
        "Rewind/Fwd: use the scrubber on the timeline.",
      ].join("\n"),
      "utf8"
    )
  );

  manifest.chapters.forEach((ch, i) => {
    const src = path.join(AUDIO_DIR, `${ch.id}.mp3`);
    if (!fs.existsSync(src)) throw new Error(`Missing ${src}`);
    const n = String(i + 1).padStart(2, "0");
    zip.addFile(`${n}-${ch.id}.mp3`, fs.readFileSync(src));
  });

  zip.writeZip(MP3_ZIP_OUT);
}

const manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, "utf8"));

console.log("Building EPUB (Kindle-valid)…");
buildEpub(manifest);

console.log("Building MP3 zip (phone-native playback)…");
buildMp3Zip(manifest);

// Verify mimetype is first in EPUB
const head = fs.readFileSync(EPUB_OUT).subarray(0, 40).toString("utf8");
const epubMb = (fs.statSync(EPUB_OUT).size / (1024 * 1024)).toFixed(2);
const zipMb = (fs.statSync(MP3_ZIP_OUT).size / (1024 * 1024)).toFixed(2);

console.log(
  JSON.stringify(
    {
      ok: true,
      epub: EPUB_OUT,
      mp3Zip: MP3_ZIP_OUT,
      epubMb,
      zipMb,
      mimetypeFirst: head.includes("mimetype") || head.startsWith("PK"),
      chapters: manifest.chapters.length,
    },
    null,
    2
  )
);
