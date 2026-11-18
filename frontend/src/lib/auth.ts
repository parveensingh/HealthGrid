/**
 * HealthGrid Authentication & API Client Utilities
 */

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:8001/api";

export type UserRole = "patient" | "doctor" | "admin" | "education";

export type DoctorProfile = {
  id: number;
  name: string;
  specialty: string;
  attributes: string[];
  verified: boolean;
};

export type AuthUser = {
  id: number;
  username: string;
  email: string;
  role: UserRole;
  full_name: string;
  ethereum_address?: string;
  doctor?: DoctorProfile | null;
  created_at?: string;
};

export type DemoUser = {
  username: string;
  role: UserRole;
  name: string;
  specialty?: string;
  hint: string;
};

const ACCESS_KEY = "healthgrid_access_token";
const REFRESH_KEY = "healthgrid_refresh_token";
const USER_KEY = "healthgrid_user_profile";

export function getAccessToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(ACCESS_KEY);
}

export function getRefreshToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(REFRESH_KEY);
}

export function getCurrentUser(): AuthUser | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function saveSession(access: string, refresh: string, user: AuthUser): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(ACCESS_KEY, access);
  localStorage.setItem(REFRESH_KEY, refresh);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function clearSession(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(ACCESS_KEY);
  localStorage.removeItem(REFRESH_KEY);
  localStorage.removeItem(USER_KEY);
}

export async function authFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const token = getAccessToken();
  const headers = new Headers(init?.headers || {});

  if (token && !headers.has("Authorization")) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const response = await fetch(input, {
    ...init,
    headers,
  });

  return response;
}

export async function fetchDemoUsers(): Promise<DemoUser[]> {
  try {
    const res = await fetch(`${API_BASE}/auth/demo-users/`);
    if (res.ok) {
      return await res.json();
    }
  } catch (err) {
    console.warn("Could not fetch demo users from backend:", err);
  }
  // Fallback default demo users
  return [
    { username: "patient.alice", role: "patient", name: "Alice Johnson", hint: "Verified patient with medical records" },
    { username: "dr.rajesh", role: "doctor", name: "Dr. Rajesh Sharma", specialty: "Cardiology", hint: "Chief Cardiologist (Clearance Level 3)" },
    { username: "dr.priya", role: "doctor", name: "Dr. Priya Nair", specialty: "Neurology", hint: "Senior Neurologist (Clearance Level 2)" },
    { username: "dr.sunita", role: "doctor", name: "Dr. Sunita Deshmukh", specialty: "Emergency Medicine", hint: "Emergency Lead (Emergency:True)" },
    { username: "admin", role: "admin", name: "HealthGrid Administrator", hint: "System Administrator" },
  ];
}
