'use client';
import React, { useState } from 'react';
import { X, Globe, Mail, History } from 'lucide-react';

interface VendorDetailsModalProps {
  vendor: Record<string, unknown>;
  onClose: () => void;
  onOpenAudit?: (vendorId: string) => void;
}

export default function VendorDetailsModal({ vendor, onClose, onOpenAudit }: VendorDetailsModalProps) {
  const [, ] = useState(false);

  if (!vendor) return null;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-[#0d1117] w-full max-w-4xl h-[85vh] rounded-lg border border-[#30363d] flex flex-col shadow-2xl relative">
        
        {/* HEADER */}
        <div className="p-6 border-b border-[#30363d] flex justify-between items-start bg-[#161b22] rounded-t-lg">
          <div className="flex gap-4">
            <div className="w-16 h-16 bg-[#21262d] rounded-lg border border-[#30363d] flex items-center justify-center text-2xl font-bold text-gray-500">
              {vendor.name ? vendor.name.substring(0, 2).toUpperCase() : 'VN'}
            </div>
            <div>
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                {vendor.name}
                <span className={`px-2 py-0.5 rounded-full text-[10px] border ${
                  vendor.risk_level === 'CRITICAL' ? 'bg-red-900/20 text-red-400 border-red-900' : 
                  'bg-green-900/20 text-green-400 border-green-900'
                }`}>
                  {vendor.risk_level}
                </span>
              </h2>
              <div className="flex gap-4 text-xs text-gray-400 mt-2">
                <span className="flex items-center gap-1"><Globe className="w-3 h-3"/> {vendor.website || 'No Website'}</span>
                <span className="flex items-center gap-1"><Mail className="w-3 h-3"/> {vendor.contact_email || 'No Email'}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* FORCE VISIBLE: Audit History Button directly in header */}
            <button 
              onClick={() => {
                if(onOpenAudit) {
                   onOpenAudit(vendor.id);
                   onClose();
                } else {
                   alert("Audit feature not connected yet.");
                }
              }}
              className="flex items-center gap-2 px-3 py-2 bg-purple-900/20 border border-purple-800 text-purple-300 rounded hover:bg-purple-900/40 transition-colors text-xs font-bold mr-2"
            >
              <History className="w-4 h-4" /> AUDIT HISTORY
            </button>

            <button onClick={onClose} className="p-2 hover:bg-[#21262d] rounded text-gray-400">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* CONTENT */}
        <div className="flex-1 p-6 overflow-y-auto">
          <div className="grid grid-cols-3 gap-6">
            <div className="col-span-2 space-y-6">
               <div className="bg-[#161b22] border border-[#30363d] rounded p-4">
                 <h3 className="text-sm font-bold text-gray-300 mb-4 border-b border-[#30363d] pb-2">Business Context</h3>
                 <p className="text-xs text-gray-400 leading-relaxed">
                   {vendor.description || 'No description provided.'}
                 </p>
               </div>
            </div>
            <div className="space-y-4">
               <div className="bg-[#161b22] border border-[#30363d] rounded p-4">
                  <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Quick Stats</h3>
                  <div className="space-y-2">
                    <div className="flex justify-between text-xs">
                      <span className="text-gray-500">ID</span>
                      <span className="text-gray-300 font-mono">{vendor.id}</span>
                    </div>
                  </div>
               </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
