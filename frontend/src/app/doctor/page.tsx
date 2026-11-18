"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import Sidebar from "@/components/Sidebar";
import StatCard from "@/components/StatCard";
import {
  IconDashboard,
  IconFileText,
  IconClock,
  IconUser,
  IconStethoscope,
  IconCheckCircle,
  IconAlertCircle,
  IconDownload,
  IconRefresh,
} from "@/components/Icons";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:8001/api";

type Doctor = {
  id: number;
  name: string;
  specialty: string;
  attributes: string[];
  verified: boolean;
};

type RecordItem = {
  id: string;
  title: string;
  patient_name: string;
  policy: unknown;
  ipfs_cid: string;
  revoked: boolean;
  created_at: string;
};

type AuditEvent = {
  id: number;
  record_id_snapshot: string;
  actor: string;
  action: string;
  details: Record<string, unknown>;
  created_at: string;
};

function policyText(policy: unknown): string {
  if (typeof policy === "string") return policy.replace("Dept:", "");
  if (policy && typeof policy === "object") {
    const node = policy as Record<string, unknown>;
    const [operator, children] = Object.entries(node)[0] ?? [];
    if (Array.isArray(children)) {
      return children.map(policyText).join(operator === "all" ? " AND " : " OR ");
    }
  }
  return String(policy ?? "");
}

async function getError(res: Response): Promise<string> {
  try {
    const d = await res.json();
    return d.error ?? "Request failed.";
  } catch {
    return "Request failed.";
  }
}

const NAV_ITEMS = [
  { label: "Dashboard", icon: <IconDashboard size={18} />, view: "dashboard" },
  { label: "Patient Records", icon: <IconFileText size={18} />, view: "records" },
  { label: "Access History", icon: <IconClock size={18} />, view: "history" },
  { label: "My Profile", icon: <IconUser size={18} />, view: "profile" },
];

export default function DoctorPage() {
  const [view, setView] = useState("dashboard");
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [records, setRecords] = useState<RecordItem[]>([]);
  const [audit, setAudit] = useState<AuditEvent[]>([]);
  const [selectedDoctor, setSelectedDoctor] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<{ type: "success" | "error" | "info"; msg: string } | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const [dRes, rRes, aRes] = await Promise.all([
        fetch(`${API}/doctors/`),
        fetch(`${API}/records/`),
        fetch(`${API}/audit/`),
      ]);
      if (dRes.ok) {
        const docs: Doctor[] = await dRes.json();
        setDoctors(docs);
        setSelectedDoctor((cur) => cur || String(docs[0]?.id ?? ""));
      }
      if (rRes.ok) setRecords(await rRes.json());
      if (aRes.ok) setAudit(await aRes.json());
    } catch {
      setNotice({ type: "error", msg: "Could not connect to backend." });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  async function accessRecord(record: RecordItem) {
    if (!selectedDoctor) {
      setNotice({ type: "error", msg: "Select a doctor first." });
      return;
    }
    setBusy(true);
    setNotice(null);
    try {
      const res = await fetch(`${API}/records/${record.id}/access/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ doctor_id: Number(selectedDoctor) }),
      });
      if (!res.ok) throw new Error(await getError(res));
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = record.title;
      a.click();
      URL.revokeObjectURL(url);
      setNotice({ type: "success", msg: "Access granted! Report decrypted via CP-ABE and downloaded." });
      await refresh();
    } catch (err) {
      setNotice({ type: "error", msg: err instanceof Error ? err.message : "Access failed." });
      await refresh();
    } finally {
      setBusy(false);
    }
  }

  const activeDoctor = doctors.find((d) => String(d.id) === selectedDoctor);
  const accessEvents = audit.filter(
    (e) => e.action === "access_granted" || e.action === "access_denied"
  );
  const activeRecords = records.filter((r) => !r.revoked);
  const depts = new Set(doctors.map((d) => d.specialty)).size;

  return (
    <div className="hg-shell">
      <Sidebar
        portalName="Doctor Portal"
        navItems={NAV_ITEMS}
        activeView={view}
        onNavigate={setView}
        userLabel={activeDoctor ? activeDoctor.name : "Doctor"}
      />
      <div className="hg-main">
        {/* Topbar */}
        <div className="hg-topbar">
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <Link
              href="/"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                padding: "6px 12px",
                borderRadius: 8,
                border: "1px solid var(--gray-200)",
                background: "var(--white)",
                color: "var(--navy)",
                fontSize: 12,
                fontWeight: 600,
                textDecoration: "none",
                transition: "all 0.15s ease",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = "var(--teal)";
                e.currentTarget.style.background = "var(--gray-50)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = "var(--gray-200)";
                e.currentTarget.style.background = "var(--white)";
              }}
            >
              <span>←</span>
              <span>Back to Hub</span>
            </Link>
            <div className="topbar-portal-name">Doctor Portal</div>
          </div>
          <div className="topbar-right">
            <span className="role-badge role-badge-doctor">
              <IconStethoscope size={15} color="#0284c7" />
              Verified Clinician
            </span>
            {/* Doctor selector */}
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 12, color: "var(--gray-500)", fontWeight: 500 }}>Clinician:</span>
              <select
                value={selectedDoctor}
                onChange={(e) => setSelectedDoctor(e.target.value)}
                style={{
                  border: "1px solid var(--gray-200)",
                  borderRadius: 8,
                  padding: "6px 12px",
                  fontSize: 13,
                  fontWeight: 600,
                  background: "white",
                  color: "var(--navy)",
                  outline: "none",
                  cursor: "pointer",
                }}
              >
                {doctors.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name} · {d.specialty}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className="hg-content">
          {notice && (
            <div
              className={`notice ${notice.type === "error" ? "notice-error" : "notice-success"}`}
              style={{
                padding: "12px 16px",
                borderRadius: 8,
                marginBottom: 20,
                background: notice.type === "error" ? "#fee2e2" : "#e0f2fe",
                color: notice.type === "error" ? "#991b1b" : "#0369a1",
                border: `1px solid ${notice.type === "error" ? "#fca5a5" : "#bae6fd"}`,
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <span>{notice.msg}</span>
              <button
                onClick={() => setNotice(null)}
                style={{ background: "transparent", border: "none", cursor: "pointer", color: "inherit", fontWeight: 700 }}
              >
                ✕
              </button>
            </div>
          )}

          {/* ── Dashboard ─────────────────────────────────── */}
          {view === "dashboard" && (
            <>
              <div className="section-header">
                <div>
                  <div className="section-title">Doctor Dashboard</div>
                  <div className="section-subtitle">Clinical activity, clearances, and medical records</div>
                </div>
                <button
                  className="btn-secondary"
                  onClick={() => void refresh()}
                  style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
                >
                  <IconRefresh size={14} /> Refresh
                </button>
              </div>
              <div className="stat-grid">
                <StatCard
                  icon={<IconFileText size={24} color="var(--teal)" />}
                  number={loading ? "…" : activeRecords.length}
                  label="Available Records"
                  trend="CP-ABE Protected"
                  borderColor="var(--teal)"
                />
                <StatCard
                  icon={<IconCheckCircle size={24} color="var(--success)" />}
                  number={loading ? "…" : accessEvents.filter((e) => e.action === "access_granted").length}
                  label="Access Granted"
                  trend="Decrypted Successfully"
                  borderColor="var(--success)"
                />
                <StatCard
                  icon={<IconStethoscope size={24} color="var(--info)" />}
                  number={loading ? "…" : depts}
                  label="Specialties"
                  trend="Hospital Departments"
                  borderColor="var(--info)"
                />
                <StatCard
                  icon={<IconAlertCircle size={24} color="var(--danger)" />}
                  number={loading ? "…" : accessEvents.filter((e) => e.action === "access_denied").length}
                  label="Access Denied"
                  trend="Policy Mismatch"
                  borderColor="var(--danger)"
                />
              </div>

              {/* Quick doctor profile */}
              {activeDoctor && (
                <div className="hg-card">
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                    <div>
                      <div
                        style={{
                          fontFamily: "'Plus Jakarta Sans', sans-serif",
                          fontWeight: 700,
                          fontSize: 18,
                          color: "var(--navy)",
                          marginBottom: 4,
                        }}
                      >
                        {activeDoctor.name}
                      </div>
                      <div style={{ color: "var(--gray-500)", fontSize: 13, marginBottom: 12 }}>
                        Specialty: <strong>{activeDoctor.specialty}</strong>
                      </div>
                      <div className="chips">
                        {activeDoctor.attributes.map((a) => (
                          <span key={a} className="chip">
                            {a}
                          </span>
                        ))}
                      </div>
                    </div>
                    <span className={`badge ${activeDoctor.verified ? "badge-success" : "badge-warning"}`}>
                      {activeDoctor.verified ? "✓ Verified Credential" : "Pending"}
                    </span>
                  </div>
                </div>
              )}
            </>
          )}

          {/* ── Patient Records ───────────────────────────── */}
          {view === "records" && (
            <>
              <div className="section-header">
                <div>
                  <div className="section-title">Patient Records</div>
                  <div className="section-subtitle">
                    Select a record to request on-demand decryption based on your verified CP-ABE attributes
                  </div>
                </div>
                <button
                  className="btn-secondary"
                  onClick={() => void refresh()}
                  style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
                >
                  <IconRefresh size={14} /> Refresh
                </button>
              </div>

              {loading ? (
                <div style={{ color: "var(--gray-400)", textAlign: "center", padding: 32 }}>Loading records…</div>
              ) : (
                <div className="hg-table-wrap">
                  <table className="hg-table">
                    <thead>
                      <tr>
                        <th>Report Title</th>
                        <th>Patient Name</th>
                        <th>Access Policy Logic</th>
                        <th>Storage CID</th>
                        <th>Status</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {records.length === 0 ? (
                        <tr>
                          <td colSpan={6} style={{ textAlign: "center", color: "var(--gray-400)", fontStyle: "italic", padding: 32 }}>
                            No medical records found in the database.
                          </td>
                        </tr>
                      ) : (
                        records.map((r) => (
                          <tr key={r.id}>
                            <td>
                              <strong style={{ fontSize: 14 }}>{r.title}</strong>
                              <br />
                              <span style={{ fontSize: 11, color: "var(--gray-400)" }}>
                                {new Date(r.created_at).toLocaleDateString()}
                              </span>
                            </td>
                            <td>{r.patient_name}</td>
                            <td style={{ maxWidth: 220 }}>
                              <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                                {policyText(r.policy)
                                  .split(" AND ")
                                  .map((p, i) => (
                                    <span key={i} className="chip">
                                      {p.trim()}
                                    </span>
                                  ))}
                              </div>
                            </td>
                            <td style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: "var(--teal)" }}>
                              {r.ipfs_cid ? `${r.ipfs_cid.slice(0, 12)}…` : "Local Encrypted"}
                            </td>
                            <td>
                              <span className={`badge ${r.revoked ? "badge-danger" : "badge-success"}`}>
                                {r.revoked ? "Revoked" : "Active"}
                              </span>
                            </td>
                            <td>
                              <button
                                className="btn-primary"
                                disabled={busy || r.revoked}
                                onClick={() => void accessRecord(r)}
                                style={{
                                  fontSize: 11,
                                  padding: "6px 12px",
                                  display: "inline-flex",
                                  alignItems: "center",
                                  gap: 4,
                                }}
                              >
                                <IconDownload size={13} /> Decrypt & Access
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}

          {/* ── Access History ────────────────────────────── */}
          {view === "history" && (
            <>
              <div className="section-title">Clinical Access Audit Trail</div>
              <div className="section-subtitle">Historical record decryption attempts and security policy outcomes</div>
              <div className="hg-table-wrap">
                <table className="hg-table">
                  <thead>
                    <tr>
                      <th>Action</th>
                      <th>Record ID</th>
                      <th>Doctor</th>
                      <th>Timestamp</th>
                      <th>Outcome</th>
                    </tr>
                  </thead>
                  <tbody>
                    {accessEvents.length === 0 ? (
                      <tr>
                        <td colSpan={5} style={{ textAlign: "center", color: "var(--gray-400)", fontStyle: "italic", padding: 32 }}>
                          No access events logged yet.
                        </td>
                      </tr>
                    ) : (
                      accessEvents.map((e) => (
                        <tr key={e.id}>
                          <td style={{ fontWeight: 600, textTransform: "capitalize" }}>
                            {e.action.replaceAll("_", " ")}
                          </td>
                          <td style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 12 }}>
                            {e.record_id_snapshot.slice(0, 10)}…
                          </td>
                          <td>{e.actor}</td>
                          <td>{new Date(e.created_at).toLocaleString()}</td>
                          <td>
                            <span className={`badge ${e.action === "access_granted" ? "badge-success" : "badge-danger"}`}>
                              <span className={`event-dot ${e.action}`} style={{ width: 6, height: 6 }} />
                              {e.action === "access_granted" ? "Decrypted (Permitted)" : "Access Denied"}
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {/* ── My Profile ────────────────────────────────── */}
          {view === "profile" && (
            <>
              <div className="section-title">Doctor Profile & Clearances</div>
              <div className="section-subtitle">Verified clinical credentials and CP-ABE cryptographic attributes</div>
              {activeDoctor ? (
                <div className="hg-card" style={{ maxWidth: 540 }}>
                  <div style={{ display: "flex", gap: 18, alignItems: "center", marginBottom: 24 }}>
                    <div
                      style={{
                        width: 56,
                        height: 56,
                        borderRadius: 14,
                        background: "linear-gradient(135deg, var(--teal), var(--teal-muted))",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontFamily: "'Plus Jakarta Sans', sans-serif",
                        fontWeight: 800,
                        fontSize: 22,
                        color: "white",
                      }}
                    >
                      {activeDoctor.name.replace("Dr. ", "").charAt(0)}
                    </div>
                    <div>
                      <div
                        style={{
                          fontFamily: "'Plus Jakarta Sans', sans-serif",
                          fontWeight: 700,
                          fontSize: 20,
                          color: "var(--navy)",
                        }}
                      >
                        {activeDoctor.name}
                      </div>
                      <div style={{ color: "var(--gray-500)", fontSize: 14 }}>{activeDoctor.specialty}</div>
                    </div>
                    <span
                      className={`badge ${activeDoctor.verified ? "badge-success" : "badge-warning"}`}
                      style={{ marginLeft: "auto" }}
                    >
                      {activeDoctor.verified ? "✓ Verified Credential" : "Unverified"}
                    </span>
                  </div>

                  <div style={{ borderTop: "1px solid var(--gray-200)", paddingTop: 18 }}>
                    <div
                      style={{
                        fontSize: 12,
                        fontWeight: 600,
                        color: "var(--gray-500)",
                        textTransform: "uppercase",
                        letterSpacing: 0.5,
                        marginBottom: 10,
                      }}
                    >
                      Attributes & Clearances
                    </div>
                    <div className="chips">
                      {activeDoctor.attributes.map((a) => (
                        <span key={a} className="chip" style={{ fontSize: 12, padding: "5px 14px" }}>
                          {a}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="hg-card" style={{ color: "var(--gray-400)", textAlign: "center" }}>
                  No doctor selected. Please select one from the topbar.
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
