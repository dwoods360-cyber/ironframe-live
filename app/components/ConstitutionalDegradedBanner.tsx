"use client";

import { useConstitutionalLockFlags } from "@/app/context/ConstitutionalIntegrityProvider";

/** Visible while owner override is active until TAS.md is fully restored. */
export default function ConstitutionalDegradedBanner() {
  const { constitutionalDegradedMode, isConstitutionalEmergency, requiredForensicAttestationMin } =
    useConstitutionalLockFlags();

  if (!constitutionalDegradedMode) {
    return null;
  }

  return (
    <DegradedModeBanner
      isConstitutionalEmergency={isConstitutionalEmergency}
      requiredForensicAttestationMin={requiredForensicAttestationMin}
    />
  );
}

function DegradedModeBanner({
  isConstitutionalEmergency,
  requiredForensicAttestationMin,
}: {
  isConstitutionalEmergency: boolean;
  requiredForensicAttestationMin: number;
}) {
  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-[190] border-t-2 border-amber-600/80 bg-amber-950/95 px-4 py-2 font-mono text-[10px] text-amber-100 shadow-[0_-8px_32px_rgba(245,158,11,0.25)]"
      role="status"
    >
      <p className="font-black uppercase tracking-widest text-amber-200">
        DEGRADED MODE — Human Root of Trust override active
      </p>
      <p className="mt-0.5 text-amber-100/90">
        {isConstitutionalEmergency
          ? "Operating without valid TAS.md authority. "
          : "TAS.md pending full rebaseline. "}
        All GRC actions require {requiredForensicAttestationMin}-character forensic justification until constitutional
        normalcy is restored.
      </p>
    </div>
  );
}
