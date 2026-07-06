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
"""

from __future__ import annotations

import asyncio
import re
from pathlib import Path

import edge_tts

ROOT = Path(__file__).resolve().parents[1]
OUT_DIR = ROOT / "public" / "training-audio"
STEPS_DIR = OUT_DIR / "steps"
VOICE = "en-US-AriaNeural"
RATE = "-5%"
SSML_NS = "http://www.w3.org/2001/10/synthesis"

# Spoken copy only — pauses via SSML <break>, never "Pause N seconds." prose.
WELCOME_TEXT = """
Welcome to Ironframe. Your workspace is now active. You have successfully signed in as an operator.
<break time="2s"/>
This brief welcome plays once. It prepares you for your guided training. You will soon begin the Get Started checklist.
This includes Command Post orientation, primary control areas, and initial dashboard review. You will also learn about audit exports.
<break time="1s"/>
Take a moment to settle in. Your first guided step will begin shortly.
You can replay this welcome or any training narration from the Get Started portal.
""".strip()

ORIENTATION_TEXT = """
Welcome to the Ironframe Command Post. You are signed in to your assigned workspace.
This walkthrough covers the Command Post layout and first tasks on the Get Started portal.
Invite and credential steps were handled during activation. We focus on orientation only.
<break time="2s"/>
Use the top navigation bar: Dashboard Cockpit, Integrity Hub, Evidence Locker, and Documentation.
Your active tenant window shows which workspace you are viewing.
On the left, Financial Targets show your safe baselines. On the right, the Hazard Pipeline tracks real-time risks.
Press Tab to move between controls. Charts include text summaries for screen readers.
<break time="2s"/>
The Get Started portal tracks five steps:
Command Post orientation,
Integrity Hub and ALE baselines,
Level 1 training track,
Trainer agent sandbox,
and Audit export path.
<break time="1s"/>
Integrity Hub holds financial risk scores and protection baselines.
Workforce Cockpit shows automated safety sweeps and agent activity trails.
Evidence Locker stores sealed compliance documents.
Documentation holds Level 1 manuals and training tracks.
Settings holds tenant configuration and contacts.
<break time="2s"/>
The first step is Command Post orientation.
Review the Command Post layout, primary control areas, and keyboard navigation.
Invite steps are handled separately in your activation email.
<break time="2s"/>
Open Integrity Hub from the checklist or top navigation.
Confirm your tenant name and baseline figures. These figures are displayed in US dollars.
<break time="2s"/>
Open the twenty-four-chapter Level 1 student index from the checklist.
This curriculum includes labs tailored for your role. Work chapters in order when you have time.
<break time="1s"/>
Use Ask Trainer from Header number one or the panel on Get Started.
You can ask questions grounded on the verified Level 1 corpus in multi-turn sessions.
<break time="2s"/>
Open Dashboard Exports from the checklist.
Locate tenant-scoped CSV and PDF export actions for auditor handoff.
<break time="2s"/>
Replay this audio while you complete the checklist. Progress saves in your browser.
For deeper first-week tasks, open the extended onboarding checklist in Documentation.
""".strip()

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

_PAUSE_LINE = re.compile(
    r"^\s*Pause\s+(?:one|two|three|\d+)\s+seconds?\.?\s*$",
    re.IGNORECASE | re.MULTILINE,
)
_BREAK_TAG = re.compile(r"<break\s+time=\"\d+s\"\s*/>", re.IGNORECASE)


def strip_spoken_pause_lines(text: str) -> str:
    """Remove 'Pause N seconds.' script directions — never spoken in TTS."""
    cleaned = _PAUSE_LINE.sub("", text)
    return re.sub(r"\n{3,}", "\n\n", cleaned).strip()


def to_ssml(spoken: str) -> str:
    """Wrap narration in SSML so <break> renders as silence, not spoken text."""
    body = strip_spoken_pause_lines(spoken)
    if body.startswith("<speak"):
        return body
    return (
        f'<speak version="1.0" xmlns="{SSML_NS}" xml:lang="en-US">'
        f"{body}</speak>"
    )


async def synthesize(text: str, output: Path) -> None:
    output.parent.mkdir(parents=True, exist_ok=True)
    ssml = to_ssml(text)
    if not _BREAK_TAG.search(ssml) and "<break" not in ssml.lower():
        # No pauses — plain text avoids SSML parser overhead.
        payload = strip_spoken_pause_lines(text)
    else:
        payload = ssml
    communicate = edge_tts.Communicate(payload, VOICE, rate=RATE)
    await communicate.save(str(output))
    size = output.stat().st_size
    print(f"wrote {output.relative_to(ROOT)} ({size:,} bytes)")


async def main() -> int:
    await synthesize(WELCOME_TEXT, OUT_DIR / "get-started-welcome.mp3")
    await synthesize(ORIENTATION_TEXT, OUT_DIR / "get-started-orientation.mp3")
    for step_id, text in STEP_TEXT.items():
        await synthesize(text, STEPS_DIR / f"{step_id}.mp3")
    return 0


if __name__ == "__main__":
    raise SystemExit(asyncio.run(main()))
