import { useRiskStore } from "@/app/store/riskStore";
import { setIronguardEffectiveTenant } from "@/app/utils/ironguardSession";
import { tenantIndustryCodeToProfileLabel } from "@/app/utils/tenantIndustryProfile";
import {
  DEMO_ENCLAVE_UUID,
  DEMO_ORG_NAME,
  DEMO_WORKSPACE_SLUG,
} from "@/app/lib/demo/demoModeConstants";
import { buildDemoPipelineThreats } from "@/app/lib/demo/demoMockThreats";

function writeDemoTenantCookie(): void {
  const maxAge = 60 * 60 * 24 * 7;
  document.cookie = `ironframe-tenant=${encodeURIComponent(DEMO_ENCLAVE_UUID)}; path=/; max-age=${maxAge}; SameSite=Lax`;
}

/** Seed zustand + Ironguard scope — no server actions or DB commits. */
export function seedDemoClientState(): void {
  writeDemoTenantCookie();
  setIronguardEffectiveTenant(DEMO_ENCLAVE_UUID);

  const store = useRiskStore.getState();
  store.setSelectedTenantName(DEMO_ORG_NAME);
  store.setSelectedIndustry(tenantIndustryCodeToProfileLabel("Corporate"));

  const threats = buildDemoPipelineThreats();
  for (const threat of threats) {
    store.upsertPipelineThreat(threat);
  }
  store.setLiveMonitoringCount(threats.filter((t) => t.lifecycleState === "active").length);

  window.dispatchEvent(new Event("ironframe-tenant-changed"));
  window.dispatchEvent(
    new CustomEvent("ironframe-demo-ready", { detail: { slug: DEMO_WORKSPACE_SLUG } }),
  );
}
