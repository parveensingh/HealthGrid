"use client";

import Link from "next/link";
import {
  IconShieldCheck,
  IconActivity,
  IconLock,
  IconUser,
  IconStethoscope,
  IconSettings,
  IconGraduationCap,
} from "@/components/Icons";

export default function Home() {
  return (
    <div style={{ minHeight: "100vh", background: "var(--navy)", color: "var(--white)", fontFamily: "'Inter', sans-serif" }}>
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
        <div style={{ display: "flex", alignItems: "center", gap: 32, fontSize: 13, fontWeight: 500, color: "var(--gray-400)" }}>
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
          <Link href="/patient" style={{
            background: "var(--teal)", color: "white", padding: "8px 20px",
            borderRadius: 8, fontWeight: 600, fontSize: 13, transition: "background 0.15s",
          }}>
            Enter Platform →
          </Link>
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
        {/* Grid pattern */}
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
            🏥 &nbsp; CP-ABE · IPFS · Blockchain
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
            backgroundClip: "text",
          }}>
            Secure Healthcare,<br />Connected & Trusted
          </h1>

          <p style={{
            fontSize: 18, color: "var(--gray-400)", lineHeight: 1.7,
            maxWidth: 540, marginBottom: 40,
          }}>
            HealthGrid delivers CP-ABE attribute-based encryption, IPFS distributed
            storage, and an on-chain audit trail — all in one unified healthcare platform.
          </p>

          <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
            <a href="#portals" style={{
              display: "inline-flex", alignItems: "center", gap: 8,
              padding: "14px 32px", borderRadius: 10,
              background: "linear-gradient(135deg, var(--teal), var(--teal-muted))",
              color: "white", fontWeight: 700, fontSize: 15,
              boxShadow: "0 4px 20px rgba(8,145,178,0.4)",
              transition: "transform 0.15s, box-shadow 0.15s",
            }}>
              Enter Platform →
            </a>
            <a href="#features" style={{
              display: "inline-flex", alignItems: "center", gap: 8,
              padding: "14px 32px", borderRadius: 10,
              border: "1px solid rgba(255,255,255,0.15)", background: "rgba(255,255,255,0.05)",
              color: "white", fontWeight: 600, fontSize: 15,
              transition: "background 0.15s",
            }}>
              Learn More
            </a>
          </div>

          {/* Stats */}
          <div style={{
            display: "flex", gap: 48, marginTop: 64, paddingTop: 48,
            borderTop: "1px solid rgba(255,255,255,0.08)",
          }}>
            {[["256-bit", "AES-GCM Encryption"], ["CP-ABE", "Policy Engine"], ["IPFS", "Distributed Storage"], ["On-Chain", "Audit Trail"]].map(([val, lbl]) => (
              <div key={lbl}>
                <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 22, fontWeight: 800, color: "var(--teal-light)" }}>{val}</div>
                <div style={{ fontSize: 12, color: "var(--gray-400)", marginTop: 2 }}>{lbl}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Features ───────────────────────────────────────── */}
      <section id="features" style={{ padding: "80px 48px", background: "var(--navy-mid)" }}>
        <div style={{ textAlign: "center", marginBottom: 56 }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: "var(--teal)", letterSpacing: 2, textTransform: "uppercase", marginBottom: 12 }}>
            TECHNOLOGY
          </div>
          <h2 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 36, fontWeight: 800, color: "white", marginBottom: 12 }}>
            Built for Healthcare Security
          </h2>
          <p style={{ color: "var(--gray-400)", fontSize: 15, maxWidth: 480, margin: "0 auto" }}>
            Enterprise-grade security primitives, purpose-built for medical records.
          </p>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 24, maxWidth: 1000, margin: "0 auto" }}>
          {[
            {
              icon: <IconShieldCheck size={36} color="var(--teal)" />,
              title: "Encrypted Storage",
              desc: "AES-256-GCM encryption at rest with IPFS distributed storage. Your records are encrypted before they ever leave your device.",
              tag: "AES-GCM + IPFS",
              color: "var(--teal)",
            },
            {
              icon: <IconActivity size={36} color="var(--info)" />,
              title: "Blockchain Audit",
              desc: "Every access event is hashed and committed to the blockchain. Tamper-proof audit trail you can trust and verify.",
              tag: "Tamper-Proof Trail",
              color: "var(--info)",
            },
            {
              icon: <IconLock size={36} color="var(--success)" />,
              title: "Attribute Access Control",
              desc: "CP-ABE policy engine allows fine-grained access control based on doctor role, department, and contextual attributes.",
              tag: "CP-ABE Engine",
              color: "var(--success)",
            },
          ].map((feat) => (
            <div key={feat.title} style={{
              background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: 16, padding: 32, transition: "border-color 0.2s, transform 0.2s",
            }}>
              <div style={{ marginBottom: 20 }}>{feat.icon}</div>
              <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 20, fontWeight: 700, color: "white", marginBottom: 12 }}>
                {feat.title}
              </div>
              <div style={{ color: "var(--gray-400)", fontSize: 13, lineHeight: 1.7, marginBottom: 16 }}>
                {feat.desc}
              </div>
              <div style={{
                display: "inline-block", padding: "4px 12px", borderRadius: 999,
                background: `${feat.color}20`, color: feat.color,
                fontSize: 11, fontWeight: 600,
              }}>
                {feat.tag}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Portal Cards ───────────────────────────────────── */}
      <section id="portals" style={{ padding: "80px 48px", background: "var(--navy)" }}>
        <div style={{ textAlign: "center", marginBottom: 56 }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: "var(--teal)", letterSpacing: 2, textTransform: "uppercase", marginBottom: 12 }}>
            PORTALS
          </div>
          <h2 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 36, fontWeight: 800, color: "white", marginBottom: 12 }}>
            Choose Your Portal
          </h2>
          <p style={{ color: "var(--gray-400)", fontSize: 15, maxWidth: 400, margin: "0 auto" }}>
            Four specialized portals designed for every healthcare stakeholder.
          </p>
        </div>

        <div style={{
          display: "grid", gridTemplateColumns: "repeat(2, 1fr)",
          gap: 20, maxWidth: 900, margin: "0 auto",
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
              color: "white",
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
