import os

print("--- PHASE 3: AUDIT DISPLAY & SORT ICON VISIBILITY FIX ---")

# ==============================================================================
# 1. DocumentList.tsx 
# FIX: Increased Sort Icon Visibility (Removed opacity-30)
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

  // FIX: Removed 'opacity-30' from ArrowUpDown to ensure visibility
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
        {/* VISIBILITY FIX: Changed opacity-30 to text-gray-600 hover:text-gray-300 */}
        {sortKey && sortConfig?.key !== sortKey && <ArrowUpDown className="w-3 h-3 ml-1 text-gray-600 group-hover:text-gray-300 transition-colors" />}
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
# 2. ArtifactDrawer.tsx
# FEATURE: Visual Audit Trail with "Sticky Note" highlighting
# ==============================================================================
drawer_code = """'use client';
import React, { useState, useEffect } from 'react';
import { X, Shield, Clock, CheckCircle, AlertTriangle, FileText, Mail, StickyNote } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { VendorArtifact } from './DocumentList';

interface DrawerProps {
  isOpen: boolean;
  onClose: () => void;
  doc: VendorArtifact | null;
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
    const className = "w-5 h-5";
    switch (style) {
      case 'success': return <CheckCircle className={`${className} text-green-400`} />;
      case 'danger': return <AlertTriangle className={`${className} text-red-400`} />;
      case 'warning': return <AlertTriangle className={`${className} text-orange-400`} />;
      case 'email': return <Mail className={`${className} text-blue-400`} />;
      default: return <Clock className={`${className} text-gray-400`} />;
    }
  };

  const toggleLog = (id: string) => {
    if (expandedLogId === id) setExpandedLogId(null);
    else setExpandedLogId(id);
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
          
          {/* Metadata Section */}
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

          {/* Audit Trail Section */}
          <h3 className="text-xs font-extrabold text-gray-600 mb-4">LIVE AUDIT TRAIL</h3>
          
          <div className="relative pl-9 border-l border-[#2d3748] ml-2.5">
            {history.length === 0 ? (
                <div className="text-xs text-gray-500 italic">No recorded history.</div>
            ) : (
                history.map((log) => {
                    const isNote = log.description.startsWith('USER_NOTE:');
                    let cleanDescription = isNote ? log.description.replace('USER_NOTE:', '').trim() : log.description;
                    const isExpanded = expandedLogId === log.id;
                    const isLongText = cleanDescription.length > 35;
                    if (!isExpanded && isLongText) {
                        cleanDescription = cleanDescription.slice(0, 35) + '...';
                    }

                    return (
                      <div key={log.id} className="mb-6 relative group">
                          <div className={`absolute -left-[45px] top-0 p-1 border rounded-full ${isNote ? 'bg-orange-900/20 border-orange-500/50' : 'bg-[#0d1117] border-[#1a202c]'}`}>
                              {getIcon(log.icon_style)}
                          </div>
                          
                          <div className="flex justify-between items-center">
                            <div className="text-sm font-bold text-gray-200">{log.action_type}</div>
                            {isNote && <StickyNote className="w-3 h-3 text-orange-400" />}
                          </div>
                          
                          <div className="text-[11px] text-gray-500 flex items-center gap-1.5 mt-0.5">
                              <Clock className="w-3 h-3" /> {new Date(log.created_at).toLocaleString()}
                          </div>
                          <div className="text-xs text-blue-400 mt-1 font-semibold">{log.user_name}</div>
                          
                          <div 
                              onClick={() => (isNote || isLongText) && toggleLog(log.id)}
                              className={`
                                text-xs mt-1.5 p-2 rounded border transition-all 
                                ${isNote 
                                  ? 'bg-orange-500/10 border-orange-500/30 text-orange-200 hover:border-orange-500/60' 
                                  : 'bg-white/5 border-[#2d3748] text-gray-400'}
                                ${(isNote || isLongText) ? 'cursor-pointer hover:bg-white/10' : ''}
                              `}
                          >
                              {isNote && <span className="text-orange-400 font-bold mr-1">📝 NOTE:</span>}
                              <span className="whitespace-pre-wrap">{cleanDescription}</span>
                          </div>
                      </div>
                    );
                })
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

with open('app/components/vendor-risk/DocumentList.tsx', 'w') as f:
    f.write(list_code)

with open('app/components/vendor-risk/ArtifactDrawer.tsx', 'w') as f:
    f.write(drawer_code)

print("✅ PHASE 3 COMPLETE: Audit Display & Sort Icons Fixed.")
