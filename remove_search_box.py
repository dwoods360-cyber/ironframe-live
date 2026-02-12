import os

print("--- REMOVING SEARCH BOX ENTIRELY ---")

# PATHS
toolbar_path = 'app/components/vendor-risk/DocumentToolbar.tsx'
list_path = 'app/components/vendor-risk/DocumentList.tsx'

# 1. TOOLBAR (NO SEARCH INPUT)
code_toolbar = """'use client';
import React from 'react';
import { Calendar } from 'lucide-react'; 

interface ToolbarProps {
  searchTerm: string;
  onSearchChange: (val: string) => void; // Kept for prop compatibility, unused in UI
  statusFilter: string;
  onStatusChange: (val: string) => void;
  dateFilter: string;
  onDateChange: (val: string) => void;
  totalItems: number;
}

export default function DocumentToolbar({
  searchTerm, onSearchChange,
  statusFilter, onStatusChange,
  dateFilter, onDateChange,
  totalItems
}: ToolbarProps) {
  return (
    <div className="flex items-center justify-between mb-4 p-1 bg-[#161b22] rounded-lg border border-[#30363d]">
      
      {/* LEFT: Title & Count */}
      <div className="flex items-center gap-3 px-3">
        <span className="text-xs font-bold text-[#8b949e]">GLOBAL DOCUMENT INDEX</span>
        <span className="px-2 py-0.5 rounded-full bg-[#30363d] text-[#c9d1d9] text-[10px] font-mono">
          {totalItems} Items
        </span>
      </div>

      {/* RIGHT: Filters ONLY (Search Box Removed) */}
      <div className="flex items-center gap-2">
        
        {/* Date Filter */}
        <div className="relative group">
          <select 
            value={dateFilter}
            onChange={(e) => onDateChange(e.target.value)}
            className="appearance-none bg-[#0d1117] border border-[#30363d] text-xs text-[#c9d1d9] pl-7 pr-8 py-1.5 rounded focus:outline-none focus:border-[#58a6ff] hover:border-[#8b949e] transition-colors cursor-pointer"
          >
            <option value="ALL">Any Time</option>
            <option value="7D">Last 7 Days</option>
          </select>
          <Calendar className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-[#8b949e]" />
        </div>

        {/* Status Filter */}
        <select 
          value={statusFilter}
          onChange={(e) => onStatusChange(e.target.value)}
          className="bg-[#0d1117] border border-[#30363d] text-xs text-[#c9d1d9] px-3 py-1.5 rounded focus:outline-none focus:border-[#58a6ff] hover:border-[#8b949e] transition-colors cursor-pointer mr-1"
        >
          <option value="ALL">All Statuses</option>
          <option value="VALID">Valid</option>
          <option value="EXPIRING">Expiring Soon</option>
          <option value="EXPIRED">Expired</option>
        </select>

        {/* SEARCH BOX DELETED */}
      </div>
    </div>
  );
}
"""

# 2. LIST (Controller - Ensures Import is Correct)
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
    // Search logic kept in state for future use, but UI input is gone.
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
      {/* TOOLBAR */}
      <DocumentToolbar 
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        statusFilter={statusFilter}
        onStatusChange={setStatusFilter}
        dateFilter={dateFilter}
        onDateChange={setDateFilter}
        totalItems={documents.length}
      />
      {/* TABLE */}
      <DocumentTable 
        documents={processedDocs}
        sortConfig={sortConfig}
        onSort={handleSort}
        onDelete={onDelete}
        onEdit={(doc) => setEditingDoc(doc)}
        onView={(doc) => setDrawerDoc(doc)}
      />
      {/* MODALS */}
      <ArtifactDrawer isOpen={!!drawerDoc} onClose={() => setDrawerDoc(null)} doc={drawerDoc} />
      <EditArtifactModal isOpen={!!editingDoc} onClose={() => setEditingDoc(null)} onSaveComplete={onRefresh} document={editingDoc} />
    </div>
  );
}
"""

with open(toolbar_path, 'w') as f:
    f.write(code_toolbar)

with open(list_path, 'w') as f:
    f.write(code_list)

print("✅ COMPLETED: Search Box removed from DocumentToolbar.tsx")
