#!/usr/bin/env python3
"""Synthesize Get Started narration MP3s via Microsoft Edge TTS (edge-tts).

Outputs:
  public/training-audio/get-started-welcome.mp3
  public/training-audio/get-started-orientation.mp3
  public/training-audio/steps/{stepId}.mp3

Source scripts:
  docs/user-manuals/get-started-welcome-audio-script.md
  docs/user-manuals/get-started-orientation-audio-script.md

TTS rules:
  - edge-tts escapes all input as plain text — never pass SSML/XML (it will be spoken aloud).
  - Pauses are implemented by synthesizing plain-text segments separately and concatenating MP3s.
  - source-file / ref / code fences must never reach TTS input.
"""

from __future__ import annotations

import asyncio
import re
import sys
import tempfile
from pathlib import Path

SCRIPTS_DIR = Path(__file__).resolve().parent
sys.path.insert(0, str(SCRIPTS_DIR))

import edge_tts

from spoken_narration import (
    NarrationSegment,
    assert_spoken_narration_safe,
    extract_narration_segments,
    parse_inline_break_segments,
)

ROOT = Path(__file__).resolve().parents[1]
OUT_DIR = ROOT / "public" / "training-audio"
STEPS_DIR = OUT_DIR / "steps"
VOICE = "en-US-AriaNeural"
RATE = "-5%"

WELCOME_SCRIPT = ROOT / "docs/user-manuals/get-started-welcome-audio-script.md"
ORIENTATION_SCRIPT = ROOT / "docs/user-manuals/get-started-orientation-audio-script.md"

# Step clips — plain text only; inline <break> markers are split before synthesis.
STEP_TEXT: dict[str, str] = {
    "quickstart": """
Welcome to the Ironframe Command Post. You are signed in to your assigned workspace.
This walkthrough covers the Command Post layout and first tasks on the Get Started portal.
<break time="1s"/>
Use the top navigation bar: Dashboard Cockpit, Integrity Hub, Evidence Locker, and Documentation.
Your active tenant window shows which workspace you are viewing.
On the left, Financial Targets show your safe baselines. On the right, the Hazard Pipeline tracks real-time risks.
<break time="1s"/>
The first step is Command Post orientation.
Review the Command Post layout, primary control areas, and keyboard navigation.
Invite steps were handled separately in your activation email.
""".strip(),
    "integrity-hub": """
Open Integrity Hub from the checklist or top navigation.
Confirm your tenant name and baseline figures. These figures are displayed in US dollars.
Integrity Hub holds financial risk scores and protection baselines for your workspace.
""".strip(),
    "level1-index": """
Open the twenty-four-chapter Level 1 student index from the checklist.
This curriculum includes labs tailored for your role. Work chapters in order when you have time.
Documentation holds Level 1 manuals and screenshot-backed training tracks.
""".strip(),
    "trainer-session": """
Use Ask Trainer from Header number one or the panel on Get Started.
You can ask questions grounded on the verified Level 1 corpus in multi-turn sessions.
The Trainer agent is isolated to the training corpus and does not access live tenant data.
""".strip(),
    "export-path": """
Open Dashboard Exports from the checklist.
Locate tenant-scoped CSV and PDF export actions for auditor handoff.
Exports are scoped to your active workspace and named for your tenant key.
""".strip(),
}

_BREAK_TAG = re.compile(r"<break\s+time=", re.IGNORECASE)


def load_segments_from_script(path: Path) -> list[NarrationSegment]:
    markdown = path.read_text(encoding="utf-8")
    segments = extract_narration_segments(markdown)
    if not segments:
        raise ValueError(f"No spoken narration extracted from {path.relative_to(ROOT)}")
    for text, _pause in segments:
        assert_spoken_narration_safe(text)
    return segments


def load_segments_from_inline_text(text: str) -> list[NarrationSegment]:
    segments = (
        parse_inline_break_segments(text)
        if _BREAK_TAG.search(text)
        else [(re.sub(r"\s+", " ", text).strip(), 0.0)]
    )
    for chunk, _pause in segments:
        assert_spoken_narration_safe(chunk)
    return segments


async def synthesize_plain_segment(text: str, output: Path) -> None:
    communicate = edge_tts.Communicate(text, VOICE, rate=RATE)
    await communicate.save(str(output))


async def synthesize_segments(segments: list[NarrationSegment], output: Path) -> None:
    output.parent.mkdir(parents=True, exist_ok=True)
    mp3_parts: list[bytes] = []

    with tempfile.TemporaryDirectory(prefix="ironframe-tts-") as tmp_dir:
        tmp = Path(tmp_dir)
        for index, (text, _pause) in enumerate(segments):
            part_path = tmp / f"part-{index:03d}.mp3"
            await synthesize_plain_segment(text, part_path)
            mp3_parts.append(part_path.read_bytes())

    output.write_bytes(b"".join(mp3_parts))
    size = output.stat().st_size
    print(f"wrote {output.relative_to(ROOT)} ({size:,} bytes, {len(segments)} segment(s))")


async def main() -> int:
    welcome_segments = load_segments_from_script(WELCOME_SCRIPT)
    orientation_segments = load_segments_from_script(ORIENTATION_SCRIPT)

    await synthesize_segments(welcome_segments, OUT_DIR / "get-started-welcome.mp3")
    await synthesize_segments(orientation_segments, OUT_DIR / "get-started-orientation.mp3")
    for step_id, text in STEP_TEXT.items():
        await synthesize_segments(load_segments_from_inline_text(text), STEPS_DIR / f"{step_id}.mp3")
    return 0


if __name__ == "__main__":
    raise SystemExit(asyncio.run(main()))
