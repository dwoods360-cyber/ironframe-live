import os

print("--- STARTING 1:00 PM DEEP RESTORATION ---")

# ============================================================
# 1. RESTORE: ArtifactDrawer.tsx
# STATE: Clean Metadata + Standard Audit Trail (No Notes/Expansion)
# ============================================================
drawer_code = """'use client';
import React, { useState, useEffect } from 'react';
import { X, Shield, Clock, CheckCircle, AlertTriangle, FileText, Mail } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

interface DrawerProps {
  isOpen: boolean;
  onClose: () => void;
  doc: any;
}

export default function ArtifactDrawer({ isOpen, onClose, doc }: DrawerProps) {
  const [history, setHistory] = useState<any[]>([]);
  const supabase = createClient();

  useEffect(() => {
    if (isOpen && doc) {
      const fetchHistory = async () => {
        const { data } = await supabase
          .from('audit_logs')
          .select('*')
          .eq('artifact_id', String(doc.id))
          .order('created_at', { ascending: false });
        if (data) setHistory(data);
      };
      fetchHistory();
    }
  }, [isOpen, doc]);

  if (!isOpen || !doc) return null;

  const getIcon = (style: string) => {
    switch (style) {
      case 'success': return <CheckCircle className="w-5 h-5 text-green-400" />;
      case 'danger': return <AlertTriangle className="w-5 h-5 text-red-400" />;
      case 'warning': return <AlertTriangle className="w-5 h-5 text-orange-400" />;
      case 'email': return <Mail className="w-5 h-5 text-blue-400" />;
      default: return <Clock className="w-5 h-5 text-gray-400" />;
    }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 100, display: 'flex', justifyContent: 'flex-end' }}>
      <div 
        onClick={onClose}
        style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(2px)' }}
      />
      
      <div style={{ position: 'relative', width: '450px', background: '#0d1117', borderLeft: '1px solid #2d3748', height: '100%', display: 'flex', flexDirection: 'column', boxShadow: '-10px 0 25px rgba(0,0,0,0.5)' }}>
        
        <div style={{ padding: '20px', borderBottom: '1px solid #2d3748', background: '#161b22', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h2 style={{ fontSize: '18px', fontWeight: 800, color: 'white', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Shield className="w-5 h-5" /> ARTIFACT INTELLIGENCE
            </h2>
            <p style={{ fontSize: '12px', color: '#718096', margin: '5px 0 0 0' }}>ID: {doc.id}</p>
          </div>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: '#718096', cursor: 'pointer' }}>
            <X className="w-6 h-6" />
          </button>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '25px' }}>
          
          <h3 style={{ fontSize: '12px', fontWeight: 800, color: '#4a5568', marginBottom: '15px' }}>DOCUMENT METADATA</h3>
          <div style={{ background: '#1a202c', borderRadius: '6px', border: '1px solid #2d3748', padding: '15px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '100px 1fr', gap: '15px', fontSize: '13px', color: '#cbd5e0' }}>
              <div style={{ color: '#718096' }}>Vendor</div>
              <div>{doc.vendorName}</div>
              
              <div style={{ color: '#718096' }}>Filename</div>
              <div style={{ wordBreak: 'break-all' }}>{doc.name}</div>
              
              <div style={{ color: '#718096' }}>Type</div>
              <div><span style={{ background: '#2d3748', padding: '2px 6px', borderRadius: '4px', fontSize: '11px', fontWeight: 700 }}>{doc.type}</span></div>
              
              <div style={{ color: '#718096' }}>Expires</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                 📅 {doc.expiry ? new Date(doc.expiry).toLocaleDateString() : 'Permanent'}
              </div>
            </div>
          </div>

          <h3 style={{ fontSize: '12px', fontWeight: 800, color: '#4a5568', marginTop: '30px', marginBottom: '15px' }}>LIVE AUDIT TRAIL</h3>
          
          <div style={{ position: 'relative', paddingLeft: '35px', borderLeft: '1px solid #2d3748', marginLeft: '10px' }}>
            {history.length === 0 ? (
                <div style={{ color: '#718096', fontSize: '12px', fontStyle: 'italic' }}>No recorded history.</div>
            ) : (
                history.map((log) => (
                    <div key={log.id} style={{ marginBottom: '25px', position: 'relative' }}>
                        <div style={{ position: 'absolute', left: '-45px', top: '0', background: '#0d1117', padding: '4px', border: '1px solid #1a202c', borderRadius: '50%' }}>
                            {getIcon(log.icon_style)}
                        </div>
                        <div style={{ fontSize: '13px', color: '#e2e8f0', fontWeight: 700 }}>{log.action_type}</div>
                        <div style={{ fontSize: '11px', color: '#718096', display: 'flex', alignItems: 'center', gap: '5px', marginTop: '2px' }}>
                            <Clock className="w-3 h-3" /> {new Date(log.created_at).toLocaleString()}
                        </div>
                        <div style={{ fontSize: '12px', color: '#3182ce', marginTop: '4px', fontWeight: 600 }}>{log.user_name}</div>
                        <div style={{ fontSize: '12px', color: '#a0aec0', marginTop: '5px', background: 'rgba(255,255,255,0.05)', padding: '8px', borderRadius: '4px', border: '1px solid #2d3748' }}>
                            {log.description}
                        </div>
                    </div>
                ))
            )}
          </div>
        </div>

        <div style={{ padding: '20px', borderTop: '1px solid #2d3748', background: '#161b22' }}>
          <a href={doc.url} target="_blank" rel="noopener noreferrer" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', background: '#2f855a', color: 'white', padding: '10px', borderRadius: '6px', textDecoration: 'none', fontWeight: 700, fontSize: '13px', border: '1px solid #276749' }}>
             <FileText className="w-4 h-4" /> Open Source File
          </a>
        </div>
      </div>
    </div>
  );
}
"""

# ============================================================
# 2. RESTORE: EditArtifactModal.tsx
# STATE: Type & Expiry Only (No Notes, No Backdate Field)
# ============================================================
modal_code = """'use client';
import React, { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';

interface EditModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveComplete: () => void;
  document: any;
}

export default function EditArtifactModal({ isOpen, onClose, onSaveComplete, document }: EditModalProps) {
  const [docType, setDocType] = useState('MSA');
  const [expiry, setExpiry] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  
  const supabase = createClient();

  useEffect(() => {
    if (document) {
      setDocType(document.type || 'MSA');
      setExpiry(document.expiry ? document.expiry.split('T')[0] : '');
    }
  }, [document]);

  const handleSave = async () => {
    setIsSaving(true);
    
    // 1. Update the Record
    const { error } = await supabase
      .from('vendor_artifacts')
      .update({ 
        document_type: docType, 
        expiry_date: expiry || null,
        updated_at: new Date().toISOString()
      })
      .eq('id', document.id);

    if (error) {
      alert('Failed to update: ' + error.message);
    } else {
      // 2. LOG THE EVENT
      await supabase.rpc('log_audit_event', {
        p_artifact_id: String(document.id),
        p_user_name: 'Dereck (Admin)', 
        p_action_type: 'METADATA_UPDATE',
        p_description: `Updated metadata: Type set to ${docType}, Expiry set to ${expiry || 'None'}`,
        p_icon_style: 'warning'
      });

      onSaveComplete();
      onClose();
    }
    setIsSaving(false);
  };

  if (!isOpen || !document) return null;

  const labelStyle = { display: 'block', fontSize: '11px', color: '#cbd5e0', marginBottom: '5px', fontWeight: 700 };
  const inputStyle = { width: '100%', background: '#1a202c', border: '1px solid #2d3748', color: 'white', padding: '8px', borderRadius: '4px', fontSize: '12px', marginBottom: '15px' };

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.7)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ background: '#0d1117', width: '400px', padding: '25px', borderRadius: '8px', border: '1px solid #2d3748', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5)' }}>
        
        <h2 style={{ color: 'white', margin: '0 0 20px 0', fontSize: '16px', borderBottom: '1px solid #2d3748', paddingBottom: '10px' }}>📝 Edit Metadata</h2>
        
        <div style={{ marginBottom: '15px', color: '#718096', fontSize: '12px' }}>
          Editing: <strong style={{ color: 'white' }}>{document.name}</strong>
        </div>

        <label style={labelStyle}>DOCUMENT TYPE</label>
        <select value={docType} onChange={(e) => setDocType(e.target.value)} style={inputStyle}>
          <option value="MSA">MSA (Master Services Agreement)</option>
          <option value="AUDIT">AUDIT (SOC2, ISO, Audit Report)</option>
          <option value="INSURANCE">INSURANCE (COI)</option>
          <option value="CERT">CERTIFICATION</option>
          <option value="OTHER">OTHER</option>
        </select>

        <label style={labelStyle}>EXPIRATION DATE</label>
        <input type="date" value={expiry} onChange={(e) => setExpiry(e.target.value)} style={inputStyle} />

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
          <button onClick={onClose} style={{ background: 'transparent', border: '1px solid #4a5568', color: '#cbd5e0', padding: '8px 16px', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }}>Cancel</button>
          <button 
            onClick={handleSave} 
            disabled={isSaving}
            style={{ background: isSaving ? '#dd6b20' : '#ed8936', border: 'none', color: 'white', padding: '8px 20px', borderRadius: '4px', cursor: isSaving ? 'not-allowed' : 'pointer', fontSize: '12px', fontWeight: 700 }}
          >
            {isSaving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>

      </div>
    </div>
  );
}
"""

# ============================================================
# 3. WRITE THE FILES (Force Overwrite)
# ============================================================
file1 = 'app/components/vendor-risk/ArtifactDrawer.tsx'
with open(file1, 'w') as f:
    f.write(drawer_code)
    print(f"✅ ANOMALY REMOVED: {file1} restored to 1:00 PM state.")

file2 = 'app/components/vendor-risk/EditArtifactModal.tsx'
with open(file2, 'w') as f:
    f.write(modal_code)
    print(f"✅ ANOMALY REMOVED: {file2} restored to 1:00 PM state.")

print("--- DEEP RESTORATION COMPLETE ---")
