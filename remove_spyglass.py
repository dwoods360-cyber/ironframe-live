import os

print("--- UI SIMPLIFICATION: REMOVING SPYGLASS ---")

file_path = 'app/components/vendor-risk/DocumentToolbar.tsx'

code = """'use client';
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
      
      {/* LEFT: Title & Count */}
      <div className="flex items-center gap-3 px-3">
        <span className="text-xs font-bold text-[#8b949e]">GLOBAL DOCUMENT INDEX</span>
        <span className="px-2 py-0.5 rounded-full bg-[#30363d] text-[#c9d1d9] text-[10px] font-mono">
          {totalItems} Items
        </span>
      </div>

      {/* RIGHT: Filters & Search */}
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
          className="bg-[#0d1117] border border-[#30363d] text-xs text-[#c9d1d9] px-3 py-1.5 rounded focus:outline-none focus:border-[#58a6ff] hover:border-[#8b949e] transition-colors cursor-pointer"
        >
          <option value="ALL">All Statuses</option>
          <option value="VALID">Valid</option>
          <option value="EXPIRING">Expiring Soon</option>
          <option value="EXPIRED">Expired</option>
        </select>

        {/* Search Bar - CLEAN (No Icon) */}
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

with open(file_path, 'w') as f:
    f.write(code)

print("✅ COMPLETED: Search Icon removed from DocumentToolbar.tsx")
