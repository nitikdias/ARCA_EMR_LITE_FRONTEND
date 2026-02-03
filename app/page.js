"use client";
import React, { useEffect, useState, useRef } from 'react';
import { toast, ToastContainer } from "react-toastify";
import 'react-toastify/dist/ReactToastify.css';

// Import contexts and components
import { useMeeting } from '@/context/meetingContext';
import { useUser } from "@/context/userContext";
import { useRecording } from '@/context/recordingContext';
import { useAudioRecorderVAD } from './dashboard/hooks/useAudioRecorderVAD';
import Sidebar from './sidebar/page'; 
import Header from './header/page';
import RecordingPanel from './dashboard/components/RecordingPanel';
import SummaryTabs from './dashboard/components/SummaryTabs';

const API_KEY = process.env.API_KEY || process.env.NEXT_PUBLIC_API_KEY || "";
const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "";

export default function App() {
  const { meetingId } = useMeeting();
  const { canRecord, setCanRecord } = useRecording();
  const { user, loading } = useUser(); 
  
  // Debug logging
  useEffect(() => {
    console.log("🔍 Debug - User state:", user);
    console.log("🔍 Debug - Loading state:", loading);
    console.log("🔍 Debug - LocalStorage userId:", localStorage.getItem("userId"));
  }, [user, loading]);
  
  const [stats, setStats] = useState({ today: 0, week: 0 });
  const [selectedLanguage, setSelectedLanguage] = useState("en");
  const [transcript, setTranscript] = useState('');
  const [summary, setSummary] = useState('');
  const [isGeneratingSummary, setIsGeneratingSummary] = useState(false);
  const [readyForSummary, setReadyForSummary] = useState(false);
  const [activeTab, setActiveTab] = useState('clinical');
  const [sections, setSections] = useState({
    hpi: { 
      title: "History of presenting complaints", 
      content: "", 
      editingTitle: false, 
      editingContent: false 
    },
    pmh: { 
      title: "Past Medical/Surgical History", 
      content: "", 
      editingTitle: false, 
      editingContent: false 
    },
    familyHistory: { 
      title: "Family History", 
      content: "", 
      editingTitle: false, 
      editingContent: false 
    },
    lifestyle: { 
      title: "Lifestyle History", 
      content: "", 
      editingTitle: false, 
      editingContent: false 
    },
    physicalExam: { 
      title: "Physical Examination", 
      content: "", 
      editingTitle: false, 
      editingContent: false 
    },
    investigations: { 
      title: "Investigation Summary", 
      content: "", 
      editingTitle: false, 
      editingContent: false 
    },
    assessment: { 
      title: "Assessment and Discussion", 
      content: "", 
      editingTitle: false, 
      editingContent: false 
    },
    management: { 
      title: "Management Plan", 
      content: "", 
      editingTitle: false, 
      editingContent: false 
    },
    prescription: { 
      title: "Prescription", 
      content: "", 
      editingTitle: false, 
      editingContent: false 
    },
  });

  const [dischargeSections, setDischargeSections] = useState({
    diagnosis: { 
      title: "Diagnosis", 
      content: "", 
      editingTitle: false, 
      editingContent: false 
    },
    admission_reason: { 
      title: "Reason for admission", 
      content: "", 
      editingTitle: false, 
      editingContent: false 
    },
    hpi: { 
      title: "History of Present Illness", 
      content: "", 
      editingTitle: false, 
      editingContent: false 
    },
    past_history: { 
      title: "Past History", 
      content: "", 
      editingTitle: false, 
      editingContent: false 
    },
    examination: { 
      title: "Examination", 
      content: "", 
      editingTitle: false, 
      editingContent: false 
    },
    lab_reports: { 
      title: "Lab Reports", 
      content: "", 
      editingTitle: false, 
      editingContent: false 
    },
    hospital_course: { 
      title: "Course in the hospital", 
      content: "", 
      editingTitle: false, 
      editingContent: false 
    },
    recommendations: { 
      title: "Recommendations", 
      content: "", 
      editingTitle: false, 
      editingContent: false 
    },
    followup: { 
      title: "Follow up plan", 
      content: "", 
      editingTitle: false, 
      editingContent: false 
    },
  });


  const {
    mics, deviceId, setDeviceId, recording, paused, stopping, recordingTime,
    startRec, stopRec, pauseRec, resumeRec
  } = useAudioRecorderVAD();

  const transcriptPollingRef = useRef(null);

  // ✅ Call clear endpoint when new encounter starts
useEffect(() => {
  console.log("Meeting ID changed:", meetingId);
  
  if (meetingId && user) {
    console.log("🆕 New encounter started - clearing all data");
    
    // ✅ Clear backend transcript
    clearBackendTranscript();
    
    // Clear frontend transcript
    setTranscript("");
    
    // Clear content but keep custom titles
    setSections((prevSections) => {
      const clearedSections = {};
      Object.keys(prevSections).forEach((key) => {
        clearedSections[key] = {
          title: prevSections[key].title,
          content: "",
          editingTitle: false,
          editingContent: false,
        };
      });
      return clearedSections;
    });
    
    // Reset other states
    setSummary("");
    setReadyForSummary(false);
    
    // ✅ Reset language to English for new encounter
    setSelectedLanguage("en");
    
    // Also update backend language setting to English
    if (user?.id) {
      const TOKEN_KEY = process.env.NEXT_PUBLIC_TOKEN_KEY;
      (async () => {
        try {
          await fetch(`/api/backend/select_language`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "X-API-KEY": API_KEY,
            },
            credentials: "include",
            body: JSON.stringify({
              language_code: "en",
              user_id: user.id,
            }),
          });
          console.log("✅ Language reset to English for new encounter");
        } catch (error) {
          console.error("Error resetting language:", error);
        }
      })();
    }
    
    toast.info("New encounter started - ready for recording");
  }
}, [meetingId, user]);

// ✅ Add function to clear backend transcript
const clearBackendTranscript = async () => {
  if (!user?.id) {
    console.warn("Cannot clear transcript: No user ID");
    return;
  }
  
  const TOKEN_KEY = process.env.NEXT_PUBLIC_TOKEN_KEY;
  try {
    // Backend expects form data, not JSON
    const formData = new FormData();
    formData.append('user_id', user.id);
    
    const response = await fetch(`/api/backend/clear_transcript`, {
      method: "POST",
      headers: {
        "X-API-KEY": API_KEY,
      },
      credentials: "include",
      body: formData,
    });
    
    if (response.ok) {
      console.log("✅ Backend transcript cleared successfully");
    } else {
      const errorText = await response.text();
      console.error("❌ Failed to clear backend transcript:", errorText);
    }
  } catch (error) {
    console.error("Error clearing backend transcript:", error);
  }
};


  // --- Fetch Stats ---
  useEffect(() => {
    if (!user) return; 
    async function fetchStats() {
      const TOKEN_KEY = process.env.NEXT_PUBLIC_TOKEN_KEY;
      try {
        const res = await fetch(`/api/backend/stats?user_id=${user.id}`, { 
          headers: { "X-API-KEY": API_KEY },
          credentials: "include"
        });
        if (res.ok) setStats(await res.json());
      } catch (err) { console.error("Failed to fetch stats:", err); }
    }
    fetchStats();
  }, [user]);

  // --- Transcript Polling ---
  const startTranscriptPolling = () => {
    if (!user) return;
    const TOKEN_KEY = process.env.NEXT_PUBLIC_TOKEN_KEY;
    const poll = async () => {
      const formData = new FormData();
      formData.append("user_id", user.id);
      try {
        const res = await fetch(`/api/backend/get_transcript`, { 
          method: "POST", 
          body: formData, 
          headers: { "X-API-KEY": API_KEY },
          credentials: "include"
        });
        if (res.ok) {
          const data = await res.json();
          setTranscript(data.transcript || '');
        }
      } catch (error) {
        console.error("Polling error:", error);
      }
    };
    poll();
    transcriptPollingRef.current = setInterval(poll, 1000);
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
    
    if (!user?.id) {
      console.error("Cannot set language: No user ID");
      toast.error("Please log in to change language");
      return;
    }
    
    const TOKEN_KEY = process.env.NEXT_PUBLIC_TOKEN_KEY;
    try {
      const response = await fetch(`/api/backend/select_language`, {
        method: "POST", 
        headers: { 
          "Content-Type": "application/json", 
          "X-API-KEY": API_KEY
        },
        credentials: "include",
        body: JSON.stringify({ 
          language_code: lang,
          user_id: user.id  // ✅ Add user_id
        })
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log("✅ Language set:", data);
        toast.success(`Language changed to ${lang}`);
      } else {
        const error = await response.json();
        console.error("❌ Failed to set language:", error);
        toast.error("Failed to change language");
      }
    } catch (error) { 
      console.error("Error setting language:", error);
      toast.error("Error changing language");
    }
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
    const TOKEN_KEY = process.env.NEXT_PUBLIC_TOKEN_KEY;
    try {
      await fetch(`/api/backend/update_transcript_section`, {
        method: "POST", 
        headers: { "Content-Type": "application/json", "X-API-KEY": API_KEY },
        credentials: "include",
        body: JSON.stringify({ meeting_id: meetingId, user_id: user.id, section_key: sectionKey, content, titles })
      });
    } catch (err) { console.error("Error saving section:", err); }
  };

  const saveDischargeSection = async (sectionKey, content) => {
    if (!meetingId) return;
    const titles = Object.fromEntries(Object.entries(dischargeSections).map(([k, v]) => [k, v.title]));
    const userId = user?.id;

    if (!userId) {
      console.error("User not authenticated");
      return;
    }
    try {
      await fetch(`/api/backend/update_transcript_section`, {
        method: "POST", 
        headers: { "Content-Type": "application/json", "X-API-KEY": API_KEY },
        credentials: "include",
        body: JSON.stringify({ meeting_id: meetingId, user_id: user.id, section_key: sectionKey, content, titles })
      });
    } catch (err) { console.error("Error saving discharge section:", err); }
  };

// --- Generate Discharge Summary ---
  const generateDischargeSummary = async () => {
    if (!meetingId) {
      toast.error("No active meeting.");
      return;
    }

    // Validate meeting_id is a valid integer
    const parsedMeetingId = parseInt(meetingId, 10);
    if (isNaN(parsedMeetingId) || parsedMeetingId < 1) {
      toast.error("Invalid meeting ID.");
      console.error("Invalid meetingId:", meetingId, "Type:", typeof meetingId);
      return;
    }

    if (loading) {
      toast.info("Loading user info...");
      return;
    }

    const userId = user?.id || "system";
    setIsGeneratingSummary(true);

    try {
      // Prepare discharge sections payload (send only titles as dict)
      const sectionsPayload = Object.fromEntries(
        Object.entries(dischargeSections).map(([k, v]) => [k, v.title])
      );

      const payload = {
        meeting_id: parsedMeetingId,
        user_id: String(userId),
        transcript: transcript || "",
        sections: sectionsPayload,
        selected_language: selectedLanguage || "en",
      };

      console.log("🔵 [DISCHARGE SUMMARY] Starting generation");
      console.log("📦 Payload:", {
        meeting_id: parsedMeetingId,
        user_id: userId,
        transcript_length: transcript?.length || 0,
        sections: sectionsPayload,
        language: selectedLanguage
      });

      const TOKEN_KEY = process.env.NEXT_PUBLIC_TOKEN_KEY;
      
      toast.info("Generating discharge summary... This may take up to 2 minutes.", { autoClose: 5000 });
      
      try {
        console.log("🚀 Sending request to /api/backend/generate_discharge_summary");
        console.log("⏰ Request started at:", new Date().toISOString());
        
        const res = await fetch(`/api/backend/generate_discharge_summary`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-API-Key": API_KEY,
          },
          credentials: "include",
          body: JSON.stringify(payload),
        });

        console.log("📡 Response received:", {
          status: res.status,
          statusText: res.statusText,
          ok: res.ok,
          timestamp: new Date().toISOString()
        });

        if (!res.ok) {
          const errText = await res.text();
          console.error("❌ Backend error response:", errText);
          console.error("❌ Response status:", res.status);
          console.error("❌ Response headers:", Object.fromEntries(res.headers.entries()));
          if (res.status >= 500) {
            console.log("⚠️ Server error received, attempting database fallback...");
            throw new Error(`Server error ${res.status}: ${errText}`);
          }
          toast.error("Failed to generate discharge summary.");
          return;
        }

        const data = await res.json();
        console.log("✅ Discharge Summary API response:", data);
        console.log("📊 Response data:", {
          has_sections: !!data.sections,
          sections_count: data.sections ? Object.keys(data.sections).length : 0,
          transcript_id: data.transcript_id,
          status: data.status
        });

        // Backend returns 'sections' dict with generated content
        if (!data || !data.sections) {
          console.error("❌ No sections in response:", data);
          toast.error("No sections returned.");
          return;
        }

        // Update discharge sections with generated content
        const updatedDischargeSections = { ...dischargeSections };
        Object.keys(updatedDischargeSections).forEach((key) => {
          if (data.sections[key]) {
            updatedDischargeSections[key].content = data.sections[key] || "";
          }
        });

        setDischargeSections(updatedDischargeSections);
        toast.success("Discharge summary loaded into sections!");

        // Auto-save to database
        for (const key in updatedDischargeSections) {
          if (updatedDischargeSections[key].content.trim()) {
            await saveDischargeSection(key, updatedDischargeSections[key].content);
          }
        }

      } catch (fetchError) {
        // Handle socket timeout - backend may have completed successfully
        console.log("⚠️ Connection error occurred:", {
          error: fetchError.message,
          type: fetchError.name,
          stack: fetchError.stack
        });
        console.log("🔍 Checking if summary was saved to database...");
        toast.info("Connection interrupted. Checking database...", { autoClose: 3000 });
        
        // Wait for backend to finish saving
        await new Promise(resolve => setTimeout(resolve, 5000));
        
        // Try to fetch the successfully saved summary from database
        try {
          console.log("🔍 Fetching from database fallback endpoint...");
          const dbRes = await fetch(`/api/backend/get_discharge_summary?meeting_id=${meetingId}`, {
            method: "GET",
            headers: { "X-API-Key": API_KEY },
            credentials: "include",
          });
          
          console.log("📡 Database fallback response:", {
            status: dbRes.status,
            ok: dbRes.ok
          });
          
          if (dbRes.ok) {
            const dbData = await dbRes.json();
            console.log("✅ Database data retrieved:", {
              has_sections: !!dbData.sections,
              sections_count: dbData.sections ? Object.keys(dbData.sections).length : 0
            });
            if (dbData.sections) {
              const updatedDischargeSections = { ...dischargeSections };
              Object.keys(updatedDischargeSections).forEach((key) => {
                if (dbData.sections[key]) {
                  updatedDischargeSections[key].content = dbData.sections[key] || "";
                }
              });
              setDischargeSections(updatedDischargeSections);
              toast.success("✅ Discharge summary loaded from database!");
              return; // Success!
            }
          }
          
          // If we get here, summary not found in database
          toast.error("Summary generation may still be in progress. Please check Reports page.");
          
        } catch (dbError) {
          console.error("Error fetching from database:", dbError);
          toast.warning("Please refresh or check the Reports page for your discharge summary.");
        }
      }

    } catch (error) {
      console.error("Error generating discharge summary:", error);
      toast.error("Server error generating discharge summary.");
    } finally {
      setIsGeneratingSummary(false);
    }
  };

// --- Generate Clinical Summary ---
  const generateSummary = async () => {
    if (!meetingId) {
      toast.error("No active meeting.");
      return;
    }

    // Validate meeting_id is a valid integer
    const parsedMeetingId = parseInt(meetingId, 10);
    if (isNaN(parsedMeetingId) || parsedMeetingId < 1) {
      toast.error("Invalid meeting ID.");
      console.error("Invalid meetingId:", meetingId, "Type:", typeof meetingId);
      return;
    }

    if (loading) {
      toast.info("Loading user info...");
      return;
    }

    const userId = user?.id || "system";
    setIsGeneratingSummary(true);

    try {
      // Prepare sections payload (send only titles as dict)
      const sectionsPayload = Object.fromEntries(
        Object.entries(sections).map(([k, v]) => [k, v.title])
      );

      const payload = {
        meeting_id: parsedMeetingId,  // Use validated integer
        user_id: String(userId),
        transcript: transcript || "",
        sections: sectionsPayload,
        selected_language: selectedLanguage || "en",
      };

      console.log("Sending clinical summary payload:", payload);

      const TOKEN_KEY = process.env.NEXT_PUBLIC_TOKEN_KEY;
      const res = await fetch(`/api/backend/generate_summary`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-API-Key": API_KEY,
        },
        credentials: "include",
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errText = await res.text();
        console.error("Backend error:", errText);
        toast.error("Failed to generate clinical summary.");
        return;
      }

      const data = await res.json();
      console.log("Clinical Summary API response:", data);

      // Backend now returns 'sections' dict
      if (!data || !data.sections) {
        toast.error("No sections returned.");
        return;
      }

      // Update sections with generated content
      const updatedSections = { ...sections };
      Object.keys(updatedSections).forEach((key) => {
        if (data.sections[key]) {
          updatedSections[key].content = data.sections[key] || "";
        }
      });

      setSections(updatedSections);
      toast.success("Summary loaded into sections!");

      // Auto-save to database
      for (const key in updatedSections) {
        if (updatedSections[key].content.trim()) {
          await saveSectionToDB(key, updatedSections[key].content);
        }
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
      // ✅ Notify UserContext that user has been cleared
      window.dispatchEvent(new Event('userUpdated'));
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
    if (activeTab === 'clinical') {
      generateSummary();
    } else if (activeTab === 'discharge') {
      generateDischargeSummary();
    }
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
              userLoading={loading}
              mics={mics} deviceId={deviceId} setDeviceId={setDeviceId}
              recording={recording} paused={paused} stopping={stopping} recordingTime={recordingTime}
              startRec={handleStartRec} stopRec={handleStopRec} pauseRec={pauseRec} resumeRec={resumeRec}
              transcript={transcript}
              selectedLanguage={selectedLanguage}
              handleLanguageChange={handleLanguageChange}
              canRecord={canRecord}
              readyForSummary={readyForSummary}
              setReadyForSummary={setReadyForSummary}
              handleGenerateSummary={handleGenerateSummary}
            />
            <SummaryTabs
              sections={sections}
              setSections={setSections}
              saveSectionToDB={saveSectionToDB}
              dischargeSections={dischargeSections}
              setDischargeSections={setDischargeSections}
              saveDischargeSection={saveDischargeSection}
              transcript={transcript}
              activeTab={activeTab}
              setActiveTab={setActiveTab}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
