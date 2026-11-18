"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import Sidebar from "@/components/Sidebar";
import StatCard from "@/components/StatCard";
import AuthModal from "@/components/AuthModal";
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
  IconShieldCheck,
  IconLock,
} from "@/components/Icons";
import { AuthUser, authFetch, clearSession, getCurrentUser } from "@/lib/auth";

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
  storage_backend: string;
  revoked: boolean;
  consent_granted: boolean;
  on_chain_tx?: string;
  created_at: string;
};

type AuditEvent = {
  id: number;
  record_id_snapshot: string;
  actor: string;
  action: string;
  details: Record<string, unknown>;
  tx_hash?: string;
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
    return d.error ?? (typeof d === "object" ? Object.values(d).flat().join(" ") : "Request failed.");
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
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [view, setView] = useState("dashboard");
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [records, setRecords] = useState<RecordItem[]>([]);
  const [audit, setAudit] = useState<AuditEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<{ type: "success" | "error" | "info"; msg: string } | null>(null);

  useEffect(() => {
    const u = getCurrentUser();
    setCurrentUser(u);
    if (!u || u.role !== "doctor") {
      setShowAuthModal(true);
    }
  }, []);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const [dRes, rRes, aRes] = await Promise.all([
        fetch(`${API}/doctors/`),
        authFetch(`${API}/records/`),
        authFetch(`${API}/audit/`),
      ]);
      if (dRes.ok) {
        const docs: Doctor[] = await dRes.json();
        setDoctors(docs);
      }
      if (rRes.ok) {
        setRecords(await rRes.json());
      } else if (rRes.status === 401) {
        setShowAuthModal(true);
      }
      if (aRes.ok) {
        setAudit(await aRes.json());
      }
    } catch {
      setNotice({ type: "error", msg: "Could not connect to backend server." });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  async function accessRecord(record: RecordItem) {
    setBusy(true);
    setNotice(null);
    try {
      const res = await authFetch(`${API}/records/${record.id}/access/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });

      if (!res.ok) {
        throw new Error(await getError(res));
      }

      // Download decrypted file
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `decrypted_${record.title}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setNotice({
        type: "success",
        msg: `Access Granted! Medical report "${record.title}" decrypted and verified via AES-256-GCM.`,
      });
      await refresh();
    } catch (err) {
      setNotice({
        type: "error",
        msg: err instanceof Error ? err.message : "Access denied by record policy or consent withdrawal.",
      });
      await refresh();
    } finally {
      setBusy(false);
    }
  }

  const handleSignOut = () => {
    clearSession();
    setCurrentUser(null);
    setShowAuthModal(true);
  };

  const activeDoctor = currentUser?.doctor ?? doctors.find((d) => d.name === currentUser?.full_name);
  const accessEvents = audit.filter(
    (e) => e.action === "access_granted" || e.action === "access_denied"
  );
  const activeRecords = records.filter((r) => !r.revoked);
  const depts = new Set(doctors.map((d) => d.specialty)).size;

  return (
    <div className="hg-shell">
      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        defaultRole="doctor"
        message={!currentUser ? "Sign in with a verified clinician account to evaluate policies and decrypt medical records." : undefined}
        onSuccess={(u) => {
          setCurrentUser(u);
          setShowAuthModal(false);
          void refresh();
        }}
      />

      <Sidebar
        portalName="Doctor Portal"
        navItems={NAV_ITEMS}
        activeView={view}
        onNavigate={setView}
        userLabel={currentUser ? `${currentUser.full_name || currentUser.username} (Doctor)` : "Clinician"}
        onSignOut={currentUser ? handleSignOut : undefined}
        onSwitchAccount={() => setShowAuthModal(true)}
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
              {activeDoctor ? `${activeDoctor.name} · ${activeDoctor.specialty}` : "Verified Clinician"}
            </span>
            <button
              className="btn-secondary"
              onClick={() => setShowAuthModal(true)}
              style={{ fontSize: 11, padding: "5px 10px" }}
            >
              Switch Account
            </button>
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
                  <div className="section-subtitle">
                    Authorized clinical records, policy evaluations, and cryptographic audit records
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

              <div className="stat-grid">
                <StatCard
                  icon={<IconFileText size={24} color="var(--teal)" />}
                  number={loading ? "…" : activeRecords.length}
                  label="Accessible Records"
                  trend="Consented & Authorized"
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
                  label="Hospital Specialties"
                  trend="Attribute Authority"
                  borderColor="var(--info)"
                />
                <StatCard
                  icon={<IconAlertCircle size={24} color="var(--danger)" />}
                  number={loading ? "…" : accessEvents.filter((e) => e.action === "access_denied").length}
                  label="Access Denied"
                  trend="Policy / Revocation"
                  borderColor="var(--danger)"
                />
              </div>

              {/* Quick doctor profile */}
              {activeDoctor && (
                <div className="hg-card" style={{ marginBottom: 24, borderLeft: "4px solid #0284c7" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 16, color: "var(--navy)" }}>{activeDoctor.name}</div>
                      <div style={{ fontSize: 13, color: "var(--teal)", marginTop: 2 }}>{activeDoctor.specialty} Department</div>
                    </div>
                    <span
                      style={{
                        padding: "4px 10px",
                        borderRadius: 16,
                        fontSize: 11,
                        fontWeight: 600,
                        background: activeDoctor.verified ? "rgba(16,185,129,0.15)" : "rgba(239,68,68,0.15)",
                        color: activeDoctor.verified ? "#10b981" : "#ef4444",
                      }}
                    >
                      {activeDoctor.verified ? "✓ Verified Clinician" : "⚠ Pending Verification"}
                    </span>
                  </div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 12 }}>
                    {activeDoctor.attributes.map((attr, idx) => (
                      <span key={idx} className="chip">
                        {attr}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Recent Access Activity */}
              <div className="hg-card" style={{ marginTop: 0 }}>
                <div className="section-header" style={{ marginBottom: 16 }}>
                  <div style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 700, fontSize: 16, color: "var(--navy)" }}>
                    Clinical Access Audit Trail
                  </div>
                </div>
                {accessEvents.length === 0 ? (
                  <div style={{ color: "var(--gray-400)", textAlign: "center", padding: "24px 0", fontStyle: "italic" }}>
                    No clinical access attempts recorded yet.
                  </div>
                ) : (
                  <div className="hg-table-wrap">
                    <table className="hg-table">
                      <thead>
                        <tr>
                          <th>Action</th>
                          <th>Record Snapshot</th>
                          <th>Actor</th>
                          <th>Timestamp</th>
                          <th>Blockchain Log</th>
                        </tr>
                      </thead>
                      <tbody>
                        {accessEvents.slice(0, 5).map((e) => (
                          <tr key={e.id}>
                            <td style={{ fontWeight: 600 }}>{e.action.replaceAll("_", " ")}</td>
                            <td style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 12 }}>
                              {e.record_id_snapshot.slice(0, 10)}…
                            </td>
                            <td>{e.actor}</td>
                            <td>{new Date(e.created_at).toLocaleString()}</td>
                            <td>
                              {e.tx_hash ? (
                                <span className="chip" style={{ fontSize: 10, color: "var(--teal)" }}>
                                  {e.tx_hash.slice(0, 10)}…
                                </span>
                              ) : (
                                <span style={{ fontSize: 11, color: "var(--gray-500)" }}>Verified</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </>
          )}

          {/* ── Patient Records View ───────────────────────── */}
          {view === "records" && (
            <>
              <div className="section-header">
                <div>
                  <div className="section-title">Patient Records Directory</div>
                  <div className="section-subtitle">
                    Medical reports matching your specialty with active patient consent
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
                <div style={{ color: "var(--gray-400)", textAlign: "center", padding: 32 }}>Loading…</div>
              ) : (
                <div className="hg-table-wrap">
                  <table className="hg-table">
                    <thead>
                      <tr>
                        <th>Report Title</th>
                        <th>Patient</th>
                        <th>Required Policy</th>
                        <th>Consent Status</th>
                        <th>Storage</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {records.length === 0 ? (
                        <tr>
                          <td colSpan={6} style={{ textAlign: "center", color: "var(--gray-400)", fontStyle: "italic", padding: 32 }}>
                            No medical records currently match your specialty and active patient consent.
                          </td>
                        </tr>
                      ) : (
                        records.map((r) => (
                          <tr key={r.id}>
                            <td>
                              <strong style={{ fontSize: 14 }}>{r.title}</strong>
                              <br />
                              <span style={{ fontSize: 11, color: "var(--gray-500)" }}>
                                ID: {r.id.slice(0, 10)}…
                              </span>
                            </td>
                            <td>{r.patient_name}</td>
                            <td style={{ maxWidth: 220 }}>
                              <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                                {policyText(r.policy)
                                  .split(" AND ")
                                  .map((part, i) => (
                                    <span key={i} className="chip">
                                      {part.trim()}
                                    </span>
                                  ))}
                              </div>
                            </td>
                            <td>
                              <span
                                style={{
                                  padding: "3px 8px",
                                  borderRadius: 12,
                                  fontSize: 11,
                                  fontWeight: 600,
                                  background: r.consent_granted ? "rgba(16,185,129,0.15)" : "rgba(239,68,68,0.15)",
                                  color: r.consent_granted ? "#10b981" : "#ef4444",
                                }}
                              >
                                {r.consent_granted ? "✓ Active Consent" : "✕ Consent Withdrawn"}
                              </span>
                            </td>
                            <td style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: "var(--teal)" }}>
                              {r.ipfs_cid ? `${r.ipfs_cid.slice(0, 10)}…` : "Local Encrypted"}
                            </td>
                            <td>
                              <button
                                className="btn-primary"
                                disabled={busy || r.revoked || !r.consent_granted}
                                onClick={() => void accessRecord(r)}
                                style={{
                                  fontSize: 11,
                                  padding: "6px 12px",
                                  display: "inline-flex",
                                  alignItems: "center",
                                  gap: 4,
                                }}
                                title={
                                  r.revoked
                                    ? "Record is revoked"
                                    : !r.consent_granted
                                    ? "Patient withdrew consent"
                                    : "Decrypt and view"
                                }
                              >
                                <IconDownload size={13} /> Decrypt & View
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

          {/* ── Access History View ────────────────────────── */}
          {view === "history" && (
            <>
              <div className="section-title">Clinical Access Audit Log</div>
              <div className="section-subtitle">Detailed record of all access evaluations and file decryptions</div>
              <div className="hg-table-wrap">
                <table className="hg-table">
                  <thead>
                    <tr>
                      <th>Action</th>
                      <th>Record ID</th>
                      <th>Clinician</th>
                      <th>Timestamp</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {accessEvents.length === 0 ? (
                      <tr>
                        <td colSpan={5} style={{ textAlign: "center", color: "var(--gray-400)", fontStyle: "italic", padding: 32 }}>
                          No access history found.
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
                            <span
                              className={`badge ${
                                e.action === "access_denied" ? "badge-danger" : "badge-success"
                              }`}
                            >
                              {e.action === "access_granted" ? "Decrypted" : "Denied"}
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

          {/* ── My Profile View ────────────────────────────── */}
          {view === "profile" && (
            <>
              <div className="section-title">Clinician Profile & Security Clearance</div>
              <div className="section-subtitle">
                Attributes issued by the Attribute Authority for policy evaluations
              </div>
              {activeDoctor ? (
                <div className="hg-card" style={{ maxWidth: 540 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 20 }}>
                    <div
                      style={{
                        width: 56,
                        height: 56,
                        borderRadius: "50%",
                        background: "rgba(2,132,199,0.15)",
                        border: "2px solid #0284c7",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: 24,
                      }}
                    >
                      🩺
                    </div>
                    <div>
                      <div style={{ fontSize: 18, fontWeight: 700, color: "var(--navy)" }}>{activeDoctor.name}</div>
                      <div style={{ fontSize: 13, color: "var(--teal)" }}>{activeDoctor.specialty} Specialist</div>
                    </div>
                  </div>

                  <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                    <div>
                      <div style={{ fontSize: 12, color: "var(--gray-500)", fontWeight: 600 }}>Authority Verification</div>
                      <div style={{ marginTop: 4 }}>
                        <span className={`badge ${activeDoctor.verified ? "badge-success" : "badge-danger"}`}>
                          {activeDoctor.verified ? "✓ Verified & Active" : "Unverified"}
                        </span>
                      </div>
                    </div>
                    <div>
                      <div style={{ fontSize: 12, color: "var(--gray-500)", fontWeight: 600 }}>Decryption Attributes</div>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 6 }}>
                        {activeDoctor.attributes.map((attr, idx) => (
                          <span key={idx} className="chip">
                            {attr}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="hg-card" style={{ color: "var(--gray-400)", textAlign: "center", padding: 32 }}>
                  No clinician profile attached to this account.
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
