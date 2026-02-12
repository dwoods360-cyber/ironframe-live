'use client';
import React from 'react';
import StrategicIntel from './StrategicIntel';

type Props = {
  company: any;
  onThreatClick: (t: string) => void;
  liveData?: { input?: string };
  onUpdateData?: (key: string, val: any) => void;
  [key: string]: any;
};

export default function LeftPane({ company, onThreatClick, liveData = {}, onUpdateData }: Props) {
  const handleSetClock = () => {
    // FIX: Explicitly cast to string or provide fallback to satisfy parseFloat(string)
    const inputVal = String(liveData?.input || '0');
    const hours = parseFloat(inputVal);

    if (!isNaN(hours) && hours > 0 && onUpdateData) {
      onUpdateData('timer', {
        timer: Math.floor(hours * 3600),
      });
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <StrategicIntel 
        company={company} 
        onThreatClick={onThreatClick} 
      />
      {/* Add a button to trigger the clock if needed for testing */}
      <button onClick={handleSetClock} style={{ display: 'none' }}>Set Clock</button>
    </div>
  );
}
