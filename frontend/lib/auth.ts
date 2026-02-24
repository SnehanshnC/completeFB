import type { User } from "./types";

const TOKEN_KEY = "token";
const ROLE_KEY = "role";
const USERNAME_KEY = "username";

export function storeAuth(accessToken: string, user: User) {
  localStorage.setItem(TOKEN_KEY, accessToken);
  localStorage.setItem(ROLE_KEY, user.role);
  localStorage.setItem(USERNAME_KEY, user.username);
}

export function clearAuth() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(ROLE_KEY);
  localStorage.removeItem(USERNAME_KEY);
}

export function getStoredToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
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
  return !!getStoredToken();
}

export function isAdmin(): boolean {
  return getStoredRole() === "admin";
}
