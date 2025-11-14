"use client";
import React, { useEffect, useState, useRef } from 'react';
import { toast, ToastContainer } from "react-toastify";
import 'react-toastify/dist/ReactToastify.css';

// Import contexts and components
import { useMeeting } from '@/context/meetingContext';
import { useUser } from "@/context/userContext";
import { useRecording } from '@/context/recordingContext';
import { useAudioRecorder } from './dashboard/hooks/useAudioRecorder';
import Sidebar from './sidebar/page'; 
import Header from './header/page';
import RecordingPanel from './dashboard/components/RecordingPanel';
import ClinicalSummary from './dashboard/components/ClinicalSummary';

const API_KEY = "n1i2t3i4k5d6i7a8s";

export default function App() {
  const { meetingId } = useMeeting();
  const { canRecord, setCanRecord } = useRecording();
  const { user, loading } = useUser(); 
  
  const [stats, setStats] = useState({ today: 0, week: 0 });
  const [selectedLanguage, setSelectedLanguage] = useState("en");
  const [transcript, setTranscript] = useState('');
  const [summary, setSummary] = useState('');
  const [isGeneratingSummary, setIsGeneratingSummary] = useState(false);
  const [readyForSummary, setReadyForSummary] = useState(false);
  const [sections, setSections] = useState({
    hpi: { title: "History of presenting complaints", content: "", editingTitle: false, editingContent: false },
    physicalExam: { title: "Physical Examination", content: "", editingTitle: false, editingContent: false },
    investigations: { title: "Investigations", content: "", editingTitle: false, editingContent: false },
    prescription: { title: "Prescription and Initial Management", content: "", editingTitle: false, editingContent: false },
    assessment: { title: "Assessment and Plan", content: "", editingTitle: false, editingContent: false }
  });

  const {
    mics, deviceId, setDeviceId, recording, paused, recordingTime,
    startRec, stopRec, pauseRec, resumeRec
  } = useAudioRecorder();

  const transcriptPollingRef = useRef(null);

  // --- Fetch Stats ---
  useEffect(() => {
    if (!user) return; 
    async function fetchStats() {
      try {
        const res = await fetch(`http://localhost:8000/stats?user_id=${user.id}`, { headers: { "X-API-Key": API_KEY } });
        if (res.ok) setStats(await res.json());
      } catch (err) { console.error("Failed to fetch stats:", err); }
    }
    fetchStats();
  }, [user]);

  // --- Transcript Polling ---
  const startTranscriptPolling = () => {
    if (!user) return;
    const poll = async () => {
      const formData = new FormData();
      formData.append("user_id", user.id);
      try {
        const res = await fetch("http://localhost:8000/get_transcript", { method: "POST", body: formData, headers: { "X-API-Key": API_KEY } });
        if (res.ok) {
          const data = await res.json();
          setTranscript(data.transcript || '');
        }
      } catch (error) {
        console.error("Polling error:", error);
      }
    };
    poll();
    transcriptPollingRef.current = setInterval(poll, 3000);
  };

  const stopTranscriptPolling = () => {
    if (transcriptPollingRef.current) clearInterval(transcriptPollingRef.current);
  };

  useEffect(() => {
    if (recording && !paused && user) { 
      startTranscriptPolling();
    } else {
      stopTranscriptPolling();
    }
    return () => stopTranscriptPolling();
  }, [recording, paused, user]);

  // --- Language ---
  const handleLanguageChange = async (e) => {
    const lang = e.target.value;
    setSelectedLanguage(lang);
    try {
      await fetch("http://localhost:8000/select_language", {
        method: "POST", headers: { "Content-Type": "application/json", "X-API-Key": API_KEY },
        body: JSON.stringify({ language_code: lang })
      });
    } catch (error) { console.error("Error setting language:", error); }
  };
  
  // --- Save Section ---
  const saveSectionToDB = async (sectionKey, content) => {
    if (!meetingId) return;
    const titles = Object.fromEntries(Object.entries(sections).map(([k, v]) => [k, v.title]));
    const userId = user?.id;

    if (!userId) {
      console.error("User not authenticated");
      return;
    }
    try {
      await fetch("http://localhost:8000/update_transcript_section", {
        method: "POST", headers: { "Content-Type": "application/json", "X-API-Key": API_KEY },
        body: JSON.stringify({ meeting_id: meetingId, user_id: user.id, section_key: sectionKey, content, titles })
      });
    } catch (err) { console.error("Error saving section:", err); }
  };

  // --- Generate Summary ---
  const generateSummary = async () => {
    if (!meetingId) {
      toast.error("No active meeting.");
      return;
    }

    if (loading) {
      toast.info("Loading user info...");
      return;
    }

    const userId = user?.id || "system";
    setIsGeneratingSummary(true);

    try {
      const res = await fetch("http://localhost:8000/generate_summary", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-API-Key": API_KEY,
        },
        body: JSON.stringify({
          meeting_id: meetingId,
          user_id: userId,
          transcript,
          titles: Object.fromEntries(Object.entries(sections).map(([k, v]) => [k, v.title])),
          selected_language: selectedLanguage,
        }),
      });

      if (!res.ok) {
        const errText = await res.text();
        console.error("Backend error:", errText);
        toast.error("Failed to generate summary.");
        return;
      }

      const data = await res.json();
      console.log("Summary API response:", data);

      if (!data || !data.summary) {
        toast.error("No summary returned.");
        return;
      }

      // --- If summary is structured (object)
      if (typeof data.summary === "object" && !Array.isArray(data.summary)) {
        const updatedSections = { ...sections };
        Object.keys(updatedSections).forEach((key) => {
          if (data.summary[key]) {
            updatedSections[key].content = data.summary[key] || "";
          }
        });
        setSections(updatedSections);
        toast.success("Summary loaded into sections!");

        // Optional: auto-save
        for (const key in updatedSections) {
          if (updatedSections[key].content.trim()) {
            await saveSectionToDB(key, updatedSections[key].content);
          }
        }
      } 
      // --- If summary is plain text
      else if (typeof data.summary === "string") {
        setSections((prev) => ({
          ...prev,
          assessment: { ...prev.assessment, content: data.summary || "" }
        }));
        setSummary(data.summary);
        toast.success("Summary generated (text only).");
      } 
      else {
        toast.warn("Unrecognized summary format.");
      }
    } catch (error) {
      console.error("Error generating summary:", error);
      toast.error("Server error generating summary.");
    } finally {
      setIsGeneratingSummary(false);
    }
  };

  // --- Logout ---
 const handleLogout = async () => {
  try {
    const res = await fetch("/api/logout", {  // ✅ Use Next.js API route
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",  // ✅ Include cookies
    });

    if (res.ok) {
      localStorage.clear();
      window.location.href = "/login";
    } else {
      const errorData = await res.json();
      console.error("❌ Logout failed:", errorData);
      toast.error("Logout failed");
    }
  } catch (err) {
    console.error("Error during logout:", err);
    toast.error("Logout error");
  }
};


  // --- Recording Controls ---
  const handleStartRec = () => {
    startRec();
    setCanRecord(true); 
  };
  
  const handleStopRec = async () => {
    await stopRec();
    setReadyForSummary(true); 
    setCanRecord(true);
  };
  
  const handleGenerateSummary = () => {
    generateSummary();
    setCanRecord(false);
  };

  // --- UI ---
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-lg text-gray-700">Loading user data...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 font-sans">
      <ToastContainer position="top-right" autoClose={2000} hideProgressBar />
      <Header user={user} handleLogout={handleLogout} /> 
      <div className="flex flex-col md:flex-row">
        <Sidebar stats={stats} />
        <div className="flex-1 p-4 sm:p-6 pt-20 md:pt-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 min-h-[calc(100vh-150px)]">
            <RecordingPanel
              user={user} 
              mics={mics} deviceId={deviceId} setDeviceId={setDeviceId}
              recording={recording} paused={paused} recordingTime={recordingTime}
              startRec={handleStartRec} stopRec={handleStopRec} pauseRec={pauseRec} resumeRec={resumeRec}
              transcript={transcript}
              selectedLanguage={selectedLanguage}
              handleLanguageChange={handleLanguageChange}
              canRecord={canRecord}
              readyForSummary={readyForSummary}
              setReadyForSummary={setReadyForSummary}
              handleGenerateSummary={handleGenerateSummary}
            />
            <ClinicalSummary
              sections={sections}
              setSections={setSections}
              saveSectionToDB={saveSectionToDB}
              transcript={transcript}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
