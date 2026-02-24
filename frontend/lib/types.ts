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
