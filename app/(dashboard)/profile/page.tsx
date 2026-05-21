import SecurityProfile from "./SecurityProfile";
import { getSecurityProfileServerData } from "@/app/actions/profileActions";

export default async function ProfilePage() {
  const initial = await getSecurityProfileServerData();

  return (
    <div className="min-h-[calc(100vh-5rem)] bg-slate-950">
      <SecurityProfile initial={initial} />
    </div>
  );
}
