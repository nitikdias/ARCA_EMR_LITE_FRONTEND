"use client";

import React, { useState, useEffect } from "react";
import { toast } from "react-toastify";

export default function SelectTemplatesModal({
  isOpen,
  onClose,
  userId,
  userStatus = "active",
  onSaveSuccess,
}) {
  const [templates, setTemplates] = useState({
    clinical: [],
    discharge: [],
  });
  const [selectedClinicalId, setSelectedClinicalId] = useState(null);
  const [selectedDischargeId, setSelectedDischargeId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");

  const isActiveAccount = (userStatus || "").toLowerCase() === "active";

  useEffect(() => {
    if (!isOpen || !userId) return;

    async function fetchTemplatesData() {
      try {
        setLoading(true);

        // 1. Fetch all templates from DB
        let res = await fetch("/spark/api/profile/templates", {
          credentials: "include",
        });
        if (!res.ok) res = await fetch("/api/profile/templates");

        if (res.ok) {
          const data = await res.json();
          if (data.templates) {
            setTemplates({
              clinical: data.templates.clinical || [],
              discharge: data.templates.discharge || [],
            });
          }
        }

        // 2. Fetch user's assigned templates
        let userRes = await fetch(`/spark/api/profile/templates?user_id=${userId}`, {
          credentials: "include",
        });
        if (!userRes.ok) userRes = await fetch(`/api/profile/templates?user_id=${userId}`);

        if (userRes.ok) {
          const userData = await userRes.json();
          if (Array.isArray(userData.templates)) {
            const clinical = userData.templates.find(
              (t) => (t.type || "").toLowerCase() === "clinical"
            );
            const discharge = userData.templates.find(
              (t) => (t.type || "").toLowerCase() === "discharge"
            );

            setSelectedClinicalId(clinical ? clinical.id : null);
            setSelectedDischargeId(discharge ? discharge.id : null);
          }
        }
      } catch (err) {
        console.error("Error fetching templates:", err);
        toast.error("Failed to load templates from database");
      } finally {
        setLoading(false);
      }
    }

    fetchTemplatesData();
  }, [isOpen, userId]);

  if (!isOpen) return null;

  const handleSelectClinical = (id) => {
    setSelectedClinicalId((prev) => (prev === id ? null : id));
  };

  const handleSelectDischarge = (id) => {
    setSelectedDischargeId((prev) => (prev === id ? null : id));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!userId) return;

    try {
      setSaving(true);
      const allSelected = [selectedClinicalId, selectedDischargeId].filter(Boolean);

      let res = await fetch("/api/profile/templates", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          user_id: userId,
          template_ids: allSelected,
        }),
      });

      if (!res.ok) {
        res = await fetch("/spark/api/profile/templates", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            user_id: userId,
            template_ids: allSelected,
          }),
        });
      }

      const data = await res.json().catch(() => ({}));
      if (res.ok && (data.status === "success" || Array.isArray(data.templates))) {
        toast.success("Templates updated successfully in database!");
        if (typeof window !== "undefined") {
          window.dispatchEvent(new Event("templatesUpdated"));
        }
        if (onSaveSuccess) {
          onSaveSuccess(data.templates || data.assigned_templates || []);
        }
        onClose();
      } else {
        toast.error(data.error || "Failed to update templates");
      }
    } catch (err) {
      console.error("Save error:", err);
      toast.error("Error saving templates to database");
    } finally {
      setSaving(false);
    }
  };

  const filterList = (list) => {
    if (!search.trim()) return list;
    const q = search.toLowerCase();
    return list.filter(
      (t) =>
        (t.name && t.name.toLowerCase().includes(q)) ||
        (t.description && t.description.toLowerCase().includes(q))
    );
  };

  const filteredClinical = filterList(templates.clinical);
  const filteredDischarge = filterList(templates.discharge);

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
          maxWidth: "760px",
          maxHeight: "90vh",
          overflowY: "auto",
          boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {/* Header */}
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
              <span>📄</span> Select Clinical & Discharge Templates
            </h3>
            <p style={{ fontSize: "12px", color: "#94a3b8", margin: "3px 0 0 0" }}>
              Select <strong>1 Clinical Template</strong> and <strong>1 Discharge Template</strong> from PostgreSQL.
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

        {/* Content */}
        <div style={{ padding: "24px", display: "flex", flexDirection: "column", gap: "20px" }}>
          {!isActiveAccount && (
            <div
              style={{
                padding: "16px 20px",
                backgroundColor: "#fffbeb",
                border: "1px solid #fde68a",
                borderRadius: "10px",
                display: "flex",
                alignItems: "flex-start",
                gap: "12px",
              }}
            >
              <span style={{ fontSize: "22px", lineHeight: 1 }}>🔒</span>
              <div>
                <h4 style={{ fontSize: "14px", fontWeight: "700", color: "#92400e", margin: 0 }}>
                  Account Pending Activation
                </h4>
                <p style={{ fontSize: "12px", color: "#b45309", margin: "4px 0 0 0", lineHeight: "1.4" }}>
                  Clinical template selection is restricted to <strong>Active</strong> accounts. Your status is currently <strong>{(userStatus || "Pending").toUpperCase()}</strong>.
                </p>
                <div style={{ marginTop: "8px", fontSize: "12px", fontWeight: "600", color: "#78350f" }}>
                  👉 Please contact the administrator to activate your account.
                </div>
              </div>
            </div>
          )}

          {/* Search filter */}
          <div>
            <input
              type="text"
              placeholder="🔍 Search templates by title or keywords..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{
                width: "100%",
                padding: "10px 14px",
                border: "1px solid #cbd5e1",
                borderRadius: "8px",
                fontSize: "13px",
                outline: "none",
              }}
            />
          </div>

          {loading ? (
            <div style={{ padding: "40px", textAlign: "center", color: "#64748b", fontSize: "13px" }}>
              Loading templates from database...
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
              {/* SECTION 1: CLINICAL TEMPLATES (ONLY 1) */}
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
                  <div>
                    <h4 style={{ fontSize: "14px", fontWeight: "700", color: "#0f172a", margin: 0, display: "flex", alignItems: "center", gap: "6px" }}>
                      <span>🩺</span> Clinical Note Template
                    </h4>
                    <p style={{ fontSize: "11px", color: "#64748b", margin: "2px 0 0 0" }}>
                      Select 1 template (or click selected to use system default)
                    </p>
                  </div>
                  {selectedClinicalId && (
                    <button
                      type="button"
                      onClick={() => setSelectedClinicalId(null)}
                      style={{
                        background: "none",
                        border: "none",
                        color: "#ef4444",
                        fontSize: "12px",
                        fontWeight: "600",
                        cursor: "pointer",
                      }}
                    >
                      Use Default (Clear)
                    </button>
                  )}
                </div>

                {filteredClinical.length === 0 ? (
                  <p style={{ fontSize: "12px", color: "#94a3b8", margin: 0 }}>No clinical templates found.</p>
                ) : (
                  <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: "10px" }}>
                    {filteredClinical.map((t) => {
                      const isSelected = selectedClinicalId === t.id;
                      return (
                        <div
                          key={t.id}
                          onClick={() => handleSelectClinical(t.id)}
                          style={{
                            padding: "14px 16px",
                            borderRadius: "8px",
                            border: isSelected ? "2px solid #012537" : "1px solid #e2e8f0",
                            backgroundColor: isSelected ? "#f0f9ff" : "#ffffff",
                            cursor: "pointer",
                            display: "flex",
                            alignItems: "flex-start",
                            gap: "12px",
                            transition: "all 0.15s ease",
                            boxShadow: isSelected ? "0 2px 6px rgba(1, 37, 55, 0.08)" : "none",
                          }}
                        >
                          <input
                            type="radio"
                            name="clinical_template_choice"
                            checked={isSelected}
                            onChange={() => {}}
                            style={{ marginTop: "3px", cursor: "pointer", width: "16px", height: "16px", accentColor: "#012537" }}
                          />
                          <div style={{ flex: 1 }}>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                              <h5 style={{ margin: 0, fontSize: "13px", fontWeight: "700", color: "#0f172a" }}>
                                {t.name}
                              </h5>
                              <span
                                style={{
                                  fontSize: "10px",
                                  fontWeight: "700",
                                  textTransform: "uppercase",
                                  padding: "2px 6px",
                                  borderRadius: "4px",
                                  backgroundColor: isSelected ? "#012537" : "#e0f2fe",
                                  color: isSelected ? "#ffffff" : "#0369a1",
                                }}
                              >
                                {isSelected ? "✓ Active Clinical" : "Clinical"}
                              </span>
                            </div>
                            {t.description && (
                              <p style={{ margin: "4px 0 0 0", fontSize: "12px", color: "#64748b" }}>
                                {t.description}
                              </p>
                            )}

                            {Array.isArray(t.headers) && t.headers.length > 0 && (
                              <div style={{ display: "flex", flexWrap: "wrap", gap: "4px", marginTop: "8px" }}>
                                {t.headers.map((h, i) => (
                                  <span
                                    key={i}
                                    style={{
                                      fontSize: "11px",
                                      backgroundColor: isSelected ? "#bae6fd" : "#f1f5f9",
                                      color: isSelected ? "#0369a1" : "#475569",
                                      padding: "2px 8px",
                                      borderRadius: "4px",
                                      fontWeight: "500",
                                    }}
                                  >
                                    • {h}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* SECTION 2: DISCHARGE TEMPLATES (ONLY 1) */}
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
                  <div>
                    <h4 style={{ fontSize: "14px", fontWeight: "700", color: "#0f172a", margin: 0, display: "flex", alignItems: "center", gap: "6px" }}>
                      <span>📋</span> Discharge Summary Template
                    </h4>
                    <p style={{ fontSize: "11px", color: "#64748b", margin: "2px 0 0 0" }}>
                      Select 1 template (or click selected to use system default)
                    </p>
                  </div>
                  {selectedDischargeId && (
                    <button
                      type="button"
                      onClick={() => setSelectedDischargeId(null)}
                      style={{
                        background: "none",
                        border: "none",
                        color: "#ef4444",
                        fontSize: "12px",
                        fontWeight: "600",
                        cursor: "pointer",
                      }}
                    >
                      Use Default (Clear)
                    </button>
                  )}
                </div>

                {filteredDischarge.length === 0 ? (
                  <p style={{ fontSize: "12px", color: "#94a3b8", margin: 0 }}>No discharge templates found.</p>
                ) : (
                  <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: "10px" }}>
                    {filteredDischarge.map((t) => {
                      const isSelected = selectedDischargeId === t.id;
                      return (
                        <div
                          key={t.id}
                          onClick={() => handleSelectDischarge(t.id)}
                          style={{
                            padding: "14px 16px",
                            borderRadius: "8px",
                            border: isSelected ? "2px solid #012537" : "1px solid #e2e8f0",
                            backgroundColor: isSelected ? "#f0fdf4" : "#ffffff",
                            cursor: "pointer",
                            display: "flex",
                            alignItems: "flex-start",
                            gap: "12px",
                            transition: "all 0.15s ease",
                            boxShadow: isSelected ? "0 2px 6px rgba(1, 37, 55, 0.08)" : "none",
                          }}
                        >
                          <input
                            type="radio"
                            name="discharge_template_choice"
                            checked={isSelected}
                            onChange={() => {}}
                            style={{ marginTop: "3px", cursor: "pointer", width: "16px", height: "16px", accentColor: "#012537" }}
                          />
                          <div style={{ flex: 1 }}>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                              <h5 style={{ margin: 0, fontSize: "13px", fontWeight: "700", color: "#0f172a" }}>
                                {t.name}
                              </h5>
                              <span
                                style={{
                                  fontSize: "10px",
                                  fontWeight: "700",
                                  textTransform: "uppercase",
                                  padding: "2px 6px",
                                  borderRadius: "4px",
                                  backgroundColor: isSelected ? "#012537" : "#dcfce7",
                                  color: isSelected ? "#ffffff" : "#15803d",
                                }}
                              >
                                {isSelected ? "✓ Active Discharge" : "Discharge"}
                              </span>
                            </div>
                            {t.description && (
                              <p style={{ margin: "4px 0 0 0", fontSize: "12px", color: "#64748b" }}>
                                {t.description}
                              </p>
                            )}

                            {Array.isArray(t.headers) && t.headers.length > 0 && (
                              <div style={{ display: "flex", flexWrap: "wrap", gap: "4px", marginTop: "8px" }}>
                                {t.headers.map((h, i) => (
                                  <span
                                    key={i}
                                    style={{
                                      fontSize: "11px",
                                      backgroundColor: isSelected ? "#bbf7d0" : "#f1f5f9",
                                      color: isSelected ? "#166534" : "#475569",
                                      padding: "2px 8px",
                                      borderRadius: "4px",
                                      fontWeight: "500",
                                    }}
                                  >
                                    • {h}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div
          style={{
            padding: "16px 24px",
            borderTop: "1px solid #e2e8f0",
            backgroundColor: "#f8fafc",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            borderBottomLeftRadius: "12px",
            borderBottomRightRadius: "12px",
          }}
        >
          <div style={{ fontSize: "12px", color: "#64748b" }}>
            Active: <strong>{selectedClinicalId ? "1 Clinical" : "Default Clinical"}</strong> • <strong>{selectedDischargeId ? "1 Discharge" : "Default Discharge"}</strong>
          </div>

          <div style={{ display: "flex", gap: "12px" }}>
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
              type="button"
              onClick={handleSave}
              disabled={saving || loading}
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
              {saving ? "Saving Selection..." : "Save Template Selection"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
