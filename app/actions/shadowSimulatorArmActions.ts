"use server";

import { readShadowSimulatorArmSnapshot } from "@/app/lib/shadowSimulatorArmServer";

/** Client refresh of InfilBot / PhishBot armed flags from open non-RESOLVED simulator threats. */
export async function syncShadowSimulatorArmAction() {
  return readShadowSimulatorArmSnapshot();
}
