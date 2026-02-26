'use client';

import React, { useState, useEffect } from 'react';

/**
 * GEMINI LIVE VOICE SHELL
 * Mandate: Secure, real-time voice interaction for Sovereign Audits.
 */
export default function VoiceComms() {
  const [isListening, setIsListening] = useState(false);
  const [permission, setPermission] = useState<PermissionState | 'prompt'>('prompt');

  const toggleVoice = async () => {
    if (!isListening) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        setIsListening(true);
        // Stream initialization for Gemini Live will go here in Sprint 6
      } catch (err) {
        console.error("Microphone access denied", err);
      }
    } else {
      setIsListening(false);
    }
  };

  return (
    <section className="p-6 bg-slate-900 border border-slate-800 rounded-xl">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold text-slate-100 flex items-center gap-2">
          <span className="text-blue-400">⚡</span> Gemini Live Comms
        </h2>
        <div className={`px-2 py-1 rounded-full text-[10px] font-bold ${
          isListening ? 'bg-blue-500 text-blue-950 animate-pulse' : 'bg-slate-800 text-slate-400'
        }`}>
          {isListening ? 'STREAM ACTIVE' : 'VOICE READY'}
        </div>
      </div>

      <div className="flex flex-col items-center justify-center py-8 border-2 border-dashed border-slate-800 rounded-lg">
        {/* WAVEFORM VISUALIZER (MOCK) */}
        <div className="flex gap-1 items-end h-12 mb-6">
          {[...Array(8)].map((_, i) => (
            <div
              key={i}
              className={`w-2 bg-blue-500 rounded-full transition-all duration-300 ${
                isListening ? 'animate-bounce' : 'h-2 opacity-20'
              }`}
              style={{ animationDelay: `${i * 0.1}s`, height: isListening ? `${Math.random() * 40 + 10}px` : '8px' }}
            />
          ))}
        </div>

        <button
          onClick={toggleVoice}
          className={`px-6 py-3 rounded-full font-bold transition-all ${
            isListening
              ? 'bg-red-500 text-white hover:bg-red-600'
              : 'bg-blue-600 text-white hover:bg-blue-500 shadow-lg shadow-blue-900/20'
          }`}
        >
          {isListening ? 'Stop Listening' : 'Initialize Gemini Live'}
        </button>
        <p className="text-xs text-slate-500 mt-4 text-center">
          Secure, multi-tenant voice stream. <br/>All inputs are audited by Agent 12.
        </p>
      </div>
    </section>
  );
}
