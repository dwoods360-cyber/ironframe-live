#!/usr/bin/env python3
"""Synthesize founder elevator-pitch practice audio via Microsoft Edge TTS.

Registers:
  commercial (default) — founder-elevator-pitch*
  casual — founder-elevator-pitch-casual*

Source markdown:
  docs/sales/founder-elevator-pitch-audio-script.md
  docs/sales/founder-elevator-pitch-casual-audio-script.md
"""

from __future__ import annotations

import argparse
import asyncio
import json
import re
import sys
import tempfile
from pathlib import Path

SCRIPTS_DIR = Path(__file__).resolve().parent
sys.path.insert(0, str(SCRIPTS_DIR))

import edge_tts

from spoken_narration import (
    assert_spoken_narration_safe,
    extract_narration_segments,
)

ROOT = Path(__file__).resolve().parents[1]
OUT_DIR = ROOT / "public" / "training-audio"
VOICE = "en-US-GuyNeural"
RATE = "-5%"

REGISTERS = {
    "commercial": {
        "script": ROOT / "docs/sales/founder-elevator-pitch-audio-script.md",
        "stem": "founder-elevator-pitch",
    },
    "casual": {
        "script": ROOT / "docs/sales/founder-elevator-pitch-casual-audio-script.md",
        "stem": "founder-elevator-pitch-casual",
    },
}

_SENTENCE_SPLIT = re.compile(r"(?<=[.!?])\s+(?=[A-Z\"“])")


def split_sentences(text: str) -> list[str]:
    cleaned = re.sub(r"\s+", " ", text).strip()
    if not cleaned:
        return []
    parts = _SENTENCE_SPLIT.split(cleaned)
    return [part.strip() for part in parts if part.strip()]


def load_sentence_units(script: Path) -> list[str]:
    markdown = script.read_text(encoding="utf-8")
    segments = extract_narration_segments(markdown)
    if not segments:
        raise ValueError(f"No spoken narration extracted from {script.relative_to(ROOT)}")

    sentences: list[str] = []
    for text, _pause in segments:
        assert_spoken_narration_safe(text)
        units = split_sentences(text)
        if not units:
            raise ValueError(f"Segment produced no sentences: {text!r}")
        sentences.extend(units)
    return sentences


async def synthesize_plain_segment(text: str, output: Path) -> None:
    communicate = edge_tts.Communicate(text, VOICE, rate=RATE)
    await communicate.save(str(output))


async def synthesize_register(register: str) -> None:
    cfg = REGISTERS[register]
    script: Path = cfg["script"]
    stem: str = cfg["stem"]
    sentence_dir = OUT_DIR / f"{stem}-sentences"
    manifest_path = OUT_DIR / f"{stem}-sentences.json"
    full_output = OUT_DIR / f"{stem}.mp3"
    public_sentence_prefix = f"/training-audio/{stem}-sentences"
    public_full = f"/training-audio/{stem}.mp3"

    sentences = load_sentence_units(script)
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    if sentence_dir.exists():
        for stale in sentence_dir.glob("*.mp3"):
            stale.unlink()
    sentence_dir.mkdir(parents=True, exist_ok=True)

    mp3_parts: list[bytes] = []
    manifest_sentences: list[dict[str, object]] = []

    with tempfile.TemporaryDirectory(prefix=f"ironframe-founder-pitch-{register}-") as tmp_dir:
        tmp = Path(tmp_dir)
        for index, text in enumerate(sentences):
            part_path = tmp / f"part-{index:03d}.mp3"
            await synthesize_plain_segment(text, part_path)
            blob = part_path.read_bytes()
            mp3_parts.append(blob)

            dest = sentence_dir / f"{index:03d}.mp3"
            dest.write_bytes(blob)
            manifest_sentences.append(
                {
                    "index": index,
                    "text": text,
                    "src": f"{public_sentence_prefix}/{index:03d}.mp3",
                }
            )

    full_output.write_bytes(b"".join(mp3_parts))
    manifest = {
        "version": 1,
        "register": register,
        "voice": VOICE,
        "rate": RATE,
        "audioFull": public_full,
        "sentenceCount": len(manifest_sentences),
        "sentences": manifest_sentences,
    }
    manifest_path.write_text(json.dumps(manifest, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")

    print(
        f"wrote {full_output.relative_to(ROOT)} "
        f"({full_output.stat().st_size:,} bytes, {len(sentences)} sentence(s), register={register})"
    )
    print(f"wrote {manifest_path.relative_to(ROOT)}")


async def main() -> int:
    parser = argparse.ArgumentParser(description="Synthesize founder pitch practice audio")
    parser.add_argument(
        "--register",
        choices=sorted(REGISTERS.keys()),
        default="commercial",
        help="commercial = catalog register; casual = peer register",
    )
    args = parser.parse_args()
    await synthesize_register(args.register)
    return 0


if __name__ == "__main__":
    raise SystemExit(asyncio.run(main()))
