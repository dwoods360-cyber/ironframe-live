import type { Metadata } from "next";

import PublicApexNav from "@/app/components/marketing/PublicApexNav";
import SalesContactClient from "@/app/components/marketing/SalesContactClient";

export const metadata: Metadata = {
  title: "Schedule a workflow review · Ironframe",
  description:
    "Schedule a 10–15 minute Ironframe workflow review on evidence and board-reporting friction. Command Design Partner is a paid 90-day cohort — no free trial; no workspace from this form.",
};

export default function SalesContactPage() {
  return (
    <>
      <PublicApexNav />
      <SalesContactClient />
    </>
  );
}
