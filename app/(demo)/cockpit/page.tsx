import type { Metadata } from "next";
import CommandPostGrid from "@/app/components/commandPost/CommandPostGrid";

export const metadata: Metadata = {
  title: "Demo Command Post · Ironframe",
  description: "Isolated sandbox preview of the Ironframe command center.",
};

export default function DemoCockpitPage() {
  return (
    <div className="flex min-h-0 min-w-0 max-w-full flex-1 flex-col overflow-hidden overflow-x-hidden p-0">
      <CommandPostGrid variant="cockpit" />
    </div>
  );
}
