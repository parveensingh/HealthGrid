"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useState } from "react";
import Sidebar from "@/components/Sidebar";
import StatCard from "@/components/StatCard";
import AuthModal from "@/components/AuthModal";
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
  IconLock,
  IconClock,
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
  admin_note?: string;
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

type BlockchainTxItem = {
  id: number;
  contract_name: string;
  function_name: string;
  tx_hash?: string;
  status: string;
  error_message?: string;
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
  { label: "Doctors & AA", icon: <IconStethoscope size={18} />, view: "doctors" },
  { label: "Records Registry", icon: <IconFileText size={18} />, view: "records" },
  { label: "Audit & Blockchain", icon: <IconActivity size={18} />, view: "audit" },
  { label: "Education Users", icon: <IconGraduationCap size={18} />, view: "edu-users" },
  { label: "Dataset Requests", icon: <IconDatabase size={18} />, view: "datasets" },
  { label: "Training Programs", icon: <IconShieldCheck size={18} />, view: "programs" },
];

export default function AdminPage() {
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [view, setView] = useState("dashboard");
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [records, setRecords] = useState<RecordItem[]>([]);
  const [audit, setAudit] = useState<AuditEvent[]>([]);
  const [blockchainTxs, setBlockchainTxs] = useState<BlockchainTxItem[]>([]);
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
  const [newDrAttrs, setNewDrAttrs] = useState("Role:Doctor, Clearance:Level2");

  // Program form
  const [showProgForm, setShowProgForm] = useState(false);
  const [newProgName, setNewProgName] = useState("");
  const [newProgDesc, setNewProgDesc] = useState("");

  useEffect(() => {
    const u = getCurrentUser();
    setCurrentUser(u);
    if (!u || u.role !== "admin") {
      setShowAuthModal(true);
    }
  }, []);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const [dRes, rRes, aRes, bRes] = await Promise.all([
        authFetch(`${API}/doctors/`),
        authFetch(`${API}/records/`),
        authFetch(`${API}/audit/`),
        authFetch(`${API}/blockchain/transactions/`),
      ]);
      if (dRes.ok) setDoctors(await dRes.json());
      if (rRes.ok) setRecords(await rRes.json());
      if (aRes.ok) setAudit(await aRes.json());
      if (bRes.ok) setBlockchainTxs(await bRes.json());

      const [euRes, drRes, prRes] = await Promise.allSettled([
        authFetch(`${API}/admin/education/users/`),
        authFetch(`${API}/admin/education/dataset-requests/`),
        authFetch(`${API}/admin/education/programs/`),
      ]);
      if (euRes.status === "fulfilled" && euRes.value.ok) setEduUsers(await euRes.value.json());
      if (drRes.status === "fulfilled" && drRes.value.ok) setDatasets(await drRes.value.json());
      if (prRes.status === "fulfilled" && prRes.value.ok) setPrograms(await prRes.value.json());
    } catch {
      setNotice({ type: "error", msg: "Could not connect to backend server." });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  async function revokeRecord(record: RecordItem) {
    if (!window.confirm(`Permanently revoke access to record "${record.title}" on-chain?`)) return;
    setBusy(true);
    setNotice(null);
    try {
      const res = await authFetch(`${API}/records/${record.id}/revoke/`, { method: "POST" });
      if (!res.ok) throw new Error(await getError(res));
      setNotice({ type: "success", msg: `Record "${record.title}" revoked on-chain.` });
      await refresh();
    } catch (err) {
      setNotice({ type: "error", msg: err instanceof Error ? err.message : "Revocation failed." });
    } finally {
      setBusy(false);
    }
  }

  async function addDoctor(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setNotice(null);
    try {
      const attrs = newDrAttrs.split(",").map((s) => s.trim()).filter(Boolean);
      attrs.push(`Dept:${newDrSpecialty}`);
      const res = await authFetch(`${API}/attribute-authority/doctors/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newDrName, specialty: newDrSpecialty, attributes: attrs }),
      });
      if (!res.ok) throw new Error(await getError(res));
      setNotice({ type: "success", msg: `Doctor identity registered and attributes issued.` });
      setNewDrName("");
      setNewDrAttrs("Role:Doctor, Clearance:Level2");
      setShowDoctorForm(false);
      await refresh();
    } catch (err) {
      setNotice({ type: "error", msg: err instanceof Error ? err.message : "Failed to add doctor." });
    } finally {
      setBusy(false);
    }
  }

  async function verifyDoctor(id: number, action: "verify" | "unverify") {
    setBusy(true);
    setNotice(null);
    try {
      const res = await authFetch(`${API}/attribute-authority/doctors/${id}/${action}/`, { method: "POST" });
      if (!res.ok) throw new Error(await getError(res));
      setNotice({ type: "success", msg: `Doctor ${action === "verify" ? "verified" : "unverified"} by Attribute Authority.` });
      await refresh();
    } catch (err) {
      setNotice({ type: "error", msg: err instanceof Error ? err.message : "Action failed." });
    } finally {
      setBusy(false);
    }
  }

  async function eduUserAction(id: number, action: "verify" | "reject") {
    setBusy(true);
    setNotice(null);
    try {
      const res = await authFetch(`${API}/admin/education/users/${id}/${action}/`, { method: "POST" });
      if (!res.ok) throw new Error(await getError(res));
      setNotice({ type: "success", msg: `Education account ${action}ed.` });
      await refresh();
    } catch (err) {
      setNotice({ type: "error", msg: err instanceof Error ? err.message : "Action failed." });
    } finally {
      setBusy(false);
    }
  }

  async function datasetAction(id: number, action: "approve" | "reject") {
    setBusy(true);
    setNotice(null);
    try {
      const res = await authFetch(`${API}/admin/education/dataset-requests/${id}/${action}/`, { method: "POST" });
      if (!res.ok) throw new Error(await getError(res));
      setNotice({ type: "success", msg: `Dataset request ${action}ed.` });
      await refresh();
    } catch (err) {
      setNotice({ type: "error", msg: err instanceof Error ? err.message : "Action failed." });
    } finally {
      setBusy(false);
    }
  }

  async function addProgram(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setNotice(null);
    try {
      const res = await authFetch(`${API}/admin/education/programs/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newProgName, description: newProgDesc }),
      });
      if (!res.ok) throw new Error(await getError(res));
      setNotice({ type: "success", msg: "Training program created." });
      setNewProgName("");
      setNewProgDesc("");
      setShowProgForm(false);
      await refresh();
    } catch (err) {
      setNotice({ type: "error", msg: err instanceof Error ? err.message : "Failed to create program." });
    } finally {
      setBusy(false);
    }
  }

  const handleSignOut = () => {
    clearSession();
    setCurrentUser(null);
    setShowAuthModal(true);
  };

  const activeRecords = records.filter((r) => !r.revoked).length;
  const pendingEdu = eduUsers.filter((u) => u.status === "pending").length;
  const pendingDatasets = datasets.filter((d) => d.status === "pending").length;

  return (
    <div className="hg-shell">
      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        defaultRole="admin"
        message={!currentUser ? "Sign in as Administrator to access system management and Attribute Authority." : undefined}
        onSuccess={(u) => {
          setCurrentUser(u);
          setShowAuthModal(false);
          void refresh();
        }}
      />

      <Sidebar
        portalName="Admin Console"
        navItems={NAV_ITEMS}
        activeView={view}
        onNavigate={setView}
        userLabel={currentUser ? `${currentUser.full_name || currentUser.username} (Admin)` : "Administrator"}
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
            >
              <span>←</span>
              <span>Back to Hub</span>
            </Link>
            <div className="topbar-portal-name">System Administration & Attribute Authority</div>
          </div>
          <div className="topbar-right">
            <span className="role-badge role-badge-admin">
              <IconShieldCheck size={15} color="#d97706" />
              Verified Administrator
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
                  <div className="section-title">Administrative Dashboard</div>
                  <div className="section-subtitle">
                    System health, Attribute Authority metrics, smart contract state, and pending clinical requests
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
                  icon={<IconStethoscope size={24} color="var(--teal)" />}
                  number={loading ? "…" : doctors.length}
                  label="Registered Doctors"
                  trend={`${doctors.filter((d) => d.verified).length} Verified`}
                  borderColor="var(--teal)"
                />
                <StatCard
                  icon={<IconFileText size={24} color="var(--success)" />}
                  number={loading ? "…" : records.length}
                  label="Total EHR Records"
                  trend={`${activeRecords} Active / ${records.length - activeRecords} Revoked`}
                  borderColor="var(--success)"
                />
                <StatCard
                  icon={<IconActivity size={24} color="var(--info)" />}
                  number={loading ? "…" : audit.length}
                  label="Audit Log Entries"
                  trend="Logged On-Chain"
                  borderColor="var(--info)"
                />
                <StatCard
                  icon={<IconGraduationCap size={24} color="#f59e0b" />}
                  number={loading ? "…" : pendingEdu + pendingDatasets}
                  label="Pending Approvals"
                  trend={`${pendingEdu} Users · ${pendingDatasets} Datasets`}
                  borderColor="#f59e0b"
                />
              </div>

              {/* Quick links & summary */}
              <div className="hg-card" style={{ marginTop: 0 }}>
                <div style={{ fontWeight: 700, fontSize: 16, color: "var(--navy)", marginBottom: 12 }}>
                  HealthGrid Core Services & Smart Contract Status
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 14 }}>
                  <div style={{ padding: 14, borderRadius: 8, background: "var(--gray-50)", border: "1px solid var(--gray-200)" }}>
                    <div style={{ fontSize: 12, color: "var(--gray-500)", fontWeight: 600 }}>Smart Contracts Deployed</div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: "var(--navy)", marginTop: 4 }}>
                      AuditLogger · Registry · AccessControl
                    </div>
                  </div>
                  <div style={{ padding: 14, borderRadius: 8, background: "var(--gray-50)", border: "1px solid var(--gray-200)" }}>
                    <div style={{ fontSize: 12, color: "var(--gray-500)", fontWeight: 600 }}>Encryption Standard</div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: "var(--navy)", marginTop: 4 }}>
                      AES-256-GCM + HKDF-SHA256
                    </div>
                  </div>
                  <div style={{ padding: 14, borderRadius: 8, background: "var(--gray-50)", border: "1px solid var(--gray-200)" }}>
                    <div style={{ fontSize: 12, color: "var(--gray-500)", fontWeight: 600 }}>Decentralized Storage</div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: "var(--navy)", marginTop: 4 }}>
                      IPFS Kubo + Local Encrypted Vault
                    </div>
                  </div>
                  <div style={{ padding: 14, borderRadius: 8, background: "var(--gray-50)", border: "1px solid var(--gray-200)" }}>
                    <div style={{ fontSize: 12, color: "var(--gray-500)", fontWeight: 600 }}>Authentication Layer</div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: "var(--navy)", marginTop: 4 }}>
                      JWT Bearer Tokens + Role Guards
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* ── Doctors & AA View ──────────────────────────── */}
          {view === "doctors" && (
            <>
              <div className="section-header">
                <div>
                  <div className="section-title">Attribute Authority: Doctors Directory</div>
                  <div className="section-subtitle">
                    Issue decryption attributes, verify hospital staff, and manage clinical identities
                  </div>
                </div>
                <button
                  className="btn-primary"
                  onClick={() => setShowDoctorForm(!showDoctorForm)}
                  style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
                >
                  <IconStethoscope size={16} /> {showDoctorForm ? "Cancel" : "Register Doctor"}
                </button>
              </div>

              {showDoctorForm && (
                <div className="hg-card" style={{ maxWidth: 540, marginBottom: 20 }}>
                  <form onSubmit={addDoctor} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                    <div>
                      <label className="hg-label">Full Name & Title</label>
                      <input
                        required
                        className="hg-input"
                        placeholder="e.g. Dr. Kavita Sundaram"
                        value={newDrName}
                        onChange={(e) => setNewDrName(e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="hg-label">Department & Specialty</label>
                      <select
                        className="hg-select"
                        value={newDrSpecialty}
                        onChange={(e) => setNewDrSpecialty(e.target.value)}
                      >
                        <option>Cardiology</option>
                        <option>Neurology</option>
                        <option>Oncology</option>
                        <option>Pediatrics</option>
                        <option>Radiology</option>
                        <option>Emergency Medicine</option>
                        <option>Orthopedics</option>
                        <option>Dermatology</option>
                        <option>General Surgery</option>
                        <option>Pathology</option>
                      </select>
                    </div>
                    <div>
                      <label className="hg-label">ABAC Attributes (comma-separated)</label>
                      <input
                        className="hg-input"
                        placeholder="Role:Doctor, Clearance:Level2, Emergency:True"
                        value={newDrAttrs}
                        onChange={(e) => setNewDrAttrs(e.target.value)}
                      />
                    </div>
                    <button type="submit" className="btn-primary" disabled={busy}>
                      {busy ? "Registering…" : "Register Doctor & Issue Attributes"}
                    </button>
                  </form>
                </div>
              )}

              <div className="hg-table-wrap">
                <table className="hg-table">
                  <thead>
                    <tr>
                      <th>Doctor</th>
                      <th>Specialty</th>
                      <th>Issued Attributes</th>
                      <th>Verification Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {doctors.map((d) => (
                      <tr key={d.id}>
                        <td>
                          <strong>{d.name}</strong>
                          <br />
                          <span style={{ fontSize: 11, color: "var(--gray-500)" }}>ID #{d.id}</span>
                        </td>
                        <td>{d.specialty}</td>
                        <td style={{ maxWidth: 260 }}>
                          <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                            {d.attributes.map((attr, idx) => (
                              <span key={idx} className="chip">
                                {attr}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td>
                          <span className={`badge ${d.verified ? "badge-success" : "badge-danger"}`}>
                            {d.verified ? "Verified" : "Unverified"}
                          </span>
                        </td>
                        <td>
                          {d.verified ? (
                            <button
                              className="btn-danger"
                              disabled={busy}
                              onClick={() => void verifyDoctor(d.id, "unverify")}
                              style={{ fontSize: 11, padding: "4px 10px" }}
                            >
                              Revoke Verification
                            </button>
                          ) : (
                            <button
                              className="btn-primary"
                              disabled={busy}
                              onClick={() => void verifyDoctor(d.id, "verify")}
                              style={{ fontSize: 11, padding: "4px 10px" }}
                            >
                              Verify Staff
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {/* ── Records Registry View ──────────────────────── */}
          {view === "records" && (
            <>
              <div className="section-header">
                <div>
                  <div className="section-title">Medical Record Registry</div>
                  <div className="section-subtitle">
                    System-wide index of all uploaded records, encryption status, and patient consent
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

              <div className="hg-table-wrap">
                <table className="hg-table">
                  <thead>
                    <tr>
                      <th>Title & ID</th>
                      <th>Patient</th>
                      <th>Policy Expression</th>
                      <th>Consent</th>
                      <th>Storage</th>
                      <th>Status & Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {records.map((r) => (
                      <tr key={r.id}>
                        <td>
                          <strong>{r.title}</strong>
                          <br />
                          <span style={{ fontSize: 11, color: "var(--gray-500)" }}>{r.id.slice(0, 12)}…</span>
                        </td>
                        <td>{r.patient_name}</td>
                        <td style={{ maxWidth: 220 }}>
                          <span className="chip">{policyText(r.policy)}</span>
                        </td>
                        <td>
                          <span className={`badge ${r.consent_granted ? "badge-success" : "badge-warning"}`}>
                            {r.consent_granted ? "Active" : "Withdrawn"}
                          </span>
                        </td>
                        <td style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: "var(--teal)" }}>
                          {r.ipfs_cid ? `IPFS: ${r.ipfs_cid.slice(0, 8)}…` : "Local Encrypted"}
                        </td>
                        <td>
                          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <span className={`badge ${r.revoked ? "badge-danger" : "badge-success"}`}>
                              {r.revoked ? "Revoked" : "Active"}
                            </span>
                            {!r.revoked && (
                              <button
                                className="btn-danger"
                                disabled={busy}
                                onClick={() => void revokeRecord(r)}
                                style={{ fontSize: 11, padding: "4px 8px" }}
                              >
                                Revoke
                              </button>
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

          {/* ── Audit & Blockchain View ────────────────────── */}
          {view === "audit" && (
            <>
              <div className="section-header">
                <div>
                  <div className="section-title">Audit Logs & Blockchain Transactions</div>
                  <div className="section-subtitle">
                    System-wide immutable audit trail and Ethereum outbox transaction queue
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

              {/* Blockchain Transaction Outbox */}
              <div className="hg-card" style={{ marginBottom: 24 }}>
                <div style={{ fontWeight: 700, fontSize: 15, color: "var(--navy)", marginBottom: 12 }}>
                  Blockchain Outbox Transactions (Smart Contract Calls)
                </div>
                {blockchainTxs.length === 0 ? (
                  <div style={{ color: "var(--gray-400)", textAlign: "center", padding: 20, fontStyle: "italic" }}>
                    No blockchain transactions recorded yet.
                  </div>
                ) : (
                  <div className="hg-table-wrap">
                    <table className="hg-table">
                      <thead>
                        <tr>
                          <th>Contract</th>
                          <th>Method</th>
                          <th>Tx Hash</th>
                          <th>Status</th>
                          <th>Timestamp</th>
                        </tr>
                      </thead>
                      <tbody>
                        {blockchainTxs.slice(0, 10).map((tx) => (
                          <tr key={tx.id}>
                            <td style={{ fontWeight: 600 }}>{tx.contract_name}</td>
                            <td style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 12 }}>{tx.function_name}</td>
                            <td style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: "var(--teal)" }}>
                              {tx.tx_hash ? `${tx.tx_hash.slice(0, 14)}…` : "—"}
                            </td>
                            <td>
                              <span
                                className={`badge ${
                                  tx.status === "confirmed"
                                    ? "badge-success"
                                    : tx.status === "failed"
                                    ? "badge-danger"
                                    : "badge-warning"
                                }`}
                              >
                                {tx.status}
                              </span>
                            </td>
                            <td>{new Date(tx.created_at).toLocaleString()}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* System Audit Events */}
              <div className="hg-table-wrap">
                <table className="hg-table">
                  <thead>
                    <tr>
                      <th>Action</th>
                      <th>Record Snapshot</th>
                      <th>Actor</th>
                      <th>Date</th>
                      <th>Tx Hash</th>
                    </tr>
                  </thead>
                  <tbody>
                    {audit.map((e) => (
                      <tr key={e.id}>
                        <td style={{ fontWeight: 600, textTransform: "capitalize" }}>
                          {e.action.replaceAll("_", " ")}
                        </td>
                        <td style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 12 }}>
                          {e.record_id_snapshot.slice(0, 12)}…
                        </td>
                        <td>{e.actor}</td>
                        <td>{new Date(e.created_at).toLocaleString()}</td>
                        <td>
                          {e.tx_hash ? (
                            <span className="chip" style={{ fontSize: 10, color: "var(--teal)" }}>
                              {e.tx_hash.slice(0, 12)}…
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
            </>
          )}

          {/* ── Education Users View ───────────────────────── */}
          {view === "edu-users" && (
            <>
              <div className="section-title">Education & Research Accounts</div>
              <div className="section-subtitle">Manage student, intern, and academic researcher credentials</div>
              <div className="hg-table-wrap">
                <table className="hg-table">
                  <thead>
                    <tr>
                      <th>Name & Email</th>
                      <th>Role</th>
                      <th>Institution</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {eduUsers.length === 0 ? (
                      <tr>
                        <td colSpan={5} style={{ textAlign: "center", color: "var(--gray-400)", padding: 32 }}>
                          No education accounts pending.
                        </td>
                      </tr>
                    ) : (
                      eduUsers.map((u) => (
                        <tr key={u.id}>
                          <td>
                            <strong>{u.name}</strong>
                            <br />
                            <span style={{ fontSize: 11, color: "var(--gray-500)" }}>{u.email}</span>
                          </td>
                          <td style={{ textTransform: "capitalize" }}>{u.role}</td>
                          <td>{u.institution || "—"}</td>
                          <td>
                            <span
                              className={`badge ${
                                u.status === "verified"
                                  ? "badge-success"
                                  : u.status === "rejected"
                                  ? "badge-danger"
                                  : "badge-warning"
                              }`}
                            >
                              {u.status}
                            </span>
                          </td>
                          <td>
                            {u.status === "pending" && (
                              <div style={{ display: "flex", gap: 6 }}>
                                <button
                                  className="btn-primary"
                                  disabled={busy}
                                  onClick={() => void eduUserAction(u.id, "verify")}
                                  style={{ fontSize: 11, padding: "4px 8px" }}
                                >
                                  Approve
                                </button>
                                <button
                                  className="btn-danger"
                                  disabled={busy}
                                  onClick={() => void eduUserAction(u.id, "reject")}
                                  style={{ fontSize: 11, padding: "4px 8px" }}
                                >
                                  Reject
                                </button>
                              </div>
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

          {/* ── Dataset Requests View ──────────────────────── */}
          {view === "datasets" && (
            <>
              <div className="section-title">Dataset Access Requests</div>
              <div className="section-subtitle">Clinical research and academic dataset access governance</div>
              <div className="hg-table-wrap">
                <table className="hg-table">
                  <thead>
                    <tr>
                      <th>Requester</th>
                      <th>Specialty</th>
                      <th>Research Objective</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {datasets.length === 0 ? (
                      <tr>
                        <td colSpan={5} style={{ textAlign: "center", color: "var(--gray-400)", padding: 32 }}>
                          No dataset requests submitted.
                        </td>
                      </tr>
                    ) : (
                      datasets.map((d) => (
                        <tr key={d.id}>
                          <td>
                            {typeof d.requester === "object" ? d.requester.name : `User #${d.requester}`}
                          </td>
                          <td>{typeof d.specialty === "object" && d.specialty ? d.specialty.name : "All Specialties"}</td>
                          <td style={{ maxWidth: 300, fontSize: 12 }}>{d.research_objective}</td>
                          <td>
                            <span
                              className={`badge ${
                                d.status === "approved"
                                  ? "badge-success"
                                  : d.status === "rejected"
                                  ? "badge-danger"
                                  : "badge-warning"
                              }`}
                            >
                              {d.status}
                            </span>
                          </td>
                          <td>
                            {d.status === "pending" && (
                              <div style={{ display: "flex", gap: 6 }}>
                                <button
                                  className="btn-primary"
                                  disabled={busy}
                                  onClick={() => void datasetAction(d.id, "approve")}
                                  style={{ fontSize: 11, padding: "4px 8px" }}
                                >
                                  Approve
                                </button>
                                <button
                                  className="btn-danger"
                                  disabled={busy}
                                  onClick={() => void datasetAction(d.id, "reject")}
                                  style={{ fontSize: 11, padding: "4px 8px" }}
                                >
                                  Reject
                                </button>
                              </div>
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

          {/* ── Training Programs View ─────────────────────── */}
          {view === "programs" && (
            <>
              <div className="section-header">
                <div>
                  <div className="section-title">Clinical Training Programs</div>
                  <div className="section-subtitle">Manage medical residency and student training curriculums</div>
                </div>
                <button
                  className="btn-primary"
                  onClick={() => setShowProgForm(!showProgForm)}
                  style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
                >
                  <IconShieldCheck size={16} /> {showProgForm ? "Cancel" : "Add Training Program"}
                </button>
              </div>

              {showProgForm && (
                <div className="hg-card" style={{ maxWidth: 540, marginBottom: 20 }}>
                  <form onSubmit={addProgram} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                    <div>
                      <label className="hg-label">Program Name</label>
                      <input
                        required
                        className="hg-input"
                        placeholder="e.g. Advanced Cardiology Residency"
                        value={newProgName}
                        onChange={(e) => setNewProgName(e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="hg-label">Curriculum Description</label>
                      <textarea
                        required
                        className="hg-input"
                        placeholder="Clinical rotation details..."
                        value={newProgDesc}
                        onChange={(e) => setNewProgDesc(e.target.value)}
                        rows={3}
                      />
                    </div>
                    <button type="submit" className="btn-primary" disabled={busy}>
                      {busy ? "Saving…" : "Create Program"}
                    </button>
                  </form>
                </div>
              )}

              <div className="hg-table-wrap">
                <table className="hg-table">
                  <thead>
                    <tr>
                      <th>Program Name</th>
                      <th>Specialty</th>
                      <th>Status</th>
                      <th>Created</th>
                    </tr>
                  </thead>
                  <tbody>
                    {programs.map((p) => (
                      <tr key={p.id}>
                        <td>
                          <strong>{p.name}</strong>
                          <div style={{ fontSize: 12, color: "var(--gray-500)", marginTop: 2 }}>{p.description}</div>
                        </td>
                        <td>{typeof p.specialty === "object" && p.specialty ? p.specialty.name : "Interdisciplinary"}</td>
                        <td>
                          <span className={`badge ${p.is_active ? "badge-success" : "badge-danger"}`}>
                            {p.is_active ? "Active" : "Archived"}
                          </span>
                        </td>
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
