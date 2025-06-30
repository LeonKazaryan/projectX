// Authentication API Service 🤖
import axios from 'axios';

const API_BASE_URL = (import.meta as any).env?.VITE_API_BASE_URL || 'http://localhost:8000/api';

export interface LoginRequest {
  emailOrUsername: string;
  password: string;
  rememberMe?: boolean;
}

export interface RegisterRequest {
  username: string;
  email: string;
  display_name: string;
  password: string;
  confirm_password: string;
  language_preference?: string;
  theme_preference?: string;
}

export interface User {
  id: string;
  username: string;
  email: string;
  displayName?: string;
  avatarUrl?: string;
  languagePreference: string;
  themePreference: string;
  isActive: boolean;
  isVerified: boolean;
  createdAt: string;
  lastLogin?: string;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  tokenType: string;
  expiresIn: number;
  user: User;
}

export interface ConnectedAccount {
  provider: 'telegram' | 'whatsapp' | 'instagram';
  username: string | null;
  connected_at: string;
  is_active: boolean;
  phone_number: string | null;
}

export interface ProfileData {
  id: string;
  username: string;
  email: string;
  created_at: string;
  connected_accounts: ConnectedAccount[];
}

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

class AuthService {
  async login(credentials: LoginRequest): Promise<AuthResponse> {
    const response = await apiClient.post("/auth/login", {
      email_or_username: credentials.emailOrUsername,
      password: credentials.password,
      remember_me: credentials.rememberMe || false,
    });

    const authResponse = this.createAuthResponse(response.data);
    this.setTokens(authResponse);
    return authResponse;
  }

  async register(userData: RegisterRequest): Promise<AuthResponse> {
    const response = await apiClient.post("/auth/register", userData);

    const authResponse = this.createAuthResponse(response.data);
    this.setTokens(authResponse);
    return authResponse;
  }

  private createAuthResponse(data: any): AuthResponse {
    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      tokenType: data.token_type,
      expiresIn: data.expires_in,
      user: data.user,
    };
  }

  private setTokens(authResponse: AuthResponse): void {
    localStorage.setItem("chathut_access_token", authResponse.accessToken);
    if (authResponse.refreshToken) {
      localStorage.setItem("chathut_refresh_token", authResponse.refreshToken);
    }
    localStorage.setItem("chathut_user", JSON.stringify(authResponse.user));
  }

  getAccessToken(): string | null {
    return localStorage.getItem('chathut_access_token');
  }

  getUser(): User | null {
    const userStr = localStorage.getItem('chathut_user');
    return userStr ? JSON.parse(userStr) : null;
  }

  isAuthenticated(): boolean {
    return !!this.getAccessToken();
  }

  logout(): void {
    localStorage.removeItem('chathut_access_token');
    localStorage.removeItem('chathut_refresh_token');
    localStorage.removeItem('chathut_user');
  }

  async getProfile(): Promise<ProfileData> {
    const response = await apiClient.get('/auth/me', {
      headers: {
        Authorization: `Bearer ${this.getAccessToken()}`,
      },
    });
    return response.data;
  }
}

export const authService = new AuthService();
export default authService; 