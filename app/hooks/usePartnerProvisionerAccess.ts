"use client";

import { useEffect, useState } from "react";
import { getPartnerProvisionerAccess } from "@/app/actions/partnerProvisionerAccessActions";

const PARTNER_PROVISIONER_ACCESS_TIMEOUT_MS = 10_000;

export type PartnerProvisionerAccessState = {
  canUsePartnerProvisioner: boolean;
  resolved: boolean;
};

/** Deferred partner provisioner gate for Client Workspaces nav chip. */
export function usePartnerProvisionerAccess(): PartnerProvisionerAccessState {
  const [state, setState] = useState<PartnerProvisionerAccessState>({
    canUsePartnerProvisioner: false,
    resolved: false,
  });

  useEffect(() => {
    let cancelled = false;
    let timeoutId: number | undefined;
    let frameId = 0;

    const finish = (canUsePartnerProvisioner: boolean) => {
      if (cancelled) return;
      setState({ canUsePartnerProvisioner, resolved: true });
    };

    frameId = window.requestAnimationFrame(() => {
      if (cancelled) return;

      timeoutId = window.setTimeout(() => {
        if (!cancelled) finish(false);
      }, PARTNER_PROVISIONER_ACCESS_TIMEOUT_MS);

      void getPartnerProvisionerAccess()
        .then((res) => {
          if (!cancelled) finish(res.canAccess);
        })
        .catch(() => {
          if (!cancelled) finish(false);
        })
        .finally(() => {
          if (timeoutId !== undefined) window.clearTimeout(timeoutId);
        });
    });

    return () => {
      cancelled = true;
      if (frameId) window.cancelAnimationFrame(frameId);
      if (timeoutId !== undefined) window.clearTimeout(timeoutId);
    };
  }, []);

  return state;
}
