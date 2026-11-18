"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import AuthModal from "@/components/AuthModal";
import {
  IconShieldCheck,
  IconActivity,
  IconLock,
  IconUser,
  IconStethoscope,
  IconSettings,
  IconGraduationCap,
} from "@/components/Icons";
import { AuthUser, clearSession, getCurrentUser } from "@/lib/auth";

export default function Home() {
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [showAuthModal, setShowAuthModal] = useState(false);

  useEffect(() => {
    setCurrentUser(getCurrentUser());
  }, []);

  const handleSignOut = () => {
    clearSession();
    setCurrentUser(null);
  };

  return (
    <div style={{ minHeight: "100vh", background: "var(--navy)", color: "var(--white)", fontFamily: "'Inter', sans-serif" }}>
      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        onSuccess={(u) => {
          setCurrentUser(u);
          setShowAuthModal(false);
        }}
      />

      {/* ── Top Navigation ─────────────────────────────────── */}
      <nav style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "0 48px", height: 72,
        borderBottom: "1px solid rgba(255,255,255,0.08)",
        position: "sticky", top: 0, zIndex: 50,
        background: "rgba(10,22,40,0.95)", backdropFilter: "blur(12px)",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{
            width: 36, height: 36, background: "linear-gradient(135deg, var(--teal), var(--teal-light))",
            borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center",
            fontFamily: "'Space Grotesk', sans-serif", fontWeight: 800, fontSize: 18, color: "white",
          }}>H</div>
          <span style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: 20, letterSpacing: "-0.5px" }}>
            HealthGrid
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 28, fontSize: 13, fontWeight: 500, color: "var(--gray-400)" }}>
          <Link href="/patient" style={{ transition: "color 0.15s" }}
            onMouseEnter={(e) => (e.currentTarget.style.color = "var(--teal-light)")}
            onMouseLeave={(e) => (e.currentTarget.style.color = "var(--gray-400)")}>
            Patient
          </Link>
          <Link href="/doctor" style={{ transition: "color 0.15s" }}
            onMouseEnter={(e) => (e.currentTarget.style.color = "var(--teal-light)")}
            onMouseLeave={(e) => (e.currentTarget.style.color = "var(--gray-400)")}>
            Doctor
          </Link>
          <Link href="/admin" style={{ transition: "color 0.15s" }}
            onMouseEnter={(e) => (e.currentTarget.style.color = "var(--teal-light)")}
            onMouseLeave={(e) => (e.currentTarget.style.color = "var(--gray-400)")}>
            Admin
          </Link>
          <Link href="/education" style={{ transition: "color 0.15s" }}
            onMouseEnter={(e) => (e.currentTarget.style.color = "var(--teal-light)")}
            onMouseLeave={(e) => (e.currentTarget.style.color = "var(--gray-400)")}>
            Education
          </Link>

          {currentUser ? (
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span
                style={{
                  padding: "4px 10px",
                  borderRadius: 16,
                  background: "rgba(8,145,178,0.2)",
                  color: "var(--teal-light)",
                  fontWeight: 600,
                  fontSize: 12,
                }}
              >
                👤 {currentUser.full_name || currentUser.username} ({currentUser.role})
              </span>
              <button
                onClick={handleSignOut}
                style={{
                  background: "transparent",
                  border: "1px solid rgba(255,255,255,0.15)",
                  color: "#fca5a5",
                  padding: "5px 12px",
                  borderRadius: 6,
                  fontSize: 12,
                  cursor: "pointer",
                }}
              >
                Sign Out
              </button>
            </div>
          ) : (
            <button
              onClick={() => setShowAuthModal(true)}
              style={{
                background: "var(--teal)", color: "white", padding: "8px 20px",
                border: "none", borderRadius: 8, fontWeight: 600, fontSize: 13,
                cursor: "pointer", transition: "background 0.15s",
              }}
            >
              Sign In / Switch →
            </button>
          )}
        </div>
      </nav>

      {/* ── Hero ───────────────────────────────────────────── */}
      <section style={{
        padding: "100px 48px 80px",
        background: `
          radial-gradient(ellipse at 20% 50%, rgba(8,145,178,0.15) 0%, transparent 60%),
          radial-gradient(ellipse at 80% 20%, rgba(34,211,238,0.08) 0%, transparent 50%),
          linear-gradient(180deg, var(--navy) 0%, var(--navy-mid) 100%)
        `,
        position: "relative", overflow: "hidden",
      }}>
        <div style={{
          position: "absolute", inset: 0,
          backgroundImage: "linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)",
          backgroundSize: "48px 48px", pointerEvents: "none",
        }} />

        <div style={{ maxWidth: 900, position: "relative" }}>
          <div style={{
            display: "inline-flex", alignItems: "center", gap: 8, padding: "6px 14px",
            borderRadius: 999, border: "1px solid rgba(8,145,178,0.4)", background: "rgba(8,145,178,0.1)",
            fontSize: 11, fontWeight: 600, color: "var(--teal-light)", letterSpacing: 1.5,
            textTransform: "uppercase", marginBottom: 24,
          }}>
            🏥 &nbsp; Attribute-Based Access Control · IPFS · Ethereum Smart Contracts
          </div>

          <h1 style={{
            fontFamily: "'Space Grotesk', sans-serif",
            fontSize: "clamp(48px, 7vw, 80px)",
            fontWeight: 800,
            lineHeight: 1.05,
            letterSpacing: "-2px",
            marginBottom: 24,
            background: "linear-gradient(135deg, #ffffff 0%, var(--teal-light) 100%)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
          }}>
            Decentralized Healthcare Data Sharing & Access Control
          </h1>

          <p style={{
            fontSize: 18,
            color: "var(--gray-300)",
            lineHeight: 1.7,
            maxWidth: 680,
            marginBottom: 40,
            fontWeight: 400,
          }}>
            HealthGrid delivers patient-sovereign electronic health record management. Medical files are protected at rest with
            authenticated AES-256-GCM encryption, pinned to IPFS, and governed by attribute-based access policies validated on Ethereum.
          </p>

          <div style={{ display: "flex", gap: 16, flexWrap: "wrap", alignItems: "center" }}>
            <Link href="/patient" style={{
              background: "var(--teal)", color: "white", padding: "14px 28px",
              borderRadius: 10, fontWeight: 600, fontSize: 14, textDecoration: "none",
              boxShadow: "0 8px 24px rgba(8,145,178,0.35)", transition: "all 0.15s",
            }}>
              Launch Patient Portal →
            </Link>
            <button
              onClick={() => setShowAuthModal(true)}
              style={{
                background: "rgba(255,255,255,0.06)", color: "white", padding: "14px 24px",
                borderRadius: 10, fontWeight: 600, fontSize: 14, border: "1px solid rgba(255,255,255,0.15)",
                cursor: "pointer",
              }}
            >
              Demo Personas & Login
            </button>
            <Link href="/education" style={{
              background: "transparent", color: "var(--teal-light)", padding: "14px 20px",
              fontWeight: 600, fontSize: 14, textDecoration: "none",
            }}>
              Explore CP-ABE Education →
            </Link>
          </div>
        </div>
      </section>

      {/* ── Key Features Bar ───────────────────────────────── */}
      <section style={{
        padding: "48px",
        borderTop: "1px solid rgba(255,255,255,0.06)",
        borderBottom: "1px solid rgba(255,255,255,0.06)",
        background: "rgba(10,22,40,0.6)",
      }}>
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
          gap: 32,
          maxWidth: 1200,
          margin: "0 auto",
        }}>
          <div style={{ display: "flex", gap: 16 }}>
            <div style={{
              width: 44, height: 44, borderRadius: 10, background: "rgba(8,145,178,0.15)",
              display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
            }}>
              <IconLock size={22} color="var(--teal)" />
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 4 }}>Authenticated AES-GCM</div>
              <div style={{ fontSize: 13, color: "var(--gray-400)", lineHeight: 1.6 }}>
                Each medical report is encrypted using unique HKDF-derived 256-bit keys with tamper-proof AAD authentication tags.
              </div>
            </div>
          </div>

          <div style={{ display: "flex", gap: 16 }}>
            <div style={{
              width: 44, height: 44, borderRadius: 10, background: "rgba(16,185,129,0.15)",
              display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
            }}>
              <IconShieldCheck size={22} color="var(--success)" />
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 4 }}>Attribute-Based Policies</div>
              <div style={{ fontSize: 13, color: "var(--gray-400)", lineHeight: 1.6 }}>
                Patients define fine-grained boolean policies (e.g. Role = Doctor AND Dept = Cardiology) evaluated dynamically against clinician attributes.
              </div>
            </div>
          </div>

          <div style={{ display: "flex", gap: 16 }}>
            <div style={{
              width: 44, height: 44, borderRadius: 10, background: "rgba(14,165,233,0.15)",
              display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
            }}>
              <IconActivity size={22} color="var(--info)" />
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 4 }}>Ethereum Smart Contracts</div>
              <div style={{ fontSize: 13, color: "var(--gray-400)", lineHeight: 1.6 }}>
                Three Solidity smart contracts manage record registry, patient access control, and an immutable audit trail.
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Four Portals ───────────────────────────────────── */}
      <section style={{ padding: "80px 48px", maxWidth: 1200, margin: "0 auto" }}>
        <div style={{ marginBottom: 48, textAlign: "center" }}>
          <div style={{
            fontSize: 12, fontWeight: 700, color: "var(--teal-light)",
            letterSpacing: 2, textTransform: "uppercase", marginBottom: 8,
          }}>
            Integrated Workspaces
          </div>
          <h2 style={{
            fontFamily: "'Space Grotesk', sans-serif", fontSize: 36,
            fontWeight: 800, letterSpacing: "-0.5px", margin: 0,
          }}>
            Choose Your Portal
          </h2>
        </div>

        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
          gap: 24,
        }}>
          {[
            {
              num: "01", href: "/patient", icon: <IconUser size={24} color="var(--teal)" />,
              title: "Patient Portal",
              desc: "Upload, protect, and revoke your medical records. Control exactly who can access your data.",
              color: "var(--teal)",
            },
            {
              num: "02", href: "/doctor", icon: <IconStethoscope size={24} color="var(--info)" />,
              title: "Doctor Portal",
              desc: "Review records you are authorized to access via your verified attributes and department.",
              color: "var(--info)",
            },
            {
              num: "03", href: "/admin", icon: <IconSettings size={24} color="var(--warning)" />,
              title: "Admin Console",
              desc: "Manage users, verify doctors, monitor the audit trail, and oversee the full system.",
              color: "var(--warning)",
            },
            {
              num: "04", href: "/education", icon: <IconGraduationCap size={24} color="var(--success)" />,
              title: "Education & Research",
              desc: "Students, interns, and researchers: access case libraries, training programs, and datasets.",
              color: "var(--success)",
            },
          ].map((portal) => (
            <Link key={portal.num} href={portal.href} style={{
              display: "block", padding: 28,
              background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: 16, transition: "border-color 0.2s, transform 0.2s, background 0.2s",
              color: "white", textDecoration: "none",
            }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLAnchorElement).style.borderColor = portal.color;
                (e.currentTarget as HTMLAnchorElement).style.transform = "translateY(-3px)";
                (e.currentTarget as HTMLAnchorElement).style.background = "rgba(255,255,255,0.06)";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLAnchorElement).style.borderColor = "rgba(255,255,255,0.08)";
                (e.currentTarget as HTMLAnchorElement).style.transform = "translateY(0)";
                (e.currentTarget as HTMLAnchorElement).style.background = "rgba(255,255,255,0.03)";
              }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
                <div style={{
                  width: 48, height: 48, borderRadius: 12,
                  background: `${portal.color}20`,
                  display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24,
                }}>
                  {portal.icon}
                </div>
                <span style={{ fontSize: 11, fontWeight: 600, color: portal.color, letterSpacing: 1 }}>
                  {portal.num}
                </span>
              </div>
              <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 20, fontWeight: 700, marginBottom: 8 }}>
                {portal.title}
              </div>
              <div style={{ color: "var(--gray-400)", fontSize: 13, lineHeight: 1.7, marginBottom: 20 }}>
                {portal.desc}
              </div>
              <div style={{ color: portal.color, fontSize: 13, fontWeight: 600 }}>
                Open portal →
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* ── Footer ─────────────────────────────────────────── */}
      <footer style={{
        padding: "32px 48px",
        borderTop: "1px solid rgba(255,255,255,0.08)",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        fontSize: 13, color: "var(--gray-400)",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, color: "var(--teal-light)" }}>
            HealthGrid
          </span>
          <span>© 2026 — Powering Connected Healthcare</span>
        </div>
        <div style={{ fontSize: 11, color: "var(--gray-500)" }}>
          Decentralized Healthcare Ecosystem · Secure Access Control
        </div>
      </footer>
    </div>
  );
}
