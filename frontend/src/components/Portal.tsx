"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useState } from "react";

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

type Mode = "patient" | "doctor" | "admin";

function policyText(policy: unknown): string {
  if (typeof policy === "string") return policy.replace("Dept:", "");
  if (policy && typeof policy === "object") {
    const node = policy as Record<string, unknown>;
    const [operator, children] = Object.entries(node)[0] ?? [];
    if (Array.isArray(children)) {
      return children.map(policyText).join(operator === "all" ? " AND " : " OR ");
    }
  }
  return "Invalid policy";
}

async function errorMessage(response: Response): Promise<string> {
  try {
    const data = await response.json();
    return data.error ?? "Request failed.";
  } catch {
    return "Request failed.";
  }
}

export default function Portal({ mode }: { mode: Mode }) {
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [records, setRecords] = useState<RecordItem[]>([]);
  const [audit, setAudit] = useState<AuditEvent[]>([]);
  const [selectedDoctor, setSelectedDoctor] = useState("");
  const [department, setDepartment] = useState("Cardiology");
  const [operator, setOperator] = useState<"all" | "any">("all");
  const [title, setTitle] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const [doctorResponse, recordResponse, auditResponse] = await Promise.all([
        fetch(`${API}/doctors/`),
        fetch(`${API}/records/`),
        fetch(`${API}/audit/`),
      ]);
      if (!doctorResponse.ok || !recordResponse.ok || !auditResponse.ok) {
        throw new Error("The API returned an error. Check that the backend is running.");
      }
      const loadedDoctors: Doctor[] = await doctorResponse.json();
      setDoctors(loadedDoctors);
      setRecords(await recordResponse.json());
      setAudit(await auditResponse.json());
      setSelectedDoctor((current) => current || String(loadedDoctors[0]?.id ?? ""));
      setNotice("");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Could not connect to the backend.");
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  async function uploadRecord(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!file) {
      setNotice("Choose a report file first.");
      return;
    }
    setBusy(true);
    setNotice("");
    const policy = operator === "all"
      ? { all: ["Role:Doctor", `Dept:${department}`] }
      : { any: [{ all: ["Role:Doctor", `Dept:${department}`] }, "Emergency:True"] };
    const body = new FormData();
    body.set("title", title);
    body.set("patient_name", "Demo Patient");
    body.set("policy", JSON.stringify(policy));
    body.set("file", file);
    try {
      const response = await fetch(`${API}/records/`, { method: "POST", body });
      if (!response.ok) throw new Error(await errorMessage(response));
      setTitle("");
      setFile(null);
      (event.currentTarget as HTMLFormElement).reset();
      setNotice("Encrypted report added.");
      await refresh();
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Upload failed.");
    } finally {
      setBusy(false);
    }
  }

  async function accessRecord(record: RecordItem) {
    if (!selectedDoctor) return;
    setBusy(true);
    setNotice("");
    try {
      const response = await fetch(`${API}/records/${record.id}/access/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ doctor_id: Number(selectedDoctor) }),
      });
      if (!response.ok) throw new Error(await errorMessage(response));
      const blobUrl = URL.createObjectURL(await response.blob());
      const anchor = document.createElement("a");
      anchor.href = blobUrl;
      anchor.download = record.title;
      anchor.click();
      URL.revokeObjectURL(blobUrl);
      setNotice("Access granted. The report was decrypted for download.");
      await refresh();
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Access failed.");
      await refresh();
    } finally {
      setBusy(false);
    }
  }

  async function revokeRecord(record: RecordItem) {
    setBusy(true);
    try {
      const response = await fetch(`${API}/records/${record.id}/revoke/`, { method: "POST" });
      if (!response.ok) throw new Error(await errorMessage(response));
      setNotice("Access revoked.");
      await refresh();
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Revocation failed.");
    } finally {
      setBusy(false);
    }
  }

  const heading = mode === "patient" ? "Patient portal" : mode === "doctor" ? "Doctor portal" : "Hospital admin";
  return (
    <main className="shell">
      <header className="topbar">
        <Link className="brand" href="/">SecureChain</Link>
        <nav><Link href="/patient">Patient</Link><Link href="/doctor">Doctor</Link><Link href="/admin">Admin</Link></nav>
        <span className="demo-label">LOCAL DEMO</span>
      </header>
      <section className="page-heading">
        <p className="eyebrow">SECURECHAIN / {mode.toUpperCase()}</p>
        <h1>{heading}</h1>
        <p>Manage encrypted sample reports and inspect attribute-based access decisions.</p>
      </section>
      {notice && <div className="notice" role="status">{notice}</div>}

      {mode === "patient" && (
        <section className="panel">
          <div className="panel-heading"><div><p className="eyebrow">NEW REPORT</p><h2>Protect a medical report</h2></div></div>
          <form className="upload-form" onSubmit={uploadRecord}>
            <label>Report title<input required maxLength={160} value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Cardiac Echo.pdf" /></label>
            <label>Department<select value={department} onChange={(event) => setDepartment(event.target.value)}><option>Cardiology</option><option>Dermatology</option><option>Emergency</option></select></label>
            <label>Policy logic<select value={operator} onChange={(event) => setOperator(event.target.value as "all" | "any")}><option value="all">Require both role and department</option><option value="any">Allow doctor, department, or emergency override</option></select></label>
            <label className="file-input">Choose report<input required type="file" onChange={(event) => setFile(event.target.files?.[0] ?? null)} /></label>
            <button disabled={busy} type="submit">{busy ? "Working…" : "Encrypt & save report"}</button>
          </form>
        </section>
      )}

      {mode === "doctor" && (
        <section className="panel doctor-select">
          <label>Acting as<select value={selectedDoctor} onChange={(event) => setSelectedDoctor(event.target.value)}>{doctors.map((doctor) => <option key={doctor.id} value={doctor.id}>{doctor.name} · {doctor.specialty}</option>)}</select></label>
          <p>Demo identities only. This portal has no real authentication.</p>
        </section>
      )}

      {mode === "admin" && (
        <section className="panel">
          <div className="panel-heading"><div><p className="eyebrow">ATTRIBUTE AUTHORITY</p><h2>Verified demo clinicians</h2></div></div>
          <div className="doctor-list">{doctors.map((doctor) => <article className="doctor-row" key={doctor.id}><div><strong>{doctor.name}</strong><span>{doctor.specialty}</span></div><div className="chips">{doctor.attributes.map((attribute) => <span className="chip" key={attribute}>{attribute}</span>)}</div><span className="status">{doctor.verified ? "Verified" : "Unverified"}</span></article>)}</div>
        </section>
      )}

      {mode !== "admin" && (
        <section className="panel">
          <div className="panel-heading"><div><p className="eyebrow">{mode === "patient" ? "YOUR DEMO FILES" : "SHARED WITH YOU"}</p><h2>Medical records</h2></div><button className="secondary" onClick={() => void refresh()}>Refresh</button></div>
          {records.length === 0 ? <p className="empty">No records yet. Upload a sample report to begin.</p> : <div className="record-list">{records.map((record) => <article className="record-row" key={record.id}><div className="record-main"><span className="file-icon">PDF</span><div><strong>{record.title}</strong><span>{record.patient_name} · {new Date(record.created_at).toLocaleDateString()}</span><small>Policy: {policyText(record.policy)}</small>{record.ipfs_cid && <small>IPFS CID: {record.ipfs_cid}</small>}</div></div><div className="record-actions"><span className={record.revoked ? "status revoked" : "status"}>{record.revoked ? "Revoked" : "Active"}</span>{mode === "patient" ? <button className="secondary" disabled={busy || record.revoked} onClick={() => void revokeRecord(record)}>Revoke</button> : <button disabled={busy || record.revoked} onClick={() => void accessRecord(record)}>Decrypt & download</button>}</div></article>)}</div>}
        </section>
      )}

      {mode === "admin" && (
        <section className="panel">
          <div className="panel-heading"><div><p className="eyebrow">AUDIT TRAIL</p><h2>Recent events</h2></div></div>
          {audit.length === 0 ? <p className="empty">No audit events have been recorded.</p> : <div className="audit-list">{audit.map((entry) => <article className="audit-row" key={entry.id}><span className={`event-dot ${entry.action}`} /><div><strong>{entry.action.replaceAll("_", " ")}</strong><span>{entry.actor} · {new Date(entry.created_at).toLocaleString()}</span><small>Record {entry.record_id_snapshot.slice(0, 8)}…</small></div></article>)}</div>}
        </section>
      )}
      <p className="disclaimer">Demo only. No CP-ABE, account authentication, production blockchain, or HIPAA safeguards are provided.</p>
    </main>
  );
}
