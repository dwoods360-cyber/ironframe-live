/**
 * Synthetic employee clearance tier → Board Report heatmap cell styling (Tailwind).
 * Level 5 Exec = critical impact; 4 Director = high; 3 Manager = medium; 1–2 = standard.
 */
export function clearanceHeatmapCellClasses(clearanceLevel: number): string {
  const n = Math.round(clearanceLevel);
  if (n >= 5) return "bg-red-500/20 border-red-500 text-red-100";
  if (n === 4) return "bg-orange-500/20 border-orange-500 text-orange-100";
  if (n === 3) return "bg-yellow-500/20 border-yellow-500 text-amber-950";
  return "bg-blue-500/20 border-blue-500 text-blue-100";
}

export function clearanceLabel(clearanceLevel: number): string {
  const n = Math.round(clearanceLevel);
  if (n >= 5) return "L5 Exec";
  if (n === 4) return "L4 Director";
  if (n === 3) return "L3 Manager";
  if (n === 2) return "L2 Mid";
  return "L1 Entry";
}
