'use client';

// Updated to useTenantContext based on the Turbopack build trace
import { useTenantContext, type TenantId } from '../context/TenantProvider'; 
import { Building2 } from 'lucide-react';

const tenants: { id: TenantId; name: string; ale: string }[] = [
  { id: 'medshield-id', name: 'Medshield Health', ale: '$11.1M' },
  { id: 'vaultbank-id', name: 'Vaultbank Global', ale: '$5.9M' },
  { id: 'gridcore-id', name: 'Gridcore Energy', ale: '$4.7M' },
];

export default function TenantSwitcher() {
  // Updated hook call here as well
  const { activeTenant, setActiveTenant } = useTenantContext();

  return (
    <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 rounded-md px-3 py-1.5 transition-colors hover:border-slate-700">
      <Building2 className="w-4 h-4 text-cyan-500" />
      <select
        value={activeTenant}
        onChange={(e) => setActiveTenant(e.target.value as TenantId)}
        className="bg-transparent text-sm font-medium text-slate-200 outline-none cursor-pointer focus:ring-0 appearance-none pr-4"
      >
        {tenants.map((tenant) => (
          <option key={tenant.id} value={tenant.id} className="bg-slate-900 text-slate-200">
            {tenant.name} — {tenant.ale}
          </option>
        ))}
      </select>
    </div>
  );
}