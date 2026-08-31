"use client";

export const dynamic = "force-dynamic";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import Header from "../header/page";
import Sidebar from "../sidebar/page";
import { useUser } from "@/context/userContext";
import EditProfileModal from "../dashboard/components/EditProfileModal";
import SelectTemplatesModal from "../dashboard/components/SelectTemplatesModal";
import AudioRecorder from "../dashboard/components/AudioRecorder";

const getStorageItem = (key) => {
  if (typeof window !== "undefined") {
    return localStorage.getItem(key);
  }
  return null;
};

export default function ProfilePage() {
  const router = useRouter();
  const { user: contextUser } = useUser();

  const [activeSubTab, setActiveSubTab] = useState("demographics");
  const [profileData, setProfileData] = useState(null);
  const [userTemplates, setUserTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isSelectTemplatesOpen, setIsSelectTemplatesOpen] = useState(false);
  const [stats, setStats] = useState({ today: 0, week: 0 });

  useEffect(() => {
    setMounted(true);
  }, []);

  const API_KEY = process.env.NEXT_PUBLIC_API_KEY || process.env.API_KEY || "";
  const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "";

  // Fetch quick stats for sidebar
  const fetchStats = useCallback(async (userId) => {
    if (!userId) return;
    try {
      const res = await fetch(`/spark/api/backend/stats?user_id=${userId}`, {
        headers: { "Content-Type": "application/json", "X-API-KEY": API_KEY },
        credentials: "include",
      });
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      }
    } catch (err) {
      console.warn("Failed to fetch stats for sidebar:", err);
    }
  }, [API_KEY]);

  // Fetch user demographics from db users table
  const fetchUserDemographics = useCallback(async (showToast = false) => {
    const userId = getStorageItem("userId") || contextUser?.id;
    const userEmail = getStorageItem("userEmail") || contextUser?.email;

    if (!userId && !userEmail) {
      setLoading(false);
      return;
    }

    try {
      if (showToast) setRefreshing(true);

      // Attempt 1: Fetch from Next.js API /api/profile
      const params = new URLSearchParams();
      if (userId) params.append("user_id", userId);
      if (userEmail) params.append("email", userEmail);

      const res = await fetch(`/spark/api/profile?${params.toString()}`, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
      });

      if (res.ok) {
        const data = await res.json();
        if (data.user) {
          setProfileData(data.user);
          if (showToast) toast.success("Demographics refreshed from database!");
          setLoading(false);
          setRefreshing(false);
          return;
        }
      }

      // Attempt 2: Fallback to proxy backend /user/profile
      const backendRes = await fetch(
        `/spark/api/backend/user/profile?${params.toString()}`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            "X-API-KEY": API_KEY,
          },
          credentials: "include",
        }
      );

      if (backendRes.ok) {
        const data = await backendRes.json();
        if (data.user) {
          setProfileData(data.user);
          if (showToast) toast.success("Demographics refreshed from database!");
          setLoading(false);
          setRefreshing(false);
          return;
        }
      }

      // Attempt 3: LocalStorage fallback without dummy data
      setProfileData({
        id: userId || null,
        name: getStorageItem("userName") || contextUser?.name || null,
        email: userEmail || contextUser?.email || null,
        phone: getStorageItem("userPhone") || contextUser?.phone || null,
        status: "active",
        eid: null,
        department_name: null,
        department_code: null,
        specialization_name: null,
        location_name: null,
        role_name: null,
      });
      if (showToast) toast.info("Displaying local profile information.");
    } catch (err) {
      console.error("Error fetching user demographics:", err);
      if (showToast) toast.error("Error fetching demographics from database");
      // Resilient fallback to basic user details
      setProfileData((prev) => prev || {
        id: userId || null,
        email: userEmail || null,
        name: getStorageItem("userName") || null,
        phone: getStorageItem("userPhone") || null,
        status: "active",
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [contextUser, API_KEY]);

  useEffect(() => {
    const userId = getStorageItem("userId") || contextUser?.id;
    if (userId) {
      fetchStats(userId);
    }
    fetchUserDemographics();
  }, [contextUser, fetchStats, fetchUserDemographics]);

  useEffect(() => {
    async function loadUserTemplates() {
      if (!profileData?.id) return;
      try {
        let res = await fetch(`/spark/api/profile/templates?user_id=${profileData.id}`, {
          credentials: "include",
        });
        if (!res.ok) res = await fetch(`/api/profile/templates?user_id=${profileData.id}`);
        if (res.ok) {
          const data = await res.json();
          setUserTemplates(data.templates || []);
        }
      } catch (err) {
        console.warn("Template load error in profile page:", err);
      }
    }
    loadUserTemplates();
  }, [profileData?.id]);

  // Handle Logout
  const handleLogout = async () => {
    try {
      const res = await fetch("/spark/api/logout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
      });

      if (res.ok) {
        if (typeof window !== "undefined") {
          localStorage.clear();
          window.dispatchEvent(new Event("userUpdated"));
        }
        router.push("/login");
        setTimeout(() => (window.location.href = "/spark/login"), 100);
      } else {
        toast.error("Logout failed");
      }
    } catch (err) {
      console.error("Logout error:", err);
      toast.error("Logout error");
    }
  };

  const copyToClipboard = (text, label) => {
    if (!text) return;
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(text);
      toast.success(`${label || "Text"} copied to clipboard!`);
    }
  };

  const getInitials = () => {
    if (!mounted) return "DR";
    const name = profileData?.name || getStorageItem("userName");
    if (name && name.trim()) {
      return name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2);
    }
    const email = profileData?.email || getStorageItem("userEmail");
    if (email) return email.slice(0, 2).toUpperCase();
    return "DR";
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return "Not recorded";
    try {
      const d = new Date(dateStr);
      return isNaN(d.getTime()) ? dateStr : d.toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 font-sans">
      <ToastContainer position="top-right" autoClose={2000} hideProgressBar />
      <Header handleLogout={handleLogout} />

      <div className="flex flex-col md:flex-row">
        <Sidebar stats={stats} />

        <div className="flex-1 p-4 sm:p-6 pt-20 md:pt-6">
          <div className="max-w-6xl mx-auto space-y-6">

            {/* Profile Hero Header Card */}
            <div
              style={{
                backgroundColor: "#012537",
                borderRadius: "12px",
                padding: "24px 32px",
                color: "#ffffff",
                boxShadow: "0 4px 12px rgba(1, 37, 55, 0.15)",
                display: "flex",
                flexWrap: "wrap",
                alignItems: "center",
                justifyContent: "space-between",
                gap: "20px",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "20px" }}>
                <div
                  suppressHydrationWarning
                  style={{
                    width: "72px",
                    height: "72px",
                    borderRadius: "50%",
                    backgroundColor: "#ffffff",
                    color: "#012537",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "24px",
                    fontWeight: "700",
                    boxShadow: "0 2px 8px rgba(0,0,0,0.2)",
                  }}
                >
                  {getInitials()}
                </div>

                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
                    <h1 suppressHydrationWarning style={{ fontSize: "22px", fontWeight: "700", margin: 0 }}>
                      {mounted ? (profileData?.name || "Healthcare Provider") : "Healthcare Provider"}
                    </h1>
                    <span
                      style={{
                        padding: "3px 10px",
                        borderRadius: "12px",
                        fontSize: "11px",
                        fontWeight: "600",
                        textTransform: "uppercase",
                        backgroundColor:
                          (profileData?.status || "active").toLowerCase() === "active"
                            ? "#10b981"
                            : "#f59e0b",
                        color: "#ffffff",
                      }}
                    >
                      {profileData?.status || "Active"}
                    </span>
                  </div>

                  <p style={{ fontSize: "14px", color: "#94a3b8", margin: "4px 0 0 0" }}>
                    {profileData?.email || "—"}
                  </p>

                  <div style={{ display: "flex", alignItems: "center", gap: "16px", marginTop: "8px", fontSize: "12px", color: "#cbd5e1" }}>
                    <span>
                      <strong>EID:</strong> {profileData?.eid || "Not assigned"}
                    </span>
                    <span>•</span>
                    <span>
                      <strong>Department:</strong> {profileData?.department_name || "Not assigned"}
                    </span>
                    <span>•</span>
                    <span>
                      <strong>Specialization:</strong> {profileData?.specialization_name || "Not assigned"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                {/* Theme-matching Edit Profile Button */}
                <button
                  onClick={() => setIsEditOpen(true)}
                  style={{
                    backgroundColor: "#ffffff",
                    color: "#012537",
                    border: "none",
                    padding: "8px 16px",
                    borderRadius: "6px",
                    fontSize: "13px",
                    fontWeight: "600",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                    boxShadow: "0 2px 4px rgba(0, 0, 0, 0.15)",
                    transition: "all 0.2s",
                  }}
                >
                  <svg style={{ width: "15px", height: "15px" }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                    />
                  </svg>
                  Edit Profile
                </button>

                {/* Icon-only Refresh Demographics Button */}
                <button
                  onClick={() => fetchUserDemographics(true)}
                  disabled={refreshing}
                  title="Refresh Demographics"
                  aria-label="Refresh Demographics"
                  style={{
                    backgroundColor: "rgba(255, 255, 255, 0.15)",
                    color: "#ffffff",
                    border: "1px solid rgba(255, 255, 255, 0.3)",
                    width: "36px",
                    height: "36px",
                    borderRadius: "6px",
                    cursor: refreshing ? "not-allowed" : "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    transition: "all 0.2s",
                  }}
                >
                  <svg
                    style={{
                      width: "16px",
                      height: "16px",
                      transform: refreshing ? "rotate(360deg)" : "none",
                      transition: "transform 0.6s ease",
                    }}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                    />
                  </svg>
                </button>

                {/* Icon-only Copy User ID Button */}
                <button
                  onClick={() => copyToClipboard(profileData?.id, "User ID")}
                  title="Copy User ID"
                  aria-label="Copy User ID"
                  style={{
                    backgroundColor: "rgba(255, 255, 255, 0.15)",
                    color: "#ffffff",
                    border: "1px solid rgba(255, 255, 255, 0.3)",
                    width: "36px",
                    height: "36px",
                    borderRadius: "6px",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    transition: "all 0.2s",
                  }}
                >
                  <svg style={{ width: "16px", height: "16px" }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                    />
                  </svg>
                </button>
              </div>
            </div>

            {/* Edit Profile Modal (Demographics & Licensing Only) */}
            <EditProfileModal
              isOpen={isEditOpen}
              onClose={() => setIsEditOpen(false)}
              profile={profileData}
              onSaveSuccess={(updatedUser) => setProfileData(updatedUser)}
            />

            {/* Select Templates Modal (Clinical & Discharge Templates Only) */}
            <SelectTemplatesModal
              isOpen={isSelectTemplatesOpen}
              onClose={() => setIsSelectTemplatesOpen(false)}
              userId={profileData?.id}
              userStatus={profileData?.status || "active"}
              onSaveSuccess={(assigned) => setUserTemplates(assigned)}
            />

            {/* Quick Metrics / Demographics Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Employee ID (EID)</p>
                <p className="text-lg font-bold text-gray-900 mt-1">{profileData?.eid || "—"}</p>
                <p className="text-xs text-gray-400 mt-1">Unique Staff Identifier</p>
              </div>

              <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Department</p>
                <p className="text-lg font-bold text-gray-900 mt-1 truncate">
                  {profileData?.department_name || "Not assigned"}
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  {profileData?.department_code ? `Code: ${profileData.department_code}` : "No code"}
                </p>
              </div>

              <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Clinical Specialization</p>
                <p className="text-lg font-bold text-gray-900 mt-1 truncate">
                  {profileData?.specialization_name || "Not assigned"}
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  {profileData?.specialization_category ? `Category: ${profileData.specialization_category}` : "Uncategorized"}
                </p>
              </div>

              <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Assigned Location</p>
                <p className="text-lg font-bold text-gray-900 mt-1 truncate">
                  {profileData?.location_name || "Not assigned"}
                </p>
                <p className="text-xs text-gray-400 mt-1">{profileData?.location_city || "—"}</p>
              </div>
            </div>

            {/* Main Tabs Card */}
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
              {/* Tab Navigation (Sticky Top) */}
              <div
                style={{
                  position: "sticky",
                  top: 0,
                  zIndex: 30,
                  backgroundColor: "#ffffff",
                  borderBottom: "1px solid #e2e8f0",
                  borderTopLeftRadius: "8px",
                  borderTopRightRadius: "8px",
                  boxShadow: "0 2px 8px rgba(0, 0, 0, 0.06)",
                  display: "flex",
                  overflowX: "auto",
                  scrollbarWidth: "none",
                }}
              >
                <button
                  onClick={() => setActiveSubTab("demographics")}
                  style={{
                    padding: "14px 20px",
                    fontSize: "14px",
                    fontWeight: "600",
                    borderBottom: activeSubTab === "demographics" ? "3px solid #012537" : "3px solid transparent",
                    color: activeSubTab === "demographics" ? "#012537" : "#64748b",
                    backgroundColor: activeSubTab === "demographics" ? "#ffffff" : "transparent",
                    transition: "all 0.2s",
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    cursor: "pointer",
                    whiteSpace: "nowrap",
                  }}
                >
                  <svg style={{ width: "18px", height: "18px" }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                    />
                  </svg>
                  Personal & Registration Details
                </button>

                <button
                  onClick={() => setActiveSubTab("clinical")}
                  style={{
                    padding: "14px 20px",
                    fontSize: "14px",
                    fontWeight: "600",
                    borderBottom: activeSubTab === "clinical" ? "3px solid #012537" : "3px solid transparent",
                    color: activeSubTab === "clinical" ? "#012537" : "#64748b",
                    backgroundColor: activeSubTab === "clinical" ? "#ffffff" : "transparent",
                    transition: "all 0.2s",
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    cursor: "pointer",
                    whiteSpace: "nowrap",
                  }}
                >
                  <svg style={{ width: "18px", height: "18px" }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                    />
                  </svg>
                  Clinical & Department Info
                </button>

                <button
                  onClick={() => setActiveSubTab("templates")}
                  style={{
                    padding: "14px 20px",
                    fontSize: "14px",
                    fontWeight: "600",
                    borderBottom: activeSubTab === "templates" ? "3px solid #012537" : "3px solid transparent",
                    color: activeSubTab === "templates" ? "#012537" : "#64748b",
                    backgroundColor: activeSubTab === "templates" ? "#ffffff" : "transparent",
                    transition: "all 0.2s",
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    cursor: "pointer",
                    whiteSpace: "nowrap",
                  }}
                >
                  <svg style={{ width: "18px", height: "18px" }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                    />
                  </svg>
                  Clinical Templates {(profileData?.status || "active").toLowerCase() === "active" ? "⚡" : ""}
                </button>

                <button
                  onClick={() => setActiveSubTab("audio")}
                  style={{
                    padding: "14px 20px",
                    fontSize: "14px",
                    fontWeight: "600",
                    borderBottom: activeSubTab === "audio" ? "3px solid #012537" : "3px solid transparent",
                    color: activeSubTab === "audio" ? "#012537" : "#64748b",
                    backgroundColor: activeSubTab === "audio" ? "#ffffff" : "transparent",
                    transition: "all 0.2s",
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    cursor: "pointer",
                    whiteSpace: "nowrap",
                  }}
                >
                  <svg style={{ width: "18px", height: "18px" }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"
                    />
                  </svg>
                  Voice Registration {(profileData?.status || "active").toLowerCase() === "active" ? "⚡" : ""}
                </button>
              </div>

              {/* Tab Contents */}
              <div className="p-6">
                {loading ? (
                  <div className="py-12 text-center">
                    <div
                      style={{
                        width: "36px",
                        height: "36px",
                        border: "3px solid #e2e8f0",
                        borderTopColor: "#012537",
                        borderRadius: "50%",
                        animation: "spin 1s linear infinite",
                        margin: "0 auto 16px auto",
                      }}
                    />
                    <p className="text-gray-600 text-sm">Fetching user demographics from database...</p>
                  </div>
                ) : (
                  <>
                    {/* TAB 1: PERSONAL DEMOGRAPHICS & MEDICAL REGISTRATION */}
                    {activeSubTab === "demographics" && (
                      <div className="space-y-6">
                        <div>
                          <h3 className="text-base font-bold text-gray-900 mb-1">
                            User Demographics & Identity
                          </h3>
                          <p className="text-xs text-gray-500">
                            Core demographic, contact attributes, and state medical council compliance registered in PostgreSQL.
                          </p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div className="space-y-4">
                            <div className="border-b border-gray-100 pb-3">
                              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Full Name</label>
                              <p className="text-sm font-medium text-gray-900 mt-1">{profileData?.name || "Not specified"}</p>
                            </div>

                            <div className="border-b border-gray-100 pb-3">
                              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Email Address</label>
                              <p className="text-sm font-medium text-gray-900 mt-1">{profileData?.email || "Not specified"}</p>
                            </div>

                            <div className="border-b border-gray-100 pb-3">
                              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Phone Number</label>
                              <p className="text-sm font-medium text-gray-900 mt-1">{profileData?.phone || "Not provided"}</p>
                            </div>

                            <div className="border-b border-gray-100 pb-3">
                              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Employee ID (EID)</label>
                              <p className="text-sm font-medium text-gray-900 mt-1 font-mono">{profileData?.eid || "EMP-1001"}</p>
                            </div>
                          </div>

                          <div className="space-y-4">
                            <div className="border-b border-gray-100 pb-3">
                              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Database User ID</label>
                              <div className="flex items-center gap-2 mt-1">
                                <p className="text-xs font-mono text-gray-700 bg-gray-50 px-2 py-1 rounded border border-gray-200 truncate">
                                  {profileData?.id || "N/A"}
                                </p>
                                <button
                                  onClick={() => copyToClipboard(profileData?.id, "User ID")}
                                  className="text-xs text-gray-500 hover:text-gray-900"
                                  title="Copy"
                                >
                                  📋
                                </button>
                              </div>
                            </div>

                            <div className="border-b border-gray-100 pb-3">
                              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Account Status</label>
                              <div className="mt-1">
                                <span
                                  style={{
                                    display: "inline-block",
                                    padding: "2px 8px",
                                    borderRadius: "4px",
                                    fontSize: "12px",
                                    fontWeight: "600",
                                    backgroundColor: (profileData?.status || "active").toLowerCase() === "active" ? "#ecfdf5" : "#fffbeb",
                                    color: (profileData?.status || "active").toLowerCase() === "active" ? "#065f46" : "#b45309",
                                    border: (profileData?.status || "active").toLowerCase() === "active" ? "1px solid #a7f3d0" : "1px solid #fde68a",
                                  }}
                                >
                                  {profileData?.status || "Active"}
                                </span>
                              </div>
                            </div>

                            <div className="border-b border-gray-100 pb-3">
                              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Registration Date</label>
                              <p className="text-sm font-medium text-gray-900 mt-1">{formatDate(profileData?.created_at)}</p>
                            </div>

                            <div className="border-b border-gray-100 pb-3">
                              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Last Profile Update</label>
                              <p className="text-sm font-medium text-gray-900 mt-1">{formatDate(profileData?.updated_at)}</p>
                            </div>
                          </div>
                        </div>

                        {/* Medical Council & Licensing Section Embedded in Personal Tab */}
                        <div className="mt-6 pt-6 border-t border-gray-200">
                          <div className="flex items-center justify-between mb-3">
                            <h4 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                              <span>📜</span> Medical Council Registration & License
                            </h4>
                            {profileData?.registration_verified ? (
                              <span className="px-2.5 py-0.5 bg-green-100 text-green-800 text-xs font-bold rounded-full border border-green-300">
                                Verified License
                              </span>
                            ) : (
                              <span className="px-2.5 py-0.5 bg-gray-100 text-gray-600 text-xs font-medium rounded-full border border-gray-300">
                                Unverified
                              </span>
                            )}
                          </div>

                          <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                            <div>
                              <p className="font-semibold text-gray-500 uppercase">Registration Number</p>
                              <p className="text-sm font-mono font-bold text-gray-900 mt-1">
                                {profileData?.registration_number || "Not registered"}
                              </p>
                            </div>

                            <div>
                              <p className="font-semibold text-gray-500 uppercase">Council / Board Name</p>
                              <p className="text-sm font-medium text-gray-900 mt-1">
                                {profileData?.council_name || "—"}
                              </p>
                            </div>

                            <div>
                              <p className="font-semibold text-gray-500 uppercase">License Expiry</p>
                              <p className="text-sm font-medium text-gray-900 mt-1">
                                {profileData?.registration_expiry ? formatDate(profileData.registration_expiry) : "—"}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* TAB 2: CLINICAL & DEPARTMENT INFO */}
                    {activeSubTab === "clinical" && (
                      <div className="space-y-6">
                        <div>
                          <h3 className="text-base font-bold text-gray-900 mb-1">
                            Clinical Affiliation & Practice Location
                          </h3>
                          <p className="text-xs text-gray-500">
                            Department assignment, specialization hierarchy, and medical center demographics.
                          </p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div className="bg-gray-50 p-5 rounded-lg border border-gray-200 space-y-3">
                            <div className="flex items-center gap-2">
                              <span style={{ fontSize: "16px" }}>🏥</span>
                              <h4 className="text-sm font-bold text-gray-900">Department Information</h4>
                            </div>
                            <div className="space-y-2 text-sm pt-2">
                              <div className="flex justify-between">
                                <span className="text-gray-500">Department Name:</span>
                                <span className="font-semibold text-gray-900">{profileData?.department_name || "Not assigned"}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-gray-500">Department Code:</span>
                                <span className="font-mono text-gray-800">{profileData?.department_code || "—"}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-gray-500">Department ID:</span>
                                <span className="font-mono text-xs text-gray-600">{profileData?.department_id || "—"}</span>
                              </div>
                            </div>
                          </div>

                          <div className="bg-gray-50 p-5 rounded-lg border border-gray-200 space-y-3">
                            <div className="flex items-center gap-2">
                              <span style={{ fontSize: "16px" }}>🩺</span>
                              <h4 className="text-sm font-bold text-gray-900">Specialization & Specialty</h4>
                            </div>
                            <div className="space-y-2 text-sm pt-2">
                              <div className="flex justify-between">
                                <span className="text-gray-500">Primary Specialty:</span>
                                <span className="font-semibold text-gray-900">{profileData?.specialization_name || "Not assigned"}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-gray-500">Category:</span>
                                <span className="font-semibold text-gray-800">{profileData?.specialization_category || "—"}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-gray-500">Specialization ID:</span>
                                <span className="font-mono text-xs text-gray-600">{profileData?.specialization_id || "—"}</span>
                              </div>
                            </div>
                          </div>

                          <div className="bg-gray-50 p-5 rounded-lg border border-gray-200 space-y-3">
                            <div className="flex items-center gap-2">
                              <span style={{ fontSize: "16px" }}>📍</span>
                              <h4 className="text-sm font-bold text-gray-900">Hospital / Clinic Location</h4>
                            </div>
                            <div className="space-y-2 text-sm pt-2">
                              <div className="flex justify-between">
                                <span className="text-gray-500">Facility Name:</span>
                                <span className="font-semibold text-gray-900">{profileData?.location_name || "Not assigned"}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-gray-500">City / Jurisdiction:</span>
                                <span className="font-semibold text-gray-800">{profileData?.location_city || "—"}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-gray-500">Location ID:</span>
                                <span className="font-mono text-xs text-gray-600">{profileData?.location_id || "—"}</span>
                              </div>
                            </div>
                          </div>

                          <div className="bg-gray-50 p-5 rounded-lg border border-gray-200 space-y-3">
                            <div className="flex items-center gap-2">
                              <span style={{ fontSize: "16px" }}>👨‍⚕️</span>
                              <h4 className="text-sm font-bold text-gray-900">Clinical Supervision & Hierarchy</h4>
                            </div>
                            <div className="space-y-2 text-sm pt-2">
                              <div className="flex justify-between">
                                <span className="text-gray-500">Clinical Supervisor:</span>
                                <span className="font-semibold text-gray-900">
                                  {profileData?.supervisor_name || "Not assigned"}
                                </span>
                              </div>
                              {profileData?.supervisor_email && (
                                <div className="flex justify-between">
                                  <span className="text-gray-500">Supervisor Email:</span>
                                  <span className="font-mono text-xs text-gray-800">{profileData.supervisor_email}</span>
                                </div>
                              )}
                              {profileData?.supervisor_assigned_at && (
                                <div className="flex justify-between">
                                  <span className="text-gray-500">Assigned On:</span>
                                  <span className="text-gray-700">{formatDate(profileData.supervisor_assigned_at)}</span>
                                </div>
                              )}
                              <div className="flex justify-between">
                                <span className="text-gray-500">Ambient STT Access:</span>
                                <span className="text-green-700 font-medium">Enabled (Indic + Whisper)</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* TAB 3: CLINICAL & DISCHARGE TEMPLATES */}
                    {activeSubTab === "templates" && (
                      <div className="space-y-6">
                        <div className="flex items-center justify-between">
                          <div>
                            <h3 className="text-base font-bold text-gray-900 mb-1">
                              Clinical & Discharge Summary Templates
                            </h3>
                            <p className="text-xs text-gray-500">
                              Templates linked to your practitioner account in PostgreSQL <code className="text-xs bg-gray-100 px-1 py-0.5 rounded text-gray-800">user_templates</code>.
                            </p>
                          </div>
                          {(profileData?.status || "active").toLowerCase() === "active" && (
                            <button
                              onClick={() => setIsSelectTemplatesOpen(true)}
                              className="px-3 py-1.5 bg-slate-900 text-white text-xs font-semibold rounded-md hover:bg-slate-800 flex items-center gap-1.5"
                            >
                              <span>📄</span> Select Templates
                            </button>
                          )}
                        </div>

                        {(profileData?.status || "active").toLowerCase() !== "active" ? (
                          <div className="p-6 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-4 shadow-sm">
                            <span className="text-3xl leading-none">🔒</span>
                            <div>
                              <h4 className="text-sm font-bold text-amber-900">
                                Clinical Templates Locked
                              </h4>
                              <p className="text-xs text-amber-800 mt-1 leading-relaxed">
                                Clinical and discharge template configuration is restricted to <strong>Active</strong> accounts. Your current account status is <strong>{(profileData?.status || "Pending").toUpperCase()}</strong>.
                              </p>
                              <div className="mt-3 text-xs font-semibold text-amber-900 bg-amber-100/90 px-3 py-1.5 rounded-md inline-block border border-amber-300">
                                👉 Please contact the administrator to activate your account.
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="bg-gray-50 p-6 rounded-lg border border-gray-200">
                            {userTemplates.length === 0 ? (
                              <div className="text-center py-6 text-gray-500">
                                <p className="text-sm">No specific templates assigned yet.</p>
                                <p className="text-xs mt-1 text-gray-400">Click <strong>Select Templates</strong> to choose active clinical and discharge templates from database.</p>
                              </div>
                            ) : (
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                {userTemplates.map((t) => (
                                  <div
                                    key={t.id}
                                    className="p-4 bg-white rounded-lg border border-gray-200 shadow-sm flex items-start gap-3"
                                  >
                                    <span className="text-xl">📄</span>
                                    <div>
                                      <div className="flex items-center gap-2">
                                        <h4 className="text-sm font-bold text-gray-900">{t.name}</h4>
                                        <span className="px-2 py-0.5 bg-teal-50 text-teal-700 text-[10px] font-bold uppercase rounded border border-teal-200">
                                          {t.type || "Clinical"}
                                        </span>
                                      </div>
                                      <p className="text-xs text-gray-500 mt-0.5">{t.description || "Active template"}</p>
                                      
                                      {Array.isArray(t.headers) && t.headers.length > 0 && (
                                        <div className="flex flex-wrap gap-1 mt-2.5">
                                          {t.headers.map((h, idx) => (
                                            <span
                                              key={idx}
                                              className="text-[10px] bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded font-medium border border-slate-200"
                                            >
                                              • {h}
                                            </span>
                                          ))}
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}

                    {/* TAB 4: AUDIO SAMPLES & VOICE REGISTRATION */}
                    {activeSubTab === "audio" && (
                      <div className="space-y-6">
                        <div>
                          <h3 className="text-base font-bold text-gray-900 mb-1">
                            Practitioner Voice Enrollment & Audio Samples
                          </h3>
                          <p className="text-xs text-gray-500">
                            Registered voice prints stored in <code className="text-xs bg-gray-100 px-1 py-0.5 rounded text-gray-800">audio_samples</code> table for ambient speaker diarization.
                          </p>
                        </div>

                        <AudioRecorder
                          userId={profileData?.id}
                          userName={profileData?.name}
                          userStatus={profileData?.status || "active"}
                        />
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
