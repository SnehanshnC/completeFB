import { getStoredToken } from "./auth";
import type { LoginResponse, Page, Profile, ScheduledPost } from "./types";

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const token = getStoredToken();
  const headers: HeadersInit = {
    "Content-Type": "application/json",
    ...options?.headers,
  };

  if (token) {
    (headers as Record<string, string>)["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers,
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.detail ?? body.error ?? `Request failed (${res.status})`);
  }

  return res.json() as Promise<T>;
}

export const api = {
  login(username: string, password: string) {
    return request<LoginResponse>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ username, password }),
    });
  },

  getMyPages() {
    return request<Page[]>("/auth/me/pages");
  },

  listPages() {
    return request<Page[]>("/pages");
  },

  listUsers() {
    return request<Profile[]>("/users");
  },

  getScheduledPosts() {
    return request<ScheduledPost[]>("/posts/scheduled");
  },
};
