import type { Metadata } from "next";

import PublicApexNav from "@/app/components/marketing/PublicApexNav";
import SalesContactClient from "@/app/components/marketing/SalesContactClient";

export const metadata: Metadata = {
  title: "Schedule a workflow review · Ironframe",
  description:
    "Schedule a 10–15 minute Ironframe workflow review. No workspace or free trial from this form — Command Design Partner is a paid design engagement after agreement.",
};

export default function SalesContactPage() {
  return (
    <>
      <PublicApexNav />
      <SalesContactClient />
    </>
  );
}
