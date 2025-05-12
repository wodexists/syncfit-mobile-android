/**
 * Firebase Service
 *
 * This service handles Firebase initialization and authentication.
 * On React Native, it uses the native Google Sign-In capabilities.
 */

import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  GoogleAuthProvider,
  signInWithCredential, 
  signOut as firebaseSignOut,
  onAuthStateChanged,
  User as FirebaseUser,
  OAuthProvider,
  Auth
} from 'firebase/auth';
import * as WebBrowser from 'expo-web-browser';
import * as Google from 'expo-auth-session/providers/google';
import * as AuthSession from 'expo-auth-session';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { logger, ErrorCode } from './logging';

// Ensure browser redirect handling on web
WebBrowser.maybeCompleteAuthSession();

// Try to get environment variables, fall back to defaults if not available
const getEnvVar = (key: string, defaultValue: string = '') => {
  if (typeof process !== 'undefined' && process.env && process.env[key]) {
    return process.env[key] || defaultValue;
  }
  // For Vite environment in the browser
  if (typeof import.meta !== 'undefined' && import.meta.env && (import.meta.env as any)[key]) {
    return (import.meta.env as any)[key] || defaultValue;
  }
  return defaultValue;
};

// Firebase configuration from environment variables
const firebaseConfig = {
  apiKey: getEnvVar('VITE_FIREBASE_API_KEY'),
  authDomain: `${getEnvVar('VITE_FIREBASE_PROJECT_ID')}.firebaseapp.com`,
  projectId: getEnvVar('VITE_FIREBASE_PROJECT_ID'),
  storageBucket: `${getEnvVar('VITE_FIREBASE_PROJECT_ID')}.appspot.com`,
  messagingSenderId: getEnvVar('VITE_FIREBASE_MESSAGING_SENDER_ID'),
  appId: getEnvVar('VITE_FIREBASE_APP_ID'),
  // Required for React Native
  clientId: getEnvVar('VITE_GOOGLE_CLIENT_ID'),
  webClientId: getEnvVar('VITE_GOOGLE_WEB_CLIENT_ID'),
  androidClientId: getEnvVar('VITE_GOOGLE_ANDROID_CLIENT_ID'),
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

// Set persistence to local for better session management
// Note: persistence setting in React Native works differently than web
// We'll use AsyncStorage for token caching

// Token storage keys
const AUTH_TOKEN_KEY = 'auth_token';
const AUTH_REFRESH_TOKEN_KEY = 'auth_refresh_token';
const AUTH_TOKEN_EXPIRY_KEY = 'auth_token_expiry';

/**
 * Firebase Authentication Service
 * Handles both web and native auth flows
 */
class FirebaseAuthService {
  private currentUser: FirebaseUser | null = null;
  private googleAccessToken: string | null = null;
  private googleRefreshToken: string | null = null;
  private tokenExpiry: number = 0;
  private auth: Auth;
  
  // OAuth request and response handlers for React Native
  private [request, response, promptAsync] = Google.useAuthRequest({
    expoClientId: firebaseConfig.clientId,
    androidClientId: firebaseConfig.androidClientId,
    webClientId: firebaseConfig.webClientId,
    scopes: [
      'profile', 
      'email',
      'https://www.googleapis.com/auth/calendar',
      'https://www.googleapis.com/auth/calendar.events'
    ],
    responseType: 'id_token token',
  });
  
  constructor() {
    this.auth = auth;
    
    // Subscribe to auth state changes
    onAuthStateChanged(auth, (user) => {
      this.currentUser = user;
      
      if (user) {
        logger.info('User signed in', null, {
          userId: user.uid,
          email: user.email,
          provider: user.providerData[0]?.providerId,
        });
        
        // Store user state in async storage for persistence
        this.persistUserState(user);
      } else {
        logger.debug('User signed out');
        this.clearPersistedState();
      }
    });
    
    // Restore auth state from storage on initialization
    this.restoreAuthState();
    
    // Log Firebase initialization
    logger.debug('Firebase config - projectId: ' + firebaseConfig.projectId);
    logger.debug('Firebase auth initialized for platform: ' + Platform.OS);
  }

  /**
   * Store authentication state for persistence
   */
  private async persistUserState(user: FirebaseUser): Promise<void> {
    try {
      // We don't store the full user object, just the tokens and key info
      if (this.googleAccessToken) {
        await AsyncStorage.setItem(AUTH_TOKEN_KEY, this.googleAccessToken);
      }
      
      if (this.googleRefreshToken) {
        await AsyncStorage.setItem(AUTH_REFRESH_TOKEN_KEY, this.googleRefreshToken);
      }
      
      if (this.tokenExpiry > 0) {
        await AsyncStorage.setItem(AUTH_TOKEN_EXPIRY_KEY, String(this.tokenExpiry));
      }
    } catch (error) {
      logger.error('Failed to persist auth state', ErrorCode.AUTH_STORAGE_ERROR, { error });
    }
  }
  
  /**
   * Clear persisted authentication state
   */
  private async clearPersistedState(): Promise<void> {
    try {
      await AsyncStorage.multiRemove([
        AUTH_TOKEN_KEY,
        AUTH_REFRESH_TOKEN_KEY,
        AUTH_TOKEN_EXPIRY_KEY
      ]);
      
      this.googleAccessToken = null;
      this.googleRefreshToken = null;
      this.tokenExpiry = 0;
    } catch (error) {
      logger.error('Failed to clear persisted auth state', ErrorCode.AUTH_STORAGE_ERROR, { error });
    }
  }
  
  /**
   * Restore authentication state from storage
   */
  private async restoreAuthState(): Promise<void> {
    try {
      // Retrieve tokens from storage
      const [accessToken, refreshToken, expiryStr] = await Promise.all([
        AsyncStorage.getItem(AUTH_TOKEN_KEY),
        AsyncStorage.getItem(AUTH_REFRESH_TOKEN_KEY),
        AsyncStorage.getItem(AUTH_TOKEN_EXPIRY_KEY)
      ]);
      
      // Restore token state
      this.googleAccessToken = accessToken;
      this.googleRefreshToken = refreshToken;
      this.tokenExpiry = expiryStr ? parseInt(expiryStr, 10) : 0;
      
      // If we have valid tokens but no current user, try to restore the session
      if (accessToken && !this.currentUser) {
        logger.debug('Attempting to restore auth session from storage');
        
        // Check if token is expired
        const now = Date.now();
        if (this.tokenExpiry > now) {
          // Token is still valid, use it to sign in
          this.signInWithToken(accessToken);
        } else if (refreshToken) {
          // Token expired but we have refresh token
          logger.debug('Stored token expired, attempting refresh');
          // Call backend to refresh token
          await this.refreshGoogleToken(refreshToken);
        }
      }
    } catch (error) {
      logger.error('Failed to restore auth state', ErrorCode.AUTH_STORAGE_ERROR, { error });
    }
  }
  
  /**
   * Sign in with an existing Google token
   */
  private async signInWithToken(idToken: string): Promise<FirebaseUser | null> {
    try {
      const credential = GoogleAuthProvider.credential(idToken);
      const userCredential = await signInWithCredential(this.auth, credential);
      return userCredential.user;
    } catch (error) {
      logger.error('Failed to sign in with token', ErrorCode.AUTH_TOKEN_ERROR, { error });
      return null;
    }
  }
  
  /**
   * Refresh Google token using the refresh token
   */
  private async refreshGoogleToken(refreshToken: string): Promise<boolean> {
    try {
      // Call backend API to refresh token
      const response = await fetch('/api/auth/refresh-token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ refreshToken })
      });
      
      if (!response.ok) {
        logger.error('Token refresh failed', ErrorCode.AUTH_TOKEN_ERROR, { 
          status: response.status,
        });
        return false;
      }
      
      const data = await response.json();
      
      if (data.accessToken) {
        this.googleAccessToken = data.accessToken;
        
        if (data.refreshToken) {
          this.googleRefreshToken = data.refreshToken;
        }
        
        if (data.expiresIn) {
          this.tokenExpiry = Date.now() + (data.expiresIn * 1000);
          await AsyncStorage.setItem(AUTH_TOKEN_EXPIRY_KEY, String(this.tokenExpiry));
        }
        
        // Store the new tokens
        await this.persistUserState(this.currentUser!);
        
        // Sign in with the new token
        await this.signInWithToken(data.accessToken);
        
        return true;
      }
      
      return false;
    } catch (error) {
      logger.error('Failed to refresh Google token', ErrorCode.AUTH_TOKEN_ERROR, { error });
      return false;
    }
  }
  
  /**
   * Get the current signed-in user
   */
  getCurrentUser(): FirebaseUser | null {
    return this.currentUser;
  }
  
  /**
   * Check if user is authenticated
   */
  isAuthenticated(): boolean {
    return this.currentUser !== null;
  }
  
  /**
   * Sign in with Google using Expo Auth Session
   * This uses the native Google Sign In on Android/iOS
   */
  async signInWithGoogle(): Promise<FirebaseUser | null> {
    try {
      logger.debug('Initiating Google sign-in with Expo Auth');
      
      // Start the auth flow
      const result = await promptAsync();
      
      if (result.type !== 'success') {
        logger.error('Google sign-in canceled or failed', ErrorCode.AUTH_GOOGLE_ERROR, {
          resultType: result.type
        });
        return null;
      }
      
      // Extract tokens from authentication response
      this.googleAccessToken = result.authentication?.accessToken || null;
      
      // Get ID token for Firebase auth
      const idToken = result.authentication?.idToken;
      
      if (!idToken) {
        logger.error('No ID token received from Google', ErrorCode.AUTH_GOOGLE_ERROR);
        return null;
      }
      
      // Sign in to Firebase with Google credential
      const credential = GoogleAuthProvider.credential(idToken, this.googleAccessToken);
      const userCredential = await signInWithCredential(auth, credential);
      
      // Update current user
      this.currentUser = userCredential.user;
      
      // Calculate token expiry (default to 1 hour if not provided)
      const expiresIn = result.authentication?.expiresIn || 3600;
      this.tokenExpiry = Date.now() + (expiresIn * 1000);
      
      // Store tokens for later use
      if (this.googleAccessToken) {
        await AsyncStorage.setItem(AUTH_TOKEN_KEY, this.googleAccessToken);
        await AsyncStorage.setItem(AUTH_TOKEN_EXPIRY_KEY, String(this.tokenExpiry));
      }
      
      // For refresh token, we need to get it from the server
      // as expo-auth-session doesn't provide it directly
      await this.requestBackendForRefreshToken(idToken);
      
      logger.info('Google sign-in successful', null, {
        hasAccessToken: !!this.googleAccessToken,
        hasRefreshToken: !!this.googleRefreshToken,
        tokenExpiry: new Date(this.tokenExpiry).toISOString()
      });
      
      return userCredential.user;
    } catch (error: any) {
      logger.error('Google sign-in failed', ErrorCode.AUTH_GOOGLE_ERROR, {
        error,
        message: error.message,
      });
      
      return null;
    }
  }
  
  /**
   * Request refresh token from backend after successful authentication
   */
  private async requestBackendForRefreshToken(idToken: string): Promise<boolean> {
    try {
      // Get Firebase ID token for authentication with backend
      const firebaseToken = await this.getIdToken();
      
      if (!firebaseToken) {
        logger.error('No Firebase token available', ErrorCode.AUTH_TOKEN_ERROR);
        return false;
      }
      
      // Call backend to get refresh token
      const response = await fetch('/api/auth/google-refresh-token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${firebaseToken}`
        },
        body: JSON.stringify({
          idToken,
          accessToken: this.googleAccessToken
        })
      });
      
      if (!response.ok) {
        logger.error('Failed to get refresh token from backend', ErrorCode.AUTH_TOKEN_ERROR, {
          status: response.status
        });
        return false;
      }
      
      const data = await response.json();
      
      if (data.refreshToken) {
        this.googleRefreshToken = data.refreshToken;
        await AsyncStorage.setItem(AUTH_REFRESH_TOKEN_KEY, data.refreshToken);
        return true;
      }
      
      return false;
    } catch (error) {
      logger.error('Failed to request refresh token', ErrorCode.AUTH_TOKEN_ERROR, { error });
      return false;
    }
  }
  
  /**
   * Sign out the current user
   */
  async signOut(): Promise<boolean> {
    try {
      // Clear our tokens first
      await this.clearPersistedState();
      
      // Then sign out from Firebase
      await firebaseSignOut(auth);
      this.currentUser = null;
      
      return true;
    } catch (error) {
      logger.error('Sign out failed', ErrorCode.AUTH_FAILED, { error });
      return false;
    }
  }
  
  /**
   * Get Firebase ID token for the current user
   */
  async getIdToken(): Promise<string | null> {
    if (!this.currentUser) {
      return null;
    }
    
    try {
      return await this.currentUser.getIdToken();
    } catch (error) {
      logger.error('Failed to get ID token', ErrorCode.AUTH_TOKEN_ERROR, { error });
      return null;
    }
  }
  
  /**
   * Get Google access token (for direct Google API calls)
   */
  getGoogleAccessToken(): string | null {
    return this.googleAccessToken;
  }
  
  /**
   * Get Google refresh token
   */
  getGoogleRefreshToken(): string | null {
    return this.googleRefreshToken;
  }
  
  /**
   * Check if Google token is expired
   */
  isGoogleTokenExpired(): boolean {
    return Date.now() >= this.tokenExpiry;
  }
}

export const firebaseAuth = new FirebaseAuthService();