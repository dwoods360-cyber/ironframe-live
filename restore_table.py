import os

print("--- RESTORING MISSING COMPONENTS (Table & Types) ---")

# PATHS
base_dir = 'app/components/vendor-risk'
table_path = f'{base_dir}/DocumentTable.tsx'
types_path = f'{base_dir}/types.ts'

# 1. TYPES (Shared Definition - Required for Table)
code_types = """export interface VendorArtifact {
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
"""

# 2. DOCUMENT TABLE (The Missing File)
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
          {documents.length === 0 ? (
            <tr><td colSpan={9} className="px-6 py-8 text-center text-[#8b949e] text-xs">No documents found.</td></tr>
          ) : (
            documents.map((doc) => {
              const status = getStatusConfig(doc.expiry, doc.type);
              const isMenuOpen = activeMenuId === doc.id;
              const StatusIcon = status.icon;

              return (
                <tr key={doc.id} className="border-b border-[#30363d] last:border-0 hover:bg-[#161b22]/50 transition-colors group">
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

with open(types_path, 'w') as f:
    f.write(code_types)
print(f"✅ RESTORED: {types_path}")

with open(table_path, 'w') as f:
    f.write(code_table)
print(f"✅ RESTORED: {table_path}")

print("--- RESTORATION COMPLETE ---")
