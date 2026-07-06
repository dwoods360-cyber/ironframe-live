import type { GetStartedStepId } from "@/app/lib/getStartedSteps";

/** Served from `public/training-audio/steps/` — outside `/docs/*` so static MP3 bytes are not swallowed by the docs reader. */
export const GET_STARTED_STEP_AUDIO_BASE = "/training-audio/steps";

export function getStartedStepAudioSrc(stepId: GetStartedStepId): string {
  return `${GET_STARTED_STEP_AUDIO_BASE}/${stepId}.mp3`;
}
