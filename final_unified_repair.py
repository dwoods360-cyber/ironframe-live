import os

print("--- 🛠️ EXECUTING FINAL UNIFIED REPAIR ---")

# PATHS
page_path = 'app/reports/vendor-risk/artifacts/page.tsx'
list_path = 'app/components/vendor-risk/DocumentList.tsx'

# 1. REWRITE ARTIFACTS PAGE (The Controller)
# - Completely removes search input, icon, and search-related state
# - Keeps data fetching and other filters
page_code = """'use client';
import React, { useEffect, useState } from 'react';
import Header from '@/app/components/structure/Header';
import DocumentList from '@/app/components/vendor-risk/DocumentList';
import UploadArtifactModal from '@/app/components/vendor-risk/UploadArtifactModal';
import EditArtifactModal from '@/app/components/vendor-risk/EditArtifactModal';
import SystemActivityModal from '@/app/components/vendor-risk/SystemActivityModal'; 
import { createClient } from '@/lib/supabase/client';
import { Activity } from 'lucide-react'; 

export default function ArtifactLibraryPage() {
  const [documents, setDocuments] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploadOpen, setIsUploadOpen] = useState(false); 
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isActivityOpen, setIsActivityOpen] = useState(false); 
  const [selectedDoc, setSelectedDoc] = useState(null);

  const [statusFilter, setStatusFilter] = useState('ALL');
  const [dateRange, setDateRange] = useState('ALL');
  const [timelineView, setTimelineView] = useState('HISTORY'); 
   
  const supabase = createClient();

  const fetchDocs = async () => {
    setIsLoading(true);
    const { data } = await supabase.from('vendor_artifacts').select('*, vendor_risk_inventory(vendor_name, criticality)');
    if (data) {
        setDocuments(data.map(item => ({
            id: String(item.id),
            name: item.name,
            vendorName: item.vendor_risk_inventory?.vendor_name || 'Unknown',
            type: item.document_type,
            expiry: item.expiry_date,
            created_at: item.created_at,
            updated_at: item.updated_at,
            url: item.file_url,
            criticality: item.vendor_risk_inventory?.criticality || 'LOW' 
        })));
    }
    setIsLoading(false);
  };

  useEffect(() => { fetchDocs(); }, []);

  const processedDocuments = documents.filter(doc => {
    if (statusFilter !== 'ALL') {
      const days = doc.expiry ? Math.ceil((new Date(doc.expiry).getTime() - new Date().getTime()) / (1000 * 3600 * 24)) : null;
      if (statusFilter === 'EXPIRING' && (days === null || days > 90)) return false;
      if (statusFilter === 'EXPIRED' && (days === null || days >= 0)) return false;
    }
    return true;
  });

  return (
    <div className="flex flex-col h-screen bg-[#0d1117] text-white overflow-hidden">
      <Header />
      <div className="flex-shrink-0 h-12 bg-blue-700 flex items-center justify-between px-6 border-b border-blue-400">
        <div className="text-xs font-bold">📂 EVIDENCE & ARTIFACT LIBRARY</div>
        <div className="flex gap-2">
           <button onClick={() => setIsActivityOpen(true)} className="px-3 py-1 bg-black/20 border border-blue-200 text-[10px] font-bold rounded flex items-center gap-1"><Activity className="w-3 h-3" /> ACTIVITY LOG</button>
           <button onClick={() => setIsUploadOpen(true)} className="px-3 py-1 bg-white text-blue-700 text-[10px] font-black rounded">UPLOAD NEW</button>
        </div>
      </div>

      <div className="flex-1 flex flex-col p-8 max-w-[1400px] w-full mx-auto overflow-hidden">
        <div className="flex-1 flex flex-col bg-[#161b22] border border-[#30363d] rounded-t-xl overflow-hidden">
          <div className="flex-shrink-0 p-5 flex items-center justify-between border-b border-[#30363d]">
            <div className="flex items-center gap-4">
               <h3 className="text-xs font-black text-gray-500">GLOBAL DOCUMENT INDEX</h3>
               <span className="px-2 py-0.5 bg-[#30363d] rounded-full text-[10px] text-gray-400">{processedDocuments.length} Items</span>
               <div className="w-[1px] h-5 bg-[#30363d]" />
               <select value={dateRange} onChange={e => setDateRange(e.target.value)} className="bg-[#0d1117] border border-[#30363d] text-[11px] px-3 py-1.5 rounded outline-none focus:border-blue-500">
                 <option value="ALL">Any Time</option>
                 <option value="7D">Last 7 Days</option>
               </select>
               <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="bg-[#0d1117] border border-[#30363d] text-[11px] px-3 py-1.5 rounded outline-none focus:border-blue-500">
                 <option value="ALL">All Statuses</option>
                 <option value="VALID">Valid</option>
                 <option value="EXPIRING">Expiring Soon</option>
                 <option value="EXPIRED">Expired</option>
               </select>
            </div>
          </div>
          
          <div className="flex-1 overflow-y-auto px-6">
            <DocumentList documents={processedDocuments} onDelete={fetchDocs} onEdit={fetchDocs} />
          </div>
        </div>
      </div>

      <UploadArtifactModal isOpen={isUploadOpen} onClose={() => setIsUploadOpen(false)} onUploadComplete={fetchDocs} />
      <EditArtifactModal isOpen={isEditOpen} onClose={() => setIsEditOpen(false)} onSaveComplete={fetchDocs} document={selectedDoc} />
      <SystemActivityModal isOpen={isActivityOpen} onClose={() => setIsActivityOpen(false)} />
    </div>
  );
}
"""

# 2. REWRITE DOCUMENTLIST.TSX (The Table)
# - Fixed Column alignment and styling
list_code = """'use client';
import React from 'react';
import { MoreVertical, FileText, CheckCircle, AlertCircle, Clock } from 'lucide-react';

export default function DocumentList({ documents, onDelete, onEdit }) {
  const getStatus = (expiry) => {
    if (!expiry) return { label: 'VALID', color: 'text-green-500', icon: CheckCircle };
    const days = Math.ceil((new Date(expiry).getTime() - new Date().getTime()) / (1000 * 3600 * 24));
    if (days < 0) return { label: 'EXPIRED', color: 'text-red-500', icon: AlertCircle };
    if (days < 90) return { label: 'EXPIRING', color: 'text-orange-500', icon: Clock };
    return { label: 'VALID', color: 'text-green-500', icon: CheckCircle };
  };

  return (
    <table className="w-full border-collapse">
      <thead>
        <tr className="text-[10px] font-black text-gray-500 uppercase tracking-widest border-b border-[#30363d]">
          <th className="py-4 text-left px-2">Name</th>
          <th className="py-4 text-left px-2">Vendor</th>
          <th className="py-4 text-left px-2">Type</th>
          <th className="py-4 text-left px-2">Criticality</th>
          <th className="py-4 text-left px-2">Uploaded</th>
          <th className="py-4 text-left px-2">Status</th>
          <th className="py-4 text-right px-2">Action</th>
        </tr>
      </thead>
      <tbody>
        {documents.map(doc => {
          const status = getStatus(doc.expiry);
          const Icon = status.icon;
          return (
            <tr key={doc.id} className="border-b border-[#30363d]/50 hover:bg-white/5 transition-colors group">
              <td className="py-3 px-2 flex items-center gap-3">
                <FileText className="w-4 h-4 text-gray-500" />
                <span className="text-sm font-bold text-gray-200">{doc.name}</span>
              </td>
              <td className="py-3 px-2 text-xs text-blue-400">{doc.vendorName}</td>
              <td className="py-3 px-2"><span className="px-2 py-0.5 bg-[#30363d] text-[10px] font-bold rounded">{doc.type}</span></td>
              <td className="py-3 px-2 text-[10px] font-black" style={{color: doc.criticality === 'HIGH' ? '#ff6b6b' : '#51cf66'}}>{doc.criticality}</td>
              <td className="py-3 px-2 text-[11px] text-gray-500 font-mono">{new Date(doc.created_at).toLocaleDateString()}</td>
              <td className="py-3 px-2">
                <div className={`flex items-center gap-1.5 text-[10px] font-black ${status.color}`}>
                  <Icon className="w-3 h-3" /> {status.label}
                </div>
              </td>
              <td className="py-3 px-2 text-right"><MoreVertical className="w-4 h-4 text-gray-500 inline cursor-pointer" /></td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
"""

with open(page_path, 'w') as f: f.write(page_code)
with open(list_path, 'w') as f: f.write(list_code)

print("✅ REPAIR COMPLETE: Search Bar/Spyglass removed. Column alignment and data restored.")
