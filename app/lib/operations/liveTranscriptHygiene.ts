/**
 * Shared STT cleanup for LIVE desk / Ops Hub voice.
 * Applied after Gemini returns a chunk and again before recap analysis.
 */

const MONTH =
  "January|February|March|April|May|June|July|August|September|October|November|December";

/** Domain terms the LIVE mic often mangles — spelling hints only, never invent. */
export const WORKFLOW_REVIEW_STT_VOCAB = [
  "Textbelt",
  "Twilio",
  "Command Design Partner",
  "Path B",
  "Ironframe",
  "Ironleads",
  "SalesTeam",
  "Ops Hub",
  "workflow review",
  "design partner",
  "Command",
  "SMS",
  "DISPATCH",
  "Approvals",
] as const;

/**
 * Strip silence token + fix high-frequency Gemini STT mishears on short LIVE chunks.
 */
export function normalizeLiveTranscriptChunk(raw: string): string {
  let text = String(raw ?? "").replace(/\s+/g, " ").trim();
  if (!text) return "";

  // Model sometimes returns EMPTY alone or embeds it mid-utterance.
  if (/^empty$/i.test(text)) return "";
  text = text.replace(/\bEMPTY\b/gi, " ").replace(/\s+/g, " ").trim();
  text = text.replace(/\s*\.\s*\./g, ".").replace(/\s+/g, " ").trim();
  if (!text || /^empty$/i.test(text) || /^\.+$/.test(text)) return "";

  // SMS provider: "tax bill" / "taxbelt" / "text belt" → Textbelt
  text = text.replace(
    /\b(?:tax\s*belts?|tax\s*bills?|text\s*belts?|text\s*bills?|teks?\s*belts?)\b/gi,
    "Textbelt",
  );

  // "July 20 Fifth" (chunk-split 25th) → "July 25th"
  text = text.replace(
    new RegExp(`\\b(${MONTH})\\s+(\\d)\\s*0\\s+Fifth\\b`, "gi"),
    (_m, month: string, tens: string) => `${month} ${tens}5th`,
  );
  text = text.replace(
    new RegExp(`\\b(${MONTH})\\s+twenty[\\s-]?fifth\\b`, "gi"),
    (_m, month: string) => `${month} 25th`,
  );

  // Mild grammar cleanup that shows up in LIVE chunks
  text = text.replace(/\bThis is a our\b/gi, "This is our");
  text = text.replace(/\band decide that\b/gi, "and decided that");

  return text.replace(/\s+/g, " ").trim();
}

export function buildWorkflowReviewSttPrompt(): string {
  const vocab = WORKFLOW_REVIEW_STT_VOCAB.join(", ");
  return (
    "You are a speech-to-text engine for Ironframe Ops Hub LIVE calls.\n" +
    "Transcribe the audio verbatim with normal punctuation.\n" +
    "Rules:\n" +
    "- Return ONLY the spoken words. No apology, commentary, translation, labels, or summaries.\n" +
    "- Do not invent, complete, or continue the speaker's sentence with sales talk-track.\n" +
    "- Do not inject host phrases such as \"Command Design Partner\", \"Path B\", or " +
    '"workflow review" unless those exact words were clearly spoken in this clip.\n' +
    "- Preserve content nouns (clients, tenants, entities, users, seats). Never drop them.\n" +
    "- Prefer correct ordinals and vendor spellings when phonetically clear " +
    '(e.g. "July 25th" not "July 20 Fifth"; "Textbelt" not "tax bill").\n' +
    `- Spelling hints only when sounded: ${vocab}.\n` +
    "- If the audio is silent, music-only, or unintelligible, return exactly EMPTY and nothing else.\n" +
    "- Never place the word EMPTY inside a normal transcript."
  );
}
