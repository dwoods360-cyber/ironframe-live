/**
 * Browser speech for Ops Hub workforce replies.
 * Shares Ironboard voice keys + rate/pitch clamps + the same Jenny/Aria voice pack
 * (`ironboard_voice_speed` / `ironboard_voice_pitch`). Every worker uses one voice.
 */

import type { OpsChatTarget } from "@/app/lib/operations/opsWorkerIds";

/** Same storage keys as Ironboard Conversation voice sliders. */
export const IRONBOARD_VOICE_SPEED_KEY = "ironboard_voice_speed";
export const IRONBOARD_VOICE_PITCH_KEY = "ironboard_voice_pitch";

const VOICE_MUTE_KEY = "ironframe-ops-worker-voice-muted";

let cachedVoices: SpeechSynthesisVoice[] = [];

function safeStorageGet(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function safeStorageSet(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch {
    /* ignore */
  }
}

export function isOpsWorkerVoiceMuted(): boolean {
  return safeStorageGet(VOICE_MUTE_KEY) === "1";
}

export function setOpsWorkerVoiceMuted(muted: boolean): void {
  if (muted) safeStorageSet(VOICE_MUTE_KEY, "1");
  else {
    try {
      localStorage.removeItem(VOICE_MUTE_KEY);
    } catch {
      /* ignore */
    }
  }
}

export function getOpsWorkerVoiceRate(): number {
  const rate = parseFloat(safeStorageGet(IRONBOARD_VOICE_SPEED_KEY) || "1");
  return Math.min(Math.max(Number.isFinite(rate) ? rate : 1, 0.5), 2.5);
}

export function getOpsWorkerVoicePitch(): number {
  const pitch = parseFloat(safeStorageGet(IRONBOARD_VOICE_PITCH_KEY) || "1");
  return Math.min(Math.max(Number.isFinite(pitch) ? pitch : 1, 0.5), 1.5);
}

/** Ironboard synthesisRate() — clamp for speak. */
export function synthesisRate(): number {
  return Math.min(Math.max(getOpsWorkerVoiceRate(), 0.75), 1.25);
}

/** Ironboard synthesisPitch() — clamp for speak. */
export function synthesisPitch(): number {
  return Math.min(Math.max(getOpsWorkerVoicePitch(), 0.85), 1.15);
}

export function setOpsWorkerVoiceRate(rate: number): void {
  const next = Math.min(Math.max(rate, 0.5), 2.5);
  safeStorageSet(IRONBOARD_VOICE_SPEED_KEY, next.toFixed(2));
}

export function setOpsWorkerVoicePitch(pitch: number): void {
  const next = Math.min(Math.max(pitch, 0.5), 1.5);
  safeStorageSet(IRONBOARD_VOICE_PITCH_KEY, next.toFixed(2));
}

/** Port of Ironboard prepareSpeechText — keep spoken strip rules identical. */
export function prepareOpsWorkerSpeechText(raw: string): string {
  const t = String(raw || "");
  let out = "";
  for (let i = 0; i < t.length; i++) {
    const code = t.charCodeAt(i);
    if (code === 10 || code === 13 || code === 9) out += " ";
    else if (code >= 32 && code !== 127) out += t.charAt(i);
  }
  const tick = String.fromCharCode(96);
  const fence = tick + tick + tick;
  out = out.split(fence).join(" ");
  out = out.split(tick).join("");
  out = out.split("**").join("");
  out = out.split("__").join("");
  out = out.split("*").join("");
  out = out.split("_").join(" ");
  out = out.split("#").join(" ");
  out = out.split(".md").join("");
  while (out.includes("  ")) out = out.split("  ").join(" ");
  out = out.trim();
  if (out.length > 720) {
    const cut = out.slice(0, 720);
    const dot = cut.lastIndexOf(".");
    out = dot > 280 ? cut.slice(0, dot + 1) : cut;
  }
  return out;
}

function refreshVoices(): void {
  if (typeof window === "undefined" || !window.speechSynthesis) return;
  cachedVoices = window.speechSynthesis.getVoices();
}

/** Same ordered prefs as IronBoard Conversation TTS. */
const SHARED_EXECUTIVE_VOICE_PREFS = [
  "Microsoft Jenny",
  "Microsoft Aria",
  "Google US English",
  "Samantha",
  "Daniel",
] as const;

/**
 * Same voice pack as IronBoard Conversation TTS (Jenny/Aria path).
 * Workforce chat never flips to David/Mark by worker id.
 */
function pickSharedIronframeVoice(): SpeechSynthesisVoice | null {
  if (!cachedVoices.length) return null;
  const english = cachedVoices.filter((v) => (v.lang || "").toLowerCase().startsWith("en"));
  const pool = english.length ? english : cachedVoices;
  for (const pref of SHARED_EXECUTIVE_VOICE_PREFS) {
    const matched = pool.find((v) => v.name.includes(pref));
    if (matched) return matched;
  }
  return pool.find((v) => v.localService) || pool[0] || null;
}

/** Unified board default role — every Ops worker speaks with the same voice. */
export const OPS_UNIFIED_VOICE_ROLE = "CEO" as const;

/** Map Ops Hub worker → shared Ironboard voice role (always CEO). */
export function workerToBoardAgentRole(_worker: OpsChatTarget): string {
  return OPS_UNIFIED_VOICE_ROLE;
}

export function cancelOpsWorkerSpeech(): void {
  if (typeof window === "undefined" || !window.speechSynthesis) return;
  window.speechSynthesis.cancel();
}

/** Speak a workforce reply using the same pipeline as Ironboard speakPanelText. */
export function speakOpsWorkerReply(text: string, _worker: OpsChatTarget): void {
  if (typeof window === "undefined" || !window.speechSynthesis) return;
  if (isOpsWorkerVoiceMuted()) return;
  if (/^Error:/i.test(text.trim())) return;

  const speechText = prepareOpsWorkerSpeechText(text);
  if (!speechText) return;

  window.speechSynthesis.cancel();
  const deliver = () => {
    refreshVoices();
    if (!cachedVoices.length) {
      window.setTimeout(deliver, 120);
      return;
    }
    const utterance = new SpeechSynthesisUtterance(speechText);
    utterance.lang = "en-US";
    utterance.rate = synthesisRate();
    utterance.pitch = synthesisPitch();
    utterance.volume = 1;
    const voice = pickSharedIronframeVoice();
    if (voice) utterance.voice = voice;
    window.speechSynthesis.speak(utterance);
  };
  window.setTimeout(deliver, 80);
}

export function bindOpsWorkerSpeechVoices(): () => void {
  if (typeof window === "undefined" || !window.speechSynthesis) return () => undefined;
  refreshVoices();
  const onChange = () => refreshVoices();
  window.speechSynthesis.addEventListener("voiceschanged", onChange);
  return () => window.speechSynthesis.removeEventListener("voiceschanged", onChange);
}
