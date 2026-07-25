import type { Metadata } from "next";
import DemoDashboardClient from "@/app/components/demo/DemoDashboardClient";

export const metadata: Metadata = {
  title: "Command Post demo · Ironframe",
  description:
    "Sample Ironframe Command Post with representative benchmark data — not a live workspace.",
};

export default function DemoDashboardPage() {
  return <DemoDashboardClient />;
}
