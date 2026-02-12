import os

print("--- REBUILDING SECTION: REMOVING SPYGLASS & SEARCH INPUT ---")

# PATHS
page_path = 'app/reports/vendor-risk/artifacts/page.tsx'
list_path = 'app/components/vendor-risk/DocumentList.tsx'

# 1. PAGE.TSX (CLEAN HEADER - NO SEARCH)
page_code = """'use client';
import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import Header from '@/app/components/structure/Header';
import DocumentList from '@/app/components/vendor-risk/DocumentList';
import UploadArtifactModal from '@/app/components/vendor-risk/UploadArtifactModal';
import EditArtifactModal from '@/app/components/vendor-risk/EditArtifactModal';
import SystemActivityModal from '@/app/components/vendor-risk/SystemActivityModal'; 
import { createClient } from '@/lib/supabase/client';
import { Activity } from 'lucide-react'; 
// NOTE: 'Search' import removed intentionally

export default function ArtifactLibraryPage() {
  const [documents, setDocuments] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploadOpen, setIsUploadOpen] = useState(false); 
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isActivityOpen, setIsActivityOpen] = useState(false); 
  const [selectedDoc, setSelectedDoc] = useState<any>(null);

  // --- FILTER STATE (NO SEARCH QUERY) ---
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [riskFilter, setRiskFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [dateRange, setDateRange] = useState('ALL');
  const [timelineView, setTimelineView] = useState('HISTORY'); 
   
  const supabase = createClient();

  const fetchDocs = async () => {
    setIsLoading(true);
    const { data } = await supabase
        .from('vendor_artifacts')
        .select(`
            id, name, document_type, expiry_date, file_url, created_at, updated_at, vendor_id,
            vendor_risk_inventory ( vendor_name, criticality )
        `);

    if (data) {
        const formattedDocs = data.map((item: any) => ({
            id: String(item.id),
            vendor_id: String(item.vendor_id),
            name: item.name,
            vendorName: item.vendor_risk_inventory?.vendor_name || 'Unknown Vendor',
            type: item.document_type,
            expiry: item.expiry_date,
            created_at: item.created_at || new Date().toISOString(),
            updated_at: item.updated_at || item.created_at || new Date().toISOString(), 
            url: item.file_url,
            criticality: item.vendor_risk_inventory?.criticality || 'LOW' 
        }));
        setDocuments(formattedDocs);
    }
    setIsLoading(false);
  };

  useEffect(() => { fetchDocs(); }, []);

  // --- HANDLERS ---
  const handleViewChange = (mode: string) => {
      setTimelineView(mode);
      if (mode === 'CREATED') setDateRange('TODAY'); 
      else if (mode === 'UPDATED') setDateRange('30D');    
      else setDateRange('ALL');    
  };

  const handleResetAll = () => {
      setRiskFilter('ALL'); setDateRange('ALL'); setStatusFilter('ALL');
      setTypeFilter('ALL'); setTimelineView('HISTORY'); 
  };

  const handleDelete = async (id: string) => {
      const docToDelete = documents.find(d => d.id === id);
      setDocuments(prev => prev.filter(d => d.id !== id));

      if (docToDelete) {
          await supabase.rpc('log_audit_event', {
            p_artifact_id: String(id),
            p_user_name: 'Dereck (Admin)', 
            p_action_type: 'ARTIFACT_DESTRUCTION',
            p_description: `Permanently deleted artifact: ${docToDelete.name}`,
            p_icon_style: 'danger'
          });
      }
      await supabase.from('vendor_artifacts').delete().eq('id', id);
  };

  const handleEdit = (doc: any) => { setSelectedDoc(doc); setIsEditOpen(true); };

  // --- LOGIC: KPI & STATUS ---
  const getDocStatus = (doc: any) => {
    if (!doc.expiry) {
        if (doc.type === 'MSA') return 'PERMANENT'; 
        return 'INCOMPLETE'; 
    }
    const today = new Date();
    const expiry = new Date(doc.expiry);
    const diffTime = expiry.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) return 'EXPIRED';
    if (diffDays < 90) return 'EXPIRING';
    return 'VALID';
  };

  const kpiTotal = documents.length;
  const kpiInflow = documents.filter(d => {
      const diffTime = new Date().getTime() - new Date(d.created_at).getTime();
      return (diffTime / (1000 * 3600)) <= 24;
  }).length;
  const kpiExpiring = documents.filter(d => getDocStatus(d) === 'EXPIRING').length;
  const kpiExpired = documents.filter(d => {
      const s = getDocStatus(d);
      return s === 'EXPIRED' || s === 'INCOMPLETE';
  }).length;

  const handleExportCSV = () => {
    const headers = ["Document Name", "Vendor", "Type", "Criticality", "Uploaded", "Last Updated", "Expiry", "Status", "URL"];
    const rows = processedDocuments.map(doc => [
        doc.name, doc.vendorName, doc.type, doc.criticality || 'N/A',
        new Date(doc.created_at).toLocaleDateString(), new Date(doc.updated_at).toLocaleDateString(),
        doc.expiry || 'Permanent', getDocStatus(doc), doc.url
    ]);
    const csvContent = [headers.join(","), ...rows.map(r => r.join(","))].join("\\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url; link.download = `GRC_Artifacts_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link); link.click(); document.body.removeChild(link);
  };

  // --- FILTERING (NO SEARCH LOGIC) ---
  const processedDocuments = documents.filter(doc => {
        const matchesType = typeFilter === 'ALL' || doc.type === typeFilter;
        const matchesRisk = riskFilter === 'ALL' || doc.criticality === riskFilter;
        
        let matchesStatus = true;
        if (statusFilter !== 'ALL') {
            const status = getDocStatus(doc);
            if (statusFilter === 'VALID') matchesStatus = (status === 'VALID' || status === 'PERMANENT');
            else matchesStatus = status === statusFilter;
        }

        let matchesDate = true;
        if (dateRange !== 'ALL') {
            const targetDate = timelineView === 'UPDATED' ? doc.updated_at : doc.created_at;
            if (targetDate) {
                const daysDiff = (new Date().getTime() - new Date(targetDate).getTime()) / (1000 * 60 * 60 * 24);
                switch (dateRange) {
                    case 'TODAY': matchesDate = daysDiff <= 1.5; break; 
                    case '7D': matchesDate = daysDiff <= 7; break;
                    case '30D': matchesDate = daysDiff <= 30; break;
                    case '90D': matchesDate = daysDiff <= 90; break;
                    case '1Y': matchesDate = daysDiff <= 365; break;
                    default: matchesDate = true;
                }
            }
        }
        return matchesType && matchesRisk && matchesStatus && matchesDate;
    }).sort((a, b) => {
        const dateA = timelineView === 'UPDATED' ? new Date(a.updated_at).getTime() : new Date(a.created_at).getTime();
        const dateB = timelineView === 'UPDATED' ? new Date(b.updated_at).getTime() : new Date(b.created_at).getTime();
        return dateB - dateA;
    });

  const inputStyle = { background: '#0d1117', border: '1px solid #2d3139', color: 'white', padding: '8px 12px', borderRadius: '4px', fontSize: '12px' };
  
  const FilterChip = ({ label, value, color, activeColor, isReset = false }: any) => {
      const isActive = isReset ? (riskFilter === 'ALL' && dateRange === 'ALL' && statusFilter === 'ALL') : riskFilter === value;
      return (
          <button onClick={() => isReset ? handleResetAll() : setRiskFilter(value)}
            style={{
                background: isActive ? activeColor : 'rgba(255,255,255,0.05)',
                border: `1px solid ${isActive ? activeColor : '#2d3139'}`, color: isActive ? 'white' : color,
                padding: '6px 16px', borderRadius: '20px', fontSize: '10px', fontWeight: 800, cursor: 'pointer',
                opacity: (riskFilter === 'ALL' || isActive) ? 1 : 0.5
            }}>{label}</button>
      );
  };

  const KPICard = ({ title, value, color, subtext }: any) => (
      <div style={{ background: '#1a1d23', borderRadius: '8px', border: '1px solid #2d3139', padding: '15px 20px', flex: 1, display: 'flex', flexDirection: 'column', gap: '5px' }}>
          <span style={{ fontSize: '10px', color: '#a0aec0', fontWeight: 700 }}>{title}</span>
          <div style={{ fontSize: '24px', fontWeight: 900, color: color }}>{value}</div>
          <span style={{ fontSize: '10px', color: '#718096' }}>{subtext}</span>
      </div>
  );

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', background: '#0d1117', color: 'white', fontFamily: 'Inter, sans-serif', overflow: 'hidden' }}>
      <div className="no-print" style={{ flexShrink: 0 }}>
        <Header />
        <div style={{ height: '50px', background: '#2b6cb0', display: 'flex', alignItems: 'center', padding: '0 20px', justifyContent: 'space-between', borderBottom: '1px solid #63b3ed' }}>
          <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
            <div style={{ fontSize: '12px', fontWeight: 800, color: '#ebf8ff' }}>📂 EVIDENCE & ARTIFACT LIBRARY</div>
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
             <button onClick={() => setIsActivityOpen(true)} style={{ background: 'rgba(0,0,0,0.2)', border: '1px solid #ebf8ff', color: '#ebf8ff', padding: '6px 12px', borderRadius: '4px', fontSize: '10px', fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Activity className="w-3 h-3" /> ACTIVITY LOG
             </button>
             <button onClick={() => setIsUploadOpen(true)} style={{ background: '#ebf8ff', border: '1px solid white', color: '#2b6cb0', padding: '6px 12px', borderRadius: '4px', fontSize: '10px', fontWeight: 900, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px' }}><span>📤</span> UPLOAD NEW</button>
             <button onClick={() => window.print()} style={{ background: 'rgba(0,0,0,0.2)', border: '1px solid #cbd5e0', color: '#cbd5e0', padding: '6px 12px', borderRadius: '4px', fontSize: '10px', fontWeight: 800, cursor: 'pointer' }}>🖨 PRINT</button>
             <button onClick={handleExportCSV} style={{ background: 'rgba(0,0,0,0.2)', border: '1px solid #ebf8ff', color: '#ebf8ff', padding: '6px 12px', borderRadius: '4px', fontSize: '10px', fontWeight: 800, cursor: 'pointer' }}>⬇ EXPORT CSV</button>
             <Link href="/reports/vendor-risk" style={{ color: '#ebf8ff', textDecoration: 'none', fontSize: '10px', fontWeight: 800, background: 'rgba(0,0,0,0.3)', padding: '6px 12px', borderRadius: '4px' }}>◀ REGISTRY</Link>
          </div>
        </div>
      </div>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '20px 40px 0 40px', overflow: 'hidden', maxWidth: '1400px', width: '100%', margin: '0 auto' }}>
        <div style={{ flexShrink: 0 }}>
            <div style={{ display: 'flex', gap: '20px', marginBottom: '20px' }}>
                <KPICard title="TOTAL ARTIFACTS" value={kpiTotal} color="white" subtext="Evidence On File" />
                <KPICard title="INFLOW (24H)" value={kpiInflow} color="#68d391" subtext="Uploaded Today" />
                <KPICard title="EXPIRING SOON" value={kpiExpiring} color="#f6ad55" subtext="Next 90 Days" />
                <KPICard title="EXPIRED / INVALID" value={kpiExpired} color="#fc8181" subtext="Expired or Missing Info" />
            </div>

            <div style={{ marginBottom: '15px', display: 'flex', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                    <span style={{ fontSize: '11px', color: '#718096', fontWeight: 700 }}>FILTER BY RISK:</span>
                    <div style={{ display: 'flex', gap: '10px' }}>
                        <FilterChip label="VIEW ALL" value="ALL" color="#cbd5e0" activeColor="#3182ce" isReset={true} />
                        <FilterChip label="HIGH CRITICALITY" value="HIGH" color="#fc8181" activeColor="#e53e3e" />
                        <FilterChip label="MED CRITICALITY" value="MED" color="#f6ad55" activeColor="#dd6b20" />
                        <FilterChip label="LOW CRITICALITY" value="LOW" color="#68d391" activeColor="#38a169" />
                    </div>
                </div>
                <div style={{ width: '1px', height: '20px', background: '#2d3139', margin: '0 25px' }}></div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ fontSize: '11px', color: '#718096', fontWeight: 700 }}>VIEW MODE:</span>
                    <select value={timelineView} onChange={(e) => handleViewChange(e.target.value)} style={{ ...inputStyle, cursor: 'pointer', minWidth: '180px', background: '#1a1d23', fontWeight: 700, borderColor: '#3182ce', color: '#90cdf4' }}>
                        <option value="HISTORY">📂 Full Library (All Time)</option>
                        <option value="CREATED">📥 Just Arrived (Today)</option>
                        <option value="UPDATED">📝 Recently Updated (30 Days)</option>
                    </select>
                </div>
            </div>
        </div>

        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: '#1a1d23', borderRadius: '8px 8px 0 0', border: '1px solid #2d3139', borderBottom: 'none', overflow: 'hidden' }}>
            {/* --- REBUILT SECTION: GLOBAL DOCUMENT INDEX --- */}
            <div style={{ flexShrink: 0, borderBottom: '1px solid #2d3139', background: '#1a1d23', zIndex: 10 }}>
                <div style={{ padding: '20px 30px 15px 30px', display: 'flex', alignItems: 'center', gap: '25px' }}>
                    
                    {/* TITLE & COUNT */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <h3 style={{ fontSize: '12px', color: '#718096', margin: 0, fontWeight: 900 }}>GLOBAL DOCUMENT INDEX</h3>
                        <span style={{ fontSize: '11px', background: '#2d3748', padding: '2px 8px', borderRadius: '10px', color: '#cbd5e0' }}>{processedDocuments.length} Items</span>
                    </div>

                    {/* DIVIDER */}
                    <div style={{ width: '1px', height: '20px', background: '#2d3139' }}></div>

                    {/* FILTERS (NO SPYGLASS / NO INPUT) */}
                    <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                        <select value={dateRange} onChange={(e) => setDateRange(e.target.value)} style={{ ...inputStyle, cursor: 'pointer', minWidth: '180px', borderColor: dateRange !== 'ALL' ? '#3182ce' : '#2d3139' }}>
                            <option value="ALL">📅 Any Time</option>
                            <option value="TODAY">Last 24 Hours</option>
                            <option value="7D">Last 7 Days</option>
                            <option value="30D">Last 30 Days</option>
                            <option value="90D">Last 90 Days</option>
                            <option value="1Y">Last 1 Year</option>
                        </select>
                        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} style={{ ...inputStyle, cursor: 'pointer', minWidth: '150px', borderColor: statusFilter !== 'ALL' ? '#e53e3e' : '#2d3139' }}>
                            <option value="ALL">All Statuses</option>
                            <option value="VALID">✅ Valid Only</option>
                            <option value="EXPIRING">⚠️ Expiring Soon</option>
                            <option value="EXPIRED">❌ Expired</option>
                            <option value="INCOMPLETE">⚠️ Missing Dates</option>
                        </select>
                    </div>
                </div>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', padding: '0 30px 30px 30px' }}>
                {isLoading ? (
                    <div style={{ padding: '40px', textAlign: 'center', color: '#adbac7' }}>Loading Library...</div>
                ) : (
                    <DocumentList documents={processedDocuments} onDelete={handleDelete} onEdit={handleEdit} sortConfig={{ key: '', direction: '' }} />
                )}
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

# 2. DOCUMENTLIST.TSX (UNIFIED TABLE)
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

interface DocumentListProps {
  documents: any[];
  onDelete: (id: string) => void;
  onEdit: (doc: any) => void;
  sortConfig: { key: string; direction: string };
}

export default function DocumentList({ documents, onDelete, onEdit }: DocumentListProps) {
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const [sendingEmailId, setSendingEmailId] = useState<string | null>(null);
  const [drawerDoc, setDrawerDoc] = useState<any>(null);
  
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
  
  const handleSendEmail = async (doc: any) => {
    setSendingEmailId(doc.id);
    const result = await sendVendorEmail(doc.vendorName, doc.name, doc.expiry);
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

  const getFileIcon = (filename: string) => {
      const lower = (filename || '').toLowerCase();
      const className = "w-4 h-4 text-gray-500";
      if (lower.includes('.pdf')) return <FileText className={className} />;
      if (lower.includes('.xls') || lower.includes('.csv')) return <FileSpreadsheet className={className} />;
      if (lower.includes('.doc')) return <FileIcon className={className} />;
      if (lower.includes('.zip') || lower.includes('.rar')) return <Box className={className} />;
      if (lower.includes('.jpg') || lower.includes('.png')) return <ImageIcon className={className} />;
      return <FileText className={className} />;
  };

  if (!documents || documents.length === 0) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', color: '#718096', border: '1px dashed #2d3748', borderRadius: '8px', marginTop: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '10px' }}><FileIcon className="w-8 h-8 opacity-50" /></div>
        No documents found matching your filters.
      </div>
    );
  }

  // TABLE COMPONENT
  return (
    <div className="w-full pb-24">
      {/* UNIFIED TABLE STRUCTURE */}
      <table className="w-full border-collapse">
        <thead>
          <tr className="border-t border-b border-[#2d3139] bg-[#16191f] text-[#718096] text-[10px] font-extrabold tracking-wider">
            <th className="px-4 py-2 text-left w-[25%]">NAME</th>
            <th className="px-4 py-2 text-left w-[15%]">VENDOR</th>
            <th className="px-4 py-2 text-left w-[10%]">TYPE</th>
            <th className="px-4 py-2 text-left w-[10%]">CRITICALITY</th>
            <th className="px-4 py-2 text-left w-[10%]">UPLOADED</th>
            <th className="px-4 py-2 text-left w-[10%]">UPDATED</th>
            <th className="px-4 py-2 text-left w-[10%]">EXPIRY</th>
            <th className="px-4 py-2 text-left w-[10%]">STATUS</th>
            <th className="px-4 py-2 text-right">ACTION</th>
          </tr>
        </thead>
        <tbody>
          {documents.map((doc) => {
            const isMenuOpen = activeMenuId === doc.id;
            const isSending = sendingEmailId === doc.id;
            
            // Status Logic
            let status = { label: 'VALID', color: '#38a169', icon: CheckCircle };
            if (!doc.expiry) {
                if (doc.type === 'MSA') status = { label: 'PERMANENT', color: '#718096', icon: CheckCircle };
                else status = { label: 'INCOMPLETE', color: '#d69e2e', icon: AlertCircle };
            } else {
                const days = Math.ceil((new Date(doc.expiry).getTime() - new Date().getTime()) / (1000 * 3600 * 24));
                if (days < 0) status = { label: 'EXPIRED', color: '#e53e3e', icon: AlertCircle };
                else if (days < 90) status = { label: 'EXPIRING', color: '#dd6b20', icon: Clock };
            }

            const StatusIcon = status.icon;

            return (
              <tr key={doc.id} className="border-b border-[#2d3139] hover:bg-[#20242b] transition-colors group">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    {getFileIcon(doc.url || doc.name)}
                    <a href={doc.url} target="_blank" rel="noopener noreferrer" 
                       className="text-sm font-bold text-gray-200 hover:text-blue-400 transition-colors truncate max-w-[200px]"
                       title={doc.name}>
                       {doc.name}
                    </a>
                  </div>
                </td>
                <td className="px-4 py-3 text-xs text-blue-400 hover:underline cursor-pointer">{doc.vendorName}</td>
                <td className="px-4 py-3">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#2d3748] text-[#cbd5e0] border border-[#2d3748]">
                        {doc.type}
                    </span>
                </td>
                <td className="px-4 py-3">
                    <span style={{ 
                        color: doc.criticality === 'HIGH' ? '#fc8181' : doc.criticality === 'MED' ? '#f6ad55' : '#68d391', 
                        fontWeight: 800, fontSize: '10px' 
                    }}>
                        {doc.criticality}
                    </span>
                </td>
                <td className="px-4 py-3 text-xs text-gray-500 font-mono">{new Date(doc.created_at).toLocaleDateString()}</td>
                <td className="px-4 py-3 text-xs text-gray-500 font-mono">{new Date(doc.updated_at).toLocaleDateString()}</td>
                <td className="px-4 py-3 text-xs font-mono" style={{ color: doc.expiry ? '#a0aec0' : '#d69e2e' }}>
                    {doc.expiry ? new Date(doc.expiry).toLocaleDateString() : 'Required*'}
                </td>
                <td className="px-4 py-3">
                   <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <StatusIcon className="w-3 h-3" style={{ color: status.color }} />
                      <span style={{ color: status.color, fontWeight: 800, fontSize: '10px' }}>{status.label}</span>
                   </div>
                </td>
                <td className="px-4 py-3 text-right relative action-menu-container">
                    <button onClick={(e) => { e.stopPropagation(); setActiveMenuId(isMenuOpen ? null : doc.id); }} 
                            className={`p-1 rounded hover:bg-gray-700 ${isMenuOpen ? 'text-white' : 'text-gray-500'}`}>
                      <MoreVertical className="w-4 h-4" />
                    </button>
                    {isMenuOpen && (
                        <div className="absolute right-0 top-8 w-44 bg-[#1a202c] border border-[#2d3748] rounded-md shadow-xl z-50 flex flex-col overflow-hidden text-left">
                            <button onClick={() => handleSendEmail(doc)} disabled={isSending} className="flex items-center gap-2 px-4 py-2 text-xs text-gray-200 hover:bg-gray-700 border-b border-[#2d3748]">
                                {isSending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Mail className="w-3 h-3" />} {isSending ? 'Sending...' : 'Request Update'}
                            </button>
                            <button onClick={() => { setDrawerDoc(doc); setActiveMenuId(null); }} className="flex items-center gap-2 px-4 py-2 text-xs text-gray-200 hover:bg-gray-700 border-b border-[#2d3748]">
                                <Shield className="w-3 h-3" /> Audit History
                            </button>
                            <button onClick={() => { onEdit(doc); setActiveMenuId(null); }} className="flex items-center gap-2 px-4 py-2 text-xs text-gray-200 hover:bg-gray-700">
                                <Edit className="w-3 h-3" /> Edit Metadata
                            </button>
                            <a href={doc.url} download={doc.name} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 px-4 py-2 text-xs text-gray-200 hover:bg-gray-700">
                                <Download className="w-3 h-3" /> Download
                            </a>
                            <button onClick={() => { if(confirm('Delete artifact?')) onDelete(doc.id); setActiveMenuId(null); }} className="flex items-center gap-2 px-4 py-2 text-xs text-red-400 hover:bg-gray-700">
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
      <ArtifactDrawer isOpen={!!drawerDoc} onClose={() => setDrawerDoc(null)} doc={drawerDoc} />
    </div>
  );
}
"""

with open(page_path, 'w') as f:
    f.write(page_code)

with open(list_path, 'w') as f:
    f.write(list_code)

print("✅ REBUILD COMPLETE: Spyglass is gone.")
