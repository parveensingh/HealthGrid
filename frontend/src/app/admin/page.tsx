"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useState } from "react";
import Sidebar from "@/components/Sidebar";
import StatCard from "@/components/StatCard";
import {
  IconDashboard,
  IconStethoscope,
  IconFileText,
  IconActivity,
  IconGraduationCap,
  IconDatabase,
  IconShieldCheck,
  IconCheckCircle,
  IconRefresh,
  IconSettings,
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

type EduUser = {
  id: number;
  name: string;
  email: string;
  role: string;
  institution: string;
  status: string;
  created_at: string;
};

type DatasetRequest = {
  id: number;
  requester: { name: string; email: string } | number;
  specialty: { name: string } | number | null;
  research_objective: string;
  status: string;
  created_at: string;
};

type TrainingProgram = {
  id: number;
  name: string;
  description: string;
  specialty: { name: string } | number | null;
  is_active: boolean;
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
  try { const d = await res.json(); return d.error ?? "Request failed."; } catch { return "Request failed."; }
}

const NAV_ITEMS = [
  { label: "Dashboard", icon: <IconDashboard size={18} />, view: "dashboard" },
  { label: "Doctors", icon: <IconStethoscope size={18} />, view: "doctors" },
  { label: "Records", icon: <IconFileText size={18} />, view: "records" },
  { label: "Audit Log", icon: <IconActivity size={18} />, view: "audit" },
  { label: "Education Users", icon: <IconGraduationCap size={18} />, view: "edu-users" },
  { label: "Dataset Requests", icon: <IconDatabase size={18} />, view: "datasets" },
  { label: "Training Programs", icon: <IconShieldCheck size={18} />, view: "programs" },
];

export default function AdminPage() {
  const [view, setView] = useState("dashboard");
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [records, setRecords] = useState<RecordItem[]>([]);
  const [audit, setAudit] = useState<AuditEvent[]>([]);
  const [eduUsers, setEduUsers] = useState<EduUser[]>([]);
  const [datasets, setDatasets] = useState<DatasetRequest[]>([]);
  const [programs, setPrograms] = useState<TrainingProgram[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<{ type: "success" | "error" | "info"; msg: string } | null>(null);

  // Doctor form
  const [showDoctorForm, setShowDoctorForm] = useState(false);
  const [newDrName, setNewDrName] = useState("");
  const [newDrSpecialty, setNewDrSpecialty] = useState("Cardiology");
  const [newDrAttrs, setNewDrAttrs] = useState("Role:Doctor");

  // Program form
  const [showProgForm, setShowProgForm] = useState(false);
  const [newProgName, setNewProgName] = useState("");
  const [newProgDesc, setNewProgDesc] = useState("");

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const [dRes, rRes, aRes] = await Promise.all([
        fetch(`${API}/doctors/`),
        fetch(`${API}/records/`),
        fetch(`${API}/audit/`),
      ]);
      if (dRes.ok) setDoctors(await dRes.json());
      if (rRes.ok) setRecords(await rRes.json());
      if (aRes.ok) setAudit(await aRes.json());

      // Try new endpoints; they may not be ready yet
      const [euRes, drRes, prRes] = await Promise.allSettled([
        fetch(`${API}/admin/education/users/`),
        fetch(`${API}/admin/education/dataset-requests/`),
        fetch(`${API}/admin/education/programs/`),
      ]);
      if (euRes.status === "fulfilled" && euRes.value.ok) setEduUsers(await euRes.value.json());
      if (drRes.status === "fulfilled" && drRes.value.ok) setDatasets(await drRes.value.json());
      if (prRes.status === "fulfilled" && prRes.value.ok) setPrograms(await prRes.value.json());
    } catch {
      setNotice({ type: "error", msg: "Could not connect to backend." });
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { void refresh(); }, [refresh]);

  async function revokeRecord(record: RecordItem) {
    setBusy(true); setNotice(null);
    try {
      const res = await fetch(`${API}/records/${record.id}/revoke/`, { method: "POST" });
      if (!res.ok) throw new Error(await getError(res));
      setNotice({ type: "success", msg: `Record "${record.title}" revoked.` });
      await refresh();
    } catch (err) {
      setNotice({ type: "error", msg: err instanceof Error ? err.message : "Revocation failed." });
    } finally { setBusy(false); }
  }

  async function addDoctor(e: FormEvent<HTMLFormElement>) {
    e.preventDefault(); setBusy(true); setNotice(null);
    try {
      const attrs = newDrAttrs.split(",").map((s) => s.trim()).filter(Boolean);
      const res = await fetch(`${API}/attribute-authority/doctors/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newDrName, specialty: newDrSpecialty, attributes: attrs }),
      });
      if (!res.ok) throw new Error(await getError(res));
      setNotice({ type: "success", msg: "Doctor added successfully." });
      setNewDrName(""); setNewDrAttrs("Role:Doctor"); setShowDoctorForm(false);
      await refresh();
    } catch (err) {
      setNotice({ type: "error", msg: err instanceof Error ? err.message : "Failed to add doctor." });
    } finally { setBusy(false); }
  }

  async function verifyDoctor(id: number, action: "verify" | "unverify") {
    setBusy(true); setNotice(null);
    try {
      const res = await fetch(`${API}/attribute-authority/doctors/${id}/${action}/`, { method: "POST" });
      if (!res.ok) throw new Error(await getError(res));
      setNotice({ type: "success", msg: `Doctor ${action === "verify" ? "verified" : "unverified"}.` });
      await refresh();
    } catch (err) {
      setNotice({ type: "error", msg: err instanceof Error ? err.message : "Action failed." });
    } finally { setBusy(false); }
  }

  async function eduUserAction(id: number, action: "verify" | "reject") {
    setBusy(true); setNotice(null);
    try {
      const res = await fetch(`${API}/admin/education/users/${id}/${action}/`, { method: "POST" });
      if (!res.ok) throw new Error(await getError(res));
      setNotice({ type: "success", msg: `User ${action}ed.` });
      await refresh();
    } catch (err) {
      setNotice({ type: "error", msg: err instanceof Error ? err.message : "Action failed." });
    } finally { setBusy(false); }
  }

  async function datasetAction(id: number, action: "approve" | "reject") {
    setBusy(true); setNotice(null);
    try {
      const res = await fetch(`${API}/admin/education/dataset-requests/${id}/${action}/`, { method: "POST" });
      if (!res.ok) throw new Error(await getError(res));
      setNotice({ type: "success", msg: `Dataset request ${action}ed.` });
      await refresh();
    } catch (err) {
      setNotice({ type: "error", msg: err instanceof Error ? err.message : "Action failed." });
    } finally { setBusy(false); }
  }

  async function addProgram(e: FormEvent<HTMLFormElement>) {
    e.preventDefault(); setBusy(true); setNotice(null);
    try {
      const res = await fetch(`${API}/admin/education/programs/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newProgName, description: newProgDesc }),
      });
      if (!res.ok) throw new Error(await getError(res));
      setNotice({ type: "success", msg: "Training program created." });
      setNewProgName(""); setNewProgDesc(""); setShowProgForm(false);
      await refresh();
    } catch (err) {
      setNotice({ type: "error", msg: err instanceof Error ? err.message : "Failed to create program." });
    } finally { setBusy(false); }
  }

  // Compute audit chart data
  const actionCounts: Record<string, number> = {};
  audit.forEach((e) => { actionCounts[e.action] = (actionCounts[e.action] ?? 0) + 1; });
  const maxCount = Math.max(...Object.values(actionCounts), 1);

  const activeRecords = records.filter((r) => !r.revoked).length;
  const pendingEdu = eduUsers.filter((u) => u.status === "pending").length;
  const pendingDatasets = datasets.filter((d) => d.status === "pending").length;

  return (
    <div className="hg-shell">
      <Sidebar
        portalName="Admin Console"
        navItems={NAV_ITEMS}
        activeView={view}
        onNavigate={setView}
        userLabel="Administrator"
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
            <div className="topbar-portal-name">Admin Console</div>
          </div>
          <div className="topbar-right">
            <span className="role-badge role-badge-admin">
              <IconSettings size={15} color="var(--navy)" />
              System Administrator
            </span>
            <button className="notification-bell" title="Pending items">
              🔔
              {(pendingEdu + pendingDatasets) > 0 && <span className="notification-dot" />}
            </button>
          </div>
        </div>

        <div className="hg-content">
          {notice && (
            <div className={`hg-notice hg-notice-${notice.type}`} role="status">
              {notice.msg}
            </div>
          )}

          {/* ── Dashboard ─────────────────────────────────── */}
          {view === "dashboard" && (
            <>
              <div className="section-header">
                <div>
                  <div className="section-title">System Dashboard</div>
                  <div className="section-subtitle">HealthGrid platform overview</div>
                </div>
                <button className="btn-secondary" onClick={() => void refresh()}>↻ Refresh</button>
              </div>

              <div className="stat-grid">
                <StatCard icon={<IconStethoscope size={24} color="var(--teal)" />} number={loading ? "…" : doctors.length} label="Total Doctors" trend="Verified Staff" />
                <StatCard icon={<IconFileText size={24} color="var(--info)" />} number={loading ? "…" : records.length} label="Total Records" trend="CP-ABE Encrypted" />
                <StatCard icon={<IconCheckCircle size={24} color="var(--success)" />} number={loading ? "…" : activeRecords} label="Active Records" borderColor="var(--success)" />
                <StatCard icon={<IconActivity size={24} color="var(--teal-light)" />} number={loading ? "…" : audit.length} label="Audit Events" borderColor="var(--teal)" />
                <StatCard icon={<IconGraduationCap size={24} color="var(--warning)" />} number={loading ? "…" : pendingEdu} label="Pending Users" borderColor="var(--warning)" />
                <StatCard icon={<IconDatabase size={24} color="var(--danger)" />} number={loading ? "…" : pendingDatasets} label="Pending Datasets" borderColor="var(--danger)" />
              </div>

              {/* Audit bar chart */}
              <div className="hg-card" style={{ marginBottom: 24 }}>
                <div style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 700, fontSize: 16, color: "var(--navy)", marginBottom: 16 }}>
                  Audit Events by Action
                </div>
                {audit.length === 0 ? (
                  <div style={{ textAlign: "center", color: "var(--gray-400)", padding: "20px 0", fontStyle: "italic", fontSize: 13 }}>
                    0 audit events recorded across all portals.
                  </div>
                ) : (
                  <div className="bar-chart">
                    {Object.entries(actionCounts).map(([action, count]) => (
                      <div key={action} className="bar-chart-col">
                        <div
                          className="bar-chart-bar"
                          style={{ height: `${Math.round((count / maxCount) * 100)}%` }}
                          title={`${action}: ${count}`}
                        />
                        <div className="bar-chart-label">{action.replaceAll("_", " ")}</div>
                        <div style={{ fontSize: 10, color: "var(--gray-700)", fontWeight: 600 }}>{count}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Recent audit */}
              <div className="hg-card">
                <div style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 700, fontSize: 16, color: "var(--navy)", marginBottom: 16 }}>
                  Recent Audit Events
                </div>
                <div className="hg-table-wrap">
                  <table className="hg-table">
                    <thead><tr><th>Action</th><th>Record</th><th>Actor</th><th>Date</th></tr></thead>
                    <tbody>
                      {audit.length === 0 ? (
                        <tr>
                          <td colSpan={4} style={{ textAlign: "center", color: "var(--gray-400)", fontStyle: "italic", padding: 24 }}>
                            No audit events logged.
                          </td>
                        </tr>
                      ) : (
                        audit.slice(0, 10).map((e) => (
                          <tr key={e.id}>
                            <td>
                              <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                                <span className={`event-dot ${e.action}`} />
                                {e.action.replaceAll("_", " ")}
                              </span>
                            </td>
                            <td style={{ fontFamily: "monospace", fontSize: 12 }}>{e.record_id_snapshot.slice(0, 10)}…</td>
                            <td>{e.actor}</td>
                            <td>{new Date(e.created_at).toLocaleString()}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}

          {/* ── Doctors ───────────────────────────────────── */}
          {view === "doctors" && (
            <>
              <div className="section-header">
                <div>
                  <div className="section-title">Doctors</div>
                  <div className="section-subtitle">Manage clinicians and attributes</div>
                </div>
                <button className="btn-primary" onClick={() => setShowDoctorForm(!showDoctorForm)}>
                  {showDoctorForm ? "✕ Cancel" : "+ Add Doctor"}
                </button>
              </div>

              {showDoctorForm && (
                <div className="hg-card" style={{ marginBottom: 24, maxWidth: 560 }}>
                  <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: 16, color: "var(--navy)", marginBottom: 16 }}>
                    New Doctor
                  </div>
                  <form onSubmit={addDoctor} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                    <div>
                      <label className="hg-label">Full Name</label>
                      <input className="hg-input" required value={newDrName} onChange={(e) => setNewDrName(e.target.value)} placeholder="Dr. Jane Smith" />
                    </div>
                    <div>
                      <label className="hg-label">Specialty</label>
                      <select className="hg-select" value={newDrSpecialty} onChange={(e) => setNewDrSpecialty(e.target.value)}>
                        {["Cardiology","Dermatology","Emergency","Neurology","Oncology","Pediatrics","Radiology","Surgery"].map((s) => (
                          <option key={s}>{s}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="hg-label">Attributes (comma-separated)</label>
                      <input className="hg-input" value={newDrAttrs} onChange={(e) => setNewDrAttrs(e.target.value)} placeholder="Role:Doctor, Dept:Cardiology" />
                    </div>
                    <button type="submit" className="btn-primary" disabled={busy}>
                      {busy ? "Saving…" : "Save Doctor"}
                    </button>
                  </form>
                </div>
              )}

              <div className="hg-table-wrap">
                <table className="hg-table">
                  <thead><tr>
                    <th>Name</th><th>Specialty</th><th>Attributes</th><th>Status</th><th>Actions</th>
                  </tr></thead>
                  <tbody>
                    {doctors.length === 0 ? (
                      <tr><td colSpan={5} style={{ textAlign: "center", color: "var(--gray-400)", fontStyle: "italic", padding: 32 }}>No doctors yet.</td></tr>
                    ) : doctors.map((d) => (
                      <tr key={d.id}>
                        <td><strong>{d.name}</strong></td>
                        <td>{d.specialty}</td>
                        <td>
                          <div className="chips">
                            {d.attributes.map((a) => <span key={a} className="chip">{a}</span>)}
                          </div>
                        </td>
                        <td>
                          <span className={`badge ${d.verified ? "badge-success" : "badge-warning"}`}>
                            {d.verified ? "Verified" : "Unverified"}
                          </span>
                        </td>
                        <td>
                          <div style={{ display: "flex", gap: 8 }}>
                            {!d.verified ? (
                              <button className="btn-primary" disabled={busy} onClick={() => void verifyDoctor(d.id, "verify")} style={{ fontSize: 11, padding: "6px 10px" }}>Verify</button>
                            ) : (
                              <button className="btn-secondary" disabled={busy} onClick={() => void verifyDoctor(d.id, "unverify")} style={{ fontSize: 11, padding: "6px 10px" }}>Unverify</button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {/* ── Records ───────────────────────────────────── */}
          {view === "records" && (
            <>
              <div className="section-header">
                <div>
                  <div className="section-title">Medical Records</div>
                  <div className="section-subtitle">All records in the system</div>
                </div>
                <button className="btn-secondary" onClick={() => void refresh()}>↻ Refresh</button>
              </div>
              <div className="hg-table-wrap">
                <table className="hg-table">
                  <thead><tr>
                    <th>Title</th><th>Patient</th><th>Date</th><th>Policy</th><th>IPFS CID</th><th>Status</th><th>Actions</th>
                  </tr></thead>
                  <tbody>
                    {records.length === 0 ? (
                      <tr><td colSpan={7} style={{ textAlign: "center", color: "var(--gray-400)", fontStyle: "italic", padding: 32 }}>No records.</td></tr>
                    ) : records.map((r) => (
                      <tr key={r.id}>
                        <td><strong>{r.title}</strong></td>
                        <td>{r.patient_name}</td>
                        <td>{new Date(r.created_at).toLocaleDateString()}</td>
                        <td><span style={{ fontSize: 11, color: "var(--gray-500)" }}>{policyText(r.policy)}</span></td>
                        <td><span style={{ fontFamily: "monospace", fontSize: 11 }}>{r.ipfs_cid ? r.ipfs_cid.slice(0, 14) + "…" : "—"}</span></td>
                        <td><span className={`badge ${r.revoked ? "badge-danger" : "badge-success"}`}>{r.revoked ? "Revoked" : "Active"}</span></td>
                        <td>
                          {!r.revoked && (
                            <button className="btn-danger" disabled={busy} onClick={() => void revokeRecord(r)} style={{ fontSize: 11, padding: "6px 10px" }}>Revoke</button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {/* ── Audit Log ─────────────────────────────────── */}
          {view === "audit" && (
            <>
              <div className="section-title">Audit Log</div>
              <div className="section-subtitle">Full system audit trail — all events</div>
              <div className="hg-table-wrap">
                <table className="hg-table">
                  <thead><tr>
                    <th></th><th>Action</th><th>Record ID</th><th>Actor</th><th>Date</th>
                  </tr></thead>
                  <tbody>
                    {audit.length === 0 ? (
                      <tr><td colSpan={5} style={{ textAlign: "center", color: "var(--gray-400)", fontStyle: "italic", padding: 32 }}>No audit events.</td></tr>
                    ) : audit.map((e) => (
                      <tr key={e.id}>
                        <td><span className={`event-dot ${e.action}`} /></td>
                        <td>{e.action.replaceAll("_", " ")}</td>
                        <td style={{ fontFamily: "monospace", fontSize: 12 }}>{e.record_id_snapshot.slice(0, 12)}…</td>
                        <td>{e.actor}</td>
                        <td>{new Date(e.created_at).toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {/* ── Education Users ───────────────────────────── */}
          {view === "edu-users" && (
            <>
              <div className="section-title">Education Users</div>
              <div className="section-subtitle">Students, interns, and researchers awaiting verification</div>
              <div className="hg-table-wrap">
                <table className="hg-table">
                  <thead><tr>
                    <th>Name</th><th>Email</th><th>Role</th><th>Institution</th><th>Status</th><th>Actions</th>
                  </tr></thead>
                  <tbody>
                    {eduUsers.length === 0 ? (
                      <tr><td colSpan={6} style={{ textAlign: "center", color: "var(--gray-400)", fontStyle: "italic", padding: 32 }}>
                        No education users yet (endpoint may not be ready).
                      </td></tr>
                    ) : eduUsers.map((u) => (
                      <tr key={u.id}>
                        <td><strong>{u.name}</strong></td>
                        <td>{u.email}</td>
                        <td><span className="chip">{u.role}</span></td>
                        <td>{u.institution}</td>
                        <td>
                          <span className={`badge ${u.status === "verified" ? "badge-success" : u.status === "rejected" ? "badge-danger" : "badge-pending"}`}>
                            {u.status}
                          </span>
                        </td>
                        <td>
                          <div style={{ display: "flex", gap: 8 }}>
                            {u.status === "pending" && (
                              <>
                                <button className="btn-primary" disabled={busy} onClick={() => void eduUserAction(u.id, "verify")} style={{ fontSize: 11, padding: "6px 10px" }}>Verify</button>
                                <button className="btn-danger" disabled={busy} onClick={() => void eduUserAction(u.id, "reject")} style={{ fontSize: 11, padding: "6px 10px" }}>Reject</button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {/* ── Dataset Requests ──────────────────────────── */}
          {view === "datasets" && (
            <>
              <div className="section-title">Dataset Requests</div>
              <div className="section-subtitle">Research dataset access requests</div>
              <div className="hg-table-wrap">
                <table className="hg-table">
                  <thead><tr>
                    <th>Requester</th><th>Specialty</th><th>Objective</th><th>Status</th><th>Date</th><th>Actions</th>
                  </tr></thead>
                  <tbody>
                    {datasets.length === 0 ? (
                      <tr><td colSpan={6} style={{ textAlign: "center", color: "var(--gray-400)", fontStyle: "italic", padding: 32 }}>
                        No dataset requests yet.
                      </td></tr>
                    ) : datasets.map((d) => (
                      <tr key={d.id}>
                        <td>
                          {typeof d.requester === "object" && d.requester !== null
                            ? (d.requester as { name: string; email: string }).name
                            : String(d.requester)}
                        </td>
                        <td>
                          {d.specialty && typeof d.specialty === "object"
                            ? (d.specialty as { name: string }).name
                            : String(d.specialty ?? "—")}
                        </td>
                        <td style={{ maxWidth: 220 }}>
                          <span style={{ fontSize: 12, color: "var(--gray-600)" }}>{d.research_objective.slice(0, 80)}{d.research_objective.length > 80 ? "…" : ""}</span>
                        </td>
                        <td>
                          <span className={`badge ${d.status === "approved" ? "badge-success" : d.status === "rejected" ? "badge-danger" : "badge-pending"}`}>
                            {d.status}
                          </span>
                        </td>
                        <td>{new Date(d.created_at).toLocaleDateString()}</td>
                        <td>
                          <div style={{ display: "flex", gap: 8 }}>
                            {d.status === "pending" && (
                              <>
                                <button className="btn-primary" disabled={busy} onClick={() => void datasetAction(d.id, "approve")} style={{ fontSize: 11, padding: "6px 10px" }}>Approve</button>
                                <button className="btn-danger" disabled={busy} onClick={() => void datasetAction(d.id, "reject")} style={{ fontSize: 11, padding: "6px 10px" }}>Reject</button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {/* ── Training Programs ─────────────────────────── */}
          {view === "programs" && (
            <>
              <div className="section-header">
                <div>
                  <div className="section-title">Training Programs</div>
                  <div className="section-subtitle">Intern training and clinical education programs</div>
                </div>
                <button className="btn-primary" onClick={() => setShowProgForm(!showProgForm)}>
                  {showProgForm ? "✕ Cancel" : "+ Create Program"}
                </button>
              </div>

              {showProgForm && (
                <div className="hg-card" style={{ marginBottom: 24, maxWidth: 560 }}>
                  <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: 16, color: "var(--navy)", marginBottom: 16 }}>
                    New Training Program
                  </div>
                  <form onSubmit={addProgram} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                    <div>
                      <label className="hg-label">Program Name</label>
                      <input className="hg-input" required value={newProgName} onChange={(e) => setNewProgName(e.target.value)} placeholder="e.g. Cardiology Internship 2026" />
                    </div>
                    <div>
                      <label className="hg-label">Description</label>
                      <textarea className="hg-textarea" value={newProgDesc} onChange={(e) => setNewProgDesc(e.target.value)} placeholder="Program overview and objectives…" />
                    </div>
                    <button type="submit" className="btn-primary" disabled={busy}>
                      {busy ? "Creating…" : "Create Program"}
                    </button>
                  </form>
                </div>
              )}

              <div className="hg-table-wrap">
                <table className="hg-table">
                  <thead><tr>
                    <th>Program</th><th>Specialty</th><th>Status</th><th>Created</th>
                  </tr></thead>
                  <tbody>
                    {programs.length === 0 ? (
                      <tr><td colSpan={4} style={{ textAlign: "center", color: "var(--gray-400)", fontStyle: "italic", padding: 32 }}>
                        No training programs yet.
                      </td></tr>
                    ) : programs.map((p) => (
                      <tr key={p.id}>
                        <td>
                          <strong>{p.name}</strong>
                          <div style={{ fontSize: 12, color: "var(--gray-500)", marginTop: 2 }}>{p.description.slice(0, 60)}{p.description.length > 60 ? "…" : ""}</div>
                        </td>
                        <td>
                          {p.specialty && typeof p.specialty === "object"
                            ? (p.specialty as { name: string }).name
                            : String(p.specialty ?? "—")}
                        </td>
                        <td><span className={`badge ${p.is_active ? "badge-success" : "badge-danger"}`}>{p.is_active ? "Active" : "Inactive"}</span></td>
                        <td>{new Date(p.created_at).toLocaleDateString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
