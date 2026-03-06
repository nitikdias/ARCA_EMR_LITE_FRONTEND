"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Sidebar from "../sidebar/page";
import Header from "../header/page";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { useUser } from "@/context/userContext";
import { generateSummaryOnlyPDF, generateTranscriptOnlyPDF } from "../dashboard/utils/pdfGenerator";

// Decode HTML entities like &quot; &amp; &#39; etc.
const decodeHTML = (str) => {
  if (!str) return str;
  const el = typeof document !== "undefined" && document.createElement("textarea");
  if (!el) return str;
  el.innerHTML = str;
  return el.value;
};

// Helper to structure flat text summary into sections
const parseTextToSections = (text) => {
  if (!text || typeof text !== 'string') return null;

  // Generic regex: Start of line, then 2-60 chars (no colon/newline), then colon.
  const regex = /(?:^|\n)([a-zA-Z0-9][^:\n]{2,60}):/g;
  const matches = [];
  let match;

  while ((match = regex.exec(text)) !== null) {
    matches.push({
      index: match.index,
      title: match[1].trim(),
      fullMatch: match[0]
    });
  }

  if (matches.length === 0) return null;

  const sections = {};

  // Handle any text before the first header (General Summary)
  const firstHeaderIndex = matches[0].index;
  if (firstHeaderIndex > 0) {
    const intro = text.substring(0, firstHeaderIndex).trim();
    if (intro) {
      sections["general"] = { title: "Summary", content: intro };
    }
  }

  for (let i = 0; i < matches.length; i++) {
    const start = matches[i].index + matches[i].fullMatch.length;
    const end = (i + 1 < matches.length) ? matches[i + 1].index : text.length;

    sections[`parsed_${i}`] = {
      title: matches[i].title,
      content: text.substring(start, end).trim()
    };
  }

  return sections;
};

export default function ReportPage({ user }) {
  const router = useRouter();
  const [meetings, setMeetings] = useState([]);
  const [filteredMeetings, setFilteredMeetings] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [selectedMeetingId, setSelectedMeetingId] = useState(null);
  const [stats, setStats] = useState({ today: 0, week: 0 });
  const [editingTranscriptId, setEditingTranscriptId] = useState(null);
  const [editData, setEditData] = useState({});


  const handleLogout = async () => {
    try {
      console.log("🚪 Starting logout...");

      // ✅ Call Next.js API route (which forwards to Flask)
      const res = await fetch("/api/logout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include"
      });

      if (res.ok) {
        console.log("✅ Logout successful");

        // ✅ Clear all localStorage
        localStorage.clear();

        // ✅ Notify TokenRefreshManager to stop
        window.dispatchEvent(new Event('userUpdated'));
        console.log("✅ Cleared localStorage");

        // ✅ Browser will automatically clear the session_id cookie
        // (Next.js set max_age=0 in response)

        console.log("🔄 Redirecting to login...");

        // ✅ Redirect to login
        router.push("/login");

        // ✅ Optional: Force full page reload after a short delay
        setTimeout(() => {
          window.location.href = "/login";
        }, 100);
      } else {
        const errorData = await res.json();
        console.error("❌ Logout failed:", errorData.error);
        alert("Logout failed. Please try again.");
      }
    } catch (err) {
      console.error("💥 Error during logout:", err);
      alert("An error occurred during logout.");
    }
  };

  const API_KEY = process.env.NEXT_PUBLIC_API_KEY || "";
  const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "";

  // Fetch meetings
  useEffect(() => {
    const fetchMeetings = async () => {
      const userId = localStorage.getItem("userId");
      if (!userId) return;
      const TOKEN_KEY = process.env.NEXT_PUBLIC_TOKEN_KEY;

      try {
        const res = await fetch(`/api/backend/meetings?user_id=${userId}`, {
          headers: {
            "Content-Type": "application/json",
            "X-API-KEY": API_KEY,
          },
          credentials: "include"
        });
        if (!res.ok) throw new Error("Failed to fetch meetings");
        const data = await res.json();
        setMeetings(data);
        setFilteredMeetings(data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchMeetings();
  }, []);

  // Fetch stats
  useEffect(() => {
    const fetchStats = async () => {
      const userId = localStorage.getItem("userId");
      if (!userId) return;
      const TOKEN_KEY = process.env.NEXT_PUBLIC_TOKEN_KEY;

      try {
        const res = await fetch(`/api/backend/stats?user_id=${userId}`, {
          headers: {
            "Content-Type": "application/json",
            "X-API-KEY": API_KEY,
          },
          credentials: "include"
        });
        if (res.ok) {
          const data = await res.json();
          setStats(data);
        }
      } catch (err) {
        console.error(err);
      }
    };

    fetchStats();
  }, []);

  // Filter meetings by patient name
  useEffect(() => {
    const filtered = meetings.filter((meeting) =>
      meeting.patient?.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredMeetings(filtered);
  }, [searchTerm, meetings]);

  if (loading) {
    return (
      <div className="flex justify-center mt-12 text-lg">Loading reports...</div>
    );
  }

  const selectedMeeting = meetings.find((m) => m.id === selectedMeetingId);

  const handleEditTranscript = (t) => {
    setEditingTranscriptId(t.id);
    setEditData({
      transcript: t.transcript || "",
      summary: t.summary || "",
    });
  };

  // Format date to IST
  const formatToIST = (dateStr) => {
    if (!dateStr) return "N/A";
    try {
      // Backend returns ISO without timezone (e.g. "2026-03-03T06:51:42")
      // Append Z to treat as UTC so timezone conversion to IST works correctly
      let str = String(dateStr);
      if (!str.endsWith("Z") && !str.includes("+") && !str.includes("-", 10)) {
        str += "Z";
      }
      return new Date(str).toLocaleString("en-IN", {
        timeZone: "Asia/Kolkata",
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: true,
      }) + " IST";
    } catch {
      return new Date(dateStr).toLocaleString();
    }
  };

  const handleSaveTranscript = async (transcript) => {
    // Check if anything actually changed
    const hasChanges =
      editData.transcript !== (transcript.transcript || "") ||
      editData.summary !== (transcript.summary || "");

    if (!hasChanges) {
      toast.info("No edits to save.");
      setEditingTranscriptId(null);
      return;
    }

    const TOKEN_KEY = process.env.NEXT_PUBLIC_TOKEN_KEY;
    try {
      const res = await fetch(`/api/backend/transcripts/${transcript.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", "X-API-KEY": API_KEY },
        credentials: "include",
        body: JSON.stringify(editData),
      });

      if (!res.ok) {
        const errText = await res.text();
        console.error("Save failed:", res.status, errText);
        toast.error("Failed to save edits.");
        return;
      }

      toast.success("Saved edits successfully!");

      // Update local state FIRST so the view shows new data immediately
      const updateMeetings = (prevMeetings) =>
        prevMeetings.map((m) => ({
          ...m,
          transcripts: m.transcripts?.map((tr) =>
            tr.id === transcript.id
              ? { ...tr, transcript: editData.transcript, summary: editData.summary }
              : tr
          ),
        }));

      setMeetings((prev) => updateMeetings(prev));
      setFilteredMeetings((prev) => updateMeetings(prev));

      // THEN exit edit mode — view will now show the updated data
      setEditingTranscriptId(null);
    } catch (err) {
      console.error("Error saving transcript edits:", err);
      toast.error("Error saving edits. Please try again.");
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      {/* Header */}
      <Header user={user} handleLogout={handleLogout} />

      <div className="flex flex-col md:flex-row flex-1 pt-16 md:pt-0">
        {/* Sidebar */}
        <Sidebar stats={stats} />

        {/* Main reports box */}
        <div className="flex-1 px-4 md:px-6 py-4 md:py-6 overflow-y-auto">
          <div className="max-w-7xl bg-white shadow-md rounded-lg p-4 sm:p-6 mx-auto text-black">
            <h1 className="text-center text-2xl sm:text-3xl font-bold mb-4 sm:mb-6">Reports</h1>

            {!selectedMeeting && (
              <input
                type="text"
                placeholder="Search patient..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full p-2.5 sm:p-3 border border-gray-300 rounded-lg mb-4 sm:mb-6 text-sm sm:text-base"
              />
            )}

            {!selectedMeeting && filteredMeetings.length === 0 && (
              <p className="text-center text-gray-600 text-sm sm:text-base">No reports found.</p>
            )}

            {/* Meetings List */}
            {!selectedMeeting &&
              filteredMeetings.map((meeting) => (
                <div
                  key={meeting.id}
                  className="border border-gray-300 rounded-lg p-3 sm:p-4 mb-3 sm:mb-4 bg-gray-50 flex flex-col sm:flex-row justify-between sm:items-center gap-3"
                >
                  <div className="flex-1">
                    <h3 className="font-semibold text-sm sm:text-base">
                      Patient: {meeting.patient?.name || "Unknown"}{" "}
                    </h3>
                    <p className="text-xs sm:text-sm text-gray-700 mt-1">
                      <strong>Created At:</strong>{" "}
                      {formatToIST(meeting.created_at)}
                    </p>
                  </div>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => setSelectedMeetingId(meeting.id)}
                      className="text-white px-4 py-2 rounded hover:bg-[#03405a] transition-colors text-sm sm:text-base"
                      style={{ backgroundColor: "#012537" }}
                    >
                      View
                    </button>
                  </div>
                </div>
              ))}

            {/* Selected Meeting Details */}
            {selectedMeeting && (
              <div className="mt-4 sm:mt-6 w-full bg-gray-100 p-4 sm:p-6 rounded-lg">
                {/* Back Button */}
                <button
                  onClick={() => setSelectedMeetingId(null)}
                  className="text-blue-600 hover:underline text-xs sm:text-sm mb-3 sm:mb-4 flex items-center gap-1"
                >
                  ← Back
                </button>

                {/* Patient Info */}
                <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mt-2">
                  Patient: {selectedMeeting.patient?.name || "Unknown"}{" "}
                  <span className="text-gray-500 text-base sm:text-lg block sm:inline mt-1 sm:mt-0">
                    (Meeting ID: {selectedMeeting.id})
                  </span>
                </h2>

                <p className="text-gray-700 mb-3 sm:mb-4 text-xs sm:text-sm">
                  <strong>Created At:</strong> {formatToIST(selectedMeeting.created_at)}
                </p>

                {/* Transcripts */}
                {selectedMeeting.transcripts && selectedMeeting.transcripts.length > 0 ? (
                  selectedMeeting.transcripts.map((t) => (
                    <div
                      key={t.id}
                      className="w-full bg-white border border-gray-300 rounded-lg p-4 sm:p-6 mt-3 sm:mt-4 flex flex-col space-y-3 sm:space-y-4"
                    >
                      {editingTranscriptId === t.id ? (
                        <div className="flex flex-col space-y-3 sm:space-y-4 flex-1">
                          {["transcript", "summary"].map((field) => (
                            <div key={field} className="flex flex-col flex-1">
                              <label className="font-semibold capitalize mb-1 block text-sm sm:text-base">
                                {field.replace("_", " ")}:
                              </label>
                              <textarea
                                className="w-full h-32 sm:h-48 border p-2 sm:p-3 rounded resize-none overflow-y-auto text-sm sm:text-base"
                                value={editData[field]}
                                onChange={(e) =>
                                  setEditData({ ...editData, [field]: e.target.value })
                                }
                              />
                            </div>
                          ))}

                          <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
                            <button
                              onClick={() => handleSaveTranscript(t)}
                              className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-500 transition-colors text-sm sm:text-base w-full sm:w-auto"
                            >
                              Save
                            </button>
                            <button
                              onClick={() => setEditingTranscriptId(null)}
                              className="bg-gray-400 text-white px-4 py-2 rounded hover:bg-gray-500 transition-colors text-sm sm:text-base w-full sm:w-auto"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex flex-col space-y-3 sm:space-y-4 flex-1">
                          {/* Transcript Section */}
                          {t.transcript && (
                            <div className="flex flex-col flex-1">
                              <div className="flex items-center justify-between mb-2">
                                <h4 className="font-semibold text-gray-800 text-sm sm:text-base">Transcript</h4>
                                <div className="flex items-center gap-1">
                                  {/* Copy Transcript */}
                                  <button
                                    onClick={async () => {
                                      try {
                                        await navigator.clipboard.writeText(decodeHTML(t.transcript) || "");
                                        toast.success("Transcript copied!");
                                      } catch (err) {
                                        toast.error("Failed to copy!");
                                      }
                                    }}
                                    className="p-1.5 sm:p-2 rounded hover:bg-gray-100 flex items-center justify-center border border-gray-200"
                                    title="Copy Transcript"
                                  >
                                    <img src="/images/copy.png" alt="Copy" className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                                  </button>
                                  {/* Download Transcript PDF */}
                                  <button
                                    onClick={() => generateTranscriptOnlyPDF(t.transcript)}
                                    className="p-1.5 sm:p-2 rounded hover:bg-gray-100 flex items-center justify-center border border-gray-200"
                                    title="Download Transcript PDF"
                                  >
                                    <img src="/images/downloads.png" alt="Download" className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                                  </button>
                                </div>
                              </div>
                              <div className="flex-1 max-h-48 sm:max-h-64 overflow-y-auto p-2 sm:p-3 bg-gray-50 rounded whitespace-pre-wrap text-gray-800 text-xs sm:text-sm">
                                {decodeHTML(t.transcript)}
                              </div>
                            </div>
                          )}

                          {/* Summary Section */}
                          {t.summary && (() => {
                            const rawSummary = decodeHTML(t.summary);
                            let parsedSections = null;
                            try {
                              parsedSections = JSON.parse(rawSummary);
                            } catch (e) {
                              parsedSections = null;
                            }

                            const isStructured = parsedSections && typeof parsedSections === "object" && !Array.isArray(parsedSections);

                            // Helper: get plain text for copying
                            const getSummaryText = () => {
                              if (isStructured) {
                                return Object.entries(parsedSections).map(([key, content]) => {
                                  const title = key
                                    .replace(/_/g, " ")
                                    .replace(/([a-z])([A-Z])/g, "$1 $2")
                                    .replace(/\b\w/g, (c) => c.toUpperCase());
                                  return `${title}:\n${decodeHTML(String(content || "Not specified."))}`;
                                }).join("\n\n");
                              }
                              return decodeHTML(rawSummary);
                            };

                            // Helper: generate summary-only PDF
                            const downloadSummaryPDF = async () => {
                              const keyToTitle = (key) => key
                                .replace(/_/g, " ")
                                .replace(/([a-z])([A-Z])/g, "$1 $2")
                                .replace(/\b\w/g, (c) => c.toUpperCase());

                              let sectionsForPDF = {};
                              const autoParsed = !isStructured ? parseTextToSections(rawSummary) : null;

                              // Detect if it's a discharge summary
                              let pdfTitle = "Clinical Summary";
                              const dischargeKeywords = ["Reason for admission", "Course in the hospital", "Follow up plan", "Diagnosis"];

                              if (isStructured) {
                                Object.entries(parsedSections).forEach(([key, content]) => {
                                  const title = keyToTitle(key);
                                  sectionsForPDF[key] = {
                                    title: title,
                                    content: String(content || "")
                                  };
                                  if (dischargeKeywords.some(k => title.includes(k))) {
                                    pdfTitle = "Discharge Summary";
                                  }
                                });
                              } else if (autoParsed) {
                                sectionsForPDF = autoParsed;
                                if (Object.values(autoParsed).some(sec => dischargeKeywords.some(k => sec.title.includes(k)))) {
                                  pdfTitle = "Discharge Summary";
                                }
                              } else if (rawSummary && rawSummary.trim()) {
                                sectionsForPDF["summary"] = {
                                  title: "Summary",
                                  content: rawSummary
                                };
                              }
                              await generateSummaryOnlyPDF(sectionsForPDF, pdfTitle);
                            };

                            return (
                              <div className="flex flex-col flex-1">
                                <div className="flex items-center justify-between mb-2">
                                  <h4 className="font-semibold text-gray-800 text-sm sm:text-base">Summary</h4>
                                  <div className="flex items-center gap-1">
                                    {/* Copy Summary */}
                                    <button
                                      onClick={async () => {
                                        try {
                                          await navigator.clipboard.writeText(getSummaryText());
                                          toast.success("Summary copied!");
                                        } catch (err) {
                                          toast.error("Failed to copy!");
                                        }
                                      }}
                                      className="p-1.5 sm:p-2 rounded hover:bg-gray-100 flex items-center justify-center border border-gray-200"
                                      title="Copy Summary"
                                    >
                                      <img src="/images/copy.png" alt="Copy" className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                                    </button>
                                    {/* Download Summary PDF */}
                                    <button
                                      onClick={downloadSummaryPDF}
                                      className="p-1.5 sm:p-2 rounded hover:bg-gray-100 flex items-center justify-center border border-gray-200"
                                      title="Download Summary PDF"
                                    >
                                      <img src="/images/downloads.png" alt="Download" className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                                    </button>
                                  </div>
                                </div>
                                {(() => {
                                  const autoParsed = !isStructured ? parseTextToSections(rawSummary) : null;

                                  if (isStructured) {
                                    return (
                                      <div className="flex flex-col space-y-2">
                                        {Object.entries(parsedSections).map(([key, content]) => {
                                          const title = key
                                            .replace(/_/g, " ")
                                            .replace(/([a-z])([A-Z])/g, "$1 $2")
                                            .replace(/\b\w/g, (c) => c.toUpperCase());
                                          return (
                                            <div key={key} className="bg-gray-50 rounded p-2 sm:p-3">
                                              <h5 className="font-semibold text-gray-700 text-xs sm:text-sm mb-1">{title}</h5>
                                              <div className="whitespace-pre-wrap text-gray-800 text-xs sm:text-sm">
                                                {decodeHTML(String(content || "Not specified."))}
                                              </div>
                                            </div>
                                          );
                                        })}
                                      </div>
                                    );
                                  } else if (autoParsed) {
                                    return (
                                      <div className="flex flex-col space-y-2">
                                        {Object.values(autoParsed).map((sec, idx) => (
                                          <div key={idx} className="bg-gray-50 rounded p-2 sm:p-3">
                                            <h5 className="font-semibold text-gray-700 text-xs sm:text-sm mb-1">{sec.title}</h5>
                                            <div className="whitespace-pre-wrap text-gray-800 text-xs sm:text-sm">
                                              {decodeHTML(sec.content)}
                                            </div>
                                          </div>
                                        ))}
                                      </div>
                                    );
                                  } else {
                                    return (
                                      <div className="flex-1 max-h-48 sm:max-h-64 overflow-y-auto p-2 sm:p-3 bg-gray-50 rounded whitespace-pre-wrap text-gray-800 text-xs sm:text-sm">
                                        {rawSummary}
                                      </div>
                                    );
                                  }
                                })()}
                              </div>
                            );
                          })()}

                          {/* Edit button */}
                          <div className="flex flex-wrap gap-2 mt-2">
                            <button
                              onClick={() => handleEditTranscript(t)}
                              className="p-2 sm:p-2.5 rounded hover:bg-gray-100 flex items-center justify-center border border-gray-200"
                              title="Edit"
                            >
                              <img src="/images/edit.png" alt="Edit" className="w-4 h-4 sm:w-5 sm:h-5" />
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))
                ) : (
                  <p className="text-gray-600 text-sm sm:text-base">No transcripts available.</p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Toast Container */}
      <ToastContainer position="top-right" autoClose={2000} hideProgressBar />
    </div>
  );
}
