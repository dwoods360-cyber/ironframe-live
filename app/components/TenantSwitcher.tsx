'use client';

import { useRouter, usePathname } from 'next/navigation';
import { Building2 } from 'lucide-react';

const tenants = [
  { id: 'global', path: '/', name: 'Global Command Center', ale: 'Aggregate Dashboard' },
  { id: 'medshield', path: '/medshield', name: 'Medshield Health', ale: '$11.1M' },
  { id: 'vaultbank', path: '/vaultbank', name: 'Vaultbank Global', ale: '$5.9M' },
  { id: 'gridcore', path: '/gridcore', name: 'Gridcore Energy', ale: '$4.7M' },
];

export default function TenantSwitcher() {
  const router = useRouter();
  const pathname = usePathname();

  // Detect the active dropdown option directly from the URL path
  const currentTenant = tenants.find(t => pathname.startsWith(t.path) && t.path !== '/')?.id 
    || (pathname === '/' ? 'global' : '');

  const handleRouting = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selected = tenants.find(t => t.id === e.target.value);
    if (selected) {
      router.push(selected.path); // Physically navigate to the isolated tenant route
    }
  };

  return (
    <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 rounded-md px-3 py-1.5 transition-colors hover:border-slate-700">
      <Building2 className="w-4 h-4 text-cyan-500" />
      <select
        value={currentTenant}
        onChange={handleRouting}
        className="bg-transparent text-sm font-medium text-slate-200 outline-none cursor-pointer focus:ring-0 appearance-none pr-4"
      >
        <option value="" disabled className="bg-slate-900 text-slate-500">SELECT VIEW</option>
        {tenants.map((tenant) => (
          <option key={tenant.id} value={tenant.id} className="bg-slate-900 text-slate-200">
            {tenant.name} {tenant.ale !== 'Aggregate Dashboard' ? `— ${tenant.ale}` : ''}
          </option>
        ))}
      </select>
    </div>
  );
}