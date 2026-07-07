"""Extract operator-facing spoken narration from Get Started audio script markdown."""

from __future__ import annotations

import re
import sys

_PAUSE_LINE = re.compile(
    r"^\s*Pause\s+(one|two|three|\d+)\s+seconds?\.?\s*$",
    re.IGNORECASE,
)
_BREAK_TAG = re.compile(r'<break\s+time="(\d+)s"\s*/>', re.IGNORECASE)
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
    "<break",
    "xmlns",
    'version="1.0"',
    "ref: GET",
)

NarrationSegment = tuple[str, float]


def pause_line_to_seconds(line: str) -> float | None:
    match = _PAUSE_LINE.match(line.strip())
    if not match:
        return None
    token = match.group(1).lower()
    if token.isdigit():
        return float(int(token))
    return float(_WORD_TO_SEC.get(token, 1))


def extract_script_section(markdown: str) -> str:
    match = re.search(r"^## Script\s*$([\s\S]*?)(?=^## |\Z)", markdown, re.MULTILINE)
    return match.group(1) if match else ""


def extract_narration_segments(markdown: str) -> list[NarrationSegment]:
    """Return plain-text narration segments with optional pause seconds after each."""
    section = extract_script_section(markdown)
    if not section:
        return []

    section = _FENCE.sub(" ", section)
    segments: list[NarrationSegment] = []
    paragraph: list[str] = []

    def flush(pause_after: float = 0.0) -> None:
        if not paragraph:
            return
        text = " ".join(paragraph)
        text = re.sub(r"`([^`]+)`", r"\1", text)
        text = re.sub(r"\*\*([^*]+)\*\*", r"\1", text)
        text = re.sub(r"\*([^*]+)\*", r"\1", text)
        text = re.sub(r"\s+", " ", text).strip()
        paragraph.clear()
        if text and text != "---":
            segments.append((text, pause_after))

    for raw_line in section.splitlines():
        line = raw_line.strip()
        if not line:
            continue
        if line == "---":
            flush(0.0)
            continue
        if _SECTION_HEADER.match(line):
            continue
        if _SOURCE_FILE.match(line) or _REF_LINE.match(line):
            continue
        if line.startswith("|") or line.startswith("- [ ]"):
            continue

        pause_seconds = pause_line_to_seconds(line)
        if pause_seconds is not None:
            flush(pause_seconds)
            continue

        numbered = re.match(r"^\d+\.\s+(.*)$", line)
        if numbered:
            line = numbered.group(1).strip()
        if line:
            paragraph.append(line)

    flush(0.0)
    return segments


def parse_inline_break_segments(text: str) -> list[NarrationSegment]:
    """Split legacy inline `<break time=\"Ns\"/>` markers into plain segments."""
    segments: list[NarrationSegment] = []
    pos = 0
    for match in _BREAK_TAG.finditer(text):
        chunk = text[pos : match.start()].strip()
        pause = float(match.group(1))
        if chunk:
            segments.append((chunk, pause))
        elif segments:
            prev_text, prev_pause = segments[-1]
            segments[-1] = (prev_text, prev_pause + pause)
        pos = match.end()
    tail = text[pos:].strip()
    if tail:
        segments.append((tail, 0.0))
    if not segments and text.strip():
        cleaned = _BREAK_TAG.sub(" ", text)
        cleaned = re.sub(r"\s+", " ", cleaned).strip()
        if cleaned:
            segments.append((cleaned, 0.0))
    return segments


def extract_spoken_narration(markdown: str) -> str:
    """Flatten narration segments for validation/logging — never fed to TTS with markup."""
    return " ".join(text for text, _pause in extract_narration_segments(markdown))


def assert_spoken_narration_safe(text: str) -> None:
    lowered = text.lower()
    for fragment in FORBIDDEN_SPOKEN_FRAGMENTS:
        if fragment.lower() in lowered:
            raise ValueError(f"spoken narration contains forbidden fragment: {fragment!r}")
    if "<" in text or ">" in text:
        raise ValueError("spoken narration must not contain XML/markup")


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
    segments = extract_narration_segments(sample)
    assert segments[0][0] == "Welcome to Ironframe."
    assert segments[0][1] == 2.0
    assert segments[1][0] == "Use the Command Post."
    assert segments[1][1] == 1.0
    spoken = extract_spoken_narration(sample)
    assert "Welcome to Ironframe" in spoken
    assert "Use the Command Post" in spoken
    assert "source-file" not in spoken
    assert "Pause two" not in spoken
    assert "const x" not in spoken
    assert_spoken_narration_safe(spoken)

    inline = parse_inline_break_segments('Hello.<break time="1s"/>World.')
    assert inline == [("Hello.", 1.0), ("World.", 0.0)]
    print("spoken_narration self-test ok")


if __name__ == "__main__":
    if "--self-test" in sys.argv:
        _self_test()
    else:
        print(extract_spoken_narration(sys.stdin.read()))
