/** Parse HH:MM:SS.mmm or MM:SS into milliseconds (integer). */
export function parseTimecodeLabel(label: string): number {
  const trimmed = label.trim();
  const parts = trimmed.split(':');
  if (parts.length < 2 || parts.length > 3) {
    throw new Error(`Invalid timecode: ${label}`);
  }

  let hours = 0;
  let minutes = 0;
  let seconds = 0;

  if (parts.length === 3) {
    hours = Number(parts[0]);
    minutes = Number(parts[1]);
    seconds = Number.parseFloat(parts[2]);
  } else {
    minutes = Number(parts[0]);
    seconds = Number.parseFloat(parts[1]);
  }

  if (!Number.isFinite(hours) || !Number.isFinite(minutes) || !Number.isFinite(seconds)) {
    throw new Error(`Invalid timecode: ${label}`);
  }

  return Math.max(0, Math.round((hours * 3600 + minutes * 60 + seconds) * 1000));
}

export function formatTimecodeLabel(ms: number): string {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const pad = (n: number) => String(n).padStart(2, '0');
  return hours > 0
    ? `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`
    : `${pad(minutes)}:${pad(seconds)}`;
}
