import os
import time

print("--- EXECUTING FINAL LAYOUT FIX & ISOLATION ---")

# PATHS
base_dir = 'app/components/vendor-risk'
list_path = f'{base_dir}/DocumentList.tsx'
table_path = f'{base_dir}/DocumentTable.tsx'

# 1. FORCE DELETE EXISTING FILES
print("1. Deleting old list and table files...")
if os.path.exists(list_path): os.remove(list_path)
if os.path.exists(table_path): os.remove(table_path)
time.sleep(0.5) # Give the filesystem a moment

# 2. CREATE THE CORRECT TABLE (Matches Target Image Layout)
print("2. Creating new DocumentTable.tsx with correct layout...")
code_table = """'use client';
import React, { useState, useEffect } from 'react';
import { 
  MoreVertical, FileText, Trash2, Download, Edit, 
  AlertCircle, CheckCircle, Clock, FileSpreadsheet, 
  File as FileIcon, Box, Mail, Loader2, Shield,
  ArrowUpDown, ChevronUp, ChevronDown, Image as ImageIcon
} from 'lucide-react';
import { VendorArtifact } from './types';
import { createClient } from '@/lib/supabase/client';
import { sendVendorEmail } from '../../actions/email';

interface TableProps {
  documents: VendorArtifact[];
  sortConfig: { key: keyof VendorArtifact; direction: 'asc' | 'desc' } | null;
  onSort: (key: keyof VendorArtifact) => void;
  onDelete: (id: string) => void;
  onEdit: (doc: VendorArtifact) => void;
  onView: (doc: VendorArtifact) => void;
}

export default function DocumentTable({ documents, sortConfig, onSort, onDelete, onEdit, onView }: TableProps) {
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const [sendingEmailId, setSendingEmailId] = useState<string | null>(null);
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

  const getFileIcon = (filename: string) => {
    const lower = (filename || '').toLowerCase();
    const className = "w-4 h-4 text-gray-400 group-hover:text-blue-400 transition-colors";
    if (lower.includes('.pdf')) return <FileText className={className} />;
    if (lower.includes('.xls') || lower.includes('.csv')) return <FileSpreadsheet className={className} />;
    if (lower.includes('.zip')) return <Box className={className} />;
    if (lower.includes('.jpg') || lower.includes('.png')) return <ImageIcon className={className} />;
    return <FileIcon className={className} />;
  };

  const getStatusConfig = (expiry: string | null, type: string) => {
    if (!expiry) {
      if (type === 'MSA') return { label: 'PERMANENT', color: 'text-gray-500', icon: CheckCircle };
      return { label: 'INCOMPLETE', color: 'text-yellow-500', icon: AlertCircle };
    }
    const days = Math.ceil((new Date(expiry).getTime() - new Date().getTime()) / (1000 * 3600 * 24));
    if (days < 0) return { label: 'EXPIRED', color: 'text-red-500', icon: AlertCircle };
    if (days < 90) return { label: 'EXPIRING', color: 'text-orange-500', icon: Clock };
    return { label: 'VALID', color: 'text-green-500', icon: CheckCircle };
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
      onClick={() => sortKey && onSort(sortKey)}
    >
      <div className="flex items-center">
        {label}
        {sortKey && sortConfig?.key === sortKey && (
            sortConfig.direction === 'asc' ? <ChevronUp className="w-3 h-3 ml-1 text-blue-400" /> : <ChevronDown className="w-3 h-3 ml-1 text-blue-400" />
        )}
        {sortKey && sortConfig?.key !== sortKey && <ArrowUpDown className="w-3 h-3 ml-1 text-gray-600 group-hover:text-gray-300 transition-colors" />}
      </div>
    </th>
  );

  return (
    <div className="bg-[#0d1117] border border-[#30363d] rounded-lg overflow-hidden">
      <table className="w-full border-collapse">
        <thead>
          <tr className="bg-[#161b22] border-b border-[#30363d]">
            <HeaderCell label="Name" sortKey="name" width="25%" />
            <HeaderCell label="Vendor" sortKey="vendorName" width="15%" />
            <HeaderCell label="Type" sortKey="type" width="10%" />
            <HeaderCell label="Criticality" sortKey="criticality" width="10%" />
            <HeaderCell label="Uploaded" sortKey="created_at" width="10%" />
            <HeaderCell label="Updated" sortKey="updated_at" width="10%" />
            <HeaderCell label="Expiry" sortKey="expiry" width="10%" />
            <HeaderCell label="Status" width="10%" />
            <th className="px-4 py-3 text-right text-[10px] font-bold text-[#8b949e] uppercase tracking-wider" style={{ width: '5%' }}>Action</th>
          </tr>
        </thead>
        <tbody>
          {documents.length === 0 ? (
            <tr><td colSpan={9} className="px-6 py-8 text-center text-[#8b949e] text-xs">No documents found.</td></tr>
          ) : (
            documents.map((doc) => {
              const status = getStatusConfig(doc.expiry, doc.type);
              const isMenuOpen = activeMenuId === doc.id;
              const StatusIcon = status.icon;

              return (
                <tr key={doc.id} className="border-b border-[#30363d] last:border-0 hover:bg-[#161b22]/50 transition-colors group">
                  {/* NAME */}
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      {getFileIcon(doc.url || doc.name)}
                      <a 
                        onClick={() => onView(doc)}
                        className="text-sm font-semibold text-gray-200 group-hover:text-blue-400 transition-colors truncate max-w-[200px] cursor-pointer" 
                        title={doc.name}
                      >
                         {doc.name}
                      </a>
                    </div>
                  </td>
                  {/* VENDOR */}
                  <td className="px-4 py-3 text-xs text-blue-400 hover:underline cursor-pointer">{doc.vendorName}</td>
                  {/* TYPE */}
                  <td className="px-4 py-3"><span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#30363d] text-gray-300 border border-[#30363d]">{doc.type}</span></td>
                  {/* CRITICALITY */}
                  <td className={`px-4 py-3 text-xs font-bold ${getCriticalityColor(doc.criticality)}`}>{doc.criticality}</td>
                  {/* DATES */}
                  <td className="px-4 py-3 text-xs text-gray-500 font-mono">{new Date(doc.created_at).toLocaleDateString()}</td>
                  <td className="px-4 py-3 text-xs text-gray-500 font-mono">{new Date(doc.updated_at).toLocaleDateString()}</td>
                  <td className={`px-4 py-3 text-xs font-mono ${doc.expiry ? 'text-gray-400' : 'text-yellow-600'}`}>{doc.expiry ? new Date(doc.expiry).toLocaleDateString() : 'Required*'}</td>
                  {/* STATUS */}
                  <td className="px-4 py-3">
                    <div className={`flex items-center gap-1.5 ${status.color}`}>
                      <StatusIcon className="w-4 h-4" />
                      <span className="text-[10px] font-bold">{status.label}</span>
                    </div>
                  </td>
                  {/* ACTION */}
                  <td className="px-4 py-3 text-right relative action-menu-container">
                    <button onClick={(e) => { e.stopPropagation(); setActiveMenuId(isMenuOpen ? null : doc.id); }} className={`p-1 rounded hover:bg-gray-800 ${isMenuOpen ? 'text-white' : 'text-gray-500'}`}>
                      <MoreVertical className="w-4 h-4" />
                    </button>
                    {isMenuOpen && (
                      <div className="absolute right-0 top-8 w-44 bg-[#1a202c] border border-[#2d3748] rounded-md shadow-xl z-50 flex flex-col overflow-hidden">
                        <button onClick={() => handleSendEmail(doc)} disabled={!!sendingEmailId} className="flex items-center gap-2 px-4 py-2 text-xs text-gray-200 hover:bg-gray-800 text-left border-b border-[#2d3748]">
                          {sendingEmailId === doc.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Mail className="w-3 h-3" />} {sendingEmailId === doc.id ? 'Sending...' : 'Request Update'}
                        </button>
                        <button onClick={() => { onView(doc); setActiveMenuId(null); }} className="flex items-center gap-2 px-4 py-2 text-xs text-gray-200 hover:bg-gray-800 text-left border-b border-[#2d3748]">
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
            })
          )}
        </tbody>
      </table>
    </div>
  );
}
"""
with open(table_path, 'w') as f:
    f.write(code_table)

# 3. CREATE THE CONTROLLER (DocumentList.tsx)
print("3. Creating new DocumentList.tsx controller...")
code_list = """'use client';
import React, { useState } from 'react';
import ArtifactDrawer from './ArtifactDrawer';
import EditArtifactModal from './EditArtifactModal';
import DocumentToolbar from './DocumentToolbar';
import DocumentTable from './DocumentTable';
import { VendorArtifact } from './types';

interface DocumentListProps {
  documents: VendorArtifact[];
  onDelete: (id: string) => void;
  onRefresh: () => void;
  onEdit: (doc: VendorArtifact) => void;
}

export default function DocumentList({ documents, onDelete, onRefresh }: DocumentListProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [dateFilter, setDateFilter] = useState('ALL');
  const [sortConfig, setSortConfig] = useState<{ key: keyof VendorArtifact; direction: 'asc' | 'desc' } | null>(null);
  
  const [drawerDoc, setDrawerDoc] = useState<VendorArtifact | null>(null);
  const [editingDoc, setEditingDoc] = useState<VendorArtifact | null>(null);

  const getStatusKey = (expiry: string | null, type: string) => {
    if (!expiry) return type === 'MSA' ? 'VALID' : 'MISSING';
    const days = Math.ceil((new Date(expiry).getTime() - new Date().getTime()) / (1000 * 3600 * 24));
    if (days < 0) return 'EXPIRED';
    if (days < 90) return 'EXPIRING';
    return 'VALID';
  };

  const processedDocs = documents.filter((doc) => {
    const matchesSearch = 
      doc.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      doc.vendorName.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'ALL' || getStatusKey(doc.expiry, doc.type) === statusFilter;
    
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

  const handleSort = (key: keyof VendorArtifact) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  return (
    <div className="w-full pb-24">
      <DocumentToolbar 
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        statusFilter={statusFilter}
        onStatusChange={setStatusFilter}
        dateFilter={dateFilter}
        onDateChange={setDateFilter}
        totalItems={documents.length}
      />
      <DocumentTable 
        documents={processedDocs}
        sortConfig={sortConfig}
        onSort={handleSort}
        onDelete={onDelete}
        onEdit={(doc) => setEditingDoc(doc)}
        onView={(doc) => setDrawerDoc(doc)}
      />
      <ArtifactDrawer isOpen={!!drawerDoc} onClose={() => setDrawerDoc(null)} doc={drawerDoc} />
      <EditArtifactModal isOpen={!!editingDoc} onClose={() => setEditingDoc(null)} onSaveComplete={onRefresh} document={editingDoc} />
    </div>
  );
}
"""
with open(list_path, 'w') as f:
    f.write(code_list)

print("✅ FINAL LAYOUT FIX & ISOLATION COMPLETE.")
print("⚠️  CRITICAL: You MUST stop your server, run 'rm -rf .next', and restart it for this to take effect.")
