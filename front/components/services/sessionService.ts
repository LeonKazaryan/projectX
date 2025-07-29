import { API_BASE_URL } from './authService';

export interface SessionData {
  platform: 'telegram' | 'whatsapp';
  session_string: string;
}

export interface SessionResponse {
  success: boolean;
  session_string?: string;
  message: string;
}

export interface SessionInfo {
  platform: string;
  created_at: string;
  updated_at: string;
}

export interface SessionsListResponse {
  success: boolean;
  sessions: SessionInfo[];
}

class SessionService {
  private getAuthHeaders(): HeadersInit {
    const token = localStorage.getItem('chathut_access_token');
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    };
  }

  async saveSession(sessionData: SessionData): Promise<SessionResponse> {
    try {
      const response = await fetch(`${API_BASE_URL}/sessions/save`, {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify(sessionData),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Failed to save session:', error);
      throw error;
    }
  }

  async getSession(platform: 'telegram' | 'whatsapp'): Promise<SessionResponse> {
    try {
      const response = await fetch(`${API_BASE_URL}/sessions/get/${platform}`, {
        method: 'GET',
        headers: this.getAuthHeaders(),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Failed to get session:', error);
      throw error;
    }
  }

  async deleteSession(platform: 'telegram' | 'whatsapp'): Promise<SessionResponse> {
    try {
      const response = await fetch(`${API_BASE_URL}/sessions/delete/${platform}`, {
        method: 'DELETE',
        headers: this.getAuthHeaders(),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Failed to delete session:', error);
      throw error;
    }
  }

  async listSessions(): Promise<SessionsListResponse> {
    try {
      const response = await fetch(`${API_BASE_URL}/sessions/list`, {
        method: 'GET',
        headers: this.getAuthHeaders(),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Failed to list sessions:', error);
      throw error;
    }
  }

  // Helper method to check if user has saved session for platform
  async hasSession(platform: 'telegram' | 'whatsapp'): Promise<boolean> {
    try {
      const response = await this.getSession(platform);
      return response.success && !!response.session_string;
    } catch (error) {
      return false;
    }
  }

  // Helper method to get session string if exists
  async getSessionString(platform: 'telegram' | 'whatsapp'): Promise<string | null> {
    try {
      const response = await this.getSession(platform);
      if (response.success && response.session_string) {
        return response.session_string;
      }
      return null;
    } catch (error) {
      return null;
    }
  }
}

export const sessionService = new SessionService(); 