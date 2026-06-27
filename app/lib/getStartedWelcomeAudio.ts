const DEFAULT_WELCOME_AUDIO_PATH = "/docs/training/assets/get-started-welcome.mp3";

export const GET_STARTED_WELCOME_PLAYED_KEY = "ironframe-get-started-welcome-played-v1";

export function resolveGetStartedWelcomeAudioSrc(): string | null {
  const override = process.env.NEXT_PUBLIC_GET_STARTED_WELCOME_AUDIO_URL?.trim();
  if (override) return override;
  return DEFAULT_WELCOME_AUDIO_PATH;
}

export function hasPlayedGetStartedWelcome(): boolean {
  if (typeof window === "undefined") return true;
  return window.localStorage.getItem(GET_STARTED_WELCOME_PLAYED_KEY) === "1";
}

export function markGetStartedWelcomePlayed(): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(GET_STARTED_WELCOME_PLAYED_KEY, "1");
}
