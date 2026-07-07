"""Extract operator-facing spoken narration from Get Started audio script markdown."""

from __future__ import annotations

import re
import sys

_PAUSE_LINE = re.compile(
    r"^\s*Pause\s+(one|two|three|\d+)\s+seconds?\.?\s*$",
    re.IGNORECASE,
)
_SOURCE_FILE = re.compile(r"^\s*source-file:\s*.+$", re.IGNORECASE)
_REF_LINE = re.compile(r"^\s*ref:\s*.+$", re.IGNORECASE)
_SECTION_HEADER = re.compile(r"^###\s+\[[^\]]+\]\s+.+$")
_FENCE = re.compile(r"```[\s\S]*?```", re.MULTILINE)
_WORD_TO_SEC = {"one": 1, "two": 2, "three": 3}

FORBIDDEN_SPOKEN_FRAGMENTS = (
    "source-file:",
    "Pause one second",
    "Pause two seconds",
    "Pause three seconds",
    "```",
    "<speak",
    "ref: GET",
)


def pause_line_to_break(line: str) -> str | None:
    match = _PAUSE_LINE.match(line.strip())
    if not match:
        return None
    token = match.group(1).lower()
    if token.isdigit():
        secs = int(token)
    else:
        secs = _WORD_TO_SEC.get(token, 1)
    return f'<break time="{secs}s"/>'


def extract_script_section(markdown: str) -> str:
    match = re.search(r"^## Script\s*$([\s\S]*?)(?=^## |\Z)", markdown, re.MULTILINE)
    return match.group(1) if match else ""


def extract_spoken_narration(markdown: str) -> str:
    """Return spoken TTS copy only — no headers, metadata, pauses-as-prose, or code fences."""
    section = extract_script_section(markdown)
    if not section:
        return ""

    section = _FENCE.sub(" ", section)
    lines_out: list[str] = []

    for raw_line in section.splitlines():
        line = raw_line.strip()
        if not line:
            if lines_out and lines_out[-1] != "":
                lines_out.append("")
            continue
        if _SECTION_HEADER.match(line):
            continue
        if _SOURCE_FILE.match(line) or _REF_LINE.match(line):
            continue
        if line.startswith("|") or line.startswith("- [ ]"):
            continue
        pause_break = pause_line_to_break(line)
        if pause_break:
            lines_out.append(pause_break)
            continue
        numbered = re.match(r"^\d+\.\s+(.*)$", line)
        if numbered:
            line = numbered.group(1).strip()
        line = re.sub(r"`([^`]+)`", r"\1", line)
        line = re.sub(r"\*\*([^*]+)\*\*", r"\1", line)
        line = re.sub(r"\*([^*]+)\*", r"\1", line)
        if line:
            lines_out.append(line)

    text = "\n".join(lines_out)
    text = re.sub(r"[ \t]+\n", "\n", text)
    text = re.sub(r"\n{3,}", "\n\n", text).strip()
    return text


def assert_spoken_narration_safe(text: str) -> None:
    lowered = text.lower()
    for fragment in FORBIDDEN_SPOKEN_FRAGMENTS:
        if fragment.lower() in lowered:
            raise ValueError(f"spoken narration contains forbidden fragment: {fragment!r}")


def _self_test() -> None:
    sample = """
## Script

### [0:00] Open

Welcome to Ironframe.

Pause two seconds.

source-file: app/lib/getStartedSteps.ts

```typescript
const x = 1;
```

### [0:20] Layout

Use the Command Post.

Pause one second.
"""
    spoken = extract_spoken_narration(sample)
    assert "Welcome to Ironframe" in spoken
    assert "Use the Command Post" in spoken
    assert '<break time="2s"/>' in spoken
    assert "source-file" not in spoken
    assert "Pause two" not in spoken
    assert "const x" not in spoken
    assert_spoken_narration_safe(spoken)
    print("spoken_narration self-test ok")


if __name__ == "__main__":
    if "--self-test" in sys.argv:
        _self_test()
    else:
        print(extract_spoken_narration(sys.stdin.read()))
