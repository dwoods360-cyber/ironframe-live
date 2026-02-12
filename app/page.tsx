'use client';
import React, { useState, useEffect } from 'react';
import Header from './components/structure/Header';
import TenantTabs from './components/structure/TenantTabs';
import Subheader from './components/structure/Subheader';
import LeftPane from './components/panes/LeftPane';
import CenterPane from './components/panes/CenterPane';
import RightPane from './components/panes/RightPane';

export default function Dashboard() {
  const [tenant, setTenant] = useState('MEDSHIELD');
  const [view, setView] = useState('DASHBOARD');
  const [selectedThreat, setSelectedThreat] = useState(null);
  
  const initialLogs = [
    { id: 1, action: 'User J.Doe accessed Patient Record #9921', severity: 'MED', time: '10 mins ago' },
    { id: 2, action: 'System Backup completed successfully', severity: 'LOW', time: '1 hour ago' },
  ];

  const initialActivity = [
    { id: 1, text: 'HIPAA Compliance Check failed on Server 4', type: 'ALERT', time: '5 mins ago' },
  ];

  const [database, setDatabase] = useState<Record<string, unknown>>({
    MEDSHIELD: { 
      systemHealth: { ironsight: 'ONLINE', coreintel: 'ONLINE', coreguard: 'ONLINE', agentManager: 'ONLINE', integrity: 100 },
      healingLog: [], 
      riskBuffer: [], 
      searchQuery: '', filter: 'ALL',
      activeRisks: [{ 
        id: 'init-1', title: 'RANSOMWARE THREAT', score: '0.63', color: '#f56565', status: 'ACTIVE', stage: 'ACKNOWLEDGED',
        source: 'INTELLIGENCE', likelihood: '0.9', impact: '0.7', description: 'Heuristic analysis detected encryption behavior.', date: '2h ago' 
      }],
      auditLogs: [...initialLogs],
      activities: [...initialActivity],
      report: 'HIPAA Compliance Matrix',
      timer: 0, isActive: false, riskTitle: '', riskDesc: '', riskLikelihood: '', riskImpact: '', riskNotes: '', riskSource: 'MANUAL',
    },
    VAULTBANK: { systemHealth: { ironsight: 'ONLINE', coreintel: 'ONLINE', coreguard: 'ONLINE', agentManager: 'ONLINE', integrity: 100 }, healingLog: [], riskBuffer: [], activeRisks: [], auditLogs: [], activities: [], timer:0, isActive:false },
    GRIDCORE:  { systemHealth: { ironsight: 'ONLINE', coreintel: 'ONLINE', coreguard: 'ONLINE', agentManager: 'ONLINE', integrity: 100 }, healingLog: [], riskBuffer: [], activeRisks: [], auditLogs: [], activities: [], timer:0, isActive:false },
  });

  useEffect(() => {
    const healingInterval = setInterval(() => {
      setDatabase((prevDb: Record<string, unknown>) => {
        const newDb = { ...prevDb };
        const currentTenantDb = newDb[tenant] as any;
        if (currentTenantDb.riskBuffer && currentTenantDb.riskBuffer.length > 8) {
          const buffer = [...currentTenantDb.riskBuffer];
          buffer.sort((a, b) => (parseFloat(a.likelihood)*parseFloat(a.impact)) - (parseFloat(b.likelihood)*parseFloat(b.impact)));
          const removed = buffer.shift(); 
          currentTenantDb.riskBuffer = buffer;
          currentTenantDb.healingLog = [{
            id: Date.now(), agent: 'AGENT MANAGER', action: `Buffer Pruned: Removed low priority item "${removed.title.substring(0,15)}..."`, time: 'Just now'
          }, ...currentTenantDb.healingLog.slice(0, 4)];
        }
        const load = currentTenantDb.riskBuffer.length * 2;
        currentTenantDb.systemHealth = {
          ironsight: 'ONLINE',
          coreintel: 'ONLINE',
          coreguard: load > 15 ? 'STRESSED' : 'ONLINE',
          agentManager: 'ONLINE',
          integrity: Math.max(90, 100 - load)
        };
        return newDb;
      });
    }, 3000); 
    return () => clearInterval(healingInterval);
  }, [tenant]);

  useEffect(() => {
    const interval = setInterval(() => {
      setDatabase((prevDb: Record<string, unknown>) => {
        const newDb = { ...prevDb };
        Object.keys(newDb).forEach((key) => {
          if (newDb[key].timer > 0) newDb[key].timer -= 1;
        });
        return newDb;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const updateDatabase = (key: string, updates: Record<string, unknown>) => {
    setDatabase((prev: Record<string, unknown>) => ({
      ...prev,
      [tenant]: { ...prev[tenant], ...updates }
    }));
  };

  const handleTenantChange = (newTenant: string) => {
    setSelectedThreat(null);
    setTenant(newTenant);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: '#0d1117', color: 'white', fontFamily: 'Inter, sans-serif' }}>
      <Header />
      <TenantTabs current={tenant} onChange={handleTenantChange} />
      <Subheader currentView={view} onViewChange={setView} />
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        <LeftPane 
          key={`left-${tenant}`} 
          tenant={tenant} 
          onViewChange={setView} 
          currentView={view} 
          onSelectThreat={setSelectedThreat}
          liveData={database[tenant]}
          onUpdateData={updateDatabase}
        />
        <CenterPane 
          key={`center-${tenant}`} 
          tenant={tenant} 
          view={view} 
          risks={[]} 
          onAction={() => {}} 
          onAddRisk={() => {}} 
          selectedThreat={selectedThreat}
          liveData={database[tenant]}
          onUpdateData={updateDatabase}
        />
        <RightPane 
          key={`right-${tenant}`} 
          tenant={tenant} 
          liveData={database[tenant]}
          onUpdateData={updateDatabase}
        />
      </div>
    </div>
  );
}
