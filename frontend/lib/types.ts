export interface User {
  id: string;
  email: string;
  role: "admin" | "va";
  username: string;
}

export interface LoginResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  user: User;
}

export interface Page {
  id: number;
  page_id: string;
  page_name: string;
  created_at: string;
}

export interface Profile {
  id: string;
  username: string;
  role: string;
  created_at: string;
}

export interface ScheduledPost {
  id: number;
  user_id: string;
  page_id: number;
  message: string;
  photo_url: string | null;
  scheduled_at: string;
  status: string;
  fb_post_id: string | null;
  error_message: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateUserPayload {
  email: string;
  password: string;
  username: string;
  role: "admin" | "va";
}

export interface CreatePagePayload {
  page_id: string;
  page_name: string;
  access_token: string;
}

export interface ImmediatePostPayload {
  page_id: number;
  message: string;
  photo_url?: string;
}

export interface ScheduledPostPayload {
  page_id: number;
  message: string;
  scheduled_at: string;
  photo_url?: string;
}

export interface UpdatePostPayload {
  message?: string;
  photo_url?: string;
  scheduled_at?: string;
}

export interface ImmediatePostResponse {
  fb_post_id: string;
  message: string;
}

export interface ValidateTokenResponse {
  valid: boolean;
  fb_page_id?: string;
  fb_page_name?: string;
  error?: string;
}
