import os

# 1. Content for ArtifactDrawer.tsx
drawer_code = """'use client';
import React, { useState, useEffect } from 'react';
import { X, Shield, Clock, CheckCircle, AlertTriangle, FileText, Mail, StickyNote } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

interface DrawerProps {
  isOpen: boolean;
  onClose: () => void;
  doc: any;
}

export default function ArtifactDrawer({ isOpen, onClose, doc }: DrawerProps) {
  const [history, setHistory] = useState<any[]>([]);
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);
  
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
      setExpandedLogId(null); 
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

  const toggleLog = (id: string) => {
      if (expandedLogId === id) setExpandedLogId(null);
      else setExpandedLogId(id);
  };

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 100, display: 'flex', justifyContent: 'flex-end' }}>
      <div onClick={onClose} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(2px)' }} />
      
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
                history.map((log) => {
                    const isNote = log.description.startsWith('USER_NOTE:');
                    let cleanDescription = isNote ? log.description.replace('USER_NOTE:', '').trim() : log.description;
                    
                    const isExpanded = expandedLogId === log.id;
                    const isLongText = cleanDescription.length > 25;
                    
                    if (!isExpanded && isLongText) {
                        cleanDescription = cleanDescription.slice(0, 25) + '...';
                    }

                    return (
                        <div key={log.id} style={{ marginBottom: '25px', position: 'relative' }}>
                            <div style={{ position: 'absolute', left: '-45px', top: '0', background: '#0d1117', padding: '4px', border: '1px solid #1a202c', borderRadius: '50%' }}>
                                {getIcon(log.icon_style)}
                            </div>
                            
                            <div style={{ fontSize: '13px', color: '#e2e8f0', fontWeight: 700, display: 'flex', justifyContent: 'space-between' }}>
                                <span>{log.action_type}</span>
                                {isNote && <StickyNote className="w-3 h-3 text-yellow-500" />} 
                            </div>
                            
                            <div style={{ fontSize: '11px', color: '#718096', display: 'flex', alignItems: 'center', gap: '5px', marginTop: '2px' }}>
                                <Clock className="w-3 h-3" /> {new Date(log.created_at).toLocaleString()}
                            </div>
                            <div style={{ fontSize: '12px', color: '#3182ce', marginTop: '4px', fontWeight: 600 }}>{log.user_name}</div>
                            
                            <div 
                                onClick={() => (isNote || isLongText) && toggleLog(log.id)}
                                style={{ 
                                    fontSize: '12px', 
                                    color: isNote ? '#ffecd1' : '#a0aec0', 
                                    marginTop: '5px', 
                                    background: isNote ? 'rgba(237, 137, 54, 0.1)' : 'rgba(255,255,255,0.05)', 
                                    padding: '10px', borderRadius: '4px', 
                                    border: isNote ? '1px solid #ed8936' : '1px solid #2d3748',
                                    cursor: (isNote || isLongText) ? 'pointer' : 'default',
                                    whiteSpace: isExpanded ? 'pre-wrap' : 'nowrap',
                                    overflow: 'hidden',
                                    wordBreak: 'break-word',
                                    transition: 'all 0.2s'
                                }}
                                title={(isNote || isLongText) ? "Click to expand/collapse" : ""}
                            >
                                {isNote && <span style={{fontWeight: 800, color: '#f6ad55', marginRight: '5px'}}>📝 NOTE:</span>}
                                {cleanDescription}
                            </div>
                        </div>
                    );
                })
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

# 2. Content for EditArtifactModal.tsx
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
  
  const [noteHistory, setNoteHistory] = useState(''); 
  const [newNote, setNewNote] = useState('');
  
  const [isSaving, setIsSaving] = useState(false);
  const supabase = createClient();

  useEffect(() => {
    if (document) {
      setDocType(document.type || 'MSA');
      setExpiry(document.expiry ? document.expiry.split('T')[0] : '');
      setNoteHistory(document.notes || ''); 
      setNewNote(''); 
    }
  }, [document]);

  const handleSave = async () => {
    setIsSaving(true);
    
    // 1. Construct the New Append String for the Main Record
    let finalNotes = noteHistory;
    
    if (newNote.trim()) {
        const timestamp = new Date().toLocaleString();
        const user = 'Dereck (Admin)'; 
        const entry = `--- [${timestamp}] ${user} ---\\n${newNote.trim()}`;
        finalNotes = finalNotes ? `${finalNotes}\\n\\n${entry}` : entry;
    }

    // 2. Update the Record
    const { error } = await supabase
      .from('vendor_artifacts')
      .update({ 
        document_type: docType, 
        expiry_date: expiry || null,
        notes: finalNotes || null,
        updated_at: new Date().toISOString()
      })
      .eq('id', document.id);

    if (error) {
      alert('Failed to update: ' + error.message);
    } else {
      // 3. LOG THE EVENT
      const logDescription = newNote.trim() 
        ? `USER_NOTE: ${newNote.trim()}` 
        : `Updated metadata: Type=${docType}, Expiry=${expiry || 'None'}`;

      await supabase.rpc('log_audit_event', {
        p_artifact_id: String(document.id),
        p_user_name: 'Dereck (Admin)', 
        p_action_type: 'METADATA_UPDATE',
        p_description: logDescription, 
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
      <div style={{ background: '#0d1117', width: '450px', padding: '25px', borderRadius: '8px', border: '1px solid #2d3748', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5)' }}>
        
        <h2 style={{ color: 'white', margin: '0 0 20px 0', fontSize: '16px', borderBottom: '1px solid #2d3748', paddingBottom: '10px' }}>📝 Edit Metadata & Notes</h2>
        
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
            <div>
                <label style={labelStyle}>DOCUMENT TYPE</label>
                <select value={docType} onChange={(e) => setDocType(e.target.value)} style={inputStyle}>
                    <option value="MSA">MSA</option>
                    <option value="AUDIT">AUDIT</option>
                    <option value="INSURANCE">INSURANCE</option>
                    <option value="CERT">CERT</option>
                    <option value="OTHER">OTHER</option>
                </select>
            </div>
            <div>
                <label style={labelStyle}>EXPIRATION DATE</label>
                <input type="date" value={expiry} onChange={(e) => setExpiry(e.target.value)} style={inputStyle} />
            </div>
        </div>
        
        <label style={labelStyle}>ADD AUDIT NOTE</label>
        <textarea 
            value={newNote} 
            onChange={(e) => setNewNote(e.target.value)} 
            placeholder="Reason for change, context, or exception details..."
            style={{ ...inputStyle, height: '80px', resize: 'none', border: '1px solid #3182ce', background: '#0d1117' }} 
        />

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

# 3. Write Files
with open('app/components/vendor-risk/ArtifactDrawer.tsx', 'w') as f:
    f.write(drawer_code)
    print("✅ Successfully repaired: ArtifactDrawer.tsx")

with open('app/components/vendor-risk/EditArtifactModal.tsx', 'w') as f:
    f.write(modal_code)
    print("✅ Successfully repaired: EditArtifactModal.tsx")

