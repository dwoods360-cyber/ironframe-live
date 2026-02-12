'use client';
import React from 'react';

interface Props { 
  tenant: string; 
  onViewChange: (view: string) => void; 
  currentView: string; 
  onSelectThreat: (t: Record<string, unknown>) => void;
  liveData: Record<string, unknown>;
  onUpdateData: Record<string, unknown>;
}

export default function LeftPane({ tenant, onSelectThreat, liveData, onUpdateData }: Props) {
  
  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const handleSetClock = () => {
    const hours = parseFloat(liveData.input);
    if (!isNaN(hours) && hours > 0) {
      onUpdateData('timer', { 
        timer: Math.floor(hours * 3600), 
        isActive: true,
        input: '72' 
      });
    }
  };

  const data: Record<string, unknown> = {
    MEDSHIELD: { industry: 'Healthcare', risk: '$10.9M', impact: '$15.2M', avg: '$8.5M', threats: [{name:'RANSOMWARE',val:'$4.9M'},{name:'DATA BREACH',val:'$3.5M'},{name:'PHISHING ATTACK',val:'$2.1M'}] },
    VAULTBANK: { industry: 'Finance', risk: '$42.1M', impact: '$180.5M', avg: '$12.0M', threats: [{name:'WIRE FRAUD',val:'$12.4M'},{name:'DDOS ATTACK',val:'$8.2M'},{name:'INSIDER THREAT',val:'$5.1M'}] },
    GRIDCORE: { industry: 'Energy', risk: '$88.5M', impact: '$450.0M', avg: '$25.0M', threats: [{name:'SCADA TAMPERING',val:'$22.0M'},{name:'PHYSICAL SABOTAGE',val:'$15.5M'},{name:'SUPPLY CHAIN',val:'$10.2M'}] }
  }[tenant] || { industry: 'Unknown', risk: '0', impact: '0', avg:'0', threats: [] };

  return (
    <div style={{width: '280px', background: '#15181e', borderRight: '1px solid #2d3139', display: 'flex', flexDirection: 'column', padding: '16px', gap: '20px', overflowY: 'auto'}}>
      
      {/* STRATEGIC INTEL HEADER */}
      <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', borderBottom:'1px solid #2d3748', paddingBottom:'8px'}}>
        <span style={{fontSize:'10px', fontWeight:700, color:'#cbd5e0', letterSpacing:'0.5px'}}>STRATEGIC INTEL</span>
        <div style={{display:'flex', alignItems:'center', gap:'4px'}}><span style={{fontSize:'10px'}}>✒️</span><span style={{fontSize:'9px', color:'#48bb78', fontWeight:700}}>ACTIVE ●</span></div>
      </div>

      {/* INDUSTRY PROFILE */}
      <div>
        <div style={{display:'flex', justifyContent:'space-between', marginBottom:'6px'}}><span style={{fontSize:'9px', fontWeight:700, color:'#a0aec0'}}>INDUSTRY PROFILE</span><span style={{fontSize:'9px', color:'#3182ce', cursor:'pointer'}}>Hide</span></div>
        <div style={{width:'100%', background:'#1a202c', color:'white', border:'1px solid #4a5568', padding:'6px', borderRadius:'4px', fontSize:'11px', marginBottom:'8px'}}>{data.industry}</div>
        <button style={{width:'100%', background:'#3182ce', color:'white', border:'none', borderRadius:'4px', padding:'6px', fontSize:'10px', fontWeight:700}}>Load Strategy</button>
      </div>

      {/* RISKS & THREATS BARS */}
      <div>
        <div style={{fontSize:'9px', fontWeight:700, color:'#a0aec0', marginBottom:'10px'}}>RISK EXPOSURE</div>
        <div style={{marginBottom:'10px'}}>
          <div style={{display:'flex', justifyContent:'space-between', fontSize:'9px', color:'#cbd5e0', marginBottom:'2px'}}><span>INDUSTRY AVERAGE</span><span style={{color:'#63b3ed'}}>{data.avg}</span></div>
          <div style={{height:'4px', background:'#2d3748', borderRadius:'2px'}}><div style={{width:'30%', height:'100%', background:'#63b3ed', borderRadius:'2px'}} /></div>
        </div>
        <div style={{marginBottom:'10px'}}>
          <div style={{display:'flex', justifyContent:'space-between', fontSize:'9px', color:'#cbd5e0', marginBottom:'2px'}}><span>YOUR CURRENT RISK</span><span style={{color:'#ecc94b'}}>{data.risk}</span></div>
          <div style={{height:'4px', background:'#2d3748', borderRadius:'2px'}}><div style={{width:'55%', height:'100%', background:'#ecc94b', borderRadius:'2px'}} /></div>
        </div>
        <div>
          <div style={{display:'flex', justifyContent:'space-between', fontSize:'9px', color:'#cbd5e0', marginBottom:'2px'}}><span>POTENTIAL IMPACT</span><span style={{color:'#f56565'}}>{data.impact}</span></div>
          <div style={{height:'4px', background:'#2d3748', borderRadius:'2px'}}><div style={{width:'75%', height:'100%', background:'#f56565', borderRadius:'2px'}} /></div>
        </div>
      </div>

      {/* TOP SECTOR THREATS */}
      <div>
        <div style={{fontSize:'9px', fontWeight:700, color:'#a0aec0', marginBottom:'8px'}}>TOP SECTOR THREATS (CLICK TO REGISTER)</div>
        {data.threats.map((t: unknown) => (
          <div key={t.name} onClick={() => onSelectThreat(t)} style={{background:'#1c2128', border:'1px solid #2d3748', padding:'8px 10px', borderRadius:'4px', marginBottom:'6px', display:'flex', justifyContent:'space-between', alignItems:'center', cursor: 'pointer'}}>
            <span style={{fontSize:'10px', fontWeight:700, color:'white'}}>{t.name}</span>
            <span style={{fontSize:'10px', color:'#48bb78', fontWeight:700}}>{t.val}</span>
          </div>
        ))}
      </div>

      {/* AI AGENTS & LIVE DB CLOCK */}
      <div>
        <div style={{fontSize:'9px', fontWeight:700, color:'#a0aec0', marginBottom:'8px'}}>AI AGENTS</div>
        <div style={{display:'flex', gap:'8px', marginBottom:'16px'}}>
          {['IRONSIGHT', 'COREINTEL', 'COREGUARD'].map(a => (
            <div key={a} style={{flex:1, background:'#1a202c', border:'1px solid #2d3748', borderRadius:'4px', padding:'10px', textAlign:'center'}}>
              <div style={{fontSize:'14px', marginBottom:'4px'}}>{a === 'IRONSIGHT' ? '🎯' : a === 'COREINTEL' ? '🧠' : '🛡️'}</div>
              <div style={{fontSize:'8px', fontWeight:700, color:'#a0aec0', marginBottom:'2px'}}>{a}</div>
              <div style={{fontSize:'8px', color:'#48bb78'}}>● Active</div>
            </div>
          ))}
        </div>
        
        <div style={{background:'#2d3748', borderRadius:'6px', padding:'6px', display:'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom:'8px'}}>
          <input 
            type="text" 
            value={liveData.input || ''} 
            onChange={(e) => onUpdateData('input', { input: e.target.value })} 
            style={{width:'40px', background:'#3e4856', border:'none', borderRadius:'4px', color:'#a0aec0', fontSize:'10px', fontFamily:'monospace', padding:'4px', textAlign:'center'}} 
          />
          <button onClick={handleSetClock} style={{background:'#3182ce', color:'white', border:'none', borderRadius:'4px', padding:'4px 12px', fontSize:'9px', fontWeight:700, cursor: 'pointer'}}>
            SET
          </button>
          <div style={{color: liveData.isActive ? '#48bb78' : '#ecc94b', fontSize:'10px', fontFamily:'monospace', fontWeight:700}}>
            TTL: {formatTime(liveData.timer)}
          </div>
        </div>

        {/* RESTORED SENTINEL FOOTER */}
        <input placeholder="Enter Agent Instruction..." style={{width:'100%', background:'#1a202c', border:'1px solid #4a5568', padding:'8px', borderRadius:'4px', color:'white', fontSize:'11px', marginBottom:'8px'}} />
        <button style={{width:'100%', background:'#ecc94b', color:'#1a202c', padding:'10px', borderRadius:'4px', fontSize:'12px', fontWeight:800, border:'none', cursor:'pointer'}}>🔍 RUN SENTINEL SWEEP</button>
      </div>
    </div>
  );
}
