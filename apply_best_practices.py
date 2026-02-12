import os

print("--- APPLYING CODING BEST PRACTICES & ISOLATION ---")

# ==============================================================================
# 1. DocumentList.tsx 
# IMPROVEMENTS: Tailwind CSS, HTML Table, Defined Interfaces, Isolated Helpers
# ==============================================================================
list_code = """'use client';
import React, { useState, useEffect } from 'react';
import { 
  MoreVertical, FileText, Trash2, Download, Edit, 
  AlertCircle, CheckCircle, Clock, FileSpreadsheet, 
  File as FileIcon, Image as ImageIcon, Box, Mail, Loader2, Shield 
} from 'lucide-react';
import { sendVendorEmail } from '../../actions/email';
import ArtifactDrawer from './ArtifactDrawer';
import { createClient } from '@/lib/supabase/client';

// --- Types Isolation ---
interface VendorDocument {
  id: string;
  name: string;
  vendorName: string;
  type: string;
  criticality: 'HIGH' | 'MED' | 'LOW';
  url: string;
  expiry: string | null;
  created_at: string;
  updated_at: string;
  status?: string; // Derived status
}

interface DocumentListProps {
  documents: VendorDocument[];
  onDelete: (id: string) => void;
  onEdit: (doc: VendorDocument) => void;
}

// --- Logic Isolation: Pure Helper Functions ---
const getFileIcon = (filename: string) => {
  const lower = (filename || '').toLowerCase();
  const className = "w-4 h-4 text-gray-400 group-hover:text-blue-400 transition-colors";
  if (lower.includes('.pdf')) return <FileText className={className} />;
  if (lower.includes('.xls') || lower.includes('.csv')) return <FileSpreadsheet className={className} />;
  if (lower.includes('.doc')) return <FileIcon className={className} />;
  if (lower.includes('.zip') || lower.includes('.rar')) return <Box className={className} />;
  if (lower.includes('.jpg') || lower.includes('.png')) return <ImageIcon className={className} />;
  return <FileText className={className} />;
};

const getStatusConfig = (expiry: string | null, type: string) => {
  if (!expiry) {
    if (type === 'MSA') return { label: 'PERMANENT', color: 'text-gray-500 bg-gray-500/10 border-gray-500/20', icon: CheckCircle };
    return { label: 'INCOMPLETE', color: 'text-yellow-500 bg-yellow-500/10 border-yellow-500/20', icon: AlertCircle };
  }
  const days = Math.ceil((new Date(expiry).getTime() - new Date().getTime()) / (1000 * 3600 * 24));
  if (days < 0) return { label: 'EXPIRED', color: 'text-red-500 bg-red-500/10 border-red-500/20', icon: AlertCircle };
  if (days < 90) return { label: 'EXPIRING', color: 'text-orange-500 bg-orange-500/10 border-orange-500/20', icon: Clock };
  return { label: 'VALID', color: 'text-green-500 bg-green-500/10 border-green-500/20', icon: CheckCircle };
};

const getCriticalityColor = (level: string) => {
  switch (level) {
    case 'HIGH': return 'text-red-400';
    case 'MED': return 'text-orange-400';
    case 'LOW': return 'text-green-400';
    default: return 'text-gray-400';
  }
};

export default function DocumentList({ documents, onDelete, onEdit }: DocumentListProps) {
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const [sendingEmailId, setSendingEmailId] = useState<string | null>(null);
  const [drawerDoc, setDrawerDoc] = useState<VendorDocument | null>(null);
  
  const supabase = createClient();

  // Click Outside Handler
  useEffect(() => {
    const handleClickOutside = (event: any) => {
      if (!event.target.closest('.action-menu-container')) {
        setActiveMenuId(null);
      }
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  const handleSendEmail = async (doc: VendorDocument) => {
    setSendingEmailId(doc.id);
    const result = await sendVendorEmail(doc.vendorName, doc.name, doc.expiry || '');
    
    if (result.success) {
      await supabase.rpc('log_audit_event', {
        p_artifact_id: String(doc.id), 
        p_user_name: 'Dereck (Admin)', 
        p_action_type: 'VENDOR_OUTREACH',
        p_description: `Automated compliance request sent to ${doc.vendorName}`,
        p_icon_style: 'email'
      });
      alert(`✅ Compliance request sent to ${doc.vendorName}`);
      setActiveMenuId(null);
    } else {
      alert('❌ Failed to send email.');
    }
    setSendingEmailId(null);
  };

  if (!documents || documents.length === 0) {
    return (
      <div className="p-10 text-center text-gray-500 border border-dashed border-gray-700 rounded-lg mt-5">
        <div className="flex justify-center mb-2"><FileIcon className="w-8 h-8 opacity-50" /></div>
        No documents found matching your filters.
      </div>
    );
  }

  return (
    <div className="w-full pb-24">
      <div className="bg-[#0d1117] border border-[#30363d] rounded-lg overflow-hidden">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-[#161b22] border-b border-[#30363d]">
              <th className="px-4 py-3 text-left text-[10px] font-bold text-[#8b949e] uppercase tracking-wider w-[30%]">Name</th>
              <th className="px-4 py-3 text-left text-[10px] font-bold text-[#8b949e] uppercase tracking-wider w-[20%]">Vendor</th>
              <th className="px-4 py-3 text-left text-[10px] font-bold text-[#8b949e] uppercase tracking-wider w-[10%]">Type</th>
              <th className="px-4 py-3 text-left text-[10px] font-bold text-[#8b949e] uppercase tracking-wider w-[10%]">Criticality</th>
              <th className="px-4 py-3 text-left text-[10px] font-bold text-[#8b949e] uppercase tracking-wider w-[10%]">Uploaded</th>
              <th className="px-4 py-3 text-left text-[10px] font-bold text-[#8b949e] uppercase tracking-wider w-[10%]">Updated</th>
              <th className="px-4 py-3 text-left text-[10px] font-bold text-[#8b949e] uppercase tracking-wider w-[10%]">Expiry</th>
              <th className="px-4 py-3 text-left text-[10px] font-bold text-[#8b949e] uppercase tracking-wider">Status</th>
              <th className="px-4 py-3 text-right text-[10px] font-bold text-[#8b949e] uppercase tracking-wider">Action</th>
            </tr>
          </thead>
          <tbody>
            {documents.map((doc) => {
              const status = getStatusConfig(doc.expiry, doc.type);
              const isMenuOpen = activeMenuId === doc.id;
              const StatusIcon = status.icon;

              return (
                <tr key={doc.id} className="border-b border-[#30363d] last:border-0 hover:bg-[#161b22]/50 transition-colors group">
                  
                  {/* Name */}
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      {getFileIcon(doc.url || doc.name)}
                      <a href={doc.url} target="_blank" rel="noopener noreferrer" 
                         className="text-sm font-semibold text-gray-200 group-hover:text-blue-400 transition-colors truncate max-w-[200px]"
                         title={doc.name}>
                         {doc.name}
                      </a>
                    </div>
                  </td>

                  {/* Vendor */}
                  <td className="px-4 py-3 text-xs text-blue-400 hover:underline cursor-pointer" title={doc.vendorName}>
                    {doc.vendorName}
                  </td>

                  {/* Type */}
                  <td className="px-4 py-3">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#30363d] text-gray-300 border border-[#30363d]">
                      {doc.type}
                    </span>
                  </td>

                  {/* Criticality */}
                  <td className={`px-4 py-3 text-xs font-bold ${getCriticalityColor(doc.criticality)}`}>
                    {doc.criticality}
                  </td>

                  {/* Dates */}
                  <td className="px-4 py-3 text-xs text-gray-500 font-mono">{new Date(doc.created_at).toLocaleDateString()}</td>
                  <td className="px-4 py-3 text-xs text-gray-500 font-mono">{new Date(doc.updated_at).toLocaleDateString()}</td>
                  <td className={`px-4 py-3 text-xs font-mono ${doc.expiry ? 'text-gray-400' : 'text-yellow-600'}`}>
                    {doc.expiry ? new Date(doc.expiry).toLocaleDateString() : 'Required*'}
                  </td>

                  {/* Status */}
                  <td className="px-4 py-3">
                    <span className={`flex items-center w-fit gap-1.5 px-2 py-0.5 rounded text-[10px] font-bold border ${status.color}`}>
                      <StatusIcon className="w-3 h-3" />
                      {status.label}
                    </span>
                  </td>

                  {/* Actions */}
                  <td className="px-4 py-3 text-right relative action-menu-container">
                    <button 
                      onClick={(e) => { e.stopPropagation(); setActiveMenuId(isMenuOpen ? null : doc.id); }}
                      className={`p-1 rounded hover:bg-gray-800 ${isMenuOpen ? 'text-white' : 'text-gray-500'}`}
                    >
                      <MoreVertical className="w-4 h-4" />
                    </button>

                    {isMenuOpen && (
                      <div className="absolute right-0 top-8 w-44 bg-[#1a202c] border border-[#2d3748] rounded-md shadow-xl z-50 flex flex-col overflow-hidden">
                        <button onClick={() => handleSendEmail(doc)} disabled={!!sendingEmailId} className="flex items-center gap-2 px-4 py-2 text-xs text-gray-200 hover:bg-gray-800 text-left border-b border-[#2d3748]">
                          {sendingEmailId === doc.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Mail className="w-3 h-3" />}
                          {sendingEmailId === doc.id ? 'Sending...' : 'Request Update'}
                        </button>
                        <button onClick={() => { setDrawerDoc(doc); setActiveMenuId(null); }} className="flex items-center gap-2 px-4 py-2 text-xs text-gray-200 hover:bg-gray-800 text-left border-b border-[#2d3748]">
                          <Shield className="w-3 h-3" /> Audit History
                        </button>
                        <button onClick={() => { onEdit(doc); setActiveMenuId(null); }} className="flex items-center gap-2 px-4 py-2 text-xs text-gray-200 hover:bg-gray-800 text-left">
                          <Edit className="w-3 h-3" /> Edit Metadata
                        </button>
                        <a href={doc.url} download={doc.name} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 px-4 py-2 text-xs text-gray-200 hover:bg-gray-800 text-left">
                          <Download className="w-3 h-3" /> Download
                        </a>
                        <button onClick={() => { if(confirm('Delete artifact?')) onDelete(doc.id); setActiveMenuId(null); }} className="flex items-center gap-2 px-4 py-2 text-xs text-red-400 hover:bg-gray-800 text-left">
                          <Trash2 className="w-3 h-3" /> Delete
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <ArtifactDrawer isOpen={!!drawerDoc} onClose={() => setDrawerDoc(null)} doc={drawerDoc} />
    </div>
  );
}
"""

# ==============================================================================
# 2. ArtifactDrawer.tsx
# IMPROVEMENTS: Tailwind CSS, Layout Isolation
# ==============================================================================
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
    const className = "w-5 h-5";
    switch (style) {
      case 'success': return <CheckCircle className={`${className} text-green-400`} />;
      case 'danger': return <AlertTriangle className={`${className} text-red-400`} />;
      case 'warning': return <AlertTriangle className={`${className} text-orange-400`} />;
      case 'email': return <Mail className={`${className} text-blue-400`} />;
      default: return <Clock className={`${className} text-gray-400`} />;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Backdrop */}
      <div onClick={onClose} className="absolute inset-0 bg-black/60 backdrop-blur-[2px]" />
      
      {/* Drawer Panel */}
      <div className="relative w-[450px] h-full bg-[#0d1117] border-l border-[#2d3748] flex flex-col shadow-2xl">
        
        {/* Header */}
        <div className="flex justify-between items-center p-5 bg-[#161b22] border-b border-[#2d3748]">
          <div>
            <h2 className="text-lg font-extrabold text-white flex items-center gap-2">
              <Shield className="w-5 h-5" /> ARTIFACT INTELLIGENCE
            </h2>
            <p className="text-xs text-gray-500 mt-1">ID: {doc.id}</p>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          
          <h3 className="text-xs font-extrabold text-gray-600 mb-4">DOCUMENT METADATA</h3>
          <div className="bg-[#1a202c] rounded-md border border-[#2d3748] p-4 mb-8">
            <div className="grid grid-cols-[100px_1fr] gap-4 text-sm text-gray-300">
              <div className="text-gray-500">Vendor</div>
              <div>{doc.vendorName}</div>
              
              <div className="text-gray-500">Filename</div>
              <div className="break-all">{doc.name}</div>
              
              <div className="text-gray-500">Type</div>
              <div><span className="bg-[#2d3748] px-1.5 py-0.5 rounded text-[11px] font-bold">{doc.type}</span></div>
              
              <div className="text-gray-500">Expires</div>
              <div className="flex items-center gap-1.5">
                 📅 {doc.expiry ? new Date(doc.expiry).toLocaleDateString() : 'Permanent'}
              </div>
            </div>
          </div>

          <h3 className="text-xs font-extrabold text-gray-600 mb-4">LIVE AUDIT TRAIL</h3>
          
          <div className="relative pl-9 border-l border-[#2d3748] ml-2.5">
            {history.length === 0 ? (
                <div className="text-xs text-gray-500 italic">No recorded history.</div>
            ) : (
                history.map((log) => (
                    <div key={log.id} className="mb-6 relative">
                        {/* Timeline Dot */}
                        <div className="absolute -left-[45px] top-0 bg-[#0d1117] p-1 border border-[#1a202c] rounded-full">
                            {getIcon(log.icon_style)}
                        </div>
                        
                        <div className="text-sm font-bold text-gray-200">{log.action_type}</div>
                        <div className="text-[11px] text-gray-500 flex items-center gap-1.5 mt-0.5">
                            <Clock className="w-3 h-3" /> {new Date(log.created_at).toLocaleString()}
                        </div>
                        <div className="text-xs text-blue-400 mt-1 font-semibold">{log.user_name}</div>
                        <div className="text-xs text-gray-400 mt-1.5 bg-white/5 p-2 rounded border border-[#2d3748]">
                            {log.description}
                        </div>
                    </div>
                ))
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-5 bg-[#161b22] border-t border-[#2d3748]">
          <a href={doc.url} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-2 bg-green-700 hover:bg-green-600 text-white py-2.5 rounded-md text-sm font-bold transition-colors">
             <FileText className="w-4 h-4" /> Open Source File
          </a>
        </div>
      </div>
    </div>
  );
}
"""

# ==============================================================================
# 3. EditArtifactModal.tsx
# IMPROVEMENTS: Tailwind CSS, Modal Isolation
# ==============================================================================
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

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="bg-[#0d1117] w-[400px] p-6 rounded-lg border border-[#2d3748] shadow-2xl">
        
        <h2 className="text-white text-base font-bold border-b border-[#2d3748] pb-3 mb-5">
          📝 Edit Metadata
        </h2>
        
        <div className="mb-4 text-xs text-gray-500">
          Editing: <strong className="text-white">{document.name}</strong>
        </div>

        <label className="block text-[11px] font-bold text-gray-400 mb-1.5">DOCUMENT TYPE</label>
        <select 
          value={docType} 
          onChange={(e) => setDocType(e.target.value)} 
          className="w-full bg-[#1a202c] border border-[#2d3748] text-white p-2 rounded text-xs mb-4 focus:outline-none focus:border-blue-500"
        >
          <option value="MSA">MSA (Master Services Agreement)</option>
          <option value="AUDIT">AUDIT (SOC2, ISO, Audit Report)</option>
          <option value="INSURANCE">INSURANCE (COI)</option>
          <option value="CERT">CERTIFICATION</option>
          <option value="OTHER">OTHER</option>
        </select>

        <label className="block text-[11px] font-bold text-gray-400 mb-1.5">EXPIRATION DATE</label>
        <input 
          type="date" 
          value={expiry} 
          onChange={(e) => setExpiry(e.target.value)} 
          className="w-full bg-[#1a202c] border border-[#2d3748] text-white p-2 rounded text-xs mb-6 focus:outline-none focus:border-blue-500"
        />

        <div className="flex justify-end gap-2.5">
          <button 
            onClick={onClose} 
            className="px-4 py-2 bg-transparent border border-gray-600 text-gray-300 rounded text-xs hover:bg-gray-800 transition-colors"
          >
            Cancel
          </button>
          <button 
            onClick={handleSave} 
            disabled={isSaving}
            className={`px-5 py-2 rounded text-xs font-bold text-white transition-colors ${
              isSaving ? 'bg-orange-600 cursor-not-allowed' : 'bg-orange-500 hover:bg-orange-600'
            }`}
          >
            {isSaving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>

      </div>
    </div>
  );
}
"""

# Write files
with open('app/components/vendor-risk/DocumentList.tsx', 'w') as f:
    f.write(list_code)
print("✅ Applied Best Practices to DocumentList.tsx")

with open('app/components/vendor-risk/ArtifactDrawer.tsx', 'w') as f:
    f.write(drawer_code)
print("✅ Applied Best Practices to ArtifactDrawer.tsx")

with open('app/components/vendor-risk/EditArtifactModal.tsx', 'w') as f:
    f.write(modal_code)
print("✅ Applied Best Practices to EditArtifactModal.tsx")

