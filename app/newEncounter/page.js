"use client";

import React, { useState, useEffect, useCallback } from "react"; // ⭐️ CHANGE 1: Imported useCallback
import { useRouter } from "next/navigation";
import { useMeeting } from "@/context/meetingContext";
import Sidebar from "../sidebar/page";
import Header from "../header/page";
import { useRecording } from "@/context/recordingContext";
import { toast } from "react-toastify";
import { useDebounce } from "../hooks/useDebounce";

export default function NewEncounter() {
  const router = useRouter();
  const { setMeetingId, setCurrentPatient } = useMeeting();

  const [patients, setPatients] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showNewPatientForm, setShowNewPatientForm] = useState(false);
  const [newPatient, setNewPatient] = useState({
    name: "",
    age: "",
    gender: "",
    hospital_id: "",
  });
  const [userId, setUserId] = useState(null);
  const [stats, setStats] = useState({ today: 0, week: 0 });

  const { setCanRecord } = useRecording();

  const API_KEY = "n1i2t3i4k5d6i7a8s";
  const debouncedSearchTerm = useDebounce(searchTerm, 500);

  const handleLogout = async () => {
    try {
      console.log("🚪 Starting logout...");

      // ✅ Call Next.js API route (which forwards to Flask)
      const res = await fetch("/api/logout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (res.ok) {
        console.log("✅ Logout successful");
        
        // ✅ Clear all localStorage
        localStorage.clear();
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

  async function fetchStats() {
    const userId = localStorage.getItem("userId");
    if (!userId) {
      console.warn("User ID not found in localStorage");
      return;
    }
    try {
      const res = await fetch(`http://localhost:8000/stats?user_id=${userId}`, {
        headers: { "Content-Type": "application/json", "X-API-Key": API_KEY },
      });
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      } else {
        console.error("Failed to fetch stats:", res.statusText);
      }
    } catch (err) {
      console.error("Failed to fetch stats:", err);
    }
  }

  useEffect(() => {
    fetchStats();
  }, []);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const id = localStorage.getItem("userId");
      setUserId(id);
    }
  }, []);

  // ⭐️ CHANGE 2: Extracted fetch logic into a reusable function with useCallback
  const fetchPatients = useCallback(async () => {
    const userId = localStorage.getItem('userId');

    if (!userId) {
      console.error("Authentication details not found. Please log in again.");
      return;
    }
    try {
      let url = `http://localhost:8000/patients?user_id=${userId}`;
      // Use the debounced term for searching
      if (debouncedSearchTerm) {
        url += `&search=${debouncedSearchTerm}`;
      }
      const res = await fetch(url, {
        headers: {
          "Content-Type": "application/json",
          "X-API-Key": API_KEY,
        },
      });
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Failed to fetch patients");
      }
      const data = await res.json();
      setPatients(data);
    } catch (err) {
      console.error(err);
      setPatients([]);
    }
  }, [debouncedSearchTerm]); // This function updates if the search term changes

  // This useEffect now calls our reusable function
  useEffect(() => {
    if (localStorage.getItem('userId')) {
      fetchPatients();
    }
  }, [fetchPatients]); // It runs when the component loads and when the search term changes

  const handleStartSession = async () => {
    if (!userId || !selectedPatient) return alert("Select user & patient");
    setLoading(true);
    try {
      const res = await fetch("http://localhost:8000/new_encounter", {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-API-Key": API_KEY },
        body: JSON.stringify({ user_id: userId, patient_id: selectedPatient.id }),
      });
      const data = await res.json();
      if (res.ok) {
        setMeetingId(data.meeting_id);
        setCurrentPatient(selectedPatient);
        localStorage.setItem("meetingId", data.meeting_id);
        setCanRecord(true);
        toast.success("Session started! You can now start recording.");
        router.push("/");
      } else {
        alert("Failed: " + (data.error || "Unknown error"));
      }
    } catch (err) {
      console.error(err);
      alert("Error starting session");
    } finally {
      setLoading(false);
    }
  };

  // ⭐️ CHANGE 3: Updated handleCreatePatient to re-fetch the list on success
  const handleCreatePatient = async (e) => {
    e.preventDefault();
    try {
      const user_id = localStorage.getItem("userId");
      if (!user_id) {
        alert("User ID not found in localStorage. Please log in again.");
        return;
      }
      const payload = {
        name: newPatient.name,
        age: newPatient.age ? Number(newPatient.age) : null,
        gender: newPatient.gender || null,
        hospital_id: newPatient.hospital_id || null,
        user_id,
      };
      const res = await fetch("http://localhost:8000/patients", {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-API-Key": API_KEY },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (res.ok) {
        // This is the fix: Re-fetch the entire patient list from the server
        await fetchPatients();
        
        // The rest of your logic to select the new patient
        setSelectedPatient(data);
        setSearchTerm(data.name);
        setShowNewPatientForm(false);
        setNewPatient({ name: "", age: "", gender: "", hospital_id: "" });
        setCurrentPatient(data);
      } else {
        alert("Failed: " + (data.error || "Unknown error"));
      }
    } catch (err) {
      console.error(err);
      alert("Error creating patient");
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", minHeight: "100vh", backgroundColor: "#f9fafb" }}>
      <Header handleLogout={handleLogout} />
      <div style={{ display: "flex", flex: 1 }}>
        <Sidebar stats={stats} />
        <div style={{ flex: 1, display: "flex", justifyContent: "center", alignItems: "center", padding: "20px" }}>
          <div style={{ width: "100%", maxWidth: "500px", padding: "20px", backgroundColor: "white", borderRadius: "8px", boxShadow: "0 2px 8px rgba(0,0,0,0.1)" }}>
            <h2 style={{ textAlign: "center", marginBottom: "20px", color: "black" }}>
              Start New Encounter
            </h2>
            <div style={{ marginBottom: "29px" }}>
              <input
                type="text"
                placeholder="Search patient..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setSelectedPatient(null);
                }}
                style={{ width: "100%", padding: "8px", border: "1px solid #ccc", borderRadius: "6px", color: "black" }}
              />
              {searchTerm && patients.length > 0 && (
                <ul style={{ listStyle: "none", margin: "8px 0 0 0", padding: "8px", border: "1px solid #ccc", borderRadius: "6px", background: "white", maxHeight: "150px", overflowY: "auto", width: "100%", zIndex: 10, color: "black" }}>
                  {patients.map((p) => (
                    <li
                      key={p.id}
                      onClick={() => {
                        setSelectedPatient(p);
                        setSearchTerm(p.name);
                      }}
                      style={{ padding: "6px", cursor: "pointer", background: selectedPatient?.id === p.id ? "#e0e7ff" : "transparent" }}
                    >
                      {p.name}
                    </li>
                  ))}
                </ul>
              )}
            </div>
            {selectedPatient && (
              <div style={{ marginBottom: "12px", color: "black" }}>
                <strong>Selected Patient:</strong> {selectedPatient.name}
              </div>
            )}
            <div style={{ display: "flex", gap: "12px", marginBottom: "12px" }}>
              <button
                onClick={handleStartSession}
                disabled={loading}
                style={{ backgroundColor: "transparent", color: "#012537", border: "2px solid #012537", borderRadius: "6px", padding: "10px 16px", cursor: "pointer", flex: 1 }}
              >
                {loading ? "Starting..." : "Start Session"}
              </button>
              <button
                onClick={() => setShowNewPatientForm((prev) => !prev)}
                style={{ backgroundColor: "transparent", color: "#012537", border: "2px solid #012537", borderRadius: "6px", padding: "10px 16px", cursor: "pointer", flex: 1 }}
              >
                New Patient
              </button>
            </div>
            {showNewPatientForm && (
              <form onSubmit={handleCreatePatient} style={{ border: "1px solid #ccc", borderRadius: "6px", padding: "16px", background: "white", color: "black" }}>
                <h3 style={{ marginBottom: "12px", textAlign: "center" }}>Create New Patient</h3>
                <label>
                  Name: <span style={{ color: "red" }}>*</span>
                  <input
                    type="text"
                    value={newPatient.name}
                    onChange={(e) => setNewPatient({ ...newPatient, name: e.target.value })}
                    required
                    style={{ width: "100%", padding: "6px", marginBottom: "8px", border: "1px solid #ccc", borderRadius: "6px" }}
                  />
                </label>
                <label>
                  Age:
                  <input
                    type="number"
                    value={newPatient.age}
                    onChange={(e) => setNewPatient({ ...newPatient, age: e.target.value })}
                    style={{ width: "100%", padding: "6px", marginBottom: "8px", border: "1px solid #ccc", borderRadius: "6px" }}
                  />
                </label>
                <label>
                  Gender:
                  <select
                    value={newPatient.gender}
                    onChange={(e) => setNewPatient({ ...newPatient, gender: e.target.value })}
                    style={{ width: "100%", padding: "6px", marginBottom: "8px", border: "1px solid #ccc", borderRadius: "6px" }}
                  >
                    <option value="">Select</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </label>
                <label>
                  Hospital ID:
                  <input
                    type="text"
                    value={newPatient.hospital_id}
                    onChange={(e) => setNewPatient({ ...newPatient, hospital_id: e.target.value })}
                    style={{ width: "100%", padding: "6px", marginBottom: "8px", border: "1px solid #ccc", borderRadius: "6px" }}
                  />
                </label>
                <button
                  type="submit"
                  style={{ backgroundColor: "transparent", color: "#012537", border: "2px solid #012537", borderRadius: "6px", padding: "10px 16px", cursor: "pointer", width: "100%" }}
                >
                  Create Patient
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}