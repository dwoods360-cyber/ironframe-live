import type { GetStartedStepId } from "@/app/lib/getStartedSteps";

export const GET_STARTED_STEP_AUDIO_BASE =
  "/docs/training/assets/get-started-orientation/steps";

export function getStartedStepAudioSrc(stepId: GetStartedStepId): string {
  return `${GET_STARTED_STEP_AUDIO_BASE}/${stepId}.mp3`;
}
