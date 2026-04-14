import DashboardHomeClient from './components/DashboardHomeClient';
import GlobalHealthSummaryCard from './components/GlobalHealthSummaryCard';
import { redirect } from 'next/navigation';
import { getActiveTenantUuidFromCookies } from './utils/serverTenantContext';

export default async function Page() {
  const tenantUuid = await getActiveTenantUuidFromCookies();
  if (tenantUuid == null) {
    redirect('/select-company');
  }

  return (
    <DashboardHomeClient>
      <GlobalHealthSummaryCard coreintelTrendActive={false} />
    </DashboardHomeClient>
  );
}
