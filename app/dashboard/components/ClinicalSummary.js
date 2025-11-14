"use client";
import React from 'react';
import { toast } from 'react-toastify';
import { generatePDF } from '../utils/pdfGenerator'; 
import { useUser } from '@/context/userContext';

const API_KEY = "n1i2t3i4k5d6i7a8s";

// --- WAV Conversion Utilities (unchanged) ---
async function convertWebMToWav(webmBlob) {
  const arrayBuffer = await webmBlob.arrayBuffer();
  const audioContext = new AudioContext();
  const decoded = await audioContext.decodeAudioData(arrayBuffer);
  const wavBuffer = audioBufferToWav(decoded);
  return new Blob([wavBuffer], { type: "audio/wav" });
}

function audioBufferToWav(buffer) {
  const numOfChan = buffer.numberOfChannels;
  const length = buffer.length * numOfChan * 2 + 44;
  const bufferArray = new ArrayBuffer(length);
  const view = new DataView(bufferArray);
  const channels = [];
  const sampleRate = buffer.sampleRate;

  let offset = 0;
  function writeString(s) {
    for (let i = 0; i < s.length; i++) view.setUint8(offset + i, s.charCodeAt(i));
  }

  writeString("RIFF"); offset += 4;
  view.setUint32(offset, 36 + buffer.length * numOfChan * 2, true); offset += 4;
  writeString("WAVE"); offset += 4;
  writeString("fmt "); offset += 4;
  view.setUint32(offset, 16, true); offset += 4;
  view.setUint16(offset, 1, true); offset += 2;
  view.setUint16(offset, numOfChan, true); offset += 2;
  view.setUint32(offset, sampleRate, true); offset += 4;
  view.setUint32(offset, sampleRate * numOfChan * 2, true); offset += 4;
  view.setUint16(offset, numOfChan * 2, true); offset += 2;
  view.setUint16(offset, 16, true); offset += 2;
  writeString("data"); offset += 4;
  view.setUint32(offset, buffer.length * numOfChan * 2, true); offset += 4;

  for (let i = 0; i < numOfChan; i++) channels.push(buffer.getChannelData(i));
  const interleaved = interleave(channels);
  floatTo16BitPCM(view, 44, interleaved);
  return bufferArray;
}

function interleave(channels) {
  const length = channels[0].length;
  const result = new Float32Array(length * channels.length);
  let index = 0;
  for (let i = 0; i < length; i++) {
    for (let j = 0; j < channels.length; j++) result[index++] = channels[j][i];
  }
  return result;
}

function floatTo16BitPCM(output, offset, input) {
  for (let i = 0; i < input.length; i++, offset += 2) {
    let s = Math.max(-1, Math.min(1, input[i]));
    output.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true);
  }
}

// --- Summary Section ---
function SummarySection({ sectionKey, section, onUpdate, onSave }) {
  const { user } = useUser();
  const [isDictating, setIsDictating] = React.useState(false);
  const mediaRecorderRef = React.useRef(null);
  const audioChunksRef = React.useRef([]);

  const handleDictateClick = async () => {
    if (!isDictating) {
      const userId = user?.id;
      if (!userId) {
        console.error("User not authenticated");
        return;
      }

      setIsDictating(true);
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const mediaRecorder = new MediaRecorder(stream);
        mediaRecorderRef.current = mediaRecorder;
        audioChunksRef.current = [];

        mediaRecorder.ondataavailable = (e) => audioChunksRef.current.push(e.data);

        mediaRecorder.onstop = async () => {
          try {
            const webmBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });
            const wavBlob = await convertWebMToWav(webmBlob);

            const formData = new FormData();
            formData.append("audio", wavBlob, "dictation.wav");
            formData.append("user_id", userId);

            const response = await fetch("http://localhost:8002/whisper-dictate", {
              headers: { "X-API-Key": API_KEY },
              method: "POST",
              body: formData,
            });

            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

            const data = await response.json();
            const transcript = data.transcript?.trim();

            if (transcript) {
              onUpdate(sectionKey, (prevSection) => {
                const currentContent = prevSection.content || "";
                const newContent =
                  currentContent +
                  (currentContent.trim() ? "\n- " : "- ") +
                  transcript;
                onSave(sectionKey, newContent);
                return { ...prevSection, content: newContent };
              });
            } else if (data.error) {
              console.error("Transcription error:", data.error);
            }
          } catch (err) {
            console.error("Dictation failed:", err);
          } finally {
            setIsDictating(false);
          }
        };

        mediaRecorder.start();
      } catch (err) {
        console.error("Mic access denied:", err);
        setIsDictating(false);
      }
    } else {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
        mediaRecorderRef.current.stop();
        mediaRecorderRef.current.stream.getTracks().forEach((track) => track.stop());
      }
    }
  };

  const decodeHtml = (html) => {
    const txt = document.createElement("textarea");
    txt.innerHTML = html;
    return txt.value;
  };

  return (
    <div key={sectionKey} className="bg-slate-50 border border-slate-200 rounded-lg p-4 mb-4 relative text-black">
      <div className="mb-3 flex items-center justify-between">
        {section.editingTitle ? (
          <input
            type="text"
            value={section.title}
            onChange={(e) =>
              onUpdate(sectionKey, (prev) => ({ ...prev, title: e.target.value }))
            }
            onBlur={() => onUpdate(sectionKey, (prev) => ({ ...prev, editingTitle: false }))}
            onKeyDown={(e) => {
              if (e.key === "Enter")
                onUpdate(sectionKey, (prev) => ({ ...prev, editingTitle: false }));
            }}
            autoFocus
            className="text-base font-semibold border border-slate-300 rounded px-2 py-1 w-full box-border text-black"
          />
        ) : (
          <h3
            onClick={() => onUpdate(sectionKey, (prev) => ({ ...prev, editingTitle: true }))}
            className="text-base font-semibold text-slate-800 m-0 cursor-pointer flex-grow"
            title="Click to edit title"
          >
            {section.title}
          </h3>
        )}
        <div className="flex items-center">
          <button
            onClick={() => {
              if (section.editingContent) onSave(sectionKey, section.content);
              onUpdate(sectionKey, (prev) => ({
                ...prev,
                editingContent: !prev.editingContent,
              }));
            }}
            className="p-2 border-none bg-transparent"
          >
            {section.editingContent ? "💾" : <img src="/images/edit.png" alt="Edit" className="w-4 h-4" />}
          </button>
          <button
            onClick={handleDictateClick}
            className="p-2 border-none bg-transparent"
            title={isDictating ? "Stop dictation" : "Start dictation"}
          >
            {isDictating ? (
              <img src="/images/stop.png" alt="Stop" className="w-4 h-4" />
            ) : (
              <img src="/images/mic.png" alt="Dictate" className="w-4 h-4" />
            )}
          </button>
        </div>
      </div>

      {section.editingContent ? (
        <textarea
          value={section.content}
          onChange={(e) =>
            onUpdate(sectionKey, (prev) => ({ ...prev, content: e.target.value }))
          }
          autoFocus
          className="w-full p-2 rounded-md border border-slate-300 min-h-[100px] text-sm resize-vertical box-border"
        />
      ) : (
        <div className="text-sm whitespace-pre-wrap text-slate-900">
          {section.content ? (
            decodeHtml(section.content)
          ) : (
            <span className="text-slate-400">Click edit to add notes...</span>
          )}
        </div>
      )}
    </div>
  );
}

// --- Main Summary Component ---
export default function ClinicalSummary({ sections, setSections, saveSectionToDB, transcript }) {
  const handleUpdateSection = (key, updater) => {
    setSections((prev) => ({
      ...prev,
      [key]:
        typeof updater === "function"
          ? updater(prev[key])
          : { ...prev[key], ...updater },
    }));
  };

  const handleSaveSection = async (key, content) => {
    const lines = (content || "")
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);
    const uniqueLines = Array.from(
      new Set(lines.map((line) => line.replace(/^[-•\s]+/, "").trim().toLowerCase()))
    ).map((normalized) => {
      const original = lines.find(
        (l) => l.replace(/^[-•\s]+/, "").trim().toLowerCase() === normalized
      );
      return original.startsWith("-") ? original : `- ${original}`;
    });
    const cleanedContent = uniqueLines.join("\n");

    setSections((prev) => ({
      ...prev,
      [key]: { ...prev[key], content: cleanedContent, editingContent: false },
    }));

    await saveSectionToDB(key, cleanedContent);
  };

  const handleCopyToClipboard = () => {
    let content = "";
    Object.values(sections).forEach((sec) => {
      if (sec?.content) content += `${sec.title}:\n${sec.content}\n\n`;
    });
    content += transcript ? `Transcript:\n${transcript}` : "";
    navigator.clipboard.writeText(content);
    toast.success("Copied to clipboard!");
  };

  return (
    <div className="bg-white rounded-lg p-4 sm:p-6 border border-gray-200 shadow-sm flex flex-col">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4">
        <div className="flex items-center gap-2">
          <div className="w-5 h-5">
            <svg viewBox="0 0 24 24" fill="currentColor" className="text-gray-800">
              <path d="M9 11H7v6h2v-6zm4 0h-2v6h2v-6zm4 0h-2v6h2v-6zm2-7h-3V2h-2v2H8V2H6v2H3c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 16H3V9h14v11z" />
            </svg>
          </div>
          <h2 className="text-base sm:text-lg font-semibold text-gray-800 m-0">
            Clinical Summary
          </h2>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleCopyToClipboard}
            className="p-2 border border-gray-800 rounded bg-transparent hover:bg-gray-50"
            title="Copy to clipboard"
          >
            <img src="/images/copy.png" alt="Copy" className="w-4 h-4" />
          </button>
          <button
            onClick={() => generatePDF(sections, transcript)}
            className="p-2 border border-gray-800 rounded bg-transparent hover:bg-gray-50"
            title="Download as PDF"
          >
            <img src="/images/downloads.png" alt="Save PDF" className="w-4 h-4" />
          </button>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto">
        {Object.keys(sections).map((key) => (
          <SummarySection
            key={key}
            sectionKey={key}
            section={sections[key]}
            onUpdate={handleUpdateSection}
            onSave={handleSaveSection}
          />
        ))}
      </div>
    </div>
  );
}
