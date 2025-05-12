/**
 * GoogleAuthManager
 * 
 * Handles Google authentication state, token refresh and calendar access
 * for Android native integration.
 */

import { API_BASE_URL } from '../config';

interface TokenResponse {
  success: boolean;
  accessToken: string;
  refreshToken?: string;
  expiresIn: number;
  message?: string;
}

interface AuthStatusResponse {
  success: boolean;
  authenticated: boolean;
  refreshed?: boolean;
  needsReauth?: boolean;
  needsGoogleAuth?: boolean;
  message?: string;
}

class GoogleAuthManager {
  private accessToken: string | null = null;
  private refreshToken: string | null = null;
  private expiresAt: number = 0;
  private userId: string | null = null;
  private email: string | null = null;
  
  constructor() {
    // Initialize from storage if available
    this.loadFromStorage();
  }
  
  /**
   * Load tokens from secure storage
   */
  private async loadFromStorage(): Promise<void> {
    try {
      // In a real implementation, this would use SecureStore or similar
      // This is a stub implementation
      console.log('Loading Google auth tokens from secure storage');
      // Mock implementation
    } catch (error) {
      console.error('Failed to load tokens from storage:', error);
    }
  }
  
  /**
   * Save tokens to secure storage
   */
  private async saveToStorage(): Promise<void> {
    try {
      // In a real implementation, this would use SecureStore or similar
      // This is a stub implementation
      console.log('Saving Google auth tokens to secure storage');
      // Mock implementation
    } catch (error) {
      console.error('Failed to save tokens to storage:', error);
    }
  }
  
  /**
   * Set tokens from Google authentication
   */
  public setTokens(accessToken: string, refreshToken: string | null, expiresIn: number): void {
    this.accessToken = accessToken;
    this.refreshToken = refreshToken;
    this.expiresAt = Date.now() + expiresIn * 1000;
    this.saveToStorage();
    console.log('Google auth tokens set successfully');
  }
  
  /**
   * Set user info
   */
  public setUserInfo(userId: string, email: string): void {
    this.userId = userId;
    this.email = email;
    this.saveToStorage();
    console.log('User info set:', email);
  }
  
  /**
   * Check if the token is expired
   */
  public isTokenExpired(): boolean {
    if (!this.accessToken || !this.expiresAt) {
      return true;
    }
    
    // Add a 5-minute buffer to ensure token refresh before expiration
    const bufferTime = 5 * 60 * 1000; // 5 minutes in milliseconds
    return Date.now() > (this.expiresAt - bufferTime);
  }
  
  /**
   * Get the current access token, refreshing if necessary
   */
  public async getAccessToken(): Promise<string | null> {
    if (!this.accessToken) {
      console.log('No access token available');
      return null;
    }
    
    if (this.isTokenExpired()) {
      console.log('Access token expired, attempting refresh');
      const refreshed = await this.refreshAccessToken();
      if (!refreshed) {
        console.log('Token refresh failed');
        return null;
      }
    }
    
    return this.accessToken;
  }
  
  /**
   * Refresh the access token using the refresh token
   */
  public async refreshAccessToken(): Promise<boolean> {
    if (!this.refreshToken) {
      console.log('No refresh token available');
      return false;
    }
    
    try {
      console.log('Refreshing access token');
      
      const response = await fetch(`${API_BASE_URL}/api/auth/refresh-token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          refreshToken: this.refreshToken
        })
      });
      
      if (!response.ok) {
        console.log('Token refresh failed with status:', response.status);
        return false;
      }
      
      const data = await response.json() as TokenResponse;
      
      if (!data.success || !data.accessToken) {
        console.log('Token refresh failed:', data.message);
        return false;
      }
      
      this.accessToken = data.accessToken;
      
      // Update refresh token if a new one was provided
      if (data.refreshToken) {
        this.refreshToken = data.refreshToken;
      }
      
      this.expiresAt = Date.now() + data.expiresIn * 1000;
      this.saveToStorage();
      
      console.log('Access token refreshed successfully');
      return true;
    } catch (error) {
      console.error('Error refreshing access token:', error);
      return false;
    }
  }
  
  /**
   * Check if user is authenticated with Google Calendar
   */
  public async checkCalendarAuthStatus(): Promise<AuthStatusResponse> {
    try {
      if (!this.accessToken) {
        return {
          success: true,
          authenticated: false,
          needsGoogleAuth: true,
          message: 'Not authenticated with Google'
        };
      }
      
      // First ensure token is fresh
      await this.getAccessToken();
      
      // Then make request to check calendar auth status
      const response = await fetch(`${API_BASE_URL}/api/auth/calendar-auth-status`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        console.log('Calendar auth status check failed with status:', response.status);
        return {
          success: false,
          authenticated: false,
          message: 'Failed to check calendar authentication status'
        };
      }
      
      const data = await response.json() as AuthStatusResponse;
      console.log('Calendar auth status:', data);
      
      return data;
    } catch (error) {
      console.error('Error checking calendar auth status:', error);
      return {
        success: false,
        authenticated: false,
        message: 'Error checking calendar authentication'
      };
    }
  }
  
  /**
   * Get tokens from Firebase authentication for Google Calendar access
   */
  public async getGoogleTokens(firebaseIdToken: string): Promise<boolean> {
    if (!this.userId || !this.email) {
      console.log('Missing user info, cannot get Google tokens');
      return false;
    }
    
    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/google-token`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${firebaseIdToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          uid: this.userId,
          email: this.email
        })
      });
      
      if (!response.ok) {
        console.log('Failed to get Google tokens with status:', response.status);
        return false;
      }
      
      const data = await response.json() as TokenResponse;
      
      if (!data.success || !data.accessToken) {
        console.log('Failed to get Google tokens:', data.message);
        return false;
      }
      
      this.accessToken = data.accessToken;
      
      if (data.refreshToken) {
        this.refreshToken = data.refreshToken;
      }
      
      this.expiresAt = Date.now() + data.expiresIn * 1000;
      this.saveToStorage();
      
      console.log('Google tokens obtained successfully');
      return true;
    } catch (error) {
      console.error('Error getting Google tokens:', error);
      return false;
    }
  }
  
  /**
   * Clear all Google auth tokens and state
   */
  public clearTokens(): void {
    this.accessToken = null;
    this.refreshToken = null;
    this.expiresAt = 0;
    this.saveToStorage();
    console.log('Google auth tokens cleared');
  }
  
  /**
   * Check if user has valid Google auth
   */
  public hasValidAuth(): boolean {
    return !!this.accessToken && !this.isTokenExpired();
  }
}

// Export a singleton instance
export const googleAuthManager = new GoogleAuthManager();