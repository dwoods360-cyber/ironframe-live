import type { Metadata } from "next";

import PublicApexNav from "@/app/components/marketing/PublicApexNav";
import SalesContactClient from "@/app/components/marketing/SalesContactClient";

export const metadata: Metadata = {
  title: "Request a workflow review · Ironframe",
  description:
    "Request a 10–15 minute Ironframe workflow review for design-partner scoping — no workspace is created from this form.",
};

export default function SalesContactPage() {
  return (
    <>
      <PublicApexNav />
      <SalesContactClient />
    </>
  );
}
