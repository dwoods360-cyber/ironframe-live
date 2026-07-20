/** Bump when training MP3 bytes change so browsers drop stale cached narration. */
export const GET_STARTED_AUDIO_ASSET_VERSION = "6";

export function withGetStartedAudioCacheBust(url: string): string {
  const trimmed = url.trim();
  if (!trimmed) return trimmed;
  if (!/\.(mp3|m4a|wav|ogg)(\?|$)/i.test(trimmed)) return trimmed;
  const sep = trimmed.includes("?") ? "&" : "?";
  return `${trimmed}${sep}v=${GET_STARTED_AUDIO_ASSET_VERSION}`;
}
