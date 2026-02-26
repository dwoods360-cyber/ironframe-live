import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import AuditStepper from '@/app/components/AuditStepper';
import RiskCard from '@/app/components/RiskCard';
import VoiceComms from '@/app/components/VoiceComms';

export const dynamic = 'force-dynamic';

/**
 * SENTINEL DASHBOARD (AGENT 11 VIEW)
 * Status: CONSTITUTIONALLY SECURE
 * Mandate: Filter all audit logs by the active Tenant UUID.
 */
export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // Fetch the latest "Audit Checkpoints" from the database
  // Note: These tables were created by Agent 11 (Irontech)
  const { data: checkpoints, error } = await supabase
    .from('checkpoints')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(5);

  return (
    <main className="p-8 bg-slate-950 text-slate-100 min-h-screen">
      <header className="mb-8 border-b border-slate-800 pb-4">
        <h1 className="text-3xl font-bold tracking-tight">Sentinel Dashboard</h1>
        <p className="text-slate-400">Sovereign Orchestration Monitoring | Tenant: {user.id}</p>
      </header>

      {/* Financial Exposure — BIGINT cents as USD */}
      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-4">Financial Exposure</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <RiskCard
            label="Medshield ALE (Mock)"
            amountCents={1110000000}
            baselineCents={1110000000}
            type="MEDSHIELD"
          />
        </div>
      </section>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Audit Chain of Command — Stepper for latest checkpoint */}
        <section className="col-span-2 bg-slate-900 border border-slate-800 rounded-xl p-6">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span>
            Audit Chain of Command
          </h2>
          {checkpoints && checkpoints.length > 0 ? (
            <>
              <div className="mb-4 p-3 bg-slate-950 border border-slate-800 rounded-lg">
                <span className="text-xs font-mono text-blue-400">
                  TRACE: {checkpoints[0].thread_id?.slice(0, 8) ?? '—'}…
                </span>
                <span className="ml-2 px-2 py-0.5 rounded text-[10px] bg-slate-800 text-slate-300">LATEST</span>
              </div>
              <AuditStepper logs={(checkpoints[0] as { agent_logs?: string[] }).agent_logs ?? []} />
            </>
          ) : (
            <p className="text-slate-500 italic">No active audit traces found in memory.</p>
          )}
        </section>

        {/* Sidebar: Agent Status + Gemini Live Voice */}
        <div className="flex flex-col gap-6">
          <section className="bg-slate-900 border border-slate-800 rounded-xl p-6">
            <h2 className="text-xl font-semibold mb-4">Agent Status</h2>
            <ul className="space-y-3">
              <li className="flex justify-between text-sm"><span>Agent 1 (Ironcore)</span> <span className="text-emerald-400">ONLINE</span></li>
              <li className="flex justify-between text-sm"><span>Agent 3 (Irontrust)</span> <span className="text-emerald-400">ONLINE</span></li>
              <li className="flex justify-between text-sm"><span>Agent 11 (Irontech)</span> <span className="text-emerald-400">ONLINE</span></li>
            </ul>
          </section>
          <VoiceComms />
        </div>
      </div>
    </main>
  );
}
