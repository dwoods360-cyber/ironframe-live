"use server";



import prisma from "@/lib/prisma";

import { auditLogCreateLoose } from "@/lib/auditLogLoose";

import { requireSystemOwnerSession } from "@/app/lib/constitutionalOwnerSession";



const MIN_JUSTIFICATION = 50;



const STREAK_INTERRUPTED_AUDIT_MESSAGE =

  "[STREAK_INTERRUPTED] — Self-Healing disabled by User. Maturity Score reduced. Governance Dividend at risk.";



export async function getAutonomousCarbonMitigation(): Promise<

  | {

      ok: true;

      enabled: boolean;

      activeSince: string | null;

      daysActive: number;

    }

  | { ok: false; error: string }

> {

  try {

    const row = await prisma.systemConfig.findUnique({

      where: { id: "global" },

      select: { autonomousCarbonMitigation: true, selfHealingActiveSince: true },

    });

    const enabled = row?.autonomousCarbonMitigation === true;

    const since = row?.selfHealingActiveSince;

    const daysActive =

      enabled && since ? Math.floor((Date.now() - since.getTime()) / 86_400_000) : 0;

    return {

      ok: true,

      enabled,

      activeSince: since?.toISOString() ?? null,

      daysActive,

    };

  } catch (e) {

    return { ok: false, error: e instanceof Error ? e.message : "Read failed." };

  }

}



export async function setAutonomousCarbonMitigation(

  nextEnabled: boolean,

  justification: string,

): Promise<{ ok: true; enabled: boolean } | { ok: false; error: string }> {

  const trimmed = justification.trim();

  if (trimmed.length < MIN_JUSTIFICATION) {

    return {

      ok: false,

      error: `Governance requires a ${MIN_JUSTIFICATION}-character justification to change autonomous carbon mitigation.`,

    };

  }



  try {

    await requireSystemOwnerSession();

  } catch (e) {

    return { ok: false, error: e instanceof Error ? e.message : "Unauthorized." };

  }



  try {

    const prev = await prisma.systemConfig.findUnique({

      where: { id: "global" },

      select: { autonomousCarbonMitigation: true },

    });

    const previousEnabled = prev?.autonomousCarbonMitigation === true;

    if (previousEnabled === nextEnabled) {

      return { ok: true, enabled: nextEnabled };

    }



    const now = new Date();

    await prisma.systemConfig.upsert({

      where: { id: "global" },

      create: {

        id: "global",

        autonomousCarbonMitigation: nextEnabled,

        selfHealingActiveSince: nextEnabled ? now : null,

      },

      update: {

        autonomousCarbonMitigation: nextEnabled,

        selfHealingActiveSince: nextEnabled ? now : null,

      },

    });



    await auditLogCreateLoose({

      data: {

        action: "CONFIG_CHANGE",

        justification: JSON.stringify({

          feature: "AUTONOMOUS_CARBON_MITIGATION",

          previousEnabled,

          nextEnabled,

          operatorNote: trimmed,

        }),

        operatorId: "SYSTEM_OWNER",

        threatId: null,

        isSimulation: false,

      },

    });



    if (previousEnabled && !nextEnabled) {

      await auditLogCreateLoose({

        data: {

          action: "STREAK_INTERRUPTED",

          justification: STREAK_INTERRUPTED_AUDIT_MESSAGE,

          operatorId: "SYSTEM_OWNER",

          threatId: null,

          isSimulation: false,

        },

      });

    }



    return { ok: true, enabled: nextEnabled };

  } catch (e) {

    return { ok: false, error: e instanceof Error ? e.message : "Update failed." };

  }

}


