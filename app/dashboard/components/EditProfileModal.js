"use client";

import React, { useState, useEffect } from "react";
import { toast } from "react-toastify";

export default function EditProfileModal({ isOpen, onClose, profile, onSaveSuccess }) {
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    eid: "",
    status: "active",
    department_id: "",
    location_id: "",
    specialization_id: "",
    registration_number: "",
    council_name: "",
    registration_expiry: "",
    supervisor_id: "",
  });

  const [lookups, setLookups] = useState({
    departments: [],
    locations: [],
    specializations: [],
    supervisors: [],
  });

  const [loadingLookups, setLoadingLookups] = useState(false);
  const [saving, setSaving] = useState(false);

  // Fetch Lookups when modal opens
  useEffect(() => {
    if (!isOpen) return;

    async function fetchLookups() {
      try {
        setLoadingLookups(true);
        let res = await fetch("/spark/api/profile/lookups", {
          credentials: "include",
        });
        if (!res.ok) res = await fetch("/api/profile/lookups");
        if (res.ok) {
          const data = await res.json();
          if (data.lookups) setLookups(data.lookups);
        }
      } catch (err) {
        console.warn("Lookups fetch notice:", err);
      } finally {
        setLoadingLookups(false);
      }
    }

    fetchLookups();
  }, [isOpen]);

  // Sync initial form data with current profile
  useEffect(() => {
    if (profile) {
      let expiryDateFormatted = "";
      if (profile.registration_expiry) {
        try {
          expiryDateFormatted = new Date(profile.registration_expiry).toISOString().split("T")[0];
        } catch {
          expiryDateFormatted = profile.registration_expiry;
        }
      }

      setFormData({
        name: profile.name || "",
        phone: profile.phone || "",
        eid: profile.eid || "",
        status: profile.status || "active",
        department_id: profile.department_id || "",
        location_id: profile.location_id || "",
        specialization_id: profile.specialization_id || "",
        registration_number: profile.registration_number || "",
        council_name: profile.council_name || "",
        registration_expiry: expiryDateFormatted,
        supervisor_id: profile.supervisor_id || "",
      });
    }
  }, [profile, isOpen]);

  if (!isOpen) return null;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);

    try {
      const payload = {
        ...formData,
        id: profile?.id,
        user_id: profile?.id,
        email: profile?.email,
      };

      let res = await fetch("/spark/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        res = await fetch("/api/profile", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      }

      const data = await res.json();
      if (res.ok && data.status === "success") {
        toast.success("Practitioner profile updated in PostgreSQL!");
        if (typeof window !== "undefined") {
          if (formData.name) localStorage.setItem("userName", formData.name);
          if (formData.phone) localStorage.setItem("userPhone", formData.phone);
          window.dispatchEvent(new Event("userUpdated"));
        }
        if (onSaveSuccess) {
          onSaveSuccess(data.user);
        }
        onClose();
      } else {
        toast.error(data.error || "Failed to update profile");
      }
    } catch (err) {
      console.error("Save error:", err);
      toast.error("Error updating profile in database");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(1, 37, 55, 0.6)",
        zIndex: 50,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "16px",
        backdropFilter: "blur(4px)",
      }}
    >
      <div
        style={{
          backgroundColor: "#ffffff",
          borderRadius: "12px",
          width: "100%",
          maxWidth: "740px",
          maxHeight: "90vh",
          overflowY: "auto",
          boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {/* Modal Header */}
        <div
          style={{
            padding: "18px 24px",
            borderBottom: "1px solid #e2e8f0",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            backgroundColor: "#012537",
            color: "#ffffff",
            borderTopLeftRadius: "12px",
            borderTopRightRadius: "12px",
          }}
        >
          <div>
            <h3 style={{ fontSize: "18px", fontWeight: "700", margin: 0, display: "flex", alignItems: "center", gap: "8px" }}>
              <span>✏️</span> Edit Practitioner Profile & Demographics
            </h3>
            <p style={{ fontSize: "12px", color: "#94a3b8", margin: "2px 0 0 0" }}>
              Updates user attributes, clinical affiliations, and medical licensing in PostgreSQL.
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              background: "transparent",
              border: "none",
              color: "#ffffff",
              fontSize: "24px",
              cursor: "pointer",
              lineHeight: 1,
            }}
          >
            ×
          </button>
        </div>

        {/* Modal Form Body */}
        <form onSubmit={handleSave} style={{ display: "flex", flexDirection: "column", flex: 1 }}>
          <div style={{ padding: "24px", display: "flex", flexDirection: "column", gap: "20px" }}>
            {loadingLookups && (
              <div style={{ fontSize: "12px", color: "#0284c7", backgroundColor: "#e0f2fe", padding: "8px 12px", borderRadius: "6px" }}>
                Loading live department and specialization records from database...
              </div>
            )}

            {/* SECTION 1: CORE DEMOGRAPHICS & CONTACT */}
            <div>
              <h4 style={{ fontSize: "13px", fontWeight: "700", color: "#012537", margin: "0 0 12px 0", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                1. Demographics & Contact Information
              </h4>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" }}>
                <div>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: "600", color: "#475569", marginBottom: "4px" }}>
                    Full Name *
                  </label>
                  <input
                    type="text"
                    name="name"
                    required
                    value={formData.name}
                    onChange={handleChange}
                    style={{ width: "100%", padding: "8px 12px", border: "1px solid #cbd5e1", borderRadius: "6px", fontSize: "13px" }}
                  />
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: "600", color: "#475569", marginBottom: "4px" }}>
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    placeholder="+91 98765 43210"
                    style={{ width: "100%", padding: "8px 12px", border: "1px solid #cbd5e1", borderRadius: "6px", fontSize: "13px" }}
                  />
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: "600", color: "#475569", marginBottom: "4px" }}>
                    Employee ID (EID)
                  </label>
                  <input
                    type="text"
                    name="eid"
                    value={formData.eid}
                    onChange={handleChange}
                    placeholder="EMP-1001"
                    style={{ width: "100%", padding: "8px 12px", border: "1px solid #cbd5e1", borderRadius: "6px", fontSize: "13px", fontFamily: "monospace" }}
                  />
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: "600", color: "#475569", marginBottom: "4px" }}>
                    Account Status
                  </label>
                  <select
                    name="status"
                    value={formData.status}
                    onChange={handleChange}
                    style={{ width: "100%", padding: "8px 12px", border: "1px solid #cbd5e1", borderRadius: "6px", fontSize: "13px", backgroundColor: "#ffffff" }}
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                    <option value="pending">Pending</option>
                    <option value="suspended">Suspended</option>
                  </select>
                </div>
              </div>
            </div>

            {/* SECTION 2: CLINICAL AFFILIATION & HIERARCHY */}
            <div style={{ paddingTop: "12px", borderTop: "1px solid #f1f5f9" }}>
              <h4 style={{ fontSize: "13px", fontWeight: "700", color: "#012537", margin: "0 0 12px 0", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                2. Clinical Affiliation & Practice Location
              </h4>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" }}>
                <div>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: "600", color: "#475569", marginBottom: "4px" }}>
                    Assigned Department
                  </label>
                  <select
                    name="department_id"
                    value={formData.department_id}
                    onChange={handleChange}
                    style={{ width: "100%", padding: "8px 12px", border: "1px solid #cbd5e1", borderRadius: "6px", fontSize: "13px", backgroundColor: "#ffffff" }}
                  >
                    <option value="">— Select Department —</option>
                    {lookups.departments.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name} {d.code ? `(${d.code})` : ""}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: "600", color: "#475569", marginBottom: "4px" }}>
                    Medical Specialization
                  </label>
                  <select
                    name="specialization_id"
                    value={formData.specialization_id}
                    onChange={handleChange}
                    style={{ width: "100%", padding: "8px 12px", border: "1px solid #cbd5e1", borderRadius: "6px", fontSize: "13px", backgroundColor: "#ffffff" }}
                  >
                    <option value="">— Select Specialization —</option>
                    {lookups.specializations.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} {s.category ? `[${s.category}]` : ""}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: "600", color: "#475569", marginBottom: "4px" }}>
                    Practice Facility Location
                  </label>
                  <select
                    name="location_id"
                    value={formData.location_id}
                    onChange={handleChange}
                    style={{ width: "100%", padding: "8px 12px", border: "1px solid #cbd5e1", borderRadius: "6px", fontSize: "13px", backgroundColor: "#ffffff" }}
                  >
                    <option value="">— Select Location —</option>
                    {lookups.locations.map((loc) => (
                      <option key={loc.id} value={loc.id}>
                        {loc.name} {loc.city ? `(${loc.city})` : ""}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: "600", color: "#475569", marginBottom: "4px" }}>
                    Clinical Supervisor
                  </label>
                  <select
                    name="supervisor_id"
                    value={formData.supervisor_id}
                    onChange={handleChange}
                    style={{ width: "100%", padding: "8px 12px", border: "1px solid #cbd5e1", borderRadius: "6px", fontSize: "13px", backgroundColor: "#ffffff" }}
                  >
                    <option value="">— Select Supervisor —</option>
                    {lookups.supervisors
                      .filter((sup) => sup.id !== profile?.id)
                      .map((sup) => (
                        <option key={sup.id} value={sup.id}>
                          {sup.name} ({sup.email})
                        </option>
                      ))}
                  </select>
                </div>
              </div>
            </div>

            {/* SECTION 3: COUNCIL REGISTRATION & LICENSING */}
            <div style={{ paddingTop: "12px", borderTop: "1px solid #f1f5f9" }}>
              <h4 style={{ fontSize: "13px", fontWeight: "700", color: "#012537", margin: "0 0 12px 0", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                3. Medical Council Registration & License
              </h4>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" }}>
                <div>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: "600", color: "#475569", marginBottom: "4px" }}>
                    Registration Number
                  </label>
                  <input
                    type="text"
                    name="registration_number"
                    value={formData.registration_number}
                    onChange={handleChange}
                    placeholder="MCI-12345 / SMC-98765"
                    style={{ width: "100%", padding: "8px 12px", border: "1px solid #cbd5e1", borderRadius: "6px", fontSize: "13px", fontFamily: "monospace" }}
                  />
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: "600", color: "#475569", marginBottom: "4px" }}>
                    Council / Medical Board Name
                  </label>
                  <input
                    type="text"
                    name="council_name"
                    value={formData.council_name}
                    onChange={handleChange}
                    placeholder="Medical Council of India / State Board"
                    style={{ width: "100%", padding: "8px 12px", border: "1px solid #cbd5e1", borderRadius: "6px", fontSize: "13px" }}
                  />
                </div>

                <div style={{ gridColumn: "span 2" }}>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: "600", color: "#475569", marginBottom: "4px" }}>
                    License Expiry Date
                  </label>
                  <input
                    type="date"
                    name="registration_expiry"
                    value={formData.registration_expiry}
                    onChange={handleChange}
                    style={{ width: "100%", padding: "8px 12px", border: "1px solid #cbd5e1", borderRadius: "6px", fontSize: "13px" }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div
            style={{
              padding: "16px 24px",
              borderTop: "1px solid #e2e8f0",
              backgroundColor: "#f8fafc",
              display: "flex",
              justifyContent: "flex-end",
              gap: "12px",
              borderBottomLeftRadius: "12px",
              borderBottomRightRadius: "12px",
            }}
          >
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: "10px 18px",
                backgroundColor: "#ffffff",
                border: "1px solid #cbd5e1",
                borderRadius: "8px",
                fontSize: "13px",
                fontWeight: "600",
                color: "#475569",
                cursor: "pointer",
              }}
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={saving}
              style={{
                padding: "10px 24px",
                backgroundColor: "#012537",
                border: "none",
                borderRadius: "8px",
                fontSize: "13px",
                fontWeight: "600",
                color: "#ffffff",
                cursor: saving ? "not-allowed" : "pointer",
                boxShadow: "0 2px 4px rgba(1, 37, 55, 0.2)",
              }}
            >
              {saving ? "Saving Changes..." : "Save Profile Details"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
