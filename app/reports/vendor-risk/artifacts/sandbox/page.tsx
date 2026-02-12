'use client';
import React, { useState } from 'react';
import { 
  FolderOpen, Activity, MoreVertical, Trash2, AlertTriangle
} from 'lucide-react';
import Header from '../../../../components/structure/Header';

export default function ArtifactSandbox() {
  const [documents, setDocuments] = useState([
    { id: 1, name: 'CO_Ethiopia_Reserved.pdf', vendor: 'External GRC API', status: 'VALID' },
    { id: 22, name: 'PagerDuty_SLA_Agreement.pdf', vendor: 'PagerDuty', status: 'EXPIRED' },
  ]);

  const [activeMenuId, setActiveMenuId] = useState<number | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<unknown | null>(null);
  const colors = { bg: '#0d1117', panel: '#161b22', border: '#30363d', ironBlue: '#1f6feb', danger: '#f85149', textMuted: '#8b949e' };

  const executeDelete = () => {
    setDocuments(prev => prev.filter(d => d.id !== (deleteTarget as any).id));
    setDeleteTarget(null);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: colors.bg, color: 'white', fontFamily: 'Inter, sans-serif', overflow: 'hidden' }}>
      <Header />
      <div style={{ height: '56px', background: colors.ironBlue, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '14px', fontWeight: 700 }}><FolderOpen size={18} /> EVIDENCE & ARTIFACT LIBRARY</div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button style={{ background: '#1a4a8a', border: '1px solid #fff', color: 'white', padding: '6px 14px', borderRadius: '4px', fontSize: '11px', fontWeight: 700 }}><Activity size={14} /> ACTIVITY LOG</button>
        </div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '24px' }}>
        <div style={{ background: colors.panel, border: `1px solid ${colors.border}`, borderRadius: '6px' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
            <tbody>
              {documents.map(doc => (
                <tr key={doc.id} style={{ borderBottom: `1px solid ${colors.border}` }}>
                  <td style={{ padding: '14px 16px' }}>{doc.name}</td>
                  <td style={{ padding: '14px', textAlign: 'right', position: 'relative' }}>
                    <MoreVertical size={16} cursor="pointer" onClick={() => setActiveMenuId(activeMenuId === doc.id ? null : doc.id)} />
                    {activeMenuId === doc.id && (
                      <div style={{ position: 'absolute', right: '30px', top: '10px', zIndex: 100, background: '#161b22', border: '1px solid #30363d', borderRadius: '4px', width: '180px', textAlign: 'left' }}>
                        <div style={{ padding: '10px 14px', fontSize: '11px', color: colors.danger, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }} onClick={() => { setDeleteTarget(doc); setActiveMenuId(null); }}>
                          <Trash2 size={14} /> REMOVE ARTIFACT
                        </div>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {deleteTarget && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: colors.panel, border: `1px solid ${colors.danger}`, padding: '32px', borderRadius: '8px', maxWidth: '450px', width: '100%', textAlign: 'center' }}>
            <AlertTriangle size={48} color={colors.danger} style={{ marginBottom: '16px' }} />
            <h3 style={{ fontSize: '18px', fontWeight: 900 }}>CONFIRM REMOVAL</h3>
            <p style={{ color: colors.textMuted, fontSize: '14px', marginBottom: '24px' }}>Delete {deleteTarget.name}?</p>
            <div style={{ display: 'flex', gap: '12px' }}>
              <button onClick={() => setDeleteTarget(null)} style={{ flex: 1, background: 'transparent', border: `1px solid ${colors.border}`, color: 'white', padding: '10px', cursor: 'pointer' }}>CANCEL</button>
              <button onClick={executeDelete} style={{ flex: 1, background: colors.danger, border: 'none', color: 'white', padding: '10px', cursor: 'pointer' }}>REMOVE</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
