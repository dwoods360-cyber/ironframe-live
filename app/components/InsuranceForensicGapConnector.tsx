"use client";

import {
  INSURANCE_FORENSIC_GAP_CONNECTOR,
  INSURANCE_FORENSIC_GAP_CONNECTOR_STACK,
} from "@/app/lib/dashboardTripaneLayout";

/**
 * Split-canvas gap bridge — `----` on the vertical midline between underwriting cards;
 * `>` stacked directly underneath, pointing right (Approved section.png / LKG geometry).
 */
export default function InsuranceForensicGapConnector() {
  return (
    <div
      className={INSURANCE_FORENSIC_GAP_CONNECTOR}
      data-testid="insurance-forensic-connector"
      aria-hidden
    >
      <div className={INSURANCE_FORENSIC_GAP_CONNECTOR_STACK}>
        <div className="text-center font-bold leading-none tracking-tighter">----</div>
        <div className="text-center text-xs font-bold leading-none">&gt;</div>
      </div>
    </div>
  );
}
