'use client';
import React from 'react';
import PipelineIngestion from './center/PipelineIngestion';
import RiskRegistration from './center/RiskRegistration';
import ActiveRisks from './center/ActiveRisks';
import SystemConfig from './center/SystemConfig';

interface Props { tenant: string; view: string; risks: Record<string, unknown>[]; onAction: Record<string, unknown>; onAddRisk: Record<string, unknown>; selectedThreat?: Record<string, unknown>; liveData: Record<string, unknown>; onUpdateData: Record<string, unknown>; }

export default function CenterPane({ tenant, view, risks, onAction,  selectedThreat, liveData, onUpdateData }: Props) {
  
  // VIEW SWITCHER
  if (view === 'CONFIG') {
    return (
      <div style={{flex:1, borderRight:'1px solid #2d3139', overflow:'hidden'}}>
        <SystemConfig tenant={tenant} liveData={liveData} />
      </div>
    );
  }

  return (
    <div style={{ 
      flex: 1, 
      display: 'flex', 
      flexDirection: 'column', 
      borderRight: '1px solid #2d3139', 
      overflowY: 'auto', 
      height: '100%'     
    }}>
      <PipelineIngestion tenant={tenant} risks={risks} onAction={onAction} onUpdateData={onUpdateData} liveData={liveData} />
      <RiskRegistration tenant={tenant} selectedThreat={selectedThreat} liveData={liveData} onUpdateData={onUpdateData} />
      <ActiveRisks tenant={tenant} risks={risks} onAction={onAction} liveData={liveData} onUpdateData={onUpdateData} />
    </div>
  );
}
