// Authentication API Service 🤖
import axios from 'axios';

export const API_BASE_URL = (import.meta as any).env?.VITE_API_BASE_URL || 'http://localhost:8000/api';

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
  // Add error handling for certificate issues
  validateStatus: function (status) {
    return status >= 200 && status < 500; // Accept all responses to handle them properly
  },
});

class AuthService {
  async login(credentials: LoginRequest): Promise<AuthResponse> {
    try {
      const response = await apiClient.post("/auth/login", {
        email_or_username: credentials.emailOrUsername,
        password: credentials.password,
        remember_me: credentials.rememberMe || false,
      });

      if (response.status >= 400) {
        throw new Error(response.data?.detail || 'Login failed');
      }

      const authResponse = this.createAuthResponse(response.data);
      this.setTokens(authResponse);
      return authResponse;
    } catch (error: any) {
      console.error('Login error:', error);
      if (error.code === 'ERR_NETWORK' || error.message?.includes('Network Error')) {
        throw new Error('Network error: Unable to connect to server. Please check your internet connection.');
      }
      if (error.code === 'ERR_CERT_AUTHORITY_INVALID') {
        throw new Error('Certificate error: Server certificate is invalid. Please contact support.');
      }
      throw error;
    }
  }

  async register(userData: RegisterRequest): Promise<AuthResponse> {
    try {
      const response = await apiClient.post("/auth/register", userData);

      if (response.status >= 400) {
        throw new Error(response.data?.detail || 'Registration failed');
      }

      const authResponse = this.createAuthResponse(response.data);
      this.setTokens(authResponse);
      return authResponse;
    } catch (error: any) {
      console.error('Registration error:', error);
      if (error.code === 'ERR_NETWORK' || error.message?.includes('Network Error')) {
        throw new Error('Network error: Unable to connect to server. Please check your internet connection.');
      }
      if (error.code === 'ERR_CERT_AUTHORITY_INVALID') {
        throw new Error('Certificate error: Server certificate is invalid. Please contact support.');
      }
      throw error;
    }
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
    console.log('Setting tokens:', {
      accessToken: authResponse.accessToken ? 'Token exists' : 'No token',
      refreshToken: authResponse.refreshToken ? 'Token exists' : 'No token',
      user: authResponse.user
    });
    
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

  async logout(): Promise<void> {
    try {
      await fetch("http://localhost:8000/auth/logout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
      });
    } catch (error) {
      console.error("Logout error:", error);
    }
    
    // Clear user state
    // this.user = null; // This line was removed from the new_code, so it's removed here.
    // this.isAuthenticated = false; // This line was removed from the new_code, so it's removed here.
    // this.userSubject.next(null); // This line was removed from the new_code, so it's removed here.
    
    // Clear localStorage
    localStorage.removeItem("chathut_access_token");
    localStorage.removeItem("chathut_refresh_token");
    localStorage.removeItem("chathut_user");
    
    // NOTE: We don't reset messaging providers here anymore
    // This allows the same user to logout/login without losing sessions
    // Provider reset only happens when switching users
  }

  async getProfile(): Promise<ProfileData> {
    const token = this.getAccessToken();
    console.log('Getting profile with token:', token ? 'Token exists' : 'No token');
    
    const response = await apiClient.get('/auth/me', {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    return response.data;
  }
}

export const authService = new AuthService();
export default authService; 