// app/dashboard/components/SummarySection.js
"use client";
import React, { useState, useRef } from 'react';

const API_KEY = "n1i2t3i4k5d6i7a8s";

export default function SummarySection({ sectionKey, section, onUpdate, onSave }) {
  const [isDictating, setIsDictating] = useState(false);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);

  const handleDictateClick = async () => {
    if (!isDictating) {
      // Start Dictation
      setIsDictating(true);
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const mediaRecorder = new MediaRecorder(stream);
        mediaRecorderRef.current = mediaRecorder;
        audioChunksRef.current = [];

        mediaRecorder.ondataavailable = (e) => audioChunksRef.current.push(e.data);

        mediaRecorder.onstop = async () => {
          const audioBlob = new Blob(audioChunksRef.current, { type: "audio/wav" });
          const formData = new FormData();
          formData.append("audio", audioBlob, "dictation.wav");
          try {
            const response = await fetch("http://localhost:8000/dictate", { 
                headers: { "X-API-Key": API_KEY },
                method: "POST", body: formData 
            });
            const data = await response.json();
            if (data.transcript) {
              const currentContent = section.content || "";
              const newContent = currentContent + (currentContent.trim() ? "\n- " : "- ") + data.transcript.trim();
              onUpdate(sectionKey, { ...section, content: newContent });
              onSave(sectionKey, newContent); // Save immediately after dictation
            }
          } catch (err) { console.error("Dictation failed:", err); } 
          finally { setIsDictating(false); }
        };
        mediaRecorder.start();
      } catch (err) {
        console.error("Mic access denied:", err);
        setIsDictating(false);
      }
    } else {
      // Stop Dictation
      if (mediaRecorderRef.current) {
        mediaRecorderRef.current.stop();
        mediaRecorderRef.current.stream.getTracks().forEach((track) => track.stop());
      }
      setIsDictating(false);
    }
  };

  // The renderSection logic is now the return statement of this component
  return (
    <div key={sectionKey} className="bg-slate-50 border border-slate-200 rounded-lg p-4 mb-4 relative text-black">
      <div className="mb-3 flex items-center justify-between">
        {/* Title */}
        {section.editingTitle ? (
          <input
            type="text"
            value={section.title}
            onChange={(e) => onUpdate(sectionKey, { ...section, title: e.target.value })}
            onBlur={() => onUpdate(sectionKey, { ...section, editingTitle: false })}
            onKeyDown={(e) => { if (e.key === "Enter") onUpdate(sectionKey, { ...section, editingTitle: false })}}
            autoFocus
            className="text-base font-semibold border border-slate-300 rounded px-2 py-1 w-full box-border text-black"
          />
        ) : (
          <h3
            onClick={() => onUpdate(sectionKey, { ...section, editingTitle: true })}
            className="text-base font-semibold text-slate-800 m-0 cursor-pointer flex-grow"
            title="Click to edit title"
          >
            {section.title}
          </h3>
        )}

        <div className="flex items-center">
            {/* Edit / Save Button */}
            <button
                onClick={() => {
                    if (section.editingContent) {
                        onSave(sectionKey, section.content);
                    }
                    onUpdate(sectionKey, { ...section, editingContent: !section.editingContent });
                }}
                 className="p-2 border-none bg-transparent"
            >
                {section.editingContent ? "💾" : <img src="/images/edit.png" alt="Edit" className="w-4 h-4" />}
            </button>

            {/* Dictate Button */}
            <button onClick={handleDictateClick} className="p-2 border-none bg-transparent" title={isDictating ? "Stop dictation" : "Start dictation"}>
                {isDictating ? <img src="/images/stop.png" alt="Stop" className="w-4 h-4" /> : <img src="/images/mic.png" alt="Dictate" className="w-4 h-4" />}
            </button>
        </div>
      </div>

      {/* Content */}
      {section.editingContent ? (
        <textarea
          value={section.content}
          onChange={(e) => onUpdate(sectionKey, { ...section, content: e.target.value })}
          autoFocus
          className="w-full p-2 rounded-md border border-slate-300 min-h-[100px] text-sm resize-vertical box-border"
        />
      ) : (
        <div className="text-sm whitespace-pre-wrap text-slate-900">
          {section.content || <span className="text-slate-400">Click edit to add notes...</span>}
        </div>
      )}
    </div>
  );
}