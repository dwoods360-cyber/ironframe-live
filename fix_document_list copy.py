import os

print("--- FORCIBLE RESTORE: DocumentList.tsx ---")

target_file = 'app/components/vendor-risk/DocumentList.tsx'

# The 1:00 PM Stable Code
code = """'use client';
import React, { useState } from 'react';
import { 
  FileText, Search, Filter, Download, 
  Trash2, Calendar, AlertTriangle 
} from 'lucide-react';
import ArtifactDrawer from './ArtifactDrawer';
import EditArtifactModal from './EditArtifactModal';

interface DocumentListProps {
  documents: any[];
  onDelete?: (id: string) => void;
  onRefresh?: () => void;
}

export default function DocumentList({ documents, onDelete, onRefresh }: DocumentListProps) {
  // 1. STATE
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [dateFilter, setDateFilter] = useState('ALL');

  // Modals
  const [selectedDoc, setSelectedDoc] = useState<any | null>(null);
  const [editingDoc, setEditingDoc] = useState<any | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  // 2. FILTERS
  const filteredDocs = documents.filter((doc) => {
    const matchesSearch = 
      doc.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      doc.vendorName.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'ALL' || doc.status === statusFilter;
    
    let matchesDate = true;
    if (dateFilter === '7D') {
      const d = new Date(doc.uploadedAt);
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      matchesDate = d > sevenDaysAgo;
    }

    return matchesSearch && matchesStatus && matchesDate;
  });

  // 3. HELPERS
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'VALID': return 'text-green-400 bg-green-400/10 border-green-400/20';
      case 'EXPIRING': return 'text-orange-400 bg-orange-400/10 border-orange-400/20';
      case 'EXPIRED': return 'text-red-400 bg-red-400/10 border-red-400/20';
      case 'MISSING': return 'text-gray-400 bg-gray-400/10 border-gray-400/20';
      default: return 'text-blue-400 bg-blue-400/10 border-blue-400/20';
    }
  };

  const getCriticalityColor = (level: string) => {
    switch (level) {
      case 'HIGH': return 'text-red-400';
      case 'MED': return 'text-yellow-400';
      case 'LOW': return 'text-green-400';
      default: return 'text-gray-400';
    }
  };

  return (
    <div className="w-full">
      
      {/* TOOLBAR */}
      <div className="flex items-center justify-between mb-4 p-1 bg-[#161b22] rounded-lg border border-[#30363d]">
        <div className="flex items-center gap-3 px-3">
          <span className="text-xs font-bold text-[#8b949e]">GLOBAL DOCUMENT INDEX</span>
          <span className="px-2 py-0.5 rounded-full bg-[#30363d] text-[#c9d1d9] text-[10px] font-mono">
            {documents.length} Items
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Date */}
          <div className="relative group">
            <select 
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="appearance-none bg-[#0d1117] border border-[#30363d] text-xs text-[#c9d1d9] pl-8 pr-8 py-1.5 rounded focus:outline-none focus:border-[#58a6ff]"
            >
              <option value="ALL">Any Time</option>
              <option value="7D">Last 7 Days</option>
              <option value="30D">Last 30 Days</option>
            </select>
            <Calendar className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#8b949e]" />
          </div>

          {/* Status */}
          <select 
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-[#0d1117] border border-[#30363d] text-xs text-[#c9d1d9] px-3 py-1.5 rounded focus:outline-none focus:border-[#58a6ff]"
          >
            <option value="ALL">All Statuses</option>
            <option value="VALID">Valid</option>
            <option value="EXPIRING">Expiring Soon</option>
            <option value="EXPIRED">Expired</option>
          </select>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#8b949e]" />
            <input 
              type="text" 
              placeholder="Search..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="bg-[#0d1117] border border-[#30363d] text-xs text-[#c9d1d9] pl-8 pr-3 py-1.5 rounded w-48 focus:outline-none focus:border-[#58a6ff] placeholder-[#8b949e]"
            />
          </div>
        </div>
      </div>

      {/* TABLE */}
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
            {filteredDocs.length === 0 ? (
              <tr>
                <td colSpan={9} className="px-6 py-8 text-center text-[#8b949e] text-xs">
                  No documents found.
                </td>
              </tr>
            ) : (
              filteredDocs.map((doc) => (
                <tr key={doc.id} className="border-b border-[#30363d] last:border-0 hover:bg-[#161b22]/50 transition-colors group">
                  <td className="px-4 py-3">
                    <div 
                      onClick={() => { setSelectedDoc(doc); setIsDrawerOpen(true); }}
                      className="flex items-center gap-3 cursor-pointer"
                    >
                      <FileText className="w-4 h-4 text-[#c9d1d9] group-hover:text-[#58a6ff] transition-colors" />
                      <span className="text-sm font-semibold text-[#e6edf3] group-hover:text-[#58a6ff] transition-colors truncate max-w-[200px]">
                        {doc.name}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-xs text-[#58a6ff] hover:underline cursor-pointer">{doc.vendorName}</td>
                  <td className="px-4 py-3"><span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#30363d] text-[#c9d1d9] border border-[#30363d]">{doc.type}</span></td>
                  <td className={`px-4 py-3 text-xs font-bold ${getCriticalityColor(doc.criticality)}`}>{doc.criticality}</td>
                  <td className="px-4 py-3 text-xs text-[#8b949e] font-mono">{new Date(doc.uploadedAt).toLocaleDateString()}</td>
                  <td className="px-4 py-3 text-xs text-[#8b949e] font-mono">{new Date(doc.updatedAt).toLocaleDateString()}</td>
                  <td className="px-4 py-3 text-xs text-[#8b949e] font-mono">{doc.expiry ? new Date(doc.expiry).toLocaleDateString() : '-'}</td>
                  <td className="px-4 py-3">
                    <span className={`flex items-center w-fit gap-1.5 px-2 py-0.5 rounded text-[10px] font-bold border ${getStatusColor(doc.status)}`}>
                      {doc.status === 'EXPIRING' && <AlertTriangle className="w-3 h-3" />}
                      {doc.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => { setSelectedDoc(doc); setIsDrawerOpen(true); }} className="p-1.5 text-[#8b949e] hover:text-[#58a6ff]"><Search className="w-3.5 h-3.5" /></button>
                      <button onClick={() => { setEditingDoc(doc); setIsEditModalOpen(true); }} className="p-1.5 text-[#8b949e] hover:text-[#e3b341]"><Filter className="w-3.5 h-3.5" /></button>
                      <a href={doc.url} target="_blank" rel="noopener noreferrer" className="p-1.5 text-[#8b949e] hover:text-[#3fb950]"><Download className="w-3.5 h-3.5" /></a>
                      {onDelete && <button onClick={() => onDelete(doc.id)} className="p-1.5 text-[#8b949e] hover:text-[#f85149]"><Trash2 className="w-3.5 h-3.5" /></button>}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <ArtifactDrawer isOpen={isDrawerOpen} onClose={() => setIsDrawerOpen(false)} doc={selectedDoc} />
      
      <EditArtifactModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        onSaveComplete={() => { if (onRefresh) onRefresh(); }}
        document={editingDoc}
      />
    </div>
  );
}
"""

# Force Write
with open(target_file, 'w') as f:
    f.write(code)

print("✅ DocumentList.tsx has been forcibly reset to the 1:00 PM state.")
