import { calculateEntityScore, EntityData } from "@/app/utils/scoring";

type HealthScoreBadgeProps = {
  entityData: EntityData;
  scoreClassName?: string;
  tooltipAlign?: "left" | "center";
};

function gradeColor(grade: string) {
  if (grade.startsWith("A")) return "text-emerald-500";
  if (grade.startsWith("B")) return "text-blue-400";
  if (grade === "C") return "text-amber-400";
  if (grade === "D") return "text-orange-400";
  return "text-red-500";
}

export default function HealthScoreBadge({
  entityData,
  scoreClassName = "text-5xl",
  tooltipAlign = "center",
}: HealthScoreBadgeProps) {
  const result = calculateEntityScore(entityData);
  const aiInsight = `Score: ${result.score}. Deductions: ${result.criticalAssets} Critical Assets, ${result.vulnerableAssets} Vulnerable Assets, ${result.activeThreats} Open Threat${result.activeThreats === 1 ? "" : "s"}. Bonus: ${result.policyAttestation}% Policy Compliance.`;

  return (
    <div className="group relative inline-flex flex-col items-center" title={aiInsight}>
      <p className={`${scoreClassName} font-bold ${gradeColor(result.grade)}`}>{result.grade}</p>
      <p className="mt-1 text-[10px] font-bold uppercase tracking-wide text-slate-300">{result.score}/100 AI SCORE</p>

      <div
        className={`pointer-events-none absolute z-20 hidden w-72 rounded border border-slate-700 bg-slate-950/95 p-3 text-[10px] text-slate-200 shadow-lg group-hover:block ${
          tooltipAlign === "left" ? "left-0 top-full mt-2" : "left-1/2 top-full mt-2 -translate-x-1/2"
        }`}
      >
        <p className="font-bold text-white">AI Insight ({result.grade})</p>
        <p className="mt-1 text-slate-300">Base 100 − (Critical × 15) − (Vulnerable × 10) − (Active Threats × 20) + Policy Bonus</p>
        <ul className="mt-2 space-y-1 text-slate-300">
          <li>Critical Assets: {result.criticalAssets} × -15</li>
          <li>Vulnerable Assets: {result.vulnerableAssets} × -10</li>
          <li>Open Threats: {result.activeThreats} × -20</li>
          <li>Policy Attestation Bonus: {result.policyAttestation}% → +{result.bonusPoints}</li>
        </ul>
        <p className="mt-2 font-semibold text-white">Final Score: {result.score} ({result.grade})</p>
      </div>
    </div>
  );
}
