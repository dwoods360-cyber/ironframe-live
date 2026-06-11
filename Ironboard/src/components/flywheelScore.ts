/** Flywheel score display — must read Prisma icpScore, never card index. */
export function displayIcpScore(prospect: { icpScore?: number | null }): number {
  return prospect.icpScore ?? 0;
}
