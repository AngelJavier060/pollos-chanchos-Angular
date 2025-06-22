export interface LoginRequest {
  username?: string;
  password?: string;
}

export interface AuthResponse {
  token: string;
  refreshToken: string;
  type: string;
  id: number;
  username: string;
  email: string;
  name: string;
  profilePicture: string | null;
  roles: string[];
}

export interface RefreshTokenRequest {
  refreshToken: string;
} 