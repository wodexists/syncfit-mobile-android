/**
 * useAuth Hook
 *
 * This hook provides access to authentication functionality
 * for React components. It integrates Firebase auth with
 * Google Calendar authentication.
 */

import { useState, useEffect, useCallback } from 'react';
import { firebaseAuth } from '../services/firebase';
import { calendarService } from '../services/calendar';
import { logger, ErrorCode } from '../services/logging';
import type { User as FirebaseUser } from 'firebase/auth';

interface UseAuthResult {
  // User state
  user: FirebaseUser | null;
  isLoading: boolean;
  error: string | null;
  isAuthenticated: boolean; // For use in navigation flow
  
  // Google Calendar state
  isCalendarAuthenticated: boolean | null; // null means "loading"
  calendarAuthError: string | null;
  
  // Methods
  signInWithGoogle: () => Promise<boolean>;
  signOut: () => Promise<boolean>;
  authenticateCalendar: () => Promise<boolean>;
  login: () => Promise<boolean>; // Alias for signInWithGoogle for compatibility
}

/**
 * Hook to access authentication functionality
 */
export function useAuth(): UseAuthResult {
  // User state
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  
  // Google Calendar state
  const [isCalendarAuthenticated, setIsCalendarAuthenticated] = useState<boolean | null>(null);
  const [calendarAuthError, setCalendarAuthError] = useState<string | null>(null);
  
  // Initialize user state from Firebase
  useEffect(() => {
    const currentUser = firebaseAuth.getCurrentUser();
    setUser(currentUser);
    setIsAuthenticated(!!currentUser);
    setIsLoading(false);
    
    // If user is signed in, check calendar authentication
    if (currentUser) {
      checkCalendarAuth();
    }
  }, []);
  
  // Check if user is authenticated with Google Calendar
  const checkCalendarAuth = useCallback(async () => {
    try {
      setIsCalendarAuthenticated(null); // Set to loading
      const result = await calendarService.isAuthenticated();
      setIsCalendarAuthenticated(result);
    } catch (error) {
      setIsCalendarAuthenticated(false);
      setCalendarAuthError('Failed to check calendar authentication');
      logger.error('Failed to check calendar authentication', 
        ErrorCode.AUTH_FAILED, { error });
    }
  }, []);
  
  // Sign in with Google
  const signInWithGoogle = useCallback(async (): Promise<boolean> => {
    setIsLoading(true);
    setError(null);
    
    try {
      const result = await firebaseAuth.signInWithGoogle();
      
      if (result) {
        setUser(result);
        setIsAuthenticated(true);
        
        // Check calendar authentication
        await checkCalendarAuth();
        
        return true;
      } else {
        setError('Sign in failed');
        return false;
      }
    } catch (err) {
      setError('Sign in failed');
      logger.error('Sign in failed', ErrorCode.AUTH_FAILED, { error: err });
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [checkCalendarAuth]);
  
  // Sign out
  const signOut = useCallback(async (): Promise<boolean> => {
    setIsLoading(true);
    setError(null);
    
    try {
      // Sign out from Firebase
      const firebaseResult = await firebaseAuth.signOut();
      
      // Sign out from Google Calendar
      const calendarResult = await calendarService.signOut();
      
      setUser(null);
      setIsAuthenticated(false);
      setIsCalendarAuthenticated(false);
      
      return firebaseResult && calendarResult;
    } catch (err) {
      setError('Sign out failed');
      logger.error('Sign out failed', ErrorCode.AUTH_FAILED, { error: err });
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);
  
  // Authenticate with Google Calendar
  const authenticateCalendar = useCallback(async (): Promise<boolean> => {
    setCalendarAuthError(null);
    
    try {
      setIsCalendarAuthenticated(null); // Set to loading
      const result = await calendarService.authenticate();
      setIsCalendarAuthenticated(result);
      
      if (!result) {
        setCalendarAuthError('Calendar authentication failed');
        return false;
      }
      
      return true;
    } catch (err) {
      setIsCalendarAuthenticated(false);
      setCalendarAuthError('Calendar authentication failed');
      logger.error('Calendar authentication failed', 
        ErrorCode.AUTH_FAILED, { error: err });
      return false;
    }
  }, []);
  
  // Create login as an alias for signInWithGoogle (for compatibility)
  const login = useCallback(() => signInWithGoogle(), [signInWithGoogle]);

  return {
    // User state
    user,
    isLoading,
    error,
    isAuthenticated,
    
    // Google Calendar state
    isCalendarAuthenticated,
    calendarAuthError,
    
    // Methods
    signInWithGoogle,
    signOut,
    authenticateCalendar,
    login,
  };
}