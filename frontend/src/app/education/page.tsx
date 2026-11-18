"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import Sidebar from "@/components/Sidebar";
import StatCard from "@/components/StatCard";
import DataTable from "@/components/DataTable";
import {
  IconDashboard,
  IconStethoscope,
  IconFileText,
  IconDatabase,
  IconActivity,
  IconGraduationCap,
  IconShieldCheck,
  IconUser,
  IconUsers,
} from "@/components/Icons";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:8001/api";

type RoleType = "student" | "intern" | "researcher";

type EduUser = {
  id: number;
  name: string;
  email: string;
  role: RoleType;
  institution: string;
  academic_purpose: string;
  status: "pending" | "verified" | "rejected";
  created_at: string;
  verified_at?: string | null;
};

type Specialty = {
  id: number;
  name: string;
  description: string;
  icon: string;
};

type Quiz = {
  id: number;
  question: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
};

type CaseStudy = {
  id: number;
  title: string;
  specialty: Specialty | null;
  description: string;
  anonymized_content: string;
  difficulty: "beginner" | "intermediate" | "advanced";
  is_active: boolean;
  created_at: string;
  quizzes?: Quiz[];
};

type DatasetRequest = {
  id: number;
  requester: { id: number; name: string; email: string };
  specialty: Specialty | null;
  research_objective: string;
  status: "pending" | "approved" | "rejected";
  admin_note?: string;
  created_at: string;
  reviewed_at?: string | null;
};

type TrainingProgram = {
  id: number;
  name: string;
  description: string;
  specialty: Specialty | null;
  supervising_doctor?: { id: number; name: string } | null;
  is_active: boolean;
  created_at: string;
};

type InternAssignment = {
  id: number;
  intern: EduUser;
  program: TrainingProgram;
  assigned_at: string;
  completed: boolean;
  feedback: string;
};

type UserProgress = {
  user_id: number;
  total_attempts: number;
  total_correct: number;
  accuracy_pct: number;
  by_case: Array<{ case_id: number; title: string; total: number; correct: number }>;
};

type Notification = {
  id: number;
  user_email: string;
  title: string;
  message: string;
  is_read: boolean;
  created_at: string;
};

async function getError(res: Response): Promise<string> {
  try {
    const d = await res.json();
    return d.error ?? "Request failed.";
  } catch {
    return "Request failed.";
  }
}

export default function EducationPage() {
  // Current active user stored in state & localStorage
  const [user, setUser] = useState<EduUser | null>(null);
  const [view, setView] = useState("dashboard");

  // Registration & Login state
  const [authRole, setAuthRole] = useState<RoleType>("student");
  const [regName, setRegName] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regInstitution, setRegInstitution] = useState("");
  const [regPurpose, setRegPurpose] = useState("");
  const [registeredUsers, setRegisteredUsers] = useState<EduUser[]>([]);

  // Core Data
  const [specialties, setSpecialties] = useState<Specialty[]>([]);
  const [cases, setCases] = useState<CaseStudy[]>([]);
  const [selectedCase, setSelectedCase] = useState<CaseStudy | null>(null);
  const [datasetRequests, setDatasetRequests] = useState<DatasetRequest[]>([]);
  const [trainingPrograms, setTrainingPrograms] = useState<TrainingProgram[]>([]);
  const [assignments, setAssignments] = useState<InternAssignment[]>([]);
  const [progress, setProgress] = useState<UserProgress | null>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);

  // Filtering & Search
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSpecialtyFilter, setSelectedSpecialtyFilter] = useState("");
  const [selectedDifficultyFilter, setSelectedDifficultyFilter] = useState("");

  // Quiz state: case_id -> { quiz_id -> selected_option }
  const [quizAnswers, setQuizAnswers] = useState<Record<number, string>>({});
  const [quizResults, setQuizResults] = useState<Record<number, { is_correct: boolean; correct_option: string }>>({});

  // Dataset Request Form modal / inline
  const [reqSpecialtyId, setReqSpecialtyId] = useState("");
  const [reqObjective, setReqObjective] = useState("");

  // Intern Feedback form
  const [internSubmission, setInternSubmission] = useState("");
  const [internSubmittedMsg, setInternSubmittedMsg] = useState("");

  // UI state
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<{ type: "success" | "error" | "info"; msg: string } | null>(null);
  const [showDatasetModal, setShowDatasetModal] = useState(false);

  // Load registered users from API on mount
  const loadUsers = useCallback(async () => {
    try {
      const res = await fetch(`${API}/education/users/`);
      if (res.ok) {
        const data: EduUser[] = await res.json();
        setRegisteredUsers(data);
        return data;
      }
    } catch {
      // Backend may be offline or initializing
    }
    return [];
  }, []);

  // Initialize active user from localStorage or existing users
  useEffect(() => {
    const init = async () => {
      const usersList = await loadUsers();
      const savedUserStr = localStorage.getItem("hg_education_user");
      if (savedUserStr) {
        try {
          const parsed = JSON.parse(savedUserStr);
          // Find updated user from server if possible
          const found = usersList.find((u) => u.id === parsed.id || u.email === parsed.email);
          setUser(found ?? parsed);
        } catch {
          localStorage.removeItem("hg_education_user");
        }
      }
    };
    void init();
  }, [loadUsers]);

  // Load portal data based on user role and selections
  const loadPortalData = useCallback(async () => {
    setLoading(true);
    try {
      const [specRes, caseRes, progRes, reqRes] = await Promise.all([
        fetch(`${API}/education/specialties/`),
        fetch(`${API}/education/cases/`),
        fetch(`${API}/education/programs/`),
        fetch(`${API}/education/dataset-requests/`),
      ]);

      if (specRes.ok) setSpecialties(await specRes.json());
      if (caseRes.ok) setCases(await caseRes.json());
      if (progRes.ok) setTrainingPrograms(await progRes.json());
      if (reqRes.ok) setDatasetRequests(await reqRes.json());

      if (user) {
        // Load user progress
        const progResp = await fetch(`${API}/education/progress/${user.id}/`);
        if (progResp.ok) setProgress(await progResp.json());

        // Load notifications
        const notifResp = await fetch(`${API}/education/notifications/${encodeURIComponent(user.email)}/`);
        if (notifResp.ok) setNotifications(await notifResp.json());

        // Load intern assignments if intern
        if (user.role === "intern") {
          const assignResp = await fetch(`${API}/education/intern-assignments/?intern_id=${user.id}`);
          if (assignResp.ok) setAssignments(await assignResp.json());
        }
      }
    } catch {
      // silent or handled in UI
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    void loadPortalData();
  }, [loadPortalData]);

  // Select user / Login
  function handleSelectUser(u: EduUser) {
    setUser(u);
    localStorage.setItem("hg_education_user", JSON.stringify(u));
    setView("dashboard");
    setNotice({ type: "success", msg: `Logged in as ${u.name} (${u.role.toUpperCase()})` });
  }

  // Logout / Switch User
  function handleLogout() {
    setUser(null);
    localStorage.removeItem("hg_education_user");
    setSelectedCase(null);
    setView("dashboard");
  }

  // Register new user
  async function handleRegister(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setNotice(null);
    try {
      const res = await fetch(`${API}/education/users/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: regName,
          email: regEmail,
          role: authRole,
          institution: regInstitution,
          academic_purpose: regPurpose,
        }),
      });

      if (!res.ok) throw new Error(await getError(res));
      const createdUser: EduUser = await res.json();
      setUser(createdUser);
      localStorage.setItem("hg_education_user", JSON.stringify(createdUser));
      setRegName("");
      setRegEmail("");
      setRegInstitution("");
      setRegPurpose("");
      await loadUsers();
      setNotice({
        type: "success",
        msg: `Welcome to HealthGrid, ${createdUser.name}! Your account is registered as ${createdUser.role.toUpperCase()}. An administrator will verify your credentials.`,
      });
      setView("dashboard");
    } catch (err) {
      setNotice({ type: "error", msg: err instanceof Error ? err.message : "Registration failed." });
    } finally {
      setBusy(false);
    }
  }

  // Open Case Study detail
  async function openCaseDetail(caseId: number) {
    setLoading(true);
    try {
      const res = await fetch(`${API}/education/cases/${caseId}/`);
      if (!res.ok) throw new Error(await getError(res));
      const detailedCase: CaseStudy = await res.json();
      setSelectedCase(detailedCase);
      setQuizAnswers({});
      setQuizResults({});
      setView("case-detail");
    } catch (err) {
      setNotice({ type: "error", msg: err instanceof Error ? err.message : "Failed to load case study." });
    } finally {
      setLoading(false);
    }
  }

  // Submit quiz answer
  async function handleQuizSubmit(quizId: number) {
    if (!user) {
      setNotice({ type: "error", msg: "Please register or select an active user first." });
      return;
    }
    const selectedOption = quizAnswers[quizId];
    if (!selectedOption) {
      setNotice({ type: "error", msg: "Select an option before submitting." });
      return;
    }

    try {
      const res = await fetch(`${API}/education/quiz-attempt/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: user.id,
          quiz_id: quizId,
          selected_option: selectedOption,
        }),
      });
      if (!res.ok) throw new Error(await getError(res));
      const result = await res.json();
      setQuizResults((prev) => ({
        ...prev,
        [quizId]: { is_correct: result.is_correct, correct_option: result.correct_option },
      }));

      // refresh user progress
      const progResp = await fetch(`${API}/education/progress/${user.id}/`);
      if (progResp.ok) setProgress(await progResp.json());
    } catch (err) {
      setNotice({ type: "error", msg: err instanceof Error ? err.message : "Submission failed." });
    }
  }

  // Submit Dataset Request
  async function handleDatasetRequest(e: FormEvent) {
    e.preventDefault();
    if (!user) return;
    setBusy(true);
    setNotice(null);
    try {
      const body: Record<string, unknown> = {
        requester_id: user.id,
        research_objective: reqObjective,
      };
      if (reqSpecialtyId) body.specialty_id = Number(reqSpecialtyId);

      const res = await fetch(`${API}/education/dataset-requests/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) throw new Error(await getError(res));
      setReqObjective("");
      setReqSpecialtyId("");
      setShowDatasetModal(false);
      setNotice({
        type: "success",
        msg: "Dataset request submitted successfully. Admin review is pending.",
      });
      await loadPortalData();
    } catch (err) {
      setNotice({ type: "error", msg: err instanceof Error ? err.message : "Request failed." });
    } finally {
      setBusy(false);
    }
  }

  // Submit intern exercise answers
  function handleInternExerciseSubmit(e: FormEvent) {
    e.preventDefault();
    if (!internSubmission.trim()) return;
    setInternSubmittedMsg("Case evaluation and findings recorded. Supervising doctor will review.");
    setInternSubmission("");
  }

  // Filtered case studies
  const filteredCases = cases.filter((c) => {
    const matchesSearch =
      c.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesSpecialty = selectedSpecialtyFilter
      ? c.specialty?.name === selectedSpecialtyFilter
      : true;
    const matchesDifficulty = selectedDifficultyFilter
      ? c.difficulty === selectedDifficultyFilter
      : true;
    return matchesSearch && matchesSpecialty && matchesDifficulty;
  });

  // Role-specific nav items
  const navItems = user
    ? user.role === "student"
      ? [
          { label: "Dashboard", icon: <IconDashboard size={18} />, view: "dashboard" },
          { label: "Specialties", icon: <IconStethoscope size={18} />, view: "specialties" },
          { label: "Case Library", icon: <IconFileText size={18} />, view: "cases" },
          { label: "My Requests", icon: <IconDatabase size={18} />, view: "dataset-requests" },
          { label: "Learning Progress", icon: <IconActivity size={18} />, view: "progress" },
          { label: "De-identified Data", icon: <IconShieldCheck size={18} />, view: "datasets" },
        ]
      : user.role === "intern"
      ? [
          { label: "Dashboard", icon: <IconDashboard size={18} />, view: "dashboard" },
          { label: "Training Programs", icon: <IconShieldCheck size={18} />, view: "programs" },
          { label: "Clinical Cases", icon: <IconFileText size={18} />, view: "cases" },
          { label: "Case Exercises", icon: <IconGraduationCap size={18} />, view: "exercises" },
          { label: "Doctor Feedback", icon: <IconUser size={18} />, view: "feedback" },
          { label: "My Progress", icon: <IconActivity size={18} />, view: "progress" },
        ]
      : [
          // researcher
          { label: "Dashboard", icon: <IconDashboard size={18} />, view: "dashboard" },
          { label: "Available Datasets", icon: <IconDatabase size={18} />, view: "datasets" },
          { label: "Dataset Requests", icon: <IconFileText size={18} />, view: "dataset-requests" },
          { label: "Aggregate Statistics", icon: <IconActivity size={18} />, view: "stats" },
          { label: "Specialties Catalog", icon: <IconStethoscope size={18} />, view: "specialties" },
        ]
    : [
        { label: "Welcome & Register", icon: <IconUsers size={18} />, view: "auth" },
        { label: "Specialties", icon: <IconStethoscope size={18} />, view: "specialties" },
        { label: "Case Studies", icon: <IconFileText size={18} />, view: "cases" },
      ];

  // If no user is logged in, show Auth / Select screen
  if (!user) {
    return (
      <div className="hg-shell">
        <Sidebar
          portalName="Education & Research"
          navItems={navItems}
          activeView={view}
          onNavigate={setView}
          userLabel="Guest Portal"
        />

        <div className="hg-main">
          <header className="hg-topbar">
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <span style={{ fontSize: 18, fontWeight: 700 }}>Education & Research Portal</span>
              <span className="role-badge role-badge-education">
                <IconGraduationCap size={15} color="#047857" />
                Academic Suite
              </span>
            </div>
            <div style={{ display: "flex", gap: 16 }}>
              <Link href="/" className="btn btn-secondary" style={{ padding: "6px 14px", fontSize: 13 }}>
                ← Main Hub
              </Link>
            </div>
          </header>

          <main className="hg-content">
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
                }}
              >
                {notice.msg}
              </div>
            )}

            <div style={{ marginBottom: 32 }}>
              <h1 style={{ fontSize: 28, marginBottom: 8 }}>Welcome to HealthGrid Academic Hub</h1>
              <p style={{ color: "var(--gray-500)", fontSize: 15 }}>
                Access de-identified medical datasets, clinical case libraries, specialized training programs,
                and accredited healthcare research tools.
              </p>
            </div>

            {/* Quick Switch from existing seeded/registered users */}
            {registeredUsers.length > 0 && (
              <div className="hg-card" style={{ marginBottom: 32 }}>
                <div className="hg-card-title" style={{ fontSize: 16, marginBottom: 16 }}>
                  ⚡ Quick Demo Login — Select Existing Profile
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 16 }}>
                  {registeredUsers.map((u) => (
                    <div
                      key={u.id}
                      onClick={() => handleSelectUser(u)}
                      style={{
                        padding: 16,
                        borderRadius: 8,
                        border: "1px solid var(--gray-200)",
                        background: "var(--white)",
                        cursor: "pointer",
                        transition: "all 0.15s ease",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.borderColor = "var(--teal)";
                        e.currentTarget.style.boxShadow = "0 4px 12px rgba(8,145,178,0.12)";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.borderColor = "var(--gray-200)";
                        e.currentTarget.style.boxShadow = "none";
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 }}>
                        <strong style={{ fontSize: 15, color: "var(--navy)" }}>{u.name}</strong>
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
                      </div>
                      <div style={{ fontSize: 12, color: "var(--teal-muted)", fontWeight: 600, textTransform: "capitalize", marginBottom: 4 }}>
                        Role: {u.role}
                      </div>
                      <div style={{ fontSize: 12, color: "var(--gray-500)" }}>{u.institution || "HealthGrid Academy"}</div>
                      <button
                        className="btn btn-secondary"
                        style={{ marginTop: 12, width: "100%", padding: "6px 12px", fontSize: 12 }}
                      >
                        Enter as {u.role} →
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Registration Form */}
            <div className="hg-card" style={{ maxWidth: 720 }}>
              <div className="hg-card-title" style={{ fontSize: 18, marginBottom: 8 }}>
                New User Registration
              </div>
              <p style={{ color: "var(--gray-500)", fontSize: 13, marginBottom: 20 }}>
                Select your academic role to register. Your application will be sent to the administrator for verification.
              </p>

              {/* Role Selector Tabs */}
              <div style={{ display: "flex", gap: 12, marginBottom: 24 }}>
                {[
                  { key: "student", label: "Medical Student", icon: "🎓" },
                  { key: "intern", label: "Medical Intern", icon: "🩺" },
                  { key: "researcher", label: "Clinical Researcher", icon: "🔬" },
                ].map((item) => (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => setAuthRole(item.key as RoleType)}
                    className={`btn ${authRole === item.key ? "btn-primary" : "btn-secondary"}`}
                    style={{ flex: 1, padding: "12px 16px", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}
                  >
                    <span>{item.icon}</span>
                    <span>{item.label}</span>
                  </button>
                ))}
              </div>

              <form onSubmit={handleRegister}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
                  <div>
                    <label className="hg-label">Full Name</label>
                    <input
                      required
                      className="hg-input"
                      placeholder="e.g. Maya Chen"
                      value={regName}
                      onChange={(e) => setRegName(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="hg-label">Academic Email</label>
                    <input
                      required
                      type="email"
                      className="hg-input"
                      placeholder="e.g. m.chen@med.edu"
                      value={regEmail}
                      onChange={(e) => setRegEmail(e.target.value)}
                    />
                  </div>
                </div>

                <div style={{ marginBottom: 16 }}>
                  <label className="hg-label">University / Medical Institution</label>
                  <input
                    required
                    className="hg-input"
                    placeholder="e.g. St. Jude Medical University & Hospital"
                    value={regInstitution}
                    onChange={(e) => setRegInstitution(e.target.value)}
                  />
                </div>

                <div style={{ marginBottom: 24 }}>
                  <label className="hg-label">
                    {authRole === "student"
                      ? "Academic Study Purpose"
                      : authRole === "intern"
                      ? "Clinical Rotation Department & Goals"
                      : "Research Objectives & Ethics Approval Details"}
                  </label>
                  <textarea
                    required
                    className="hg-textarea"
                    rows={3}
                    placeholder="Provide your educational goals or clinical focus..."
                    value={regPurpose}
                    onChange={(e) => setRegPurpose(e.target.value)}
                  />
                </div>

                <button type="submit" disabled={busy} className="btn btn-primary" style={{ width: "100%", padding: "12px 20px" }}>
                  {busy ? "Submitting Registration…" : `Register as ${authRole.toUpperCase()}`}
                </button>
              </form>
            </div>
          </main>
        </div>
      </div>
    );
  }

  // RENDER PORTAL FOR AUTHENTICATED USER
  return (
    <div className="hg-shell">
      <Sidebar
        portalName={`Education (${user.role.toUpperCase()})`}
        navItems={navItems}
        activeView={view}
        onNavigate={setView}
        userLabel={`${user.name} · ${user.institution || "HealthGrid"}`}
      />

      <div className="hg-main">
        {/* Topbar */}
        <header className="hg-topbar">
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <span style={{ fontSize: 16, fontWeight: 700 }}>
              {user.role === "student"
                ? "Medical Student Learning Suite"
                : user.role === "intern"
                ? "Medical Intern Clinical Workspace"
                : "Clinical Research & Dataset Portal"}
            </span>
            <span
              className={`badge ${
                user.status === "verified"
                  ? "badge-success"
                  : user.status === "rejected"
                  ? "badge-danger"
                  : "badge-warning"
              }`}
            >
              {user.status === "verified" ? "✓ Verified Credential" : user.status === "pending" ? "⏳ Pending Admin Approval" : "✕ Rejected"}
            </span>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <div style={{ fontSize: 13, color: "var(--gray-500)" }}>
              Signed in as <strong>{user.name}</strong>
            </div>
            <button
              onClick={handleLogout}
              className="btn btn-ghost"
              style={{ fontSize: 12, padding: "6px 12px", border: "1px solid var(--gray-200)" }}
            >
              Switch Role / Exit
            </button>
            <Link href="/" className="btn btn-secondary" style={{ fontSize: 12, padding: "6px 12px" }}>
              ← Hub
            </Link>
          </div>
        </header>

        <main className="hg-content">
          {/* Notifications banner / Notice */}
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

          {/* Pending verification advisory if user is pending */}
          {user.status !== "verified" && (
            <div
              style={{
                background: "#fef3c7",
                border: "1px solid #fde68a",
                borderRadius: 8,
                padding: "12px 18px",
                marginBottom: 24,
                color: "#92400e",
                fontSize: 13,
                display: "flex",
                alignItems: "center",
                gap: 12,
              }}
            >
              <span style={{ fontSize: 20 }}>⚠️</span>
              <div>
                <strong>Account Pending Verification:</strong> Your registration has been submitted to the Admin Portal.
                You can browse public cases and review training curriculum while your verified academic credentials are being reviewed.
              </div>
            </div>
          )}

          {/* ========================================================
              VIEW: DASHBOARD
              ======================================================== */}
          {view === "dashboard" && (
            <div>
              {/* Stat Cards */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 20, marginBottom: 28 }}>
                <StatCard
                  icon="📚"
                  number={cases.length}
                  label="Clinical Case Studies"
                  trend="De-identified Cases"
                  borderColor="var(--teal)"
                />
                <StatCard
                  icon="🩺"
                  number={specialties.length}
                  label="Medical Specialties"
                  trend="Active Curriculums"
                  borderColor="var(--teal-light)"
                />
                {user.role === "student" && (
                  <StatCard
                    icon="🎯"
                    number={`${progress?.accuracy_pct ?? 0}%`}
                    label="Quiz Accuracy Rate"
                    trend={`${progress?.total_attempts ?? 0} Questions Taken`}
                    borderColor="var(--success)"
                  />
                )}
                {user.role === "intern" && (
                  <StatCard
                    icon="🏥"
                    number={assignments.length || trainingPrograms.length}
                    label="Clinical Programs"
                    trend="Hospital Rotations"
                    borderColor="var(--info)"
                  />
                )}
                {user.role === "researcher" && (
                  <StatCard
                    icon="📦"
                    number={datasetRequests.filter((r) => r.requester.id === user.id).length}
                    label="My Dataset Requests"
                    trend={`${datasetRequests.filter((r) => r.requester.id === user.id && r.status === "approved").length} Approved`}
                    borderColor="var(--warning)"
                  />
                )}
                <StatCard
                  icon="🛡️"
                  number={user.status.toUpperCase()}
                  label="Academic Access Tier"
                  trend="CP-ABE De-identified"
                  borderColor="var(--navy)"
                />
              </div>

              {/* Main Dashboard Cards */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24, marginBottom: 28 }}>
                {/* Left Card: Featured Cases */}
                <div className="hg-card">
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                    <div className="hg-card-title">Featured Case Studies</div>
                    <button onClick={() => setView("cases")} className="btn btn-ghost" style={{ fontSize: 12 }}>
                      View All ({cases.length}) →
                    </button>
                  </div>

                  <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                    {cases.slice(0, 4).map((c) => (
                      <div
                        key={c.id}
                        onClick={() => openCaseDetail(c.id)}
                        style={{
                          padding: 12,
                          borderRadius: 8,
                          background: "var(--gray-50)",
                          border: "1px solid var(--gray-200)",
                          cursor: "pointer",
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          transition: "border-color 0.15s ease",
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.borderColor = "var(--teal)")}
                        onMouseLeave={(e) => (e.currentTarget.style.borderColor = "var(--gray-200)")}
                      >
                        <div>
                          <strong style={{ fontSize: 13, color: "var(--navy)" }}>{c.title}</strong>
                          <div style={{ fontSize: 11, color: "var(--gray-500)", marginTop: 2 }}>
                            {c.specialty?.name} · Difficulty:{" "}
                            <span style={{ textTransform: "capitalize", fontWeight: 600 }}>{c.difficulty}</span>
                          </div>
                        </div>
                        <span style={{ fontSize: 12, color: "var(--teal)", fontWeight: 600 }}>Study Case →</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Right Card: Role-Specific Action Board */}
                <div className="hg-card">
                  {user.role === "student" && (
                    <div>
                      <div className="hg-card-title" style={{ marginBottom: 16 }}>
                        Learning Progress & Quizzes
                      </div>
                      <div style={{ marginBottom: 16 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 6 }}>
                          <span>Overall Mastery</span>
                          <strong>{progress?.accuracy_pct ?? 0}%</strong>
                        </div>
                        <div style={{ width: "100%", height: 8, background: "var(--gray-200)", borderRadius: 999, overflow: "hidden" }}>
                          <div
                            style={{
                              width: `${progress?.accuracy_pct ?? 0}%`,
                              height: "100%",
                              background: "linear-gradient(90deg, var(--teal), var(--teal-light))",
                              borderRadius: 999,
                            }}
                          />
                        </div>
                      </div>

                      <div style={{ fontSize: 13, color: "var(--gray-500)", marginBottom: 16 }}>
                        Completed <strong>{progress?.total_correct ?? 0}</strong> correct answers out of{" "}
                        <strong>{progress?.total_attempts ?? 0}</strong> question attempts across medical case studies.
                      </div>

                      <div style={{ display: "flex", gap: 12 }}>
                        <button onClick={() => setView("cases")} className="btn btn-primary" style={{ fontSize: 13 }}>
                          Practice Cases
                        </button>
                        <button onClick={() => setShowDatasetModal(true)} className="btn btn-secondary" style={{ fontSize: 13 }}>
                          Request Dataset
                        </button>
                      </div>
                    </div>
                  )}

                  {user.role === "intern" && (
                    <div>
                      <div className="hg-card-title" style={{ marginBottom: 16 }}>
                        Active Clinical Programs
                      </div>
                      <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 16 }}>
                        {trainingPrograms.slice(0, 3).map((p) => (
                          <div
                            key={p.id}
                            style={{
                              padding: 12,
                              borderRadius: 6,
                              background: "var(--gray-50)",
                              border: "1px solid var(--gray-200)",
                            }}
                          >
                            <div style={{ fontWeight: 600, fontSize: 13 }}>{p.name}</div>
                            <div style={{ fontSize: 11, color: "var(--gray-500)" }}>
                              Specialty: {p.specialty?.name} · Supervisor: {p.supervising_doctor?.name ?? "Attending Physician"}
                            </div>
                          </div>
                        ))}
                      </div>

                      <div style={{ display: "flex", gap: 12 }}>
                        <button onClick={() => setView("exercises")} className="btn btn-primary" style={{ fontSize: 13 }}>
                          Record Observations
                        </button>
                        <button onClick={() => setView("feedback")} className="btn btn-secondary" style={{ fontSize: 13 }}>
                          View Supervisor Notes
                        </button>
                      </div>
                    </div>
                  )}

                  {user.role === "researcher" && (
                    <div>
                      <div className="hg-card-title" style={{ marginBottom: 16 }}>
                        Cohort Research Workspace
                      </div>
                      <p style={{ fontSize: 13, color: "var(--gray-500)", marginBottom: 16 }}>
                        Query HIPAA-compliant synthetic cohorts and de-identified clinical datasets. Submit research proposals
                        for IRB and administrator sign-off.
                      </p>
                      <div style={{ display: "flex", gap: 12 }}>
                        <button onClick={() => setShowDatasetModal(true)} className="btn btn-primary" style={{ fontSize: 13 }}>
                          Submit Proposal / Dataset Request
                        </button>
                        <button onClick={() => setView("stats")} className="btn btn-secondary" style={{ fontSize: 13 }}>
                          View Aggregate Metrics
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Specialties Overview Grid */}
              <div className="hg-card">
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                  <div className="hg-card-title">Medical Specialties & Departments</div>
                  <button onClick={() => setView("specialties")} className="btn btn-ghost" style={{ fontSize: 12 }}>
                    Browse All Specialties →
                  </button>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16 }}>
                  {specialties.map((s) => (
                    <div
                      key={s.id}
                      onClick={() => {
                        setSelectedSpecialtyFilter(s.name);
                        setView("cases");
                      }}
                      style={{
                        padding: 16,
                        borderRadius: 8,
                        border: "1px solid var(--gray-200)",
                        background: "var(--white)",
                        cursor: "pointer",
                        transition: "all 0.15s",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.borderColor = "var(--teal)";
                        e.currentTarget.style.transform = "translateY(-2px)";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.borderColor = "var(--gray-200)";
                        e.currentTarget.style.transform = "none";
                      }}
                    >
                      <div style={{ fontSize: 24, marginBottom: 6 }}>🩺</div>
                      <strong style={{ fontSize: 14, color: "var(--navy)" }}>{s.name}</strong>
                      <p style={{ fontSize: 12, color: "var(--gray-500)", marginTop: 4 }}>{s.description}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ========================================================
              VIEW: SPECIALTIES
              ======================================================== */}
          {view === "specialties" && (
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
                <div>
                  <h2 style={{ fontSize: 22 }}>Medical Specialties</h2>
                  <p style={{ color: "var(--gray-500)", fontSize: 13 }}>
                    Explore clinical areas, case libraries, and specialized educational modules.
                  </p>
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 20 }}>
                {specialties.map((s) => (
                  <div key={s.id} className="hg-card" style={{ display: "flex", flexDirection: "column" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
                      <div
                        style={{
                          width: 44,
                          height: 44,
                          borderRadius: 8,
                          background: "var(--mint)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: 22,
                        }}
                      >
                        🩺
                      </div>
                      <div>
                        <strong style={{ fontSize: 16, color: "var(--navy)" }}>{s.name}</strong>
                        <div style={{ fontSize: 11, color: "var(--teal)" }}>
                          {cases.filter((c) => c.specialty?.name === s.name).length} Case Studies Available
                        </div>
                      </div>
                    </div>

                    <p style={{ fontSize: 13, color: "var(--gray-500)", flex: 1, marginBottom: 16 }}>{s.description}</p>

                    <button
                      onClick={() => {
                        setSelectedSpecialtyFilter(s.name);
                        setView("cases");
                      }}
                      className="btn btn-secondary"
                      style={{ width: "100%", fontSize: 12 }}
                    >
                      Browse Cases in {s.name} →
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ========================================================
              VIEW: CASE LIBRARY / CASES
              ======================================================== */}
          {view === "cases" && (
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
                <div>
                  <h2 style={{ fontSize: 22 }}>Clinical Case Study Library</h2>
                  <p style={{ color: "var(--gray-500)", fontSize: 13 }}>
                    De-identified patient case studies for medical students and interns. Includes multi-choice evaluation quizzes.
                  </p>
                </div>
              </div>

              {/* Filters */}
              <div
                style={{
                  display: "flex",
                  gap: 16,
                  alignItems: "center",
                  background: "var(--white)",
                  padding: 16,
                  borderRadius: 8,
                  border: "1px solid var(--gray-200)",
                  marginBottom: 20,
                  flexWrap: "wrap",
                }}
              >
                <div style={{ flex: 1, minWidth: 200 }}>
                  <input
                    className="hg-input"
                    placeholder="Search case studies by keywords..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
                <div style={{ width: 180 }}>
                  <select
                    className="hg-select"
                    value={selectedSpecialtyFilter}
                    onChange={(e) => setSelectedSpecialtyFilter(e.target.value)}
                  >
                    <option value="">All Specialties</option>
                    {specialties.map((s) => (
                      <option key={s.id} value={s.name}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div style={{ width: 160 }}>
                  <select
                    className="hg-select"
                    value={selectedDifficultyFilter}
                    onChange={(e) => setSelectedDifficultyFilter(e.target.value)}
                  >
                    <option value="">All Difficulties</option>
                    <option value="beginner">Beginner</option>
                    <option value="intermediate">Intermediate</option>
                    <option value="advanced">Advanced</option>
                  </select>
                </div>
                {(searchQuery || selectedSpecialtyFilter || selectedDifficultyFilter) && (
                  <button
                    onClick={() => {
                      setSearchQuery("");
                      setSelectedSpecialtyFilter("");
                      setSelectedDifficultyFilter("");
                    }}
                    className="btn btn-ghost"
                    style={{ fontSize: 12 }}
                  >
                    Clear Filters
                  </button>
                )}
              </div>

              {/* Cases List */}
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                {filteredCases.length === 0 ? (
                  <div className="hg-card" style={{ textAlign: "center", padding: 48, color: "var(--gray-500)" }}>
                    No case studies match your query criteria.
                  </div>
                ) : (
                  filteredCases.map((c) => (
                    <div
                      key={c.id}
                      className="hg-card"
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        gap: 20,
                      }}
                    >
                      <div style={{ flex: 1 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
                          <span className="badge badge-info">{c.specialty?.name ?? "General Medicine"}</span>
                          <span
                            className={`badge ${
                              c.difficulty === "beginner"
                                ? "badge-success"
                                : c.difficulty === "intermediate"
                                ? "badge-warning"
                                : "badge-danger"
                            }`}
                          >
                            {c.difficulty}
                          </span>
                        </div>
                        <h3 style={{ fontSize: 16, marginBottom: 6 }}>{c.title}</h3>
                        <p style={{ fontSize: 13, color: "var(--gray-500)", lineHeight: 1.5 }}>{c.description}</p>
                      </div>

                      <button
                        onClick={() => openCaseDetail(c.id)}
                        className="btn btn-primary"
                        style={{ padding: "8px 18px", fontSize: 13, whiteSpace: "nowrap" }}
                      >
                        Open Case Study →
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* ========================================================
              VIEW: CASE DETAIL & QUIZ
              ======================================================== */}
          {view === "case-detail" && selectedCase && (
            <div>
              <button
                onClick={() => setView("cases")}
                className="btn btn-ghost"
                style={{ marginBottom: 16, fontSize: 13, padding: "4px 8px" }}
              >
                ← Back to Case Library
              </button>

              <div className="hg-card" style={{ marginBottom: 24 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                  <span className="badge badge-info">{selectedCase.specialty?.name}</span>
                  <span className="badge badge-warning" style={{ textTransform: "capitalize" }}>
                    {selectedCase.difficulty}
                  </span>
                </div>
                <h1 style={{ fontSize: 24, marginBottom: 12 }}>{selectedCase.title}</h1>
                <p style={{ fontSize: 14, color: "var(--gray-700)", lineHeight: 1.6, marginBottom: 20 }}>
                  {selectedCase.description}
                </p>

                {/* De-identified Clinical Report / EHR Snapshot */}
                <div
                  style={{
                    background: "var(--gray-100)",
                    border: "1px solid var(--gray-200)",
                    borderRadius: 8,
                    padding: 20,
                  }}
                >
                  <div
                    style={{
                      fontFamily: "'Space Grotesk', sans-serif",
                      fontWeight: 700,
                      fontSize: 13,
                      color: "var(--teal-muted)",
                      textTransform: "uppercase",
                      letterSpacing: 1,
                      marginBottom: 8,
                    }}
                  >
                    🔒 De-Identified Medical Record & Findings
                  </div>
                  <pre
                    style={{
                      fontFamily: "inherit",
                      fontSize: 13,
                      lineHeight: 1.6,
                      color: "var(--gray-700)",
                      whiteSpace: "pre-wrap",
                      wordBreak: "break-word",
                    }}
                  >
                    {selectedCase.anonymized_content}
                  </pre>
                </div>
              </div>

              {/* Case Quizzes */}
              <div className="hg-card">
                <div className="hg-card-title" style={{ fontSize: 18, marginBottom: 16 }}>
                  Clinical Evaluation & Knowledge Check
                </div>

                {!selectedCase.quizzes || selectedCase.quizzes.length === 0 ? (
                  <p style={{ color: "var(--gray-500)", fontSize: 13 }}>No quizzes attached to this case study.</p>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
                    {selectedCase.quizzes.map((q, idx) => {
                      const result = quizResults[q.id];
                      return (
                        <div
                          key={q.id}
                          style={{
                            padding: 18,
                            borderRadius: 8,
                            border: `1px solid ${
                              result ? (result.is_correct ? "var(--success)" : "var(--danger)") : "var(--gray-200)"
                            }`,
                            background: result
                              ? result.is_correct
                                ? "rgba(16,185,129,0.04)"
                                : "rgba(239,68,68,0.04)"
                              : "var(--white)",
                          }}
                        >
                          <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 12 }}>
                            Question {idx + 1}: {q.question}
                          </div>

                          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 14 }}>
                            {[
                              { key: "a", text: q.option_a },
                              { key: "b", text: q.option_b },
                              { key: "c", text: q.option_c },
                              { key: "d", text: q.option_d },
                            ].map((opt) => (
                              <label
                                key={opt.key}
                                style={{
                                  display: "flex",
                                  alignItems: "center",
                                  gap: 10,
                                  fontSize: 13,
                                  cursor: "pointer",
                                  padding: "8px 12px",
                                  borderRadius: 6,
                                  background:
                                    quizAnswers[q.id] === opt.key ? "rgba(8,145,178,0.08)" : "transparent",
                                  border: `1px solid ${
                                    quizAnswers[q.id] === opt.key ? "var(--teal)" : "transparent"
                                  }`,
                                }}
                              >
                                <input
                                  type="radio"
                                  name={`quiz_${q.id}`}
                                  value={opt.key}
                                  checked={quizAnswers[q.id] === opt.key}
                                  onChange={() =>
                                    setQuizAnswers((prev) => ({ ...prev, [q.id]: opt.key }))
                                  }
                                />
                                <span>
                                  <strong>{opt.key.toUpperCase()}:</strong> {opt.text}
                                </span>
                              </label>
                            ))}
                          </div>

                          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                            <button
                              onClick={() => handleQuizSubmit(q.id)}
                              className="btn btn-secondary"
                              style={{ padding: "6px 14px", fontSize: 12 }}
                            >
                              Submit Answer
                            </button>

                            {result && (
                              <span
                                style={{
                                  fontSize: 12,
                                  fontWeight: 600,
                                  color: result.is_correct ? "var(--success)" : "var(--danger)",
                                }}
                              >
                                {result.is_correct
                                  ? "✓ Correct Answer!"
                                  : `✕ Incorrect. Correct answer is (${result.correct_option.toUpperCase()})`}
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ========================================================
              VIEW: DATASET REQUESTS (Student / Researcher)
              ======================================================== */}
          {view === "dataset-requests" && (
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
                <div>
                  <h2 style={{ fontSize: 22 }}>Medical Dataset Requests</h2>
                  <p style={{ color: "var(--gray-500)", fontSize: 13 }}>
                    Submit and track applications for de-identified health datasets and clinical cohorts.
                  </p>
                </div>
                <button onClick={() => setShowDatasetModal(true)} className="btn btn-primary" style={{ fontSize: 13 }}>
                  + New Dataset Request
                </button>
              </div>

              <div className="hg-card">
                <DataTable
                  columns={[
                    {
                      key: "specialty",
                      header: "Specialty / Cohort",
                      render: (r: DatasetRequest) => (
                        <strong>{r.specialty?.name ?? "General / All Specialties"}</strong>
                      ),
                    },
                    {
                      key: "research_objective",
                      header: "Research / Study Objective",
                      render: (r: DatasetRequest) => (
                        <div style={{ maxWidth: 360, fontSize: 13 }}>{r.research_objective}</div>
                      ),
                    },
                    {
                      key: "created_at",
                      header: "Submitted",
                      render: (r: DatasetRequest) => new Date(r.created_at).toLocaleDateString(),
                    },
                    {
                      key: "status",
                      header: "Approval Status",
                      render: (r: DatasetRequest) => (
                        <span
                          className={`badge ${
                            r.status === "approved"
                              ? "badge-success"
                              : r.status === "rejected"
                              ? "badge-danger"
                              : "badge-warning"
                          }`}
                        >
                          {r.status}
                        </span>
                      ),
                    },
                    {
                      key: "admin_note",
                      header: "Admin Feedback",
                      render: (r: DatasetRequest) => (
                        <span style={{ fontSize: 12, color: "var(--gray-500)" }}>
                          {r.admin_note || (r.status === "pending" ? "In review" : "—")}
                        </span>
                      ),
                    },
                  ]}
                  data={datasetRequests.filter((r) => r.requester.id === user.id)}
                  emptyMessage="No dataset requests submitted yet. Click '+ New Dataset Request' to apply."
                />
              </div>
            </div>
          )}

          {/* ========================================================
              VIEW: LEARNING PROGRESS (Student / Intern)
              ======================================================== */}
          {view === "progress" && (
            <div>
              <div style={{ marginBottom: 20 }}>
                <h2 style={{ fontSize: 22 }}>Academic Progress & Quiz Metrics</h2>
                <p style={{ color: "var(--gray-500)", fontSize: 13 }}>
                  Track your mastery across medical case studies and knowledge checks.
                </p>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 20, marginBottom: 24 }}>
                <StatCard
                  icon="📝"
                  number={progress?.total_attempts ?? 0}
                  label="Total Questions Attempted"
                  borderColor="var(--teal)"
                />
                <StatCard
                  icon="✓"
                  number={progress?.total_correct ?? 0}
                  label="Correct Answers"
                  borderColor="var(--success)"
                />
                <StatCard
                  icon="📊"
                  number={`${progress?.accuracy_pct ?? 0}%`}
                  label="Accuracy Rate"
                  borderColor="var(--info)"
                />
              </div>

              <div className="hg-card">
                <div className="hg-card-title" style={{ marginBottom: 16 }}>
                  Performance by Case Study
                </div>
                {!progress?.by_case || progress.by_case.length === 0 ? (
                  <p style={{ color: "var(--gray-500)", fontSize: 13 }}>
                    No quiz attempts recorded yet. Study cases in the library and complete evaluation quizzes.
                  </p>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                    {progress.by_case.map((item) => {
                      const pct = Math.round((item.correct / item.total) * 100);
                      return (
                        <div key={item.case_id} style={{ padding: 12, background: "var(--gray-50)", borderRadius: 8 }}>
                          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                            <strong style={{ fontSize: 13 }}>{item.title}</strong>
                            <span style={{ fontSize: 12, fontWeight: 600 }}>
                              {item.correct} / {item.total} Correct ({pct}%)
                            </span>
                          </div>
                          <div style={{ width: "100%", height: 8, background: "var(--gray-200)", borderRadius: 999 }}>
                            <div
                              style={{
                                width: `${pct}%`,
                                height: "100%",
                                background: pct >= 70 ? "var(--success)" : "var(--warning)",
                                borderRadius: 999,
                              }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ========================================================
              VIEW: DE-IDENTIFIED DATASETS (Student / Researcher)
              ======================================================== */}
          {view === "datasets" && (
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
                <div>
                  <h2 style={{ fontSize: 22 }}>Anonymized Research & Educational Datasets</h2>
                  <p style={{ color: "var(--gray-500)", fontSize: 13 }}>
                    Access permitted de-identified cohorts stripped of direct identifiers in compliance with HIPAA Safe Harbor.
                  </p>
                </div>
                <button onClick={() => setShowDatasetModal(true)} className="btn btn-primary" style={{ fontSize: 13 }}>
                  + Request Cohort Access
                </button>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 20 }}>
                {[
                  {
                    name: "Cardiovascular Risk Cohort — 2026",
                    records: "1,240 synthetic subjects",
                    features: "BP, ECG, Troponin-I, Coronary Angiography",
                    specialty: "Cardiology",
                    cid: "QmX8Y...cardio26",
                  },
                  {
                    name: "Acute Stroke Imaging Benchmark",
                    records: "850 CT/MRI scans",
                    features: "Alteplase timing, ASPECTS score, MCA occlusion",
                    specialty: "Neurology",
                    cid: "QmZ3K...neuro26",
                  },
                  {
                    name: "Oncology Biomarker Registry",
                    records: "540 de-identified profiles",
                    features: "HER2, ER/PR status, BIRADS classifications",
                    specialty: "Oncology",
                    cid: "QmP7Q...onco26",
                  },
                  {
                    name: "Emergency Triage Observations",
                    records: "3,100 triage encounters",
                    features: "O2 sat, ESI score, vital signs, outcome",
                    specialty: "Emergency Medicine",
                    cid: "QmW2L...em26",
                  },
                ].map((ds, i) => (
                  <div key={i} className="hg-card" style={{ display: "flex", flexDirection: "column" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                      <span className="badge badge-info">{ds.specialty}</span>
                      <span className="badge badge-success">De-identified</span>
                    </div>
                    <h3 style={{ fontSize: 15, marginBottom: 6 }}>{ds.name}</h3>
                    <div style={{ fontSize: 12, color: "var(--gray-500)", marginBottom: 4 }}>
                      Cohort Size: <strong>{ds.records}</strong>
                    </div>
                    <div style={{ fontSize: 12, color: "var(--gray-500)", flex: 1, marginBottom: 14 }}>
                      Attributes: {ds.features}
                    </div>
                    <div style={{ fontSize: 11, color: "var(--teal)", fontFamily: "monospace", marginBottom: 12 }}>
                      IPFS CID: {ds.cid}
                    </div>
                    <button
                      onClick={() =>
                        setNotice({
                          type: "success",
                          msg: `Export initiated for ${ds.name}. Encrypted batch downloaded with CP-ABE attribute session token.`,
                        })
                      }
                      className="btn btn-secondary"
                      style={{ fontSize: 12 }}
                    >
                      Export Anonymized CSV ↓
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ========================================================
              VIEW: TRAINING PROGRAMS (Intern)
              ======================================================== */}
          {view === "programs" && (
            <div>
              <div style={{ marginBottom: 20 }}>
                <h2 style={{ fontSize: 22 }}>Hospital Training Programs & Clinical Rotations</h2>
                <p style={{ color: "var(--gray-500)", fontSize: 13 }}>
                  Structured residency and intern rotations supervised by attending physicians.
                </p>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                {trainingPrograms.map((p) => (
                  <div
                    key={p.id}
                    className="hg-card"
                    style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}
                  >
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
                        <span className="badge badge-info">{p.specialty?.name}</span>
                        <span className="badge badge-success">Active Rotation</span>
                      </div>
                      <h3 style={{ fontSize: 16, marginBottom: 4 }}>{p.name}</h3>
                      <p style={{ fontSize: 13, color: "var(--gray-500)", marginBottom: 6 }}>{p.description}</p>
                      <div style={{ fontSize: 12, color: "var(--teal-muted)" }}>
                        Supervising Attending:{" "}
                        <strong>{p.supervising_doctor?.name ?? "Dr. Sarah Jenkins"}</strong>
                      </div>
                    </div>

                    <button
                      onClick={() => {
                        setSelectedSpecialtyFilter(p.specialty?.name ?? "");
                        setView("cases");
                      }}
                      className="btn btn-primary"
                      style={{ fontSize: 12 }}
                    >
                      Study Assigned Cases →
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ========================================================
              VIEW: CASE EXERCISES (Intern)
              ======================================================== */}
          {view === "exercises" && (
            <div>
              <div style={{ marginBottom: 20 }}>
                <h2 style={{ fontSize: 22 }}>Case-Based Clinical Observations</h2>
                <p style={{ color: "var(--gray-500)", fontSize: 13 }}>
                  Record clinical findings, diagnostic hypotheses, and treatment plans for supervisor review.
                </p>
              </div>

              {internSubmittedMsg && (
                <div
                  style={{
                    padding: 12,
                    background: "#dcfce7",
                    color: "#166534",
                    borderRadius: 8,
                    marginBottom: 20,
                    fontSize: 13,
                  }}
                >
                  ✓ {internSubmittedMsg}
                </div>
              )}

              <div className="hg-card">
                <form onSubmit={handleInternExerciseSubmit}>
                  <div style={{ marginBottom: 16 }}>
                    <label className="hg-label">Select Case Study</label>
                    <select className="hg-select">
                      {cases.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.title} ({c.specialty?.name})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div style={{ marginBottom: 16 }}>
                    <label className="hg-label">Differential Diagnosis & Key Observations</label>
                    <textarea
                      required
                      className="hg-textarea"
                      rows={5}
                      placeholder="Detail physical exam observations, laboratory findings analysis, and proposed therapy protocol..."
                      value={internSubmission}
                      onChange={(e) => setInternSubmission(e.target.value)}
                    />
                  </div>

                  <button type="submit" className="btn btn-primary" style={{ padding: "10px 20px" }}>
                    Submit to Supervising Doctor
                  </button>
                </form>
              </div>
            </div>
          )}

          {/* ========================================================
              VIEW: SUPERVISOR FEEDBACK (Intern)
              ======================================================== */}
          {view === "feedback" && (
            <div>
              <div style={{ marginBottom: 20 }}>
                <h2 style={{ fontSize: 22 }}>Supervising Doctor Evaluations</h2>
                <p style={{ color: "var(--gray-500)", fontSize: 13 }}>
                  Feedback on diagnostic accuracy, patient safety, and clinical case studies.
                </p>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                {[
                  {
                    doctor: "Dr. Sarah Jenkins (Cardiology)",
                    date: "Today, 14:30",
                    case: "Acute Myocardial Infarction — Anterior STEMI",
                    grade: "Exemplary",
                    comment:
                      "Accurate recognition of reciprocal changes in inferior leads. Timely referral for emergent primary PCI is well justified.",
                  },
                  {
                    doctor: "Dr. Marcus Vance (Dermatology)",
                    date: "Yesterday",
                    case: "Breast Cancer Screening — Abnormal Mammogram",
                    grade: "Satisfactory",
                    comment:
                      "Good review of BIRADS criteria. Remember to document family history when discussing genetic testing referral.",
                  },
                ].map((fb, idx) => (
                  <div key={idx} className="hg-card">
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                      <strong style={{ fontSize: 14, color: "var(--navy)" }}>{fb.doctor}</strong>
                      <span className="badge badge-success">{fb.grade}</span>
                    </div>
                    <div style={{ fontSize: 12, color: "var(--teal)", marginBottom: 8 }}>
                      Case: {fb.case} · {fb.date}
                    </div>
                    <p style={{ fontSize: 13, color: "var(--gray-700)" }}>{fb.comment}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ========================================================
              VIEW: AGGREGATE STATISTICS (Researcher)
              ======================================================== */}
          {view === "stats" && (
            <div>
              <div style={{ marginBottom: 20 }}>
                <h2 style={{ fontSize: 22 }}>Aggregate Healthcare Statistics</h2>
                <p style={{ color: "var(--gray-500)", fontSize: 13 }}>
                  Aggregated cohort metrics and epidemiological distributions without individual patient identifiers.
                </p>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24, marginBottom: 24 }}>
                <div className="hg-card">
                  <div className="hg-card-title" style={{ marginBottom: 16 }}>
                    Cases by Medical Specialty
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                    {specialties.map((s) => {
                      const count = cases.filter((c) => c.specialty?.name === s.name).length;
                      const maxCount = Math.max(cases.length, 1);
                      const pct = Math.round((count / maxCount) * 100);
                      return (
                        <div key={s.id}>
                          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 4 }}>
                            <span>{s.name}</span>
                            <strong>{count} cases ({pct}%)</strong>
                          </div>
                          <div style={{ height: 6, background: "var(--gray-200)", borderRadius: 999 }}>
                            <div style={{ width: `${Math.max(pct, 5)}%`, height: "100%", background: "var(--teal)", borderRadius: 999 }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="hg-card">
                  <div className="hg-card-title" style={{ marginBottom: 16 }}>
                    Anonymized Patient Demographics (Synthetic Cohort)
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                    <div>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 4 }}>
                        <span>Age Bracket 18–45</span>
                        <strong>34%</strong>
                      </div>
                      <div style={{ height: 6, background: "var(--gray-200)", borderRadius: 999 }}>
                        <div style={{ width: "34%", height: "100%", background: "var(--info)", borderRadius: 999 }} />
                      </div>
                    </div>
                    <div>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 4 }}>
                        <span>Age Bracket 46–65</span>
                        <strong>48%</strong>
                      </div>
                      <div style={{ height: 6, background: "var(--gray-200)", borderRadius: 999 }}>
                        <div style={{ width: "48%", height: "100%", background: "var(--teal-light)", borderRadius: 999 }} />
                      </div>
                    </div>
                    <div>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 4 }}>
                        <span>Age Bracket 65+</span>
                        <strong>18%</strong>
                      </div>
                      <div style={{ height: 6, background: "var(--gray-200)", borderRadius: 999 }}>
                        <div style={{ width: "18%", height: "100%", background: "var(--warning)", borderRadius: 999 }} />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================
              MODAL: NEW DATASET REQUEST
              ======================================================== */}
          {showDatasetModal && (
            <div
              style={{
                position: "fixed",
                inset: 0,
                background: "rgba(10,22,40,0.6)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                zIndex: 200,
                padding: 16,
              }}
            >
              <div className="hg-card" style={{ maxWidth: 560, width: "100%", maxHeight: "90vh", overflowY: "auto" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                  <div className="hg-card-title" style={{ fontSize: 18 }}>
                    Submit Medical Dataset Request
                  </div>
                  <button
                    onClick={() => setShowDatasetModal(false)}
                    style={{ background: "transparent", border: "none", cursor: "pointer", fontSize: 18 }}
                  >
                    ✕
                  </button>
                </div>

                <form onSubmit={handleDatasetRequest}>
                  <div style={{ marginBottom: 14 }}>
                    <label className="hg-label">Target Specialty / Medical Domain</label>
                    <select
                      className="hg-select"
                      value={reqSpecialtyId}
                      onChange={(e) => setReqSpecialtyId(e.target.value)}
                    >
                      <option value="">All Specialties / Cross-Domain</option>
                      {specialties.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div style={{ marginBottom: 14 }}>
                    <label className="hg-label">Academic Purpose & Institution</label>
                    <input
                      disabled
                      className="hg-input"
                      value={`${user.name} (${user.institution || "HealthGrid Academy"})`}
                    />
                  </div>

                  <div style={{ marginBottom: 20 }}>
                    <label className="hg-label">Research Objectives & Ethical Protocol</label>
                    <textarea
                      required
                      className="hg-textarea"
                      rows={4}
                      placeholder="Specify your clinical question, required sample size, hypothesis, and compliance considerations..."
                      value={reqObjective}
                      onChange={(e) => setReqObjective(e.target.value)}
                    />
                  </div>

                  <div style={{ display: "flex", justifyContent: "flex-end", gap: 12 }}>
                    <button
                      type="button"
                      onClick={() => setShowDatasetModal(false)}
                      className="btn btn-ghost"
                      style={{ fontSize: 13 }}
                    >
                      Cancel
                    </button>
                    <button type="submit" disabled={busy} className="btn btn-primary" style={{ fontSize: 13 }}>
                      {busy ? "Submitting…" : "Submit Request to Admin"}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
