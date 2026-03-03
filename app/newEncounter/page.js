// Full component with ONLY design changes applied (background + logo + responsive)
"use client";

import React, { useState, useEffect, useCallback } from "react";
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
  const { setCanRecord } = useRecording();

  const [patients, setPatients] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showNewPatientForm, setShowNewPatientForm] = useState(false);
  const [newPatient, setNewPatient] = useState({ name: "", age: "", gender: "", hospital_id: "" });
  const [creatingPatient, setCreatingPatient] = useState(false);
  const [userId, setUserId] = useState(null);
  const [stats, setStats] = useState({ today: 0, week: 0 });

  const API_KEY = process.env.NEXT_PUBLIC_API_KEY || process.env.API_KEY || "";
  const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "";
  const debouncedSearchTerm = useDebounce(searchTerm, 500);

  // ---------------------- DESIGN ONLY ----------------------
  const containerStyle = {
    backgroundImage: "url('/images/auth-image.png')",
    backgroundSize: "cover",
    backgroundPosition: "center",
    backgroundRepeat: "no-repeat",
    minHeight: "100vh",
    width: "100%",
    display: "flex",
    flexDirection: "column"
  };

  const contentWrapperStyle = {
    flex: 1,
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    padding: "20px"
  };

  const formWrapperStyle = {
    width: "100%",
    maxWidth: "480px",
    padding: "24px",
    backgroundColor: "rgba(255,255,255,0.92)",
    borderRadius: "12px",
    backdropFilter: "blur(10px)",
    boxShadow: "0 4px 16px rgba(0,0,0,0.15)"
  };

  const logoStyle = {
    width: "150px",
    margin: "0 auto 25px auto",
    display: "block"
  };
  // ---------------------------------------------------------

  const handleLogout = async () => {
    try {
      const res = await fetch("/api/logout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include"
      });
      if (res.ok) {
        // Clear all local storage
        localStorage.clear();
        // Notify TokenRefreshManager to stop
        window.dispatchEvent(new Event('userUpdated'));
        // Redirect to login
        router.push("/login");
        setTimeout(() => (window.location.href = "/login"), 100);
      }
    } catch (err) {
      console.error("Logout error:", err);
    }
  };

  async function fetchStats() {
    const id = localStorage.getItem("userId");
    if (!id) return;
    const TOKEN_KEY = process.env.NEXT_PUBLIC_TOKEN_KEY;
    try {
      const res = await fetch(`/api/backend/stats?user_id=${id}`, {
        headers: { "Content-Type": "application/json", "X-API-KEY": API_KEY },
        credentials: "include"
      });
      if (res.ok) setStats(await res.json());
    } catch (err) {
      console.error(err);
    }
  }

  useEffect(() => { fetchStats(); }, []);

  useEffect(() => {
    if (typeof window !== "undefined") setUserId(localStorage.getItem("userId"));
  }, []);

  const fetchPatients = useCallback(async () => {
    const id = localStorage.getItem("userId");
    if (!id) return;
    const TOKEN_KEY = process.env.NEXT_PUBLIC_TOKEN_KEY;
    try {
      let url = `/api/backend/patients?user_id=${id}`;
      if (debouncedSearchTerm) url += `&search=${debouncedSearchTerm}`;

      const res = await fetch(url, {
        headers: { "Content-Type": "application/json", "X-API-KEY": API_KEY },
        credentials: "include"
      });

      if (!res.ok) {
        const body = await res.text().catch(() => "<no body>");
        const bodySnippet = (typeof body === "string" ? body : JSON.stringify(body)).slice(0, 200);
        console.warn(`fetchPatients failed (status=${res.status}) body="${bodySnippet}"`);

        if (res.status === 401) {
          toast.error("Session expired. Please log in again.");
          localStorage.clear();
          router.push("/login");
          return;
        }

        setPatients([]);
        return;
      }

      setPatients(await res.json());
    } catch (err) {
      console.error(err);
      setPatients([]);
    }
  }, [debouncedSearchTerm]);

  useEffect(() => {
    if (localStorage.getItem("userId")) fetchPatients();
  }, [fetchPatients]);

  const handleStartSession = async () => {
    if (!userId || !selectedPatient) return alert("Select user & patient");
    setLoading(true);
    const TOKEN_KEY = process.env.NEXT_PUBLIC_TOKEN_KEY;
    try {
      const res = await fetch(`/api/backend/new_encounter`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-API-KEY": API_KEY },
        credentials: "include",
        body: JSON.stringify({ user_id: userId, patient_id: selectedPatient.id })
      });

      const data = await res.json();
      if (res.ok) {
        setMeetingId(data.meeting_id);
        setCurrentPatient(selectedPatient);
        localStorage.setItem("meetingId", data.meeting_id);
        setCanRecord(true);
        toast.success("Session started!");
        router.push("/");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreatePatient = async (e) => {
    e.preventDefault();
    if (creatingPatient) return; // Prevent double-click

    // Validate name
    if (!newPatient.name.trim()) {
      toast.error("Patient name is required.");
      return;
    }

    // Validate age
    if (!newPatient.age) {
      toast.error("Age is required.");
      return;
    }
    const ageNum = Number(newPatient.age);
    if (isNaN(ageNum) || ageNum < 1 || ageNum > 150 || !Number.isInteger(ageNum)) {
      toast.error("Please enter a valid age (1-150).");
      return;
    }

    // Validate gender
    if (!newPatient.gender) {
      toast.error("Gender is required.");
      return;
    }

    setCreatingPatient(true);
    const TOKEN_KEY = process.env.NEXT_PUBLIC_TOKEN_KEY;
    try {
      const user_id = localStorage.getItem("userId");
      if (!user_id) return alert("User not found");

      const res = await fetch(`/api/backend/patients`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-API-KEY": API_KEY },
        credentials: "include",
        body: JSON.stringify({ ...newPatient, age: newPatient.age ? Number(newPatient.age) : null, user_id })
      });

      const data = await res.json();
      if (res.ok) {
        await fetchPatients();
        setSelectedPatient(data);
        setSearchTerm(data.name);
        setShowNewPatientForm(false);
        setNewPatient({ name: "", age: "", gender: "", hospital_id: "" });
      }
    } catch (err) {
      console.error(err);
    } finally {
      setCreatingPatient(false);
    }
  };

  return (
    <div style={containerStyle}>
      <Header handleLogout={handleLogout} />

      <div style={{ display: "flex", flex: 1 }}>
        <Sidebar stats={stats} />

        <div style={contentWrapperStyle}>
          <div style={formWrapperStyle}>
            <img src="/images/auth-logo.png" alt="Auth Logo" style={logoStyle} />

            <h2 style={{ textAlign: "center", marginBottom: "20px", color: "black", fontWeight: "600" }}>Start New Encounter</h2>

            <div style={{ marginBottom: "20px" }}>
              <input
                type="text"
                placeholder="Search patient..."
                value={searchTerm}
                onChange={(e) => { setSearchTerm(e.target.value); setSelectedPatient(null); }}
                style={{ width: "100%", padding: "12px", border: "1px solid #ccc", borderRadius: "8px", fontSize: "15px", color: "black" }}
              />

              {searchTerm && patients.length > 0 && (
                <ul style={{ listStyle: "none", marginTop: "10px", padding: "10px", background: "white", border: "1px solid #ccc", borderRadius: "8px", maxHeight: "160px", overflowY: "auto" }}>
                  {patients.map((p) => (
                    <li
                      key={p.id}
                      onClick={() => { setSelectedPatient(p); setSearchTerm(p.name); }}
                      style={{ padding: "10px", cursor: "pointer", borderBottom: "1px solid #eee", color: "black" }}
                    >
                      {p.name}
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {selectedPatient && (
              <div style={{ marginBottom: "12px", fontWeight: "500", color: "black" }}>
                <strong>Selected Patient:</strong> {selectedPatient.name}
              </div>
            )}

            <div style={{ display: "flex", gap: "12px", marginBottom: "18px" }}>
              <button
                onClick={handleStartSession}
                disabled={loading}
                style={{ flex: 1, padding: "12px", border: "2px solid #012537", color: "#012537", background: "transparent", borderRadius: "8px", fontSize: "15px" }}
              >
                {loading ? "Starting..." : "Start Session"}
              </button>

              <button
                onClick={() => setShowNewPatientForm((prev) => !prev)}
                style={{ flex: 1, padding: "12px", border: "2px solid #012537", color: "#012537", background: "transparent", borderRadius: "8px", fontSize: "15px" }}
              >
                New Patient
              </button>
            </div>

            {showNewPatientForm && (
              <form onSubmit={handleCreatePatient} style={{ border: "1px solid #ccc", borderRadius: "8px", padding: "18px", background: "white", color: "black" }}>
                <h3 style={{ textAlign: "center", marginBottom: "14px", fontWeight: "600", color: "black" }}>Create New Patient</h3>

                <label>
                  Name: *
                  <input
                    type="text"
                    value={newPatient.name}
                    required
                    onChange={(e) => {
                      const val = e.target.value;
                      // Only allow letters, spaces, hyphens, periods, apostrophes
                      if (val === "" || /^[a-zA-Z\s.'-]+$/.test(val)) {
                        setNewPatient({ ...newPatient, name: val });
                      }
                    }}
                    placeholder="Example: John doe"
                    style={{ width: "100%", padding: "10px", marginBottom: "10px", borderRadius: "6px", border: "1px solid #ccc", color: "black" }}
                  />
                </label>

                <label>
                  Age: *
                  <input
                    type="text"
                    inputMode="numeric"
                    value={newPatient.age}
                    required
                    onChange={(e) => {
                      const val = e.target.value;
                      // Only allow digits, max 3 characters (up to 150)
                      if (val === "" || /^\d{1,3}$/.test(val)) {
                        const num = Number(val);
                        if (val === "" || num <= 150) {
                          setNewPatient({ ...newPatient, age: val });
                        }
                      }
                    }}
                    onKeyDown={(e) => {
                      // Block e, E, +, -, . from being typed
                      if (["e", "E", "+", "-", "."].includes(e.key)) {
                        e.preventDefault();
                      }
                    }}
                    placeholder="0-150"
                    style={{ width: "100%", padding: "10px", marginBottom: "10px", borderRadius: "6px", border: "1px solid #ccc" }}
                  />
                </label>

                <label>
                  Gender: *
                  <select
                    value={newPatient.gender}
                    required
                    onChange={(e) => setNewPatient({ ...newPatient, gender: e.target.value })}
                    style={{ width: "100%", padding: "10px", marginBottom: "10px", borderRadius: "6px", border: "1px solid #ccc" }}
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
                    onChange={(e) => {
                      const val = e.target.value;
                      // Only allow alphanumeric and hyphens
                      if (val === "" || /^[a-zA-Z0-9-]+$/.test(val)) {
                        setNewPatient({ ...newPatient, hospital_id: val });
                      }
                    }}
                    placeholder="e.g. HOSP-12345"
                    style={{ width: "100%", padding: "10px", marginBottom: "10px", borderRadius: "6px", border: "1px solid #ccc" }}
                  />
                </label>

                <button
                  type="submit"
                  disabled={creatingPatient}
                  style={{ width: "100%", padding: "12px", border: "2px solid #012537", background: "transparent", color: "#012537", borderRadius: "8px", fontSize: "15px", opacity: creatingPatient ? 0.5 : 1, cursor: creatingPatient ? "not-allowed" : "pointer" }}
                >
                  {creatingPatient ? "Creating..." : "Create Patient"}
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
