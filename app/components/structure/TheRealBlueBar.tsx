'use client';
import React from 'react';
import { FolderOpen, Activity, UploadCloud, Printer, Download, ArrowLeft } from 'lucide-react';

// Define props to make the component functional
interface Props {
  onActivityLogClick: () => void;
}

export default function TheRealBlueBar({ onActivityLogClick }: Props) {
  
  // --- APPROVED SOLID BLUE CHIP STYLE ---
  // Matches the approved image: Solid blue background, white text, sharp corners.
  const blueChipStyle = {
    background: '#3182ce',         // Solid Ironframe Blue
    border: 'none',                // No contrasting border based on image
    borderRadius: '4px',           // Rounded corners
    color: 'white',                // White text
    fontSize: '11px',
    fontWeight: 700,
    padding: '6px 12px',           // Standard button padding
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    cursor: 'pointer',
    fontFamily: 'Inter, sans-serif',
    boxShadow: '0 1px 2px rgba(0,0,0,0.1)',
    transition: 'background 0.2s'
  };

  // Hover state helper
  const handleMouseEnter = (e: React.MouseEvent<HTMLButtonElement>) => {
     e.currentTarget.style.background = '#2c5282'; // Slightly darker on hover
  };
  const handleMouseLeave = (e: React.MouseEvent<HTMLButtonElement>) => {
     e.currentTarget.style.background = '#3182ce'; // Restore original blue
  };

  return (
    // CONTAINER #2: THE BLUE SUBHEADER BAR
    <div style={{
      height: '50px',
      width: '100%',
      background: '#1f6feb', // Vibrant Blue background for the bar itself
      borderBottom: '1px solid #1a56db',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 24px',
      boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
      flexShrink: 0, 
      zIndex: 40,
      fontFamily: 'Inter, sans-serif'
    }}>
      {/* LEFT: TITLE */}
      <div className="flex items-center gap-2 text-white font-bold text-sm tracking-wide">
        <FolderOpen size={16} className="text-gray-200" />
        <span className="uppercase">EVIDENCE & ARTIFACT LIBRARY</span>
      </div>

      {/* RIGHT: ACTION CHIPS (All matching the approved blue style) */}
      <div className="flex items-center gap-2">
        
        {/* --- ACTIVITY LOG CHIP (Approved Design & Functional) --- */}
        <button 
          onClick={onActivityLogClick}
          style={blueChipStyle}
          onMouseEnter={handleMouseEnter} 
          onMouseLeave={handleMouseLeave}
        >
          <Activity size={14} color="#48bb78" /> {/* Green Icon based on image */}
          ACTIVITY LOG
        </button>

        {/* UPLOAD NEW */}
        <button style={blueChipStyle} onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave}>
          <UploadCloud size={14} color="white" />
          UPLOAD NEW
        </button>

        {/* PRINT */}
        <button style={blueChipStyle} onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave}>
          <Printer size={14} color="white" />
          PRINT
        </button>

        {/* EXPORT CSV */}
        <button style={blueChipStyle} onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave}>
          <Download size={14} color="white" />
          EXPORT CSV
        </button>

        {/* REGISTRY (Darker to differentiate slightly, or keep uniform) */}
        {/* Keeping uniform blue for now based on "match surrounding" instruction */}
        <button style={blueChipStyle} onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave}>
          <ArrowLeft size={14} color="white" />
          REGISTRY
        </button>
      </div>
    </div>
  );
}
