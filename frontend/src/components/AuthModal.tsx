"use client";

import { FormEvent, useState } from "react";
import {
  IconCheckCircle,
  IconAlertCircle,
  IconLock,
  IconUser,
  IconStethoscope,
  IconShieldCheck,
  IconGraduationCap,
} from "./Icons";
import { AuthUser, DemoUser, saveSession } from "@/lib/auth";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:8001/api";

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (user: AuthUser) => void;
  defaultRole?: "patient" | "doctor" | "admin" | "education";
  message?: string;
}

export default function AuthModal({
  isOpen,
  onClose,
  onSuccess,
  defaultRole = "patient",
  message,
}: AuthModalProps) {
  const [tab, setTab] = useState<"demo" | "login" | "register">("demo");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState(defaultRole);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [specialty, setSpecialty] = useState("Cardiology");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  async function handleLogin(e: FormEvent) {
    e.preventDefault();
    if (!username.trim() || !password) {
      setError("Please enter your username and password.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`${API}/auth/login/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error ?? "Invalid credentials.");
      }
      saveSession(data.access, data.refresh, data.user);
      onSuccess(data.user);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Authentication failed.");
    } finally {
      setBusy(false);
    }
  }

  async function handleDemoLogin(demoUsername: string, demoPassword = "Doctor@HealthGrid2026!") {
    setBusy(true);
    setError(null);
    try {
      let pwd = demoPassword;
      if (demoUsername.startsWith("patient")) pwd = "Patient@HealthGrid2026!";
      if (demoUsername === "admin") pwd = "Admin@HealthGrid2026!";

      const res = await fetch(`${API}/auth/login/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: demoUsername, password: pwd }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error ?? "Failed to authenticate with demo user.");
      }
      saveSession(data.access, data.refresh, data.user);
      onSuccess(data.user);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Demo login failed.");
    } finally {
      setBusy(false);
    }
  }

  async function handleRegister(e: FormEvent) {
    e.preventDefault();
    if (!username.trim() || !password) {
      setError("Username and password are required.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`${API}/auth/register/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username,
          password,
          email,
          role,
          full_name: fullName,
          specialty: role === "doctor" ? specialty : undefined,
          attributes: role === "doctor" ? ["Role:Doctor", `Dept:${specialty}`, "Clearance:Level2"] : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        const msg = typeof data === "object" ? Object.values(data).flat().join(" ") : "Registration failed.";
        throw new Error(msg);
      }
      saveSession(data.access, data.refresh, data.user);
      onSuccess(data.user);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Registration failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        background: "rgba(10,22,40,0.85)",
        backdropFilter: "blur(8px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 520,
          background: "var(--navy-mid, #0d2137)",
          border: "1px solid rgba(8,145,178,0.35)",
          borderRadius: 16,
          boxShadow: "0 24px 64px rgba(0,0,0,0.6)",
          padding: 32,
          color: "white",
          fontFamily: "'Inter', sans-serif",
          position: "relative",
        }}
      >
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div
              style={{
                width: 40,
                height: 40,
                background: "linear-gradient(135deg, var(--teal, #0891b2), #22d3ee)",
                borderRadius: 10,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontWeight: 800,
                fontSize: 20,
              }}
            >
              H
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700, letterSpacing: "-0.3px" }}>
                HealthGrid Authentication
              </h3>
              <p style={{ margin: 0, fontSize: 12, color: "var(--gray-400, #94a3b8)" }}>
                Decentralized Access Control & Identity Verification
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: "transparent",
              border: "none",
              color: "var(--gray-400, #94a3b8)",
              fontSize: 22,
              cursor: "pointer",
              padding: "4px 8px",
            }}
          >
            ×
          </button>
        </div>

        {message && (
          <div
            style={{
              padding: "10px 14px",
              background: "rgba(8,145,178,0.12)",
              border: "1px solid rgba(8,145,178,0.3)",
              borderRadius: 8,
              fontSize: 13,
              color: "#38bdf8",
              marginBottom: 18,
            }}
          >
            ℹ️ {message}
          </div>
        )}

        {error && (
          <div
            style={{
              padding: "10px 14px",
              background: "rgba(239,68,68,0.15)",
              border: "1px solid rgba(239,68,68,0.4)",
              borderRadius: 8,
              fontSize: 13,
              color: "#fca5a5",
              marginBottom: 18,
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            <IconAlertCircle size={16} />
            {error}
          </div>
        )}

        {/* Tab switcher */}
        <div
          style={{
            display: "flex",
            background: "rgba(0,0,0,0.25)",
            padding: 4,
            borderRadius: 10,
            marginBottom: 20,
            gap: 4,
          }}
        >
          <button
            type="button"
            onClick={() => { setTab("demo"); setError(null); }}
            style={{
              flex: 1,
              padding: "8px 12px",
              border: "none",
              borderRadius: 8,
              fontSize: 12,
              fontWeight: 600,
              cursor: "pointer",
              background: tab === "demo" ? "var(--teal, #0891b2)" : "transparent",
              color: tab === "demo" ? "white" : "var(--gray-400, #94a3b8)",
              transition: "all 0.15s",
            }}
          >
            ⚡ Demo Personas
          </button>
          <button
            type="button"
            onClick={() => { setTab("login"); setError(null); }}
            style={{
              flex: 1,
              padding: "8px 12px",
              border: "none",
              borderRadius: 8,
              fontSize: 12,
              fontWeight: 600,
              cursor: "pointer",
              background: tab === "login" ? "var(--teal, #0891b2)" : "transparent",
              color: tab === "login" ? "white" : "var(--gray-400, #94a3b8)",
              transition: "all 0.15s",
            }}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => { setTab("register"); setError(null); }}
            style={{
              flex: 1,
              padding: "8px 12px",
              border: "none",
              borderRadius: 8,
              fontSize: 12,
              fontWeight: 600,
              cursor: "pointer",
              background: tab === "register" ? "var(--teal, #0891b2)" : "transparent",
              color: tab === "register" ? "white" : "var(--gray-400, #94a3b8)",
              transition: "all 0.15s",
            }}
          >
            Register
          </button>
        </div>

        {/* DEMO PERSONAS TAB */}
        {tab === "demo" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <p style={{ margin: "0 0 8px", fontSize: 12, color: "var(--gray-400, #94a3b8)" }}>
              One-click academic demonstration login with pre-configured roles and attributes:
            </p>

            <button
              disabled={busy}
              onClick={() => handleDemoLogin("patient.alice")}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "12px 16px",
                background: "rgba(255,255,255,0.03)",
                border: "1px solid rgba(255,255,255,0.08)",
                borderRadius: 10,
                color: "white",
                cursor: busy ? "not-allowed" : "pointer",
                textAlign: "left",
                transition: "background 0.15s",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(8,145,178,0.15)")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.03)")}
            >
              <div>
                <div style={{ fontWeight: 600, fontSize: 14, display: "flex", alignItems: "center", gap: 8 }}>
                  <IconUser size={16} /> Alice Johnson (Patient)
                </div>
                <div style={{ fontSize: 11, color: "var(--gray-400, #94a3b8)", marginTop: 2 }}>
                  Has encrypted EHR records · Controls consent & policy
                </div>
              </div>
              <span style={{ fontSize: 11, padding: "3px 8px", borderRadius: 4, background: "rgba(16,185,129,0.2)", color: "#34d399", fontWeight: 600 }}>
                Patient
              </span>
            </button>

            <button
              disabled={busy}
              onClick={() => handleDemoLogin("dr.rajesh")}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "12px 16px",
                background: "rgba(255,255,255,0.03)",
                border: "1px solid rgba(255,255,255,0.08)",
                borderRadius: 10,
                color: "white",
                cursor: busy ? "not-allowed" : "pointer",
                textAlign: "left",
                transition: "background 0.15s",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(8,145,178,0.15)")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.03)")}
            >
              <div>
                <div style={{ fontWeight: 600, fontSize: 14, display: "flex", alignItems: "center", gap: 8 }}>
                  <IconStethoscope size={16} /> Dr. Rajesh Sharma (Cardiology)
                </div>
                <div style={{ fontSize: 11, color: "var(--gray-400, #94a3b8)", marginTop: 2 }}>
                  Chief Cardiologist · Level 3 Clearance · Verified
                </div>
              </div>
              <span style={{ fontSize: 11, padding: "3px 8px", borderRadius: 4, background: "rgba(14,165,233,0.2)", color: "#38bdf8", fontWeight: 600 }}>
                Doctor
              </span>
            </button>

            <button
              disabled={busy}
              onClick={() => handleDemoLogin("dr.priya")}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "12px 16px",
                background: "rgba(255,255,255,0.03)",
                border: "1px solid rgba(255,255,255,0.08)",
                borderRadius: 10,
                color: "white",
                cursor: busy ? "not-allowed" : "pointer",
                textAlign: "left",
                transition: "background 0.15s",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(8,145,178,0.15)")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.03)")}
            >
              <div>
                <div style={{ fontWeight: 600, fontSize: 14, display: "flex", alignItems: "center", gap: 8 }}>
                  <IconStethoscope size={16} /> Dr. Priya Nair (Neurology)
                </div>
                <div style={{ fontSize: 11, color: "var(--gray-400, #94a3b8)", marginTop: 2 }}>
                  Senior Neurologist · Level 2 Clearance · Dept:Neurology
                </div>
              </div>
              <span style={{ fontSize: 11, padding: "3px 8px", borderRadius: 4, background: "rgba(14,165,233,0.2)", color: "#38bdf8", fontWeight: 600 }}>
                Doctor
              </span>
            </button>

            <button
              disabled={busy}
              onClick={() => handleDemoLogin("admin")}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "12px 16px",
                background: "rgba(255,255,255,0.03)",
                border: "1px solid rgba(255,255,255,0.08)",
                borderRadius: 10,
                color: "white",
                cursor: busy ? "not-allowed" : "pointer",
                textAlign: "left",
                transition: "background 0.15s",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(8,145,178,0.15)")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.03)")}
            >
              <div>
                <div style={{ fontWeight: 600, fontSize: 14, display: "flex", alignItems: "center", gap: 8 }}>
                  <IconShieldCheck size={16} /> System Administrator
                </div>
                <div style={{ fontSize: 11, color: "var(--gray-400, #94a3b8)", marginTop: 2 }}>
                  Manage doctors, verify identities, monitor audit & blockchain
                </div>
              </div>
              <span style={{ fontSize: 11, padding: "3px 8px", borderRadius: 4, background: "rgba(245,158,11,0.2)", color: "#fbbf24", fontWeight: 600 }}>
                Admin
              </span>
            </button>
          </div>
        )}

        {/* STANDARD SIGN IN TAB */}
        {tab === "login" && (
          <form onSubmit={handleLogin} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div>
              <label style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 6, color: "var(--gray-300, #cbd5e1)" }}>
                Username
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="e.g. patient.alice or dr.rajesh"
                required
                style={{
                  width: "100%",
                  padding: "10px 14px",
                  borderRadius: 8,
                  border: "1px solid rgba(255,255,255,0.15)",
                  background: "rgba(0,0,0,0.3)",
                  color: "white",
                  fontSize: 14,
                  boxSizing: "border-box",
                }}
              />
            </div>

            <div>
              <label style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 6, color: "var(--gray-300, #cbd5e1)" }}>
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                required
                style={{
                  width: "100%",
                  padding: "10px 14px",
                  borderRadius: 8,
                  border: "1px solid rgba(255,255,255,0.15)",
                  background: "rgba(0,0,0,0.3)",
                  color: "white",
                  fontSize: 14,
                  boxSizing: "border-box",
                }}
              />
            </div>

            <button
              type="submit"
              disabled={busy}
              style={{
                marginTop: 8,
                padding: "12px",
                borderRadius: 8,
                border: "none",
                background: "var(--teal, #0891b2)",
                color: "white",
                fontWeight: 600,
                fontSize: 14,
                cursor: busy ? "not-allowed" : "pointer",
                transition: "opacity 0.15s",
              }}
            >
              {busy ? "Authenticating..." : "Sign In →"}
            </button>
          </form>
        )}

        {/* REGISTRATION TAB */}
        {tab === "register" && (
          <form onSubmit={handleRegister} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <div>
                <label style={{ display: "block", fontSize: 11, fontWeight: 600, marginBottom: 4, color: "var(--gray-300)" }}>
                  Username
                </label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="username"
                  required
                  style={{
                    width: "100%", padding: "8px 12px", borderRadius: 8,
                    border: "1px solid rgba(255,255,255,0.15)", background: "rgba(0,0,0,0.3)",
                    color: "white", fontSize: 13, boxSizing: "border-box",
                  }}
                />
              </div>
              <div>
                <label style={{ display: "block", fontSize: 11, fontWeight: 600, marginBottom: 4, color: "var(--gray-300)" }}>
                  Full Name
                </label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="John Doe"
                  required
                  style={{
                    width: "100%", padding: "8px 12px", borderRadius: 8,
                    border: "1px solid rgba(255,255,255,0.15)", background: "rgba(0,0,0,0.3)",
                    color: "white", fontSize: 13, boxSizing: "border-box",
                  }}
                />
              </div>
            </div>

            <div>
              <label style={{ display: "block", fontSize: 11, fontWeight: 600, marginBottom: 4, color: "var(--gray-300)" }}>
                Role
              </label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as any)}
                style={{
                  width: "100%", padding: "8px 12px", borderRadius: 8,
                  border: "1px solid rgba(255,255,255,0.15)", background: "#0a1628",
                  color: "white", fontSize: 13, boxSizing: "border-box",
                }}
              >
                <option value="patient">Patient (Upload & Control Records)</option>
                <option value="doctor">Doctor (Evaluate Policy & Decrypt)</option>
                <option value="education">Education (Student / Researcher)</option>
              </select>
            </div>

            {role === "doctor" && (
              <div>
                <label style={{ display: "block", fontSize: 11, fontWeight: 600, marginBottom: 4, color: "var(--gray-300)" }}>
                  Medical Specialty
                </label>
                <select
                  value={specialty}
                  onChange={(e) => setSpecialty(e.target.value)}
                  style={{
                    width: "100%", padding: "8px 12px", borderRadius: 8,
                    border: "1px solid rgba(255,255,255,0.15)", background: "#0a1628",
                    color: "white", fontSize: 13, boxSizing: "border-box",
                  }}
                >
                  <option value="Cardiology">Cardiology</option>
                  <option value="Neurology">Neurology</option>
                  <option value="Oncology">Oncology</option>
                  <option value="Pediatrics">Pediatrics</option>
                  <option value="Emergency Medicine">Emergency Medicine</option>
                  <option value="Radiology">Radiology</option>
                  <option value="General Surgery">General Surgery</option>
                </select>
              </div>
            )}

            <div>
              <label style={{ display: "block", fontSize: 11, fontWeight: 600, marginBottom: 4, color: "var(--gray-300)" }}>
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 6 characters"
                required
                style={{
                  width: "100%", padding: "8px 12px", borderRadius: 8,
                  border: "1px solid rgba(255,255,255,0.15)", background: "rgba(0,0,0,0.3)",
                  color: "white", fontSize: 13, boxSizing: "border-box",
                }}
              />
            </div>

            <button
              type="submit"
              disabled={busy}
              style={{
                marginTop: 6,
                padding: "10px",
                borderRadius: 8,
                border: "none",
                background: "var(--teal, #0891b2)",
                color: "white",
                fontWeight: 600,
                fontSize: 13,
                cursor: busy ? "not-allowed" : "pointer",
              }}
            >
              {busy ? "Registering..." : "Create Account →"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
