import Link from "next/link";

export default function Home() {
  return (
    <main className="shell">
      <header className="topbar"><Link className="brand" href="/">SecureChain</Link><span className="demo-label">LOCAL DEMO</span></header>
      <section className="hero">
        <p className="eyebrow">MEDICAL RECORD ACCESS CONTROL</p>
        <h1>Private records.<br /><span>Clear permissions.</span></h1>
        <p className="hero-copy">A local demonstration of encrypted file storage, attribute-based access policies, and auditable actions.</p>
        <div className="portal-grid">
          <Link className="portal-card" href="/patient"><span className="portal-number">01</span><strong>Patient portal</strong><span>Upload, protect, and revoke records.</span><b>Open portal ↗</b></Link>
          <Link className="portal-card" href="/doctor"><span className="portal-number">02</span><strong>Doctor portal</strong><span>Review records allowed by your attributes.</span><b>Open portal ↗</b></Link>
          <Link className="portal-card" href="/admin"><span className="portal-number">03</span><strong>Admin console</strong><span>View seeded clinicians and audit events.</span><b>Open console ↗</b></Link>
        </div>
      </section>
      <p className="disclaimer">Prototype only: this build does not implement CP-ABE, user authentication, or HIPAA compliance.</p>
    </main>
  );
}
