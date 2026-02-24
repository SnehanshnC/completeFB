import type { User } from "./types";

const TOKEN_KEY = "token";
const ROLE_KEY = "role";
const USERNAME_KEY = "username";
const EXPIRY_KEY = "token_expiry";

export function storeAuth(user: User) {
  localStorage.setItem(ROLE_KEY, user.role);
  localStorage.setItem(USERNAME_KEY, user.username);
}

export function clearAuth() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(ROLE_KEY);
  localStorage.removeItem(USERNAME_KEY);
  localStorage.removeItem(EXPIRY_KEY);
}

export function storeExpiry(expiresIn: number) {
  const expiresAt = Date.now() + expiresIn * 1000;
  localStorage.setItem(EXPIRY_KEY, String(expiresAt));
}

export function getExpiry(): number | null {
  if (typeof window === "undefined") return null;
  const val = localStorage.getItem(EXPIRY_KEY);
  return val ? Number(val) : null;
}

export function getStoredRole(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(ROLE_KEY);
}

export function getStoredUsername(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(USERNAME_KEY);
}

export function isAuthenticated(): boolean {
  return !!getStoredRole();
}

export function isAdmin(): boolean {
  return getStoredRole() === "admin";
}
