import type { ProductAsset } from "./state.js";

/** Flagship GRC telemetry platform — principal portfolio asset at GA baseline. */
export const FLAGSHIP_IRONFRAME_SAAS: ProductAsset = {
  id: "ironframe-saas",
  name: "Ironframe SaaS App",
  type: "GRC Telemetry Platform",
  currentStatus: "GA_BASELINE",
};

/** Initial product portfolio — expandable over time without ironframe-live DB coupling. */
export const INITIAL_PORTFOLIO: ProductAsset[] = [FLAGSHIP_IRONFRAME_SAAS];
