"use server";

import prisma from "@/lib/prisma";
import type { VendorTypeRequirements } from "@/app/store/systemConfigStore";

const CONFIG_ID = "default";

export async function loadGrcTemplateConfig(): Promise<{
  generalRfiChecklist: string[];
  vendorTypeRequirements: VendorTypeRequirements;
} | null> {
  try {
    const row = await prisma.grcTemplateConfig.findUnique({ where: { id: CONFIG_ID } });
    if (!row) return null;
    return {
      generalRfiChecklist: row.generalRfiChecklist as string[],
      vendorTypeRequirements: row.vendorTypeRequirements as VendorTypeRequirements,
    };
  } catch {
    return null;
  }
}

export async function saveGrcTemplateConfig(
  generalRfiChecklist: string[],
  vendorTypeRequirements: VendorTypeRequirements
): Promise<{ ok: boolean; error?: string }> {
  try {
    await prisma.grcTemplateConfig.upsert({
      where: { id: CONFIG_ID },
      create: {
        id: CONFIG_ID,
        generalRfiChecklist: generalRfiChecklist as object,
        vendorTypeRequirements: vendorTypeRequirements as object,
      },
      update: {
        generalRfiChecklist: generalRfiChecklist as object,
        vendorTypeRequirements: vendorTypeRequirements as object,
      },
    });
    return { ok: true };
  } catch (e) {
    return { ok: false, error: String(e) };
  }
}
