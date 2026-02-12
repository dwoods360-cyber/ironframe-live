'use client';
import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabaseClient';
import type { Company, Risk } from '@/app/types/domain';

import StrategicIntel from './panes/StrategicIntel';
import AuditIntelligence from './panes/right/AuditIntelligence';
import PipelineIngestion from './panes/center/PipelineIngestion';
import RiskRegistration from './panes/center/RiskRegistration';
import ActiveRisks from './panes/center/ActiveRisks';

export default function Dashboard() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [risks, setRisks] = useState<Risk[]>([]);

  const fetchRisks = useCallback(async (companyId: string) => {
    const { data } = await supabase
      .from('active_risks')
      .select('*')
      .eq('company_id', companyId)
      .or('status.eq.REGISTRATION,status.eq.ACTIVE,status.eq.PENDING_SOC,status.eq.PENDING_AGENT')
      .order('created_at', { ascending: false });
    setRisks((data ?? []) as unknown as Risk[]);
  }, []);

  useEffect(() => {
    async function init() {
      const { data } = await supabase.from('companies').select('*').order('id');
      const typed = (data ?? []) as unknown as Company[];
      if (typed.length > 0) {
        setCompanies(typed);
        setSelectedCompany(typed[0]);
        fetchRisks(typed[0].id);
      }
    }
    init();
  }, [fetchRisks]);

  const handleAction = async (riskId: number, action: string) => {
    console.log(`Action ${action} on ${riskId}`);
  };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr 300px', height: '100vh', background: '#0d1117' }}>
      {/* LEFT PANE */}
      <StrategicIntel 
        company={selectedCompany as Company} 
        onThreatClick={(t) => console.log(t)} 
      />

      {/* CENTER COLUMN */}
      <div style={{ display: 'flex', flexDirection: 'column', borderLeft: '1px solid #30363d', borderRight: '1px solid #30363d' }}>
        <PipelineIngestion risks={risks} onAction={handleAction} />
        <RiskRegistration risks={risks} onAction={handleAction} onAddRisk={() => {}} />
        <ActiveRisks risks={risks} />
      </div>

      {/* RIGHT PANE */}
      <AuditIntelligence company={selectedCompany} />
    </div>
  );
}
