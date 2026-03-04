"use client";

import { useRiskStore } from "@/app/store/riskStore";
import { useScenarioStore } from "@/app/store/scenarioStore";
import { formatRiskExposure } from "@/app/utils/riskFormatting";

type Props = { baseUsd: number };

export default function LiabilityExposureDisplay({ baseUsd }: Props) {
  const pipelineThreats = useRiskStore((s) => s.pipelineThreats);
  const acceptedThreatImpacts = useRiskStore((s) => s.acceptedThreatImpacts);
  const acceptedThreatIndustries = useRiskStore((s) => s.acceptedThreatIndustries);
  const selectedIndustry = useRiskStore((s) => s.selectedIndustry);
  const currencyMagnitude = useRiskStore((s) => s.currencyMagnitude);
  const { activeScenario, multiplier } = useScenarioStore();

  const pipelinePendingM = pipelineThreats
    .filter((t) => !selectedIndustry || t.industry === selectedIndustry)
    .reduce((sum, t) => sum + (t.score ?? t.loss), 0);
  const acceptedM = Object.entries(acceptedThreatImpacts).reduce(
    (sum, [id, impact]) =>
      sum + (acceptedThreatIndustries[id] === selectedIndustry ? impact : 0),
    0,
  );
  let totalUsd = baseUsd + acceptedM * 1e6 + pipelinePendingM * 1e6;
  if (activeScenario && multiplier !== 1) totalUsd = totalUsd * multiplier;

  const formatted = formatRiskExposure(totalUsd, currencyMagnitude);

  return (
    <span className="text-3xl font-light text-red-400">
      ${formatted}
    </span>
  );
}
