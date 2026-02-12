import React from 'react';

interface MetricChipProps {
  label: string;
  value: number | string;
  color?: string;
  bg?: string;
  border?: string;
}

export default function MetricChip({ label, value, color = 'white', bg = 'rgba(0,0,0,0.2)', border = 'none' }: MetricChipProps) {
  return (
    <div style={{ 
      background: bg, 
      color: color, 
      padding: '4px 12px', 
      borderRadius: '4px', 
      fontSize: '10px', 
      fontWeight: 800, 
      minWidth: '80px', 
      textAlign: 'center', 
      whiteSpace: 'nowrap',
      border: border,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      boxShadow: '0 1px 2px rgba(0,0,0,0.1)'
    }}>
      {label}: {value}
    </div>
  );
}
