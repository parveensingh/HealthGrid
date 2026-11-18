"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useState } from "react";
import Sidebar from "@/components/Sidebar";
import StatCard from "@/components/StatCard";
import {
  IconDashboard,
  IconFileText,
  IconUploadCloud,
  IconLock,
  IconShieldCheck,
  IconBell,
  IconClock,
  IconCheckCircle,
  IconAlertCircle,
  IconRefresh,
  IconEye,
} from "@/components/Icons";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:8001/api";

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

type Notification = {
  id: number;
  title: string;
  message: string;
  is_read: boolean;
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
  { label: "My Records", icon: <IconFileText size={18} />, view: "records" },
  { label: "Upload Report", icon: <IconUploadCloud size={18} />, view: "upload" },
  { label: "Access Control", icon: <IconLock size={18} />, view: "access" },
  { label: "Notifications", icon: <IconBell size={18} />, view: "notifications" },
];

export default function PatientPage() {
  const [view, setView] = useState("dashboard");
  const [records, setRecords] = useState<RecordItem[]>([]);
  const [audit, setAudit] = useState<AuditEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<{ type: "success" | "error" | "info"; msg: string } | null>(null);

  // Upload form state
  const [title, setTitle] = useState("");
  const [department, setDepartment] = useState("Cardiology");
  const [operator, setOperator] = useState<"all" | "any">("all");
  const [file, setFile] = useState<File | null>(null);

  // Notifications
  const [notifEmail, setNotifEmail] = useState("");
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [notifLoading, setNotifLoading] = useState(false);

  // History modal
  const [historyRecord, setHistoryRecord] = useState<RecordItem | null>(null);
  const [historyEvents, setHistoryEvents] = useState<AuditEvent[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const [rRes, aRes] = await Promise.all([
        fetch(`${API}/records/`),
        fetch(`${API}/audit/`),
      ]);
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

  async function uploadRecord(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!file) {
      setNotice({ type: "error", msg: "Choose a report file first." });
      return;
    }
    setBusy(true);
    setNotice(null);
    const policy =
      operator === "all"
        ? { all: ["Role:Doctor", `Dept:${department}`] }
        : { any: [{ all: ["Role:Doctor", `Dept:${department}`] }, "Emergency:True"] };

    const body = new FormData();
    body.set("title", title);
    body.set("patient_name", "Demo Patient");
    body.set("policy", JSON.stringify(policy));
    body.set("file", file);

    try {
      const res = await fetch(`${API}/records/`, { method: "POST", body });
      if (!res.ok) throw new Error(await getError(res));
      setTitle("");
      setFile(null);
      (e.currentTarget as HTMLFormElement).reset();
      setNotice({ type: "success", msg: "Encrypted report uploaded and secured with CP-ABE policy." });
      setView("records");
      await refresh();
    } catch (err) {
      setNotice({ type: "error", msg: err instanceof Error ? err.message : "Upload failed." });
    } finally {
      setBusy(false);
    }
  }

  async function revokeRecord(record: RecordItem) {
    setBusy(true);
    try {
      const res = await fetch(`${API}/records/${record.id}/revoke/`, { method: "POST" });
      if (!res.ok) throw new Error(await getError(res));
      setNotice({ type: "success", msg: `Access revoked for "${record.title}".` });
      await refresh();
    } catch (err) {
      setNotice({ type: "error", msg: err instanceof Error ? err.message : "Revocation failed." });
    } finally {
      setBusy(false);
    }
  }

  async function viewHistory(record: RecordItem) {
    setHistoryRecord(record);
    setHistoryLoading(true);
    try {
      const res = await fetch(`${API}/records/${record.id}/history/`);
      if (res.ok) setHistoryEvents(await res.json());
      else setHistoryEvents([]);
    } catch {
      setHistoryEvents([]);
    } finally {
      setHistoryLoading(false);
    }
  }

  async function fetchNotifications() {
    if (!notifEmail.trim()) return;
    setNotifLoading(true);
    try {
      const res = await fetch(`${API}/education/notifications/${encodeURIComponent(notifEmail)}/`);
      if (res.ok) setNotifications(await res.json());
      else setNotifications([]);
    } catch {
      setNotifications([]);
    } finally {
      setNotifLoading(false);
    }
  }

  async function markRead(id: number) {
    await fetch(`${API}/education/notifications/${id}/read/`, { method: "POST" });
    setNotifications((prev) => (prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))));
  }

  const totalRecords = records.length;
  const activeRecords = records.filter((r) => !r.revoked).length;
  const revokedRecords = records.filter((r) => r.revoked).length;
  const recentAudit = audit.slice(0, 5);

  return (
    <div className="hg-shell">
      <Sidebar
        portalName="Patient Portal"
        navItems={NAV_ITEMS}
        activeView={view}
        onNavigate={setView}
        userLabel="Verified Patient"
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
            <div className="topbar-portal-name">Patient Portal</div>
          </div>
          <div className="topbar-right">
            <span className="role-badge">
              <IconShieldCheck size={15} color="var(--teal)" />
              Verified Patient
            </span>
            <button className="notification-bell" onClick={() => setView("notifications")} title="Notifications">
              <IconBell size={18} color="var(--gray-700)" />
              {notifications.filter((n) => !n.is_read).length > 0 && <span className="notification-dot" />}
            </button>
          </div>
        </div>

        <div className="hg-content">
          {/* Notice */}
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
                  <div className="section-title">Dashboard</div>
                  <div className="section-subtitle">Your personal health records and cryptographic access overview</div>
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
                  number={loading ? "…" : totalRecords}
                  label="Total Records"
                  trend="Stored On IPFS"
                  borderColor="var(--teal)"
                />
                <StatCard
                  icon={<IconCheckCircle size={24} color="var(--success)" />}
                  number={loading ? "…" : activeRecords}
                  label="Active Records"
                  trend="Decryption Permitted"
                  borderColor="var(--success)"
                />
                <StatCard
                  icon={<IconAlertCircle size={24} color="var(--danger)" />}
                  number={loading ? "…" : revokedRecords}
                  label="Revoked Records"
                  trend="Access Suspended"
                  borderColor="var(--danger)"
                />
                <StatCard
                  icon={<IconClock size={24} color="var(--info)" />}
                  number={loading ? "…" : recentAudit.length}
                  label="Recent Events"
                  trend="Audit Logged"
                  borderColor="var(--info)"
                />
              </div>

              <div className="hg-card" style={{ marginTop: 0 }}>
                <div className="section-header" style={{ marginBottom: 16 }}>
                  <div style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 700, fontSize: 16, color: "var(--navy)" }}>
                    Recent Audit Activity
                  </div>
                </div>
                {recentAudit.length === 0 ? (
                  <div style={{ color: "var(--gray-400)", textAlign: "center", padding: "24px 0", fontStyle: "italic" }}>
                    No recent activity.
                  </div>
                ) : (
                  <div className="hg-table-wrap">
                    <table className="hg-table">
                      <thead>
                        <tr>
                          <th>Action</th>
                          <th>Record ID</th>
                          <th>Actor</th>
                          <th>Date</th>
                          <th>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {recentAudit.map((e) => (
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
                                  e.action === "access_denied"
                                    ? "badge-danger"
                                    : e.action === "revoked"
                                    ? "badge-warning"
                                    : "badge-success"
                                }`}
                              >
                                <span className={`event-dot ${e.action}`} style={{ width: 6, height: 6 }} />
                                {e.action.replaceAll("_", " ")}
                              </span>
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

          {/* ── My Records ────────────────────────────────── */}
          {view === "records" && (
            <>
              <div className="section-header">
                <div>
                  <div className="section-title">My Records</div>
                  <div className="section-subtitle">All your encrypted medical files secured with CP-ABE policies</div>
                </div>
                <button
                  className="btn-primary"
                  onClick={() => setView("upload")}
                  style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
                >
                  <IconUploadCloud size={16} /> Upload New Report
                </button>
              </div>
              {loading ? (
                <div style={{ color: "var(--gray-400)", textAlign: "center", padding: 32 }}>Loading…</div>
              ) : (
                <div className="hg-table-wrap">
                  <table className="hg-table">
                    <thead>
                      <tr>
                        <th>Title</th>
                        <th>Uploaded</th>
                        <th>Access Policy</th>
                        <th>IPFS CID</th>
                        <th>Status</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {records.length === 0 ? (
                        <tr>
                          <td colSpan={6} style={{ textAlign: "center", color: "var(--gray-400)", fontStyle: "italic", padding: 32 }}>
                            No records yet. Upload your first medical report.
                          </td>
                        </tr>
                      ) : (
                        records.map((r) => (
                          <tr key={r.id}>
                            <td>
                              <strong style={{ fontSize: 14 }}>{r.title}</strong>
                              <br />
                              <span style={{ fontSize: 11, color: "var(--gray-500)" }}>{r.patient_name}</span>
                            </td>
                            <td>{new Date(r.created_at).toLocaleDateString()}</td>
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
                            <td style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: "var(--teal)" }}>
                              {r.ipfs_cid ? `${r.ipfs_cid.slice(0, 12)}…` : "Local Encrypted"}
                            </td>
                            <td>
                              <span className={`badge ${r.revoked ? "badge-danger" : "badge-success"}`}>
                                {r.revoked ? "Revoked" : "Active"}
                              </span>
                            </td>
                            <td>
                              <div style={{ display: "flex", gap: 8 }}>
                                <button
                                  className="btn-secondary"
                                  onClick={() => void viewHistory(r)}
                                  style={{
                                    fontSize: 11,
                                    padding: "5px 10px",
                                    display: "inline-flex",
                                    alignItems: "center",
                                    gap: 4,
                                  }}
                                  title="View Access History"
                                >
                                  <IconEye size={13} /> History
                                </button>
                                {!r.revoked && (
                                  <button
                                    className="btn-danger"
                                    disabled={busy}
                                    onClick={() => void revokeRecord(r)}
                                    style={{ fontSize: 11, padding: "5px 10px" }}
                                  >
                                    Revoke
                                  </button>
                                )}
                              </div>
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

          {/* ── Upload Report ─────────────────────────────── */}
          {view === "upload" && (
            <>
              <div className="section-title">Upload & Protect Report</div>
              <div className="section-subtitle">
                File is encrypted locally using AES-256-GCM and stored with an IPFS CID
              </div>
              <div className="hg-card" style={{ maxWidth: 620 }}>
                <form onSubmit={uploadRecord} style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                  <div>
                    <label className="hg-label">Report Title</label>
                    <input
                      required
                      className="hg-input"
                      placeholder="e.g. Echocardiogram_Report_2026.pdf"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                    />
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                    <div>
                      <label className="hg-label">Department</label>
                      <select
                        className="hg-select"
                        value={department}
                        onChange={(e) => setDepartment(e.target.value)}
                      >
                        <option>Cardiology</option>
                        <option>Dermatology</option>
                        <option>Emergency</option>
                        <option>Neurology</option>
                        <option>Oncology</option>
                        <option>Pediatrics</option>
                        <option>Radiology</option>
                        <option>Surgery</option>
                      </select>
                    </div>
                    <div>
                      <label className="hg-label">Policy Logic</label>
                      <select
                        className="hg-select"
                        value={operator}
                        onChange={(e) => setOperator(e.target.value as "all" | "any")}
                      >
                        <option value="all">Require Role & Department</option>
                        <option value="any">Allow Doctor OR Emergency Override</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="hg-label">Select Medical Report File</label>
                    <input
                      className="hg-input"
                      type="file"
                      required
                      onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                    />
                  </div>
                  <div
                    style={{
                      padding: "14px 18px",
                      background: "rgba(8,145,178,0.06)",
                      border: "1px solid rgba(8,145,178,0.2)",
                      borderRadius: 8,
                      fontSize: 12,
                      color: "var(--teal-muted)",
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                    }}
                  >
                    <IconShieldCheck size={20} color="var(--teal)" />
                    <span>
                      This file will be encrypted with AES-256-GCM before upload. Access permissions are evaluated against
                      the smart contract attribute policy.
                    </span>
                  </div>
                  <div style={{ display: "flex", gap: 12 }}>
                    <button
                      type="submit"
                      className="btn-primary"
                      disabled={busy}
                      style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
                    >
                      <IconUploadCloud size={16} />
                      {busy ? "Encrypting & Storing…" : "Encrypt & Upload Report"}
                    </button>
                    <button type="button" className="btn-secondary" onClick={() => setView("records")}>
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            </>
          )}

          {/* ── Access Control ────────────────────────────── */}
          {view === "access" && (
            <>
              <div className="section-title">Patient Access & Consent Management</div>
              <div className="section-subtitle">
                Revoke access permissions or modify CP-ABE decryption authorizations
              </div>
              <div className="hg-table-wrap">
                <table className="hg-table">
                  <thead>
                    <tr>
                      <th>Record</th>
                      <th>Policy Rule</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {records.length === 0 ? (
                      <tr>
                        <td colSpan={4} style={{ textAlign: "center", color: "var(--gray-400)", fontStyle: "italic", padding: 32 }}>
                          No records to manage.
                        </td>
                      </tr>
                    ) : (
                      records.map((r) => (
                        <tr key={r.id}>
                          <td>
                            <strong style={{ fontSize: 14 }}>{r.title}</strong>
                            <br />
                            <span style={{ fontSize: 11, color: "var(--gray-500)" }}>
                              Uploaded: {new Date(r.created_at).toLocaleDateString()}
                            </span>
                          </td>
                          <td>
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
                            <span className={`badge ${r.revoked ? "badge-danger" : "badge-success"}`}>
                              {r.revoked ? "Revoked" : "Active"}
                            </span>
                          </td>
                          <td>
                            {!r.revoked && (
                              <button
                                className="btn-danger"
                                disabled={busy}
                                onClick={() => void revokeRecord(r)}
                                style={{ fontSize: 11, padding: "6px 12px" }}
                              >
                                Revoke Access
                              </button>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {/* ── Notifications ─────────────────────────────── */}
          {view === "notifications" && (
            <>
              <div className="section-title">Patient Notifications</div>
              <div className="section-subtitle">Medical report activity and access alert history</div>
              <div className="hg-card" style={{ maxWidth: 480, marginBottom: 24 }}>
                <div style={{ display: "flex", gap: 12 }}>
                  <input
                    className="hg-input"
                    type="email"
                    placeholder="Enter email to check notifications"
                    value={notifEmail}
                    onChange={(e) => setNotifEmail(e.target.value)}
                    style={{ flex: 1 }}
                  />
                  <button
                    className="btn-primary"
                    onClick={() => void fetchNotifications()}
                    disabled={notifLoading}
                    style={{ fontSize: 13 }}
                  >
                    {notifLoading ? "Loading…" : "Check"}
                  </button>
                </div>
              </div>

              {notifications.length === 0 ? (
                <div className="hg-card" style={{ color: "var(--gray-400)", textAlign: "center", padding: 32 }}>
                  No notifications found for this email address.
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  {notifications.map((n) => (
                    <div
                      key={n.id}
                      className="hg-card"
                      style={{
                        padding: 16,
                        borderLeft: `4px solid ${n.is_read ? "var(--gray-300)" : "var(--teal)"}`,
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                      }}
                    >
                      <div>
                        <div style={{ fontWeight: 600, fontSize: 14 }}>{n.title}</div>
                        <div style={{ fontSize: 12, color: "var(--gray-600)", marginTop: 4 }}>{n.message}</div>
                        <div style={{ fontSize: 11, color: "var(--gray-400)", marginTop: 4 }}>
                          {new Date(n.created_at).toLocaleString()}
                        </div>
                      </div>
                      {!n.is_read && (
                        <button
                          className="btn-secondary"
                          onClick={() => void markRead(n.id)}
                          style={{ fontSize: 11, padding: "4px 10px" }}
                        >
                          Mark Read
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          {/* ── History Modal ──────────────────────────────── */}
          {historyRecord && (
            <div
              style={{
                position: "fixed",
                inset: 0,
                background: "rgba(9,30,47,0.65)",
                backdropFilter: "blur(4px)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                zIndex: 200,
                padding: 16,
              }}
            >
              <div className="hg-card" style={{ maxWidth: 580, width: "100%", maxHeight: "85vh", overflowY: "auto" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                  <div>
                    <h3 style={{ fontSize: 17, color: "var(--navy)" }}>Audit Trail & Access History</h3>
                    <div style={{ fontSize: 12, color: "var(--gray-500)", marginTop: 2 }}>{historyRecord.title}</div>
                  </div>
                  <button
                    onClick={() => setHistoryRecord(null)}
                    style={{ background: "transparent", border: "none", cursor: "pointer", fontSize: 18 }}
                  >
                    ✕
                  </button>
                </div>

                {historyLoading ? (
                  <div style={{ textAlign: "center", padding: 32, color: "var(--gray-400)" }}>Loading history…</div>
                ) : historyEvents.length === 0 ? (
                  <div style={{ textAlign: "center", padding: 24, color: "var(--gray-400)", fontStyle: "italic" }}>
                    No audit records logged for this file yet.
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    {historyEvents.map((evt) => (
                      <div
                        key={evt.id}
                        style={{
                          padding: 12,
                          borderRadius: 8,
                          background: "var(--gray-50)",
                          border: "1px solid var(--gray-200)",
                        }}
                      >
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <span
                            className={`badge ${
                              evt.action === "access_denied"
                                ? "badge-danger"
                                : evt.action === "revoked"
                                ? "badge-warning"
                                : "badge-success"
                            }`}
                          >
                            {evt.action.replaceAll("_", " ")}
                          </span>
                          <span style={{ fontSize: 11, color: "var(--gray-400)" }}>
                            {new Date(evt.created_at).toLocaleString()}
                          </span>
                        </div>
                        <div style={{ fontSize: 12, color: "var(--navy)", marginTop: 6 }}>
                          Actor: <strong>{evt.actor}</strong>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
