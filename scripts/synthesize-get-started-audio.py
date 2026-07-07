#!/usr/bin/env python3
"""Synthesize Get Started narration MP3s via Microsoft Edge TTS (edge-tts).

Outputs:
  public/training-audio/get-started-welcome.mp3
  public/training-audio/get-started-orientation.mp3
  public/training-audio/steps/{stepId}.mp3

Source scripts:
  docs/user-manuals/get-started-welcome-audio-script.md
  docs/user-manuals/get-started-orientation-audio-script.md

Pause handling:
  - Script "Pause N seconds." production notes must never be spoken.
  - <break time="Ns"/> is SSML silence only (requires <speak> wrapper).
  - source-file / ref / code fences must never reach TTS input.
"""

from __future__ import annotations

import asyncio
import re
import sys
from pathlib import Path

SCRIPTS_DIR = Path(__file__).resolve().parent
sys.path.insert(0, str(SCRIPTS_DIR))

import edge_tts

from spoken_narration import assert_spoken_narration_safe, extract_spoken_narration

ROOT = Path(__file__).resolve().parents[1]
OUT_DIR = ROOT / "public" / "training-audio"
STEPS_DIR = OUT_DIR / "steps"
VOICE = "en-US-AriaNeural"
RATE = "-5%"
SSML_NS = "http://www.w3.org/2001/10/synthesis"

WELCOME_SCRIPT = ROOT / "docs/user-manuals/get-started-welcome-audio-script.md"
ORIENTATION_SCRIPT = ROOT / "docs/user-manuals/get-started-orientation-audio-script.md"

_BREAK_TAG = re.compile(r"<break\s+time=\"\d+s\"\s*/>", re.IGNORECASE)

# Step clips — spoken copy only; pauses via SSML <break>, never "Pause N seconds." prose.
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


def load_spoken_from_script(path: Path) -> str:
    markdown = path.read_text(encoding="utf-8")
    spoken = extract_spoken_narration(markdown)
    if not spoken:
        raise ValueError(f"No spoken narration extracted from {path.relative_to(ROOT)}")
    assert_spoken_narration_safe(spoken)
    return spoken


def to_ssml(spoken: str) -> str:
    """Wrap narration in SSML so <break> renders as silence, not spoken text."""
    body = spoken.strip()
    if body.startswith("<speak"):
        return body
    return (
        f'<speak version="1.0" xmlns="{SSML_NS}" xml:lang="en-US">'
        f"{body}</speak>"
    )


async def synthesize(text: str, output: Path) -> None:
    assert_spoken_narration_safe(text)
    output.parent.mkdir(parents=True, exist_ok=True)
    payload = to_ssml(text) if _BREAK_TAG.search(text) or "<break" in text.lower() else text.strip()
    communicate = edge_tts.Communicate(payload, VOICE, rate=RATE)
    await communicate.save(str(output))
    size = output.stat().st_size
    print(f"wrote {output.relative_to(ROOT)} ({size:,} bytes)")


async def main() -> int:
    welcome = load_spoken_from_script(WELCOME_SCRIPT)
    orientation = load_spoken_from_script(ORIENTATION_SCRIPT)

    await synthesize(welcome, OUT_DIR / "get-started-welcome.mp3")
    await synthesize(orientation, OUT_DIR / "get-started-orientation.mp3")
    for step_id, text in STEP_TEXT.items():
        assert_spoken_narration_safe(text)
        await synthesize(text, STEPS_DIR / f"{step_id}.mp3")
    return 0


if __name__ == "__main__":
    raise SystemExit(asyncio.run(main()))
