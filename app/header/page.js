"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

export default function Header({ handleLogout }) {
  const router = useRouter();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [user, setUser] = useState(null);

  // ✅ Read user info from localStorage on mount
  useEffect(() => {
    const storedUser = {
      name: localStorage.getItem("userName"),
      email: localStorage.getItem("userEmail"),
    };

    if (storedUser.name || storedUser.email) {
      setUser(storedUser);
    }
  }, []);

  // ✅ Helper to get initials from name or email
  const getInitials = () => {
    if (!user) return "DS";
    if (user.name && user.name.trim()) {
      return user.name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase();
    }
    if (user.email) return user.email.slice(0, 2).toUpperCase();
    return "DS";
  };

  return (
    <div
      style={{
        backgroundColor: '#012537',
        borderBottom: '1px solid #012537',
        padding: '16px 24px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}
    >
      {/* Left section */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        <div
          style={{
            width: '52px',
            height: '32px',
            backgroundColor: '#ffffffff',
            borderRadius: '6px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          <span style={{ display: 'inline-block', width: '24px', height: '24px' }}>
            <img
              src="/spark/images/app-logo.png"
              alt="Logo"
              style={{ width: '100%', height: '100%', objectFit: 'contain' }}
            />

          </span>
        </div>

        <div className="hidden md:block">
          <h1 style={{ fontSize: '18px', fontWeight: '600', margin: 0, color: '#ffffffff' }}>
            ARCA SPARK
          </h1>
          <p style={{ fontSize: '14px', color: '#64748b', margin: 0 }}>Ambient Listening</p>
        </div>
      </div>

      {/* Right section */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        {/* Desktop view */}
        <div className="hidden md:flex" style={{ alignItems: 'center', gap: '16px' }}>
          <div
            onClick={() => router.push("/profile")}
            style={{
              width: '32px',
              height: '32px',
              backgroundColor: '#eceef0ff',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer'
            }}
            title="View Profile"
          >
            <span style={{ color: 'black', fontSize: '12px', fontWeight: 'bold' }}>
              {getInitials()}
            </span>
          </div>

          {/* Dropdown */}
          <div style={{ position: "relative" }}>
            <div
              style={{ cursor: "pointer", fontSize: "14px", fontWeight: 500, color: "#fefefeff" }}
              onClick={() => setDropdownOpen(!dropdownOpen)}
            >
              {user?.email || "Loading..."}
            </div>

            {dropdownOpen && (
              <div
                style={{
                  position: "absolute",
                  top: "100%",
                  right: 0,
                  backgroundColor: "white",
                  border: "1px solid #e2e8f0",
                  borderRadius: "6px",
                  boxShadow: "0 2px 10px rgba(0,0,0,0.1)",
                  padding: "8px",
                  zIndex: 10,
                  marginTop: "4px",
                  minWidth: "150px"
                }}
              >
                <button
                  onClick={() => {
                    setDropdownOpen(false);
                    router.push("/profile");
                  }}
                  style={{
                    background: "transparent",
                    border: "none",
                    cursor: "pointer",
                    padding: "6px 8px",
                    width: "100%",
                    textAlign: "left",
                    fontSize: "14px",
                    color: "#012537",
                    fontWeight: "500",
                    display: "flex",
                    alignItems: "center",
                    gap: "8px"
                  }}
                >
                  <svg style={{ width: "16px", height: "16px" }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  My Profile
                </button>
                <div style={{ height: "1px", backgroundColor: "#e2e8f0", margin: "4px 0" }} />
                <button
                  onClick={handleLogout}
                  style={{
                    background: "transparent",
                    border: "none",
                    cursor: "pointer",
                    padding: "6px 8px",
                    width: "100%",
                    textAlign: "left",
                    fontSize: "14px",
                    color: "#ef4444",
                    display: "flex",
                    alignItems: "center",
                    gap: "8px"
                  }}
                >
                  <svg style={{ width: "16px", height: "16px" }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                  Logout
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Mobile menu */}
        <div className="md:hidden" style={{ position: "relative" }}>
          <div
            onClick={() => setDropdownOpen(!dropdownOpen)}
            style={{
              cursor: "pointer",
              color: "#fefefeff",
              fontSize: "24px",
              width: "40px",
              height: "40px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center"
            }}
          >
            ☰
          </div>

          {dropdownOpen && (
            <div
              style={{
                position: "absolute",
                top: "100%",
                right: 0,
                backgroundColor: "white",
                border: "1px solid #e2e8f0",
                borderRadius: "6px",
                boxShadow: "0 2px 10px rgba(0,0,0,0.1)",
                padding: "8px",
                zIndex: 10,
                marginTop: "4px",
                minWidth: "180px"
              }}
            >
              <div style={{
                padding: "8px 12px",
                fontSize: "13px",
                color: "#64748b",
                borderBottom: "1px solid #e2e8f0",
                marginBottom: "4px",
                wordBreak: "break-word"
              }}>
                {user?.email || "Loading..."}
              </div>
              <button
                onClick={() => {
                  setDropdownOpen(false);
                  router.push("/profile");
                }}
                style={{
                  background: "transparent",
                  border: "none",
                  cursor: "pointer",
                  padding: "8px 12px",
                  width: "100%",
                  textAlign: "left",
                  fontSize: "14px",
                  color: "#012537",
                  fontWeight: "500",
                  display: "flex",
                  alignItems: "center",
                  gap: "8px"
                }}
              >
                <svg style={{ width: "16px", height: "16px" }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                My Profile
              </button>
              <button
                onClick={handleLogout}
                style={{
                  background: "transparent",
                  border: "none",
                  cursor: "pointer",
                  padding: "8px 12px",
                  width: "100%",
                  textAlign: "left",
                  fontSize: "14px",
                  color: "#ef4444",
                  display: "flex",
                  alignItems: "center",
                  gap: "8px"
                }}
              >
                <svg style={{ width: "16px", height: "16px" }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                Logout
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
