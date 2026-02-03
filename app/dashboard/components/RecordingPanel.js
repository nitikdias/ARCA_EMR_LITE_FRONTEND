"use client";
import React, { useRef, useEffect, useState } from 'react';

// --- Waveform Component ---
function CodePenWaveform({ paused }) {
  const svgRef = useRef(null);
  const requestRef = useRef();
  const containerRef = useRef();
  const [dimensions, setDimensions] = useState({ width: 400, height: 150 });

  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        const width = containerRef.current.offsetWidth;
        const height = width < 640 ? 80 : 150;
        setDimensions({ width: Math.min(width, 700), height });
      }
    };
    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    return () => window.removeEventListener('resize', updateDimensions);
  }, []);

  useEffect(() => {
    if (!svgRef.current) return;
    const lines = svgRef.current.querySelectorAll("line");
    if (!lines || !lines.length) return;
    const amplitude = dimensions.height * 0.2;
    const wavelength = lines.length;
    const baseline = dimensions.height * 0.73;
    const speed = 0.005;

    const animate = () => {
      if (!paused) {
        const time = Date.now();
        lines.forEach((line, i) => {
          const y = baseline + amplitude * Math.sin((2 * Math.PI * i) / wavelength - speed * time);
          line.setAttribute("y2", y);
        });
      }
      requestRef.current = requestAnimationFrame(animate);
    };
    requestRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(requestRef.current);
  }, [paused, dimensions]);

  const lineCount = dimensions.width < 640 ? 20 : 28;
  const spacing = dimensions.width / (lineCount + 2);
  const strokeWidth = dimensions.width < 640 ? 3 : 4;

  return (
    <div ref={containerRef} className="w-full flex justify-center">
      <svg ref={svgRef} width={dimensions.width} height={dimensions.height} viewBox={`0 0 ${dimensions.width} ${dimensions.height}`} className="max-w-full h-auto" style={{ display: "block" }}>
        <g>
          {Array.from({ length: lineCount }).map((_, i) => {
            const x = spacing + i * spacing;
            const y1 = dimensions.height * 0.93;
            const y2 = dimensions.height * 0.73;
            return <line key={i} x1={x} y1={y1} x2={x} y2={y2} stroke="#3b82f6" strokeWidth={strokeWidth} strokeLinecap="round" />;
          })}
        </g>
      </svg>
    </div>
  );
}

// --- Main Panel Component ---
export default function RecordingPanel({
  // Add user prop
  user,
  userLoading,
  // Props from audio hook
  mics, deviceId, setDeviceId, recording, paused, recordingTime,
  startRec, stopRec, pauseRec, resumeRec,
  // Props for transcript and other controls
  transcript, selectedLanguage, handleLanguageChange, canRecord,
  readyForSummary, setReadyForSummary, handleGenerateSummary
}) {
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleStart = () => {
    setReadyForSummary(false);
    startRec();
  };

  return (
    <div className="flex flex-col gap-4 sm:gap-6">
      {/* Recording Section */}
      <div className="bg-white rounded-lg p-4 sm:p-6 border border-gray-200 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
            <div className="w-5 h-5"><svg viewBox="0 0 24 24" fill="currentColor" className="text-gray-800"><path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z"/><path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z"/></svg></div>
            <h2 className="text-base sm:text-lg font-semibold text-gray-800 m-0">Ambient Recording</h2>
        </div>
        <div className="flex items-center gap-3 sm:gap-4 mb-4 sm:mb-6 text-xs sm:text-sm text-gray-600">
            <div className="flex items-center gap-2">
                <div className="w-2 h-2 text-red-500"><svg viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="12" r="12"/></svg></div>
                <span className="font-mono">{formatTime(recordingTime)}</span>
            </div>
            <span>{recording ? (paused ? 'Paused' : 'Recording') : 'Ready'}</span>
        </div>
        <div className="text-center my-4 sm:my-6 min-h-[60px] sm:min-h-[70px]">
            {recording && <CodePenWaveform paused={paused} />}
        </div>
        <div className="flex flex-col gap-3">
            <div className="flex flex-col sm:flex-row gap-3">
                <select value={deviceId} onChange={e => setDeviceId(e.target.value)} className="flex-1 px-3 py-2 sm:py-2.5 border border-gray-300 rounded-lg text-xs sm:text-sm bg-gray-50 cursor-pointer text-black">
                    {mics.map((mic, idx) => <option key={idx} value={mic.deviceId}>{mic.label || `Mic ${idx + 1}`}</option>)}
                </select>
                <select value={selectedLanguage} onChange={handleLanguageChange} className="flex-1 px-3 py-2 sm:py-2.5 border border-gray-300 rounded-lg text-xs sm:text-sm bg-gray-50 cursor-pointer text-black">
                    <option value="en">English</option><option value="ta">Tamil</option><option value="te">Telugu</option><option value="hi">Hindi</option><option value="ml">Malayalam</option><option value="kn">Kannada</option><option value="bn">Bengali</option>
                </select>
            </div>
            <div className="flex flex-col sm:flex-row gap-3">
                {!recording ? (
                    !readyForSummary ? (
                    // Update disabled logic and button text
                    <button 
                        disabled={userLoading || !canRecord || !user} 
                        onClick={handleStart} 
                        className={`w-full py-2.5 sm:py-3 rounded-lg border-2 text-black border-blue-500 bg-transparent font-semibold text-sm sm:text-base ${(userLoading || !canRecord || !user) ? "opacity-50 cursor-not-allowed" : "hover:bg-blue-50"}`}
                        title={userLoading ? "Loading user..." : (!user ? "User not found" : (!canRecord ? "Start session first to enable recording" : ""))}
                    >
                        {userLoading ? "Loading..." : (!canRecord ? "Disabled" : "Start Recording")}
                    </button>
                    ) : (
                    <button onClick={() => { handleGenerateSummary(); setReadyForSummary(false); }} className="w-full py-2.5 sm:py-3 rounded-lg border-2 border-green-500 bg-transparent text-black font-semibold text-sm sm:text-base hover:bg-green-50">
                        Review Summary
                    </button>
                    )
                ) : (
                    <>
                    <button onClick={paused ? resumeRec : pauseRec} className="w-full sm:flex-1 py-2.5 sm:py-3 rounded-lg border-2 border-yellow-500 bg-transparent text-black font-semibold text-sm sm:text-base hover:bg-yellow-50">
                        {paused ? "Resume" : "Pause"}
                    </button>
                    <button onClick={stopRec} className="w-full sm:flex-1 py-2.5 sm:py-3 rounded-lg border-2 border-red-500 bg-transparent text-black font-semibold text-sm sm:text-base hover:bg-red-50">
                        Stop Recording
                    </button>
                    </>
                )}
            </div>
        </div>
      </div>

      {/* Transcript Section */}
      <div className="bg-white rounded-lg p-4 sm:p-6 border border-gray-200 shadow-sm flex-1">
        <div className="flex items-center gap-2 mb-4">
            <div className="w-5 h-5"><svg viewBox="0 0 24 24" fill="currentColor" className="text-gray-800"><path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 2 2h8c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z"/></svg></div>
            <h2 className="text-base sm:text-lg font-semibold text-gray-800 m-0">Transcript</h2>
        </div>
        <div className="text-xs sm:text-sm leading-relaxed text-gray-800 whitespace-pre-wrap h-48 sm:h-64 lg:h-80 overflow-y-auto p-3 sm:p-4 bg-gray-50 rounded-lg">
            {transcript || 'Transcript will appear here...'}
        </div>
      </div>
    </div>
  );
}
