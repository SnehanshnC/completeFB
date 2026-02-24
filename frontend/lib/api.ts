import { getStoredToken } from "./auth";
import type {
  LoginResponse,
  Page,
  Profile,
  ScheduledPost,
  CreateUserPayload,
  CreatePagePayload,
  ImmediatePostPayload,
  ImmediatePostResponse,
  ScheduledPostPayload,
  UpdatePostPayload,
  ValidateTokenResponse,
} from "./types";

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

async function requestMultipart<T>(path: string, body: FormData): Promise<T> {
  const token = getStoredToken();
  const headers: Record<string, string> = {};
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(`${BASE_URL}${path}`, {
    method: "POST",
    headers,
    body,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail ?? err.error ?? `Request failed (${res.status})`);
  }

  return res.json() as Promise<T>;
}

export const api = {
  // ── Auth ──
  login(username: string, password: string) {
    return request<LoginResponse>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ username, password }),
    });
  },

  getMyPages() {
    return request<Page[]>("/auth/me/pages");
  },

  // ── Pages ──
  listPages() {
    return request<Page[]>("/pages");
  },

  createPage(data: CreatePagePayload) {
    return request<Page>("/pages", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  deletePage(pageId: number) {
    return request<void>(`/pages/${pageId}`, { method: "DELETE" });
  },

  updatePageToken(pageId: number, accessToken: string) {
    return request<Page>(`/pages/${pageId}/token`, {
      method: "PATCH",
      body: JSON.stringify({ access_token: accessToken }),
    });
  },

  validatePageToken(pageId: number) {
    return request<ValidateTokenResponse>(`/pages/${pageId}/validate`, {
      method: "POST",
    });
  },

  // ── Users ──
  listUsers() {
    return request<Profile[]>("/users");
  },

  createUser(data: CreateUserPayload) {
    return request<Profile>("/users", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  deleteUser(userId: string) {
    return request<void>(`/users/${userId}`, { method: "DELETE" });
  },

  getUserPages(userId: string) {
    return request<Page[]>(`/users/${userId}/pages`);
  },

  grantPageAccess(userId: string, pageId: number) {
    return request<void>(`/users/${userId}/pages/${pageId}`, {
      method: "POST",
    });
  },

  revokePageAccess(userId: string, pageId: number) {
    return request<void>(`/users/${userId}/pages/${pageId}`, {
      method: "DELETE",
    });
  },

  // ── Posts ──
  getScheduledPosts() {
    return request<ScheduledPost[]>("/posts/scheduled");
  },

  postImmediate(data: ImmediatePostPayload) {
    return request<ImmediatePostResponse>("/posts/immediate", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  createScheduledPost(data: ScheduledPostPayload) {
    return request<ScheduledPost>("/posts/scheduled", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  updateScheduledPost(postId: number, data: UpdatePostPayload) {
    return request<ScheduledPost>(`/posts/scheduled/${postId}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  },

  deleteScheduledPost(postId: number) {
    return request<void>(`/posts/scheduled/${postId}`, { method: "DELETE" });
  },

  requeuePost(postId: number) {
    return request<ScheduledPost>(`/posts/scheduled/${postId}/requeue`, {
      method: "PUT",
    });
  },

  uploadPhoto(file: File) {
    const form = new FormData();
    form.append("file", file);
    return requestMultipart<{ url: string }>("/posts/upload-photo", form);
  },
};
