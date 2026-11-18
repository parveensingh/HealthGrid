"use client";

import Link from "next/link";

type NavItem = {
  label: string;
  icon: React.ReactNode;
  view: string;
};

type SidebarProps = {
  portalName: string;
  navItems: NavItem[];
  activeView: string;
  onNavigate: (view: string) => void;
  userLabel: string;
  onSignOut?: () => void;
  onSwitchAccount?: () => void;
};

export default function Sidebar({
  portalName,
  navItems,
  activeView,
  onNavigate,
  userLabel,
  onSignOut,
  onSwitchAccount,
}: SidebarProps) {
  return (
    <aside className="hg-sidebar">
      <div className="sidebar-brand">
        <Link href="/" style={{ textDecoration: "none", color: "inherit", display: "block" }}>
          <div className="sidebar-brand-logo">
            <div className="logo-mark">H</div>
            <div>
              <div className="sidebar-brand-name">HealthGrid</div>
              <div className="sidebar-brand-tagline">Connected Healthcare</div>
            </div>
          </div>
        </Link>
      </div>

      <div style={{ padding: "0 16px 12px" }}>
        <Link
          href="/"
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "8px 12px",
            borderRadius: 8,
            background: "rgba(8, 145, 178, 0.15)",
            border: "1px solid rgba(8, 145, 178, 0.35)",
            color: "var(--teal-light)",
            fontSize: 12,
            fontWeight: 600,
            textDecoration: "none",
            transition: "all 0.15s ease",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "rgba(8, 145, 178, 0.28)";
            e.currentTarget.style.borderColor = "var(--teal-light)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "rgba(8, 145, 178, 0.15)";
            e.currentTarget.style.borderColor = "rgba(8, 145, 178, 0.35)";
          }}
        >
          <span style={{ fontSize: 14 }}>←</span>
          <span>Back to Main Hub</span>
        </Link>
      </div>

      <div className="sidebar-portal-label">{portalName}</div>

      <nav className="sidebar-nav">
        {navItems.map((item) => (
          <button
            key={item.view}
            className={`sidebar-nav-item${activeView === item.view ? " active" : ""}`}
            onClick={() => onNavigate(item.view)}
          >
            <span className="nav-icon">{item.icon}</span>
            <span className="nav-label">{item.label}</span>
          </button>
        ))}
      </nav>

      <div className="sidebar-footer">
        <div style={{ marginBottom: 4, fontWeight: 600, color: "var(--white)", fontSize: 12 }}>
          {userLabel}
        </div>
        <div style={{ display: "flex", gap: 10, fontSize: 11, marginTop: 4 }}>
          {onSwitchAccount && (
            <button
              onClick={onSwitchAccount}
              style={{
                background: "none",
                border: "none",
                color: "var(--teal-light, #22d3ee)",
                cursor: "pointer",
                padding: 0,
                fontSize: 11,
                textDecoration: "underline",
              }}
            >
              Switch Account
            </button>
          )}
          {onSignOut && (
            <button
              onClick={onSignOut}
              style={{
                background: "none",
                border: "none",
                color: "#f87171",
                cursor: "pointer",
                padding: 0,
                fontSize: 11,
                textDecoration: "underline",
              }}
            >
              Sign Out
            </button>
          )}
        </div>
        <div style={{ marginTop: 8, fontSize: 10, color: "var(--gray-400)" }}>HealthGrid © 2026</div>
      </div>
    </aside>
  );
}
