import os

print("--- RESTORING FINAL GRC MODALS ---")

base_dir = 'app/components/vendor-risk'

# 1. EDITARTIFACTMODAL.TSX
code_edit = """'use client';
import React, { useState, useEffect } from 'react';
import { X, Save, Loader2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

export default function EditArtifactModal({ isOpen, onClose, onSaveComplete, document }: any) {
  const [loading, setLoading] = useState(false);
  const [docName, setDocName] = useState('');
  const supabase = createClient();

  useEffect(() => {
    if (document) setDocName(document.name);
  }, [document]);

  if (!isOpen || !document) return null;

  const handleSave = async (e: any) => {
    e.preventDefault();
    setLoading(true);
    
    const { error } = await supabase
      .from('vendor_artifacts')
      .update({ name: docName })
      .eq('id', document.id);

    if (!error) {
      if (onSaveComplete) onSaveComplete();
      onClose();
    }
    setLoading(false);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md bg-[#0d1117] border border-[#30363d] rounded-xl shadow-2xl">
        <div className="p-4 border-b border-[#30363d] flex justify-between items-center bg-[#161b22]">
          <h2 className="text-xs font-extrabold text-white">EDIT METADATA</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-white"><X className="w-4 h-4" /></button>
        </div>
        <form onSubmit={handleSave} className="p-6 space-y-4">
          <div>
            <label className="text-[10px] font-bold text-gray-500 block mb-1">DOCUMENT NAME</label>
            <input 
              type="text" 
              value={docName} 
              onChange={(e) => setDocName(e.target.value)}
              className="w-full bg-[#1a202c] border border-[#2d3748] text-white p-2 rounded text-xs focus:outline-none focus:border-blue-500"
            />
          </div>
          <button type="submit" disabled={loading} className="w-full py-2 bg-blue-600 hover:bg-blue-500 text-white rounded font-bold text-xs flex items-center justify-center gap-2">
            {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />} Save Changes
          </button>
        </form>
      </div>
    </div>
  );
}
"""

# 2. SYSTEMACTIVITYMODAL.TSX
code_activity = """'use client';
import React, { useEffect, useState } from 'react';
import { X, Activity, Clock } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

export default function SystemActivityModal({ isOpen, onClose }: any) {
  const [logs, setLogs] = useState<any[]>([]);
  const supabase = createClient();

  useEffect(() => {
    if (isOpen) {
      const fetchLogs = async () => {
        const { data } = await supabase
          .from('audit_logs')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(10);
        if (data) setLogs(data);
      };
      fetchLogs();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-2xl bg-[#0d1117] border border-[#30363d] rounded-xl shadow-2xl">
        <div className="p-4 border-b border-[#30363d] flex justify-between items-center bg-[#161b22]">
          <h2 className="text-xs font-extrabold text-white flex items-center gap-2">
            <Activity className="w-3 h-3 text-blue-400" /> SYSTEM ACTIVITY LOG
          </h2>
          <button onClick={onClose} className="text-gray-500 hover:text-white"><X className="w-4 h-4" /></button>
        </div>
        <div className="p-6 max-h-[400px] overflow-y-auto space-y-3">
          {logs.map((log: any) => (
            <div key={log.id} className="p-3 bg-[#161b22] border border-[#30363d] rounded-lg flex items-start gap-3">
              <Clock className="w-4 h-4 text-gray-500 mt-0.5" />
              <div>
                <p className="text-xs text-gray-200">{log.description}</p>
                <p className="text-[10px] text-gray-500 mt-1 uppercase font-mono">{new Date(log.created_at).toLocaleString()}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
"""

with open(f"{base_dir}/EditArtifactModal.tsx", 'w') as f:
    f.write(code_edit)
with open(f"{base_dir}/SystemActivityModal.tsx", 'w') as f:
    f.write(code_activity)

print("✅ COMPLETED: Edit and Activity modals restored.")
