import { redirect } from "next/navigation";

import { canUsePerimeterWorkforceFromSession } from "@/app/lib/auth/perimeterWorkforceAccess";

import FounderPitchCasualClient from "./FounderPitchCasualClient";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Founder pitch · casual register | Ironframe Operations",
  description:
    "Peer-register founder pitch practice — same spine as the commercial kit, softer verbiage for informal rooms.",
};

export default async function FounderPitchCasualPage() {
  const allowed = await canUsePerimeterWorkforceFromSession();
  if (!allowed) {
    redirect("/unauthorized");
  }

  return <FounderPitchCasualClient />;
}
