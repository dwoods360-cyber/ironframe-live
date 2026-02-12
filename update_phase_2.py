import os

print("--- PHASE 2: SPYGLASS TWEAK & AUDIT NOTES INPUT ---")

# ==============================================================================
# 1. DocumentList.tsx 
# UPDATE: Reduced Spyglass size to w-3 h-3
# ==============================================================================
list_code = """'use client';
import React, { useState, useEffect } from 'react';
import { 
  MoreVertical, FileText, Trash2, Download, Edit, 
  AlertCircle, CheckCircle, Clock, FileSpreadsheet, 
  File as FileIcon, Image as ImageIcon, Box, Mail, Loader2, Shield,
  Search, Calendar, ArrowUpDown, ChevronUp, ChevronDown
} from 'lucide-react';
import { sendVendorEmail } from '../../actions/email';
import ArtifactDrawer from './ArtifactDrawer';
import EditArtifactModal from './EditArtifactModal';
import { createClient } from '@/lib/supabase/client';

export interface VendorArtifact {
  id: string;
  name: string;
  vendorName: string;
  type: string;
  criticality: 'HIGH' | 'MED' | 'LOW';
  url: string;
  expiry: string | null;
  created_at: string;
  updated_at: string;
  status?: string; 
}

interface DocumentListProps {
  documents: VendorArtifact[];
  onDelete: (id: string) => void;
  onRefresh: () => void;
  onEdit: (doc: VendorArtifact) => void;
}

export default function DocumentList({ documents, onDelete, onRefresh, onEdit }: DocumentListProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [dateFilter, setDateFilter] = useState('ALL');
  const [sortConfig, setSortConfig] = useState<{ key: keyof VendorArtifact; direction: 'asc' | 'desc' } | null>(null);

  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const [sendingEmailId, setSendingEmailId] = useState<string | null>(null);
  const [drawerDoc, setDrawerDoc] = useState<VendorArtifact | null>(null);
  const [editingDoc, setEditingDoc] = useState<VendorArtifact | null>(null);
  
  const supabase = createClient();

  useEffect(() => {
    const handleClickOutside = (event: any) => {
      if (!event.target.closest('.action-menu-container')) {
        setActiveMenuId(null);
      }
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  const handleSort = (key: keyof VendorArtifact) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const getStatusConfig = (expiry: string | null, type: string) => {
    if (!expiry) {
      if (type === 'MSA') return { label: 'PERMANENT', color: 'text-gray-500 bg-gray-500/10 border-gray-500/20', icon: CheckCircle, statusKey: 'VALID' };
      return { label: 'INCOMPLETE', color: 'text-yellow-500 bg-yellow-500/10 border-yellow-500/20', icon: AlertCircle, statusKey: 'MISSING' };
    }
    const days = Math.ceil((new Date(expiry).getTime() - new Date().getTime()) / (1000 * 3600 * 24));
    if (days < 0) return { label: 'EXPIRED', color: 'text-red-500 bg-red-500/10 border-red-500/20', icon: AlertCircle, statusKey: 'EXPIRED' };
    if (days < 90) return { label: 'EXPIRING', color: 'text-orange-500 bg-orange-500/10 border-orange-500/20', icon: Clock, statusKey: 'EXPIRING' };
    return { label: 'VALID', color: 'text-green-500 bg-green-500/10 border-green-500/20', icon: CheckCircle, statusKey: 'VALID' };
  };

  const processedDocs = documents.filter((doc) => {
    const matchesSearch = 
      doc.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      doc.vendorName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'ALL' || getStatusConfig(doc.expiry, doc.type).statusKey === statusFilter;
    let matchesDate = true;
    if (dateFilter === '7D') {
      const d = new Date(doc.created_at);
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      matchesDate = d > sevenDaysAgo;
    }
    return matchesSearch && matchesStatus && matchesDate;
  });

  if (sortConfig) {
    processedDocs.sort((a, b) => {
      let valA = a[sortConfig.key];
      let valB = b[sortConfig.key];
      if (valA === null || valA === undefined) valA = '';
      if (valB === null || valB === undefined) valB = '';
      if (typeof valA === 'string') valA = valA.toLowerCase();
      if (typeof valB === 'string') valB = valB.toLowerCase();
      if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1;
      if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
  }

  const getFileIcon = (filename: string) => {
    const lower = (filename || '').toLowerCase();
    const className = "w-4 h-4 text-gray-400 group-hover:text-blue-400 transition-colors";
    if (lower.includes('.pdf')) return <FileText className={className} />;
    if (lower.includes('.xls') || lower.includes('.csv')) return <FileSpreadsheet className={className} />;
    if (lower.includes('.zip')) return <Box className={className} />;
    return <FileIcon className={className} />;
  };

  const getCriticalityColor = (level: string) => {
    switch (level) {
      case 'HIGH': return 'text-red-400';
      case 'MED': return 'text-orange-400';
      case 'LOW': return 'text-green-400';
      default: return 'text-gray-400';
    }
  };

  const handleSendEmail = async (doc: VendorArtifact) => {
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
      alert(`✅ Request sent to ${doc.vendorName}`);
      setActiveMenuId(null);
    } else {
      alert('❌ Failed to send email.');
    }
    setSendingEmailId(null);
  };

  const HeaderCell = ({ label, sortKey, width }: { label: string, sortKey?: keyof VendorArtifact, width?: string }) => (
    <th 
      className={`px-4 py-3 text-left text-[10px] font-bold text-[#8b949e] uppercase tracking-wider ${sortKey ? 'cursor-pointer hover:text-white group' : ''}`}
      style={{ width }}
      onClick={() => sortKey && handleSort(sortKey)}
    >
      <div className="flex items-center">
        {label}
        {sortKey && sortConfig?.key === sortKey && (
            sortConfig.direction === 'asc' ? <ChevronUp className="w-3 h-3 ml-1 text-blue-400" /> : <ChevronDown className="w-3 h-3 ml-1 text-blue-400" />
        )}
        {sortKey && sortConfig?.key !== sortKey && <ArrowUpDown className="w-3 h-3 ml-1 opacity-30 group-hover:opacity-100" />}
      </div>
    </th>
  );

  return (
    <div className="w-full pb-24">
      {/* TOOLBAR */}
      <div className="flex items-center justify-between mb-4 p-1 bg-[#161b22] rounded-lg border border-[#30363d]">
        <div className="flex items-center gap-3 px-3">
          <span className="text-xs font-bold text-[#8b949e]">GLOBAL DOCUMENT INDEX</span>
          <span className="px-2 py-0.5 rounded-full bg-[#30363d] text-[#c9d1d9] text-[10px] font-mono">
            {documents.length} Items
          </span>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative group">
            <select value={dateFilter} onChange={(e) => setDateFilter(e.target.value)} className="appearance-none bg-[#0d1117] border border-[#30363d] text-xs text-[#c9d1d9] pl-8 pr-8 py-1.5 rounded focus:outline-none focus:border-[#58a6ff] hover:border-[#8b949e] transition-colors cursor-pointer">
              <option value="ALL">Any Time</option>
              <option value="7D">Last 7 Days</option>
            </select>
            <Calendar className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#8b949e]" />
          </div>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="bg-[#0d1117] border border-[#30363d] text-xs text-[#c9d1d9] px-3 py-1.5 rounded focus:outline-none focus:border-[#58a6ff] hover:border-[#8b949e] transition-colors cursor-pointer">
            <option value="ALL">All Statuses</option>
            <option value="VALID">Valid</option>
            <option value="EXPIRING">Expiring Soon</option>
            <option value="EXPIRED">Expired</option>
          </select>
          <div className="relative">
            {/* SPYGLASS FIX: Reduced to w-3 h-3 */}
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-[#8b949e]" />
            <input type="text" placeholder="Search..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="bg-[#0d1117] border border-[#30363d] text-xs text-[#c9d1d9] pl-8 pr-3 py-1.5 rounded w-48 focus:outline-none focus:border-[#58a6ff] placeholder-[#8b949e] transition-colors" />
          </div>
        </div>
      </div>

      {/* TABLE */}
      <div className="bg-[#0d1117] border border-[#30363d] rounded-lg overflow-hidden">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-[#161b22] border-b border-[#30363d]">
              <HeaderCell label="Name" sortKey="name" width="30%" />
              <HeaderCell label="Vendor" sortKey="vendorName" width="20%" />
              <HeaderCell label="Type" sortKey="type" width="10%" />
              <HeaderCell label="Criticality" sortKey="criticality" width="10%" />
              <HeaderCell label="Uploaded" sortKey="created_at" width="10%" />
              <HeaderCell label="Updated" sortKey="updated_at" width="10%" />
              <HeaderCell label="Expiry" sortKey="expiry" width="10%" />
              <HeaderCell label="Status" width="10%" />
              <th className="px-4 py-3 text-right text-[10px] font-bold text-[#8b949e] uppercase tracking-wider">Action</th>
            </tr>
          </thead>
          <tbody>
            {processedDocs.length === 0 ? (
              <tr><td colSpan={9} className="px-6 py-8 text-center text-[#8b949e] text-xs">No documents found.</td></tr>
            ) : (
              processedDocs.map((doc) => {
                const status = getStatusConfig(doc.expiry, doc.type);
                const isMenuOpen = activeMenuId === doc.id;
                const StatusIcon = status.icon;
                return (
                  <tr key={doc.id} className="border-b border-[#30363d] last:border-0 hover:bg-[#161b22]/50 transition-colors group">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        {getFileIcon(doc.url || doc.name)}
                        <a href={doc.url} target="_blank" rel="noopener noreferrer" className="text-sm font-semibold text-gray-200 group-hover:text-blue-400 transition-colors truncate max-w-[200px]" title={doc.name}>{doc.name}</a>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs text-blue-400 hover:underline cursor-pointer">{doc.vendorName}</td>
                    <td className="px-4 py-3"><span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#30363d] text-gray-300 border border-[#30363d]">{doc.type}</span></td>
                    <td className={`px-4 py-3 text-xs font-bold ${getCriticalityColor(doc.criticality)}`}>{doc.criticality}</td>
                    <td className="px-4 py-3 text-xs text-gray-500 font-mono">{new Date(doc.created_at).toLocaleDateString()}</td>
                    <td className="px-4 py-3 text-xs text-gray-500 font-mono">{new Date(doc.updated_at).toLocaleDateString()}</td>
                    <td className={`px-4 py-3 text-xs font-mono ${doc.expiry ? 'text-gray-400' : 'text-yellow-600'}`}>{doc.expiry ? new Date(doc.expiry).toLocaleDateString() : 'Required*'}</td>
                    <td className="px-4 py-3">
                      <span className={`flex items-center w-fit gap-1.5 px-2 py-0.5 rounded text-[10px] font-bold border ${status.color}`}>
                        <StatusIcon className="w-3 h-3" /> {status.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right relative action-menu-container">
                      <button onClick={(e) => { e.stopPropagation(); setActiveMenuId(isMenuOpen ? null : doc.id); }} className={`p-1 rounded hover:bg-gray-800 ${isMenuOpen ? 'text-white' : 'text-gray-500'}`}>
                        <MoreVertical className="w-4 h-4" />
                      </button>
                      {isMenuOpen && (
                        <div className="absolute right-0 top-8 w-44 bg-[#1a202c] border border-[#2d3748] rounded-md shadow-xl z-50 flex flex-col overflow-hidden">
                          <button onClick={() => handleSendEmail(doc)} disabled={!!sendingEmailId} className="flex items-center gap-2 px-4 py-2 text-xs text-gray-200 hover:bg-gray-800 text-left border-b border-[#2d3748]">
                            {sendingEmailId === doc.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Mail className="w-3 h-3" />} {sendingEmailId === doc.id ? 'Sending...' : 'Request Update'}
                          </button>
                          <button onClick={() => { setDrawerDoc(doc); setActiveMenuId(null); }} className="flex items-center gap-2 px-4 py-2 text-xs text-gray-200 hover:bg-gray-800 text-left border-b border-[#2d3748]">
                            <Shield className="w-3 h-3" /> Audit History
                          </button>
                          <button onClick={() => { setEditingDoc(doc); setActiveMenuId(null); }} className="flex items-center gap-2 px-4 py-2 text-xs text-gray-200 hover:bg-gray-800 text-left">
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
              })
            )}
          </tbody>
        </table>
      </div>
      <ArtifactDrawer isOpen={!!drawerDoc} onClose={() => setDrawerDoc(null)} doc={drawerDoc} />
      <EditArtifactModal isOpen={!!editingDoc} onClose={() => setEditingDoc(null)} onSaveComplete={onRefresh} document={editingDoc} />
    </div>
  );
}
"""

# ==============================================================================
# 2. EditArtifactModal.tsx
# FEATURE: Audit Notes Input (textarea)
# SAFETY: Strictly typed props
# ==============================================================================
modal_code = """'use client';
import React, { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { VendorArtifact } from './DocumentList';

interface EditModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveComplete: () => void;
  document: VendorArtifact | null;
}

export default function EditArtifactModal({ isOpen, onClose, onSaveComplete, document }: EditModalProps) {
  const [docType, setDocType] = useState('MSA');
  const [expiry, setExpiry] = useState('');
  const [newNote, setNewNote] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  
  const supabase = createClient();

  useEffect(() => {
    if (document) {
      setDocType(document.type || 'MSA');
      setExpiry(document.expiry ? document.expiry.split('T')[0] : '');
      setNewNote('');
    }
  }, [document]);

  const handleSave = async () => {
    if (!document) return;
    setIsSaving(true);
    
    // 1. Update Metadata
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
      // 2. Log Audit Event with Note
      const logDescription = newNote.trim() 
        ? `USER_NOTE: ${newNote.trim()}` 
        : `Updated metadata: Type=${docType}, Expiry=${expiry || 'None'}`;
      const iconStyle = newNote.trim() ? 'warning' : 'success';

      await supabase.rpc('log_audit_event', {
        p_artifact_id: String(document.id),
        p_user_name: 'Dereck (Admin)', 
        p_action_type: 'METADATA_UPDATE',
        p_description: logDescription,
        p_icon_style: iconStyle
      });
      onSaveComplete();
      onClose();
    }
    setIsSaving(false);
  };

  if (!isOpen || !document) return null;

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="bg-[#0d1117] w-[450px] p-6 rounded-lg border border-[#2d3748] shadow-2xl">
        <h2 className="text-white text-base font-bold border-b border-[#2d3748] pb-3 mb-5">
          📝 Edit Metadata & Audit Notes
        </h2>
        <div className="mb-4 text-xs text-gray-500">
          Editing: <strong className="text-white">{document.name}</strong>
        </div>
        <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
                <label className="block text-[11px] font-bold text-gray-400 mb-1.5">DOCUMENT TYPE</label>
                <select value={docType} onChange={(e) => setDocType(e.target.value)} className="w-full bg-[#1a202c] border border-[#2d3748] text-white p-2 rounded text-xs focus:outline-none focus:border-blue-500">
                  <option value="MSA">MSA</option>
                  <option value="AUDIT">AUDIT</option>
                  <option value="INSURANCE">INSURANCE</option>
                  <option value="CERT">CERT</option>
                  <option value="OTHER">OTHER</option>
                </select>
            </div>
            <div>
                <label className="block text-[11px] font-bold text-gray-400 mb-1.5">EXPIRATION DATE</label>
                <input type="date" value={expiry} onChange={(e) => setExpiry(e.target.value)} className="w-full bg-[#1a202c] border border-[#2d3748] text-white p-2 rounded text-xs focus:outline-none focus:border-blue-500" />
            </div>
        </div>
        
        {/* NEW FEATURE: Audit Note Input */}
        <label className="block text-[11px] font-bold text-orange-400 mb-1.5">ADD AUDIT NOTE (OPTIONAL)</label>
        <textarea 
            value={newNote}
            onChange={(e) => setNewNote(e.target.value)}
            placeholder="Enter reason for change, exception details, or compliance notes..."
            className="w-full bg-[#1a202c] border border-[#2d3748] text-white p-2.5 rounded text-xs mb-6 h-24 resize-none focus:outline-none focus:border-orange-500 placeholder-gray-600"
        />

        <div className="flex justify-end gap-2.5">
          <button onClick={onClose} className="px-4 py-2 bg-transparent border border-gray-600 text-gray-300 rounded text-xs hover:bg-gray-800 transition-colors">Cancel</button>
          <button onClick={handleSave} disabled={isSaving} className={`px-5 py-2 rounded text-xs font-bold text-white transition-colors ${isSaving ? 'bg-orange-600 cursor-not-allowed' : 'bg-orange-500 hover:bg-orange-600'}`}>
            {isSaving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
}
"""

with open('app/components/vendor-risk/DocumentList.tsx', 'w') as f:
    f.write(list_code)

with open('app/components/vendor-risk/EditArtifactModal.tsx', 'w') as f:
    f.write(modal_code)

print("✅ PHASE 2 COMPLETE: Spyglass Resized & Audit Notes Input Added.")
