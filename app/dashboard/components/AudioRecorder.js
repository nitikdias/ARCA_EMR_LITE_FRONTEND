"use client";

import React, { useState, useEffect, useRef } from "react";
import { toast } from "react-toastify";

// Clinical Dictation Scripts for Samples 1 to 10
const SAMPLE_SCRIPTS = [
  {
    slot: 1,
    title: "Chief Complaint & History",
    script: "The patient is a 45-year-old presenting with a three-day history of persistent dry cough, low-grade fever, and mild exertional dyspnea with no chest pain.",
  },
  {
    slot: 2,
    title: "Vital Signs & Physical Examination",
    script: "Blood pressure is 128 over 82 mmHg, heart rate 76 beats per minute, regular rhythm, respiratory rate 16, and oxygen saturation 98% on room air.",
  },
  {
    slot: 3,
    title: "Cardiovascular Assessment",
    script: "Cardiovascular exam reveals normal S1 and S2 heart sounds with no murmurs, rubs, or gallops. Peripheral pulses are intact and equal bilaterally.",
  },
  {
    slot: 4,
    title: "Respiratory & Chest Examination",
    script: "Lungs are clear to auscultation bilaterally with good air entry. No wheezing, rales, or rhonchi noted throughout both lung fields.",
  },
  {
    slot: 5,
    title: "Abdominal & Gastrointestinal",
    script: "Abdomen is soft, non-tender, non-distended with normal active bowel sounds in all four quadrants. No hepatosplenomegaly or palpable masses.",
  },
  {
    slot: 6,
    title: "Neurological & Mental Status",
    script: "Cranial nerves two through twelve are grossly intact. Sensation is symmetric and deep tendon reflexes are two plus throughout.",
  },
  {
    slot: 7,
    title: "Diagnostic Orders & Lab Review",
    script: "Complete blood count, comprehensive metabolic panel, and a two-view chest X-ray are ordered to evaluate for infectious or inflammatory etiology.",
  },
  {
    slot: 8,
    title: "Prescription & Medication Plan",
    script: "Start oral azithromycin 500 milligrams on day one followed by 250 milligrams daily for four days. Advise adequate hydration and rest.",
  },
  {
    slot: 9,
    title: "Discharge Summary & Instructions",
    script: "Patient is discharged in stable condition. Instructed on return precautions for severe shortness of breath, high fever, or worsening symptoms.",
  },
  {
    slot: 10,
    title: "Follow-up & Continuity of Care",
    script: "Follow-up scheduled in the outpatient clinic in five days. Contact the clinic immediately if any adverse medication reactions occur.",
  },
];

export default function AudioRecorder({ userId, userName, userStatus = "active", onSampleAdded }) {
  const [samples, setSamples] = useState([]);
  const [loadingSamples, setLoadingSamples] = useState(false);
  const [activeSlot, setActiveSlot] = useState(1); // Currently focused slot (1 to 10)

  const isAccountActive = (userStatus || "").toLowerCase() === "active";
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioBlob, setAudioBlob] = useState(null);
  const [audioUrl, setAudioUrl] = useState(null);
  const [processingSlot, setProcessingSlot] = useState(null);
  const [validatingId, setValidatingId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);

  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const timerRef = useRef(null);
  const fileInputRefs = useRef({});

  // Fetch registered samples for this user
  const fetchSamples = async () => {
    if (!userId) return;
    try {
      setLoadingSamples(true);
      let res = await fetch(`/spark/api/profile/audio?user_id=${userId}`, {
        credentials: "include",
      });
      if (!res.ok) {
        res = await fetch(`/api/profile/audio?user_id=${userId}`);
      }
      if (res.ok) {
        const data = await res.json();
        setSamples(data.samples || []);
      }
    } catch (err) {
      console.warn("Failed to fetch audio samples:", err);
    } finally {
      setLoadingSamples(false);
    }
  };

  useEffect(() => {
    fetchSamples();
  }, [userId]);

  // Clean up timer and object URLs
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (audioUrl) URL.revokeObjectURL(audioUrl);
    };
  }, [audioUrl]);

  // Find sample matching a specific slot (1 to 10)
  const getSampleForSlot = (slotNum) => {
    return samples.find((s) => {
      if (s.filename) {
        if (s.filename.includes(`sample_${slotNum}.`) || s.filename.includes(`sample_${slotNum}_`)) {
          return true;
        }
      }
      return false;
    });
  };

  // Start in-browser recording for the targeted slot
  const startRecordingForSlot = async (slotNum) => {
    try {
      setActiveSlot(slotNum);
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 44100,
        },
      });

      audioChunksRef.current = [];
      setAudioBlob(null);
      if (audioUrl) URL.revokeObjectURL(audioUrl);
      setAudioUrl(null);
      setRecordingTime(0);

      const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : "audio/webm";

      const mediaRecorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: mimeType });
        setAudioBlob(blob);
        const url = URL.createObjectURL(blob);
        setAudioUrl(url);
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorder.start(200);
      setIsRecording(true);

      timerRef.current = setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);
    } catch (err) {
      console.error("Microphone error:", err);
      toast.error("Microphone access denied or device not found.");
    }
  };

  // Stop Recording
  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerRef.current) clearInterval(timerRef.current);
    }
  };

  // Reset current recording
  const resetRecording = () => {
    setAudioBlob(null);
    if (audioUrl) URL.revokeObjectURL(audioUrl);
    setAudioUrl(null);
    setRecordingTime(0);
  };

  // Process & Save (Calls 16-bit PCM standardization, 30681 Embedding Service, MinIO, and PostgreSQL)
  const processAndSaveSample = async (slotNum, fileToUpload = null) => {
    const uploadPayload = fileToUpload || audioBlob;
    if (!uploadPayload || !userId) {
      toast.error("Please record or select an audio sample first.");
      return;
    }

    try {
      setProcessingSlot(slotNum);
      const formData = new FormData();
      const filename = fileToUpload
        ? fileToUpload.name
        : `user_sample_${slotNum}.wav`;

      formData.append("audio", uploadPayload, filename);
      formData.append("user_id", userId);
      formData.append("slot_number", slotNum.toString());
      formData.append("duration_seconds", (recordingTime || 15).toString());
      formData.append("format", "wav");

      let res = await fetch("/spark/api/profile/audio", {
        method: "POST",
        credentials: "include",
        body: formData,
      });

      if (!res.ok) {
        res = await fetch("/api/profile/audio", {
          method: "POST",
          body: formData,
        });
      }

      const data = await res.json();
      if (res.ok && data.status === "success") {
        if (data.embedding_generated) {
          toast.success(`Sample ${slotNum} processed! Voice biometrics & embeddings saved to MinIO and PostgreSQL.`);
        } else {
          toast.success(`Sample ${slotNum} registered in PostgreSQL database.`);
        }
        resetRecording();
        fetchSamples();
        if (onSampleAdded) onSampleAdded(data.sample);
      } else {
        toast.error(data.error || "Failed to process audio sample.");
      }
    } catch (err) {
      console.error("Processing error:", err);
      toast.error("Error processing sample with embedding pipeline.");
    } finally {
      setProcessingSlot(null);
    }
  };

  // File Upload Fallback per slot
  const handleFileSelect = (slotNum, e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error("File size exceeds 5MB limit. Please choose a smaller audio file.");
      return;
    }

    processAndSaveSample(slotNum, file);
    if (fileInputRefs.current[slotNum]) {
      fileInputRefs.current[slotNum].value = "";
    }
  };

  // Validate Audio Quality
  const handleValidateQuality = async (sampleId, slotNum) => {
    try {
      setValidatingId(sampleId);
      let res = await fetch(`/spark/api/profile/audio/${sampleId}/validate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ validated: true }),
      });
      if (!res.ok) {
        res = await fetch(`/api/profile/audio/${sampleId}/validate`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ validated: true }),
        });
      }

      if (res.ok) {
        toast.success(`Sample ${slotNum} quality validated & certified for ambient transcription!`);
        fetchSamples();
      } else {
        toast.error("Validation failed");
      }
    } catch (err) {
      console.error("Validation error:", err);
      toast.error("Quality verification error");
    } finally {
      setValidatingId(null);
    }
  };

  // Delete Sample from Slot
  const handleDeleteSample = async (sampleId, slotNum) => {
    if (!confirm(`Are you sure you want to remove voice sample from Slot ${slotNum}?`)) return;
    try {
      setDeletingId(sampleId);
      let res = await fetch(`/spark/api/profile/audio/${sampleId}?user_id=${userId}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) {
        res = await fetch(`/api/profile/audio/${sampleId}?user_id=${userId}`, {
          method: "DELETE",
        });
      }
      if (res.ok) {
        toast.success(`Sample ${slotNum} removed from database.`);
        fetchSamples();
      } else {
        toast.error("Failed to delete sample");
      }
    } catch (err) {
      console.error("Delete error:", err);
      toast.error("Error deleting sample");
    } finally {
      setDeletingId(null);
    }
  };

  const formatTime = (secs) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  const enrolledCount = samples.length;
  const profilePercentage = Math.min(100, Math.round((enrolledCount / 10) * 100));

  if (!isAccountActive) {
    return (
      <div
        style={{
          backgroundColor: "#fffbeb",
          border: "1px solid #fde68a",
          borderRadius: "12px",
          padding: "24px",
          display: "flex",
          alignItems: "flex-start",
          gap: "16px",
          boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
        }}
      >
        <span style={{ fontSize: "32px", lineHeight: 1 }}>🔒</span>
        <div>
          <h3 style={{ fontSize: "16px", fontWeight: "700", color: "#92400e", margin: 0 }}>
            Voice Registration Locked
          </h3>
          <p style={{ fontSize: "13px", color: "#b45309", margin: "6px 0 0 0", lineHeight: "1.5" }}>
            Voice profiling and audio biometric enrollment are only available for <strong>Active</strong> practitioner accounts.
          </p>
          <div
            style={{
              marginTop: "14px",
              padding: "10px 16px",
              backgroundColor: "#fef3c7",
              border: "1px solid #fcd34d",
              borderRadius: "8px",
              fontSize: "13px",
              fontWeight: "600",
              color: "#78350f",
              display: "inline-block",
            }}
          >
            ⚠️ Account Status: {(userStatus || "Pending").toUpperCase()} — Please contact the administrator to activate your account.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
      {/* --- TOP BANNER: BIOMETRIC ENROLLMENT STATUS & PIPELINE OVERVIEW --- */}
      <div
        style={{
          backgroundColor: "#ffffff",
          border: "1px solid #e2e8f0",
          borderRadius: "12px",
          padding: "20px 24px",
          boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
          display: "flex",
          flexDirection: "column",
          gap: "14px",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px" }}>
          <div>
            <h3 style={{ fontSize: "16px", fontWeight: "700", color: "#012537", margin: 0, display: "flex", alignItems: "center", gap: "8px" }}>
              <span>🎙️</span> Voice Profiling & Acoustic Biometrics (1 to 10 Samples)
            </h3>
            <p style={{ fontSize: "12px", color: "#64748b", margin: "4px 0 0 0" }}>
              Standardized 16-bit PCM WAV $\rightarrow$ Voice Embedding Service <code>:30681</code> $\rightarrow$ MinIO <code>stenovault-embeddings</code> & PostgreSQL.
            </p>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <span
              style={{
                padding: "6px 14px",
                borderRadius: "20px",
                fontSize: "12px",
                fontWeight: "700",
                backgroundColor: enrolledCount >= 3 ? "#dcfce7" : enrolledCount >= 1 ? "#fef3c7" : "#f1f5f9",
                color: enrolledCount >= 3 ? "#15803d" : enrolledCount >= 1 ? "#b45309" : "#64748b",
              }}
            >
              {enrolledCount >= 3 ? "🟢 Diarization Active" : enrolledCount >= 1 ? "🟡 Basic Profile (3+ Recommended)" : "⚪ Unenrolled"}
            </span>

            <button
              onClick={fetchSamples}
              disabled={loadingSamples}
              style={{
                padding: "6px 12px",
                backgroundColor: "#f8fafc",
                border: "1px solid #cbd5e1",
                borderRadius: "6px",
                fontSize: "12px",
                fontWeight: "600",
                color: "#334155",
                cursor: "pointer",
              }}
            >
              {loadingSamples ? "Refreshing..." : "🔄 Refresh Slots"}
            </button>
          </div>
        </div>

        {/* Progress Bar */}
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", marginBottom: "6px" }}>
            <span style={{ fontWeight: "600", color: "#334155" }}>
              Voice Profile Completeness: <strong>{enrolledCount} of 10 Samples Enrolled</strong>
            </span>
            <span style={{ fontWeight: "700", color: "#0284c7" }}>{profilePercentage}%</span>
          </div>
          <div style={{ width: "100%", height: "8px", backgroundColor: "#e2e8f0", borderRadius: "4px", overflow: "hidden" }}>
            <div
              style={{
                width: `${profilePercentage}%`,
                height: "100%",
                backgroundColor: profilePercentage >= 60 ? "#10b981" : profilePercentage >= 20 ? "#0284c7" : "#f59e0b",
                transition: "width 0.4s ease",
              }}
            />
          </div>
        </div>
      </div>

      {/* --- ACTIVE RECORDING / LIVE PREVIEW MODAL DOCK --- */}
      {isRecording && (
        <div
          style={{
            position: "sticky",
            top: "80px",
            zIndex: 40,
            backgroundColor: "#012537",
            color: "#ffffff",
            borderRadius: "12px",
            padding: "18px 24px",
            boxShadow: "0 10px 25px rgba(0,0,0,0.25)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "20px",
            flexWrap: "wrap",
            border: "2px solid #ef4444",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
            <div
              style={{
                width: "14px",
                height: "14px",
                borderRadius: "50%",
                backgroundColor: "#ef4444",
                animation: "pulse 1s infinite",
              }}
            />
            <div>
              <p style={{ margin: 0, fontWeight: "700", fontSize: "14px" }}>
                Recording Sample {activeSlot}: {SAMPLE_SCRIPTS[activeSlot - 1]?.title}
              </p>
              <p style={{ margin: "2px 0 0 0", fontSize: "12px", color: "#cbd5e1" }}>
                Read the highlighted script text aloud clearly...
              </p>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
            <span style={{ fontSize: "28px", fontWeight: "800", fontFamily: "monospace", color: "#f87171" }}>
              {formatTime(recordingTime)}
            </span>

            <button
              type="button"
              onClick={stopRecording}
              style={{
                padding: "8px 20px",
                backgroundColor: "#ef4444",
                color: "#ffffff",
                border: "none",
                borderRadius: "6px",
                fontSize: "13px",
                fontWeight: "700",
                cursor: "pointer",
                boxShadow: "0 2px 6px rgba(239, 68, 68, 0.4)",
              }}
            >
              ⏹️ Finish Recording
            </button>
          </div>
        </div>
      )}

      {/* --- PREVIEW & PROCESS BAR (AFTER RECORDING) --- */}
      {audioUrl && !isRecording && (
        <div
          style={{
            backgroundColor: "#f0fdf4",
            border: "2px solid #86efac",
            borderRadius: "12px",
            padding: "18px 24px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "16px",
            flexWrap: "wrap",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <span style={{ fontSize: "22px" }}>🔊</span>
            <div>
              <p style={{ margin: 0, fontWeight: "700", fontSize: "14px", color: "#166534" }}>
                Recorded Preview for Slot {activeSlot} ({formatTime(recordingTime)})
              </p>
              <audio controls src={audioUrl} style={{ height: "32px", width: "240px", marginTop: "4px" }} />
            </div>
          </div>

          <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
            <button
              type="button"
              onClick={resetRecording}
              style={{
                padding: "8px 14px",
                backgroundColor: "#ffffff",
                color: "#ef4444",
                border: "1px solid #fca5a5",
                borderRadius: "6px",
                fontSize: "12px",
                fontWeight: "600",
                cursor: "pointer",
              }}
            >
              Discard
            </button>

            <button
              type="button"
              onClick={() => processAndSaveSample(activeSlot)}
              disabled={processingSlot === activeSlot}
              style={{
                padding: "8px 20px",
                backgroundColor: "#012537",
                color: "#ffffff",
                border: "none",
                borderRadius: "6px",
                fontSize: "13px",
                fontWeight: "700",
                cursor: processingSlot === activeSlot ? "not-allowed" : "pointer",
                display: "flex",
                alignItems: "center",
                gap: "8px",
                boxShadow: "0 2px 6px rgba(1, 37, 55, 0.25)",
              }}
            >
              {processingSlot === activeSlot ? "⚙️ Generating Embeddings..." : "💾 Process & Save Embedding (.NPY) to DB"}
            </button>
          </div>
        </div>
      )}

      {/* --- 10-SLOT ENROLLMENT GRID --- */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: "16px" }}>
        {SAMPLE_SCRIPTS.map((item) => {
          const sample = getSampleForSlot(item.slot);
          const isSlotRecording = isRecording && activeSlot === item.slot;
          const isProcessing = processingSlot === item.slot;
          const hasRecorded = !!sample;

          return (
            <div
              key={item.slot}
              style={{
                backgroundColor: isSlotRecording ? "#fff1f2" : hasRecorded ? "#ffffff" : "#f8fafc",
                border: isSlotRecording
                  ? "2px solid #ef4444"
                  : hasRecorded
                  ? "1px solid #cbd5e1"
                  : "1px dashed #cbd5e1",
                borderRadius: "10px",
                padding: "18px 20px",
                boxShadow: hasRecorded ? "0 1px 3px rgba(0,0,0,0.05)" : "none",
                display: "flex",
                flexDirection: "column",
                gap: "12px",
                transition: "all 0.2s ease",
              }}
            >
              {/* Slot Header */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "8px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <div
                    style={{
                      width: "32px",
                      height: "32px",
                      borderRadius: "50%",
                      backgroundColor: hasRecorded ? "#012537" : "#e2e8f0",
                      color: hasRecorded ? "#ffffff" : "#475569",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontWeight: "700",
                      fontSize: "13px",
                    }}
                  >
                    {item.slot}
                  </div>
                  <div>
                    <h4 style={{ margin: 0, fontSize: "14px", fontWeight: "700", color: "#0f172a" }}>
                      Sample {item.slot}: {item.title}
                    </h4>
                    <span style={{ fontSize: "11px", color: "#64748b" }}>
                      Filename: <code>user_sample_{item.slot}.wav</code>
                    </span>
                  </div>
                </div>

                {/* Status Badges */}
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  {hasRecorded ? (
                    <>
                      {sample.validated ? (
                        <span style={{ padding: "3px 8px", backgroundColor: "#dcfce7", color: "#15803d", borderRadius: "12px", fontSize: "11px", fontWeight: "700" }}>
                          ✓ Certified Quality
                        </span>
                      ) : (
                        <span style={{ padding: "3px 8px", backgroundColor: "#fef3c7", color: "#b45309", borderRadius: "12px", fontSize: "11px", fontWeight: "600" }}>
                          Pending Validation
                        </span>
                      )}

                      <span style={{ padding: "3px 8px", backgroundColor: "#f0fdf4", color: "#166534", border: "1px solid #bbf7d0", borderRadius: "12px", fontSize: "11px", fontWeight: "600" }}>
                        ⚡ .NPY Vector Saved
                      </span>
                    </>
                  ) : (
                    <span style={{ padding: "3px 8px", backgroundColor: "#f1f5f9", color: "#64748b", borderRadius: "12px", fontSize: "11px", fontWeight: "500" }}>
                      ⚪ Empty Slot
                    </span>
                  )}
                </div>
              </div>

              {/* Dictation Script Prompt */}
              <div
                style={{
                  padding: "10px 14px",
                  backgroundColor: "#f8fafc",
                  borderLeft: "3px solid #0284c7",
                  borderRadius: "4px",
                  fontSize: "12px",
                  color: "#334155",
                  lineHeight: "1.5",
                  fontStyle: "italic",
                }}
              >
                &ldquo;{item.script}&rdquo;
              </div>

              {/* Player and Slot Controls */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "10px", paddingTop: "4px" }}>
                {/* Audio Playback Player if sample exists */}
                {hasRecorded ? (
                  <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    <audio
                      controls
                      src={`/spark/api/profile/audio/${sample.id}`}
                      style={{ height: "30px", width: "220px" }}
                    />
                    <span style={{ fontSize: "11px", color: "#64748b" }}>
                      {sample.duration_seconds || 15}s • {new Date(sample.created_at).toLocaleDateString()}
                    </span>
                  </div>
                ) : (
                  <div style={{ fontSize: "12px", color: "#94a3b8" }}>
                    Record 15–30s or upload a .wav audio file for this slot.
                  </div>
                )}

                {/* Actions */}
                <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                  {/* Record Button */}
                  <button
                    type="button"
                    onClick={() => startRecordingForSlot(item.slot)}
                    disabled={isRecording || isProcessing}
                    style={{
                      padding: "6px 12px",
                      backgroundColor: hasRecorded ? "#ffffff" : "#012537",
                      color: hasRecorded ? "#012537" : "#ffffff",
                      border: hasRecorded ? "1px solid #012537" : "none",
                      borderRadius: "6px",
                      fontSize: "12px",
                      fontWeight: "600",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: "5px",
                    }}
                  >
                    🎙️ {hasRecorded ? "Re-record Slot" : "Record Slot"}
                  </button>

                  {/* Upload Fallback File */}
                  <label
                    style={{
                      padding: "6px 12px",
                      backgroundColor: "#ffffff",
                      color: "#475569",
                      border: "1px solid #cbd5e1",
                      borderRadius: "6px",
                      fontSize: "12px",
                      fontWeight: "600",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: "5px",
                    }}
                  >
                    📁 Upload File
                    <input
                      ref={(el) => (fileInputRefs.current[item.slot] = el)}
                      type="file"
                      accept="audio/*,.wav,.mp3,.m4a,.ogg"
                      onChange={(e) => handleFileSelect(item.slot, e)}
                      style={{ display: "none" }}
                    />
                  </label>

                  {/* Download Action */}
                  {hasRecorded && (
                    <a
                      href={`/spark/api/profile/audio/${sample.id}/download`}
                      download={`user_sample_${item.slot}.wav`}
                      style={{
                        padding: "6px 10px",
                        backgroundColor: "#f8fafc",
                        color: "#0284c7",
                        border: "1px solid #cbd5e1",
                        borderRadius: "6px",
                        fontSize: "12px",
                        fontWeight: "600",
                        textDecoration: "none",
                        display: "flex",
                        alignItems: "center",
                        gap: "4px",
                      }}
                    >
                      ⬇️ Download
                    </a>
                  )}

                  {/* Validate Quality Action */}
                  {hasRecorded && !sample.validated && (
                    <button
                      type="button"
                      onClick={() => handleValidateQuality(sample.id, item.slot)}
                      disabled={validatingId === sample.id}
                      style={{
                        padding: "6px 10px",
                        backgroundColor: "#f0fdf4",
                        color: "#16a34a",
                        border: "1px solid #bbf7d0",
                        borderRadius: "6px",
                        fontSize: "12px",
                        fontWeight: "600",
                        cursor: "pointer",
                      }}
                    >
                      {validatingId === sample.id ? "Validating..." : "✓ Validate Quality"}
                    </button>
                  )}

                  {/* Delete Action */}
                  {hasRecorded && (
                    <button
                      type="button"
                      onClick={() => handleDeleteSample(sample.id, item.slot)}
                      disabled={deletingId === sample.id}
                      title="Delete slot sample"
                      style={{
                        padding: "6px 8px",
                        backgroundColor: "#fef2f2",
                        color: "#ef4444",
                        border: "1px solid #fecaca",
                        borderRadius: "6px",
                        fontSize: "12px",
                        fontWeight: "600",
                        cursor: "pointer",
                      }}
                    >
                      {deletingId === sample.id ? "..." : "🗑️"}
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
