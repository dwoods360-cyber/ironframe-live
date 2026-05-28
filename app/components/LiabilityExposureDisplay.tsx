"use client";

import { useRiskStore } from "@/app/store/riskStore";
import { useScenarioStore } from "@/app/store/scenarioStore";
import { formatRiskExposure } from "@/app/utils/riskFormatting";
import { millionsNumberToCents } from "@/app/utils/riskStoreBigIntMath";

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
  const baseUsdNormalized = Number.isFinite(baseUsd) ? baseUsd : 0;
  const baseCents = BigInt(Math.round(baseUsdNormalized * 100));
  const acceptedCents = millionsNumberToCents(acceptedM);
  const pipelinePendingCents = millionsNumberToCents(pipelinePendingM);

  let totalCents = baseCents + acceptedCents + pipelinePendingCents;
  if (activeScenario && multiplier !== 1 && Number.isFinite(multiplier)) {
    const multiplierScaled = BigInt(Math.round(multiplier * 10_000));
    totalCents = (totalCents * multiplierScaled) / 10_000n;
  }

  const formatted = formatRiskExposure(totalCents.toString(), currencyMagnitude);

  return (
    <span className="text-3xl font-light text-red-400">
      ${formatted}
    </span>
  );
}
