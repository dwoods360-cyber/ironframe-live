import os

print("--- INITIATING SPYGLASS SEARCH & DESTROY ---")

base_dir = 'app/components/vendor-risk'
files_to_check = ['DocumentList.tsx', 'DocumentToolbar.tsx', 'DocumentTable.tsx']

# ---------------------------------------------------------
# DEFINITIONS OF CLEAN FILES
# ---------------------------------------------------------

# 1. CLEAN TOOLBAR (No Search Icon)
clean_toolbar = """'use client';
import React from 'react';
import { Calendar } from 'lucide-react'; 

interface ToolbarProps {
  searchTerm: string;
  onSearchChange: (val: string) => void;
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
      <div className="flex items-center gap-3 px-3">
        <span className="text-xs font-bold text-[#8b949e]">GLOBAL DOCUMENT INDEX</span>
        <span className="px-2 py-0.5 rounded-full bg-[#30363d] text-[#c9d1d9] text-[10px] font-mono">
          {totalItems} Items
        </span>
      </div>
      <div className="flex items-center gap-2">
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
        <select 
          value={statusFilter}
          onChange={(e) => onStatusChange(e.target.value)}
          className="bg-[#0d1117] border border-[#30363d] text-xs text-[#c9d1d9] px-3 py-1.5 rounded focus:outline-none focus:border-[#58a6ff] hover:border-[#8b949e] transition-colors cursor-pointer"
        >
          <option value="ALL">All Statuses</option>
          <option value="VALID">Valid</option>
          <option value="EXPIRING">Expiring Soon</option>
          <option value="EXPIRED">Expired</option>
        </select>
        <div>
          <input 
            type="text" 
            placeholder="Search..." 
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            className="bg-[#0d1117] border border-[#30363d] text-xs text-[#c9d1d9] px-3 py-1.5 rounded w-48 focus:outline-none focus:border-[#58a6ff] placeholder-[#8b949e] transition-colors"
          />
        </div>
      </div>
    </div>
  );
}
"""

# 2. CLEAN LIST (Controller Only - No UI/Icons)
clean_list = """'use client';
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

# ---------------------------------------------------------
# EXECUTION
# ---------------------------------------------------------

for fname in files_to_check:
    path = os.path.join(base_dir, fname)
    if os.path.exists(path):
        with open(path, 'r') as f:
            content = f.read()
            
        # CHECK FOR SPYGLASS
        if 'Search' in content and 'lucide-react' in content:
            print(f"⚠️  VIOLATION FOUND IN: {fname}")
            
            # DESTROY AND REPLACE
            if fname == 'DocumentToolbar.tsx':
                print(f"   -> Overwriting {fname} with NO ICON version...")
                with open(path, 'w') as f: f.write(clean_toolbar)
                print("   -> FIXED.")
            
            elif fname == 'DocumentList.tsx':
                print(f"   -> Overwriting {fname} with ISOLATED CONTROLLER version...")
                with open(path, 'w') as f: f.write(clean_list)
                print("   -> FIXED.")
            
            else:
                print(f"   -> Manual review required for {fname} (Unusual location)")
        else:
            print(f"✅ CLEAN: {fname}")

print("--- SCAN COMPLETE ---")
