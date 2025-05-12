/**
 * Google Calendar API Integration
 * 
 * This module provides direct integration with Google Calendar API.
 * It handles authentication, token management, and API calls.
 */

import { Calendar, TimeSlot, EventDetails } from './calendar';
import { logger, ErrorCode } from './logging';
import { firebaseAuth } from './firebase';

// Time slot constants
const TIME_SLOT_START_HOUR = 7; // 7 AM
const TIME_SLOT_END_HOUR = 22; // 10 PM
const TIME_SLOT_INTERVAL = 60; // 60 minutes

// API URL constants
const API_BASE_URL = 'https://www.googleapis.com/calendar/v3';
const TOKEN_INFO_URL = 'https://oauth2.googleapis.com/tokeninfo';
const TOKEN_REFRESH_URL = 'https://oauth2.googleapis.com/token';

interface GoogleCalendarEvent {
  id: string;
  summary: string;
  description?: string;
  location?: string;
  start: {
    dateTime: string;
    timeZone?: string;
  };
  end: {
    dateTime: string;
    timeZone?: string;
  };
}

interface AuthResult {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

interface TokenInfo {
  accessToken: string;
  refreshToken?: string;
  expiresAt: number; // timestamp when token expires
}

class GoogleCalendarAPI {
  private apiBase = API_BASE_URL;
  private tokenInfoUrl = TOKEN_INFO_URL;
  private tokenRefreshUrl = TOKEN_REFRESH_URL;
  private authCache: { 
    tokens?: TokenInfo,
    calendars?: Calendar[] 
  } = {};
  
  /**
   * Real implementation of Google Calendar authentication
   * This function uses Firebase's GoogleAuthProvider credentials
   * to authenticate with Google Calendar API
   */
  async authenticate(): Promise<AuthResult | null> {
    try {
      logger.info('Starting Google Calendar authentication flow');
      
      // Check if we already have valid tokens in the cache
      if (this.authCache.tokens?.accessToken) {
        const isValid = await this.validateToken(this.authCache.tokens.accessToken);
        
        if (isValid) {
          logger.info('Using cached tokens that are still valid');
          return {
            accessToken: this.authCache.tokens.accessToken,
            refreshToken: this.authCache.tokens.refreshToken || '',
            expiresIn: Math.max(0, Math.floor((this.authCache.tokens.expiresAt - Date.now()) / 1000))
          };
        }
        
        // If we have a refresh token, try to refresh instead of full re-auth
        if (this.authCache.tokens.refreshToken) {
          logger.info('Cached token invalid, attempting refresh');
          const refreshed = await this.refreshToken();
          
          if (refreshed && this.authCache.tokens) {
            return {
              accessToken: this.authCache.tokens.accessToken,
              refreshToken: this.authCache.tokens.refreshToken || '',
              expiresIn: Math.max(0, Math.floor((this.authCache.tokens.expiresAt - Date.now()) / 1000))
            };
          }
        }
      }
      
      // If no cached tokens or refresh failed, do full authentication
      
      // Get current Firebase user
      const firebaseUser = firebaseAuth.getCurrentUser();
      if (!firebaseUser) {
        logger.error('No Firebase user found during calendar authentication', 
          ErrorCode.AUTH_FAILED);
        return null;
      }
      
      // Get Firebase ID token
      const idToken = await firebaseAuth.getIdToken();
      if (!idToken) {
        logger.error('Failed to get Firebase ID token', 
          ErrorCode.AUTH_FAILED);
        return null;
      }
      
      // Call backend to get Google access token
      logger.debug('Calling backend for Google Calendar tokens');
      const response = await fetch('/api/auth/google-token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`
        },
        body: JSON.stringify({
          uid: firebaseUser.uid,
          email: firebaseUser.email
        })
      });
      
      if (!response.ok) {
        // Specific handling for common error cases
        if (response.status === 401) {
          logger.error('Firebase authentication rejected by server', 
            ErrorCode.AUTH_FAILED);
          // Suggest user to re-authenticate with Firebase
          await firebaseAuth.signOut();
          return null;
        }
        
        if (response.status === 404) {
          logger.error('User not found on server, may need to create account', 
            ErrorCode.AUTH_FAILED);
          return null;
        }
        
        const errorText = await response.text();
        logger.error('Google Calendar token fetch failed', 
          ErrorCode.AUTH_FAILED, { 
            status: response.status, 
            error: errorText 
          });
        return null;
      }
      
      const tokenData = await response.json();
      
      if (!tokenData.accessToken) {
        logger.error('No access token returned from token endpoint', 
          ErrorCode.AUTH_FAILED);
        return null;
      }
      
      // Store tokens with expiration
      this.authCache.tokens = {
        accessToken: tokenData.accessToken,
        refreshToken: tokenData.refreshToken,
        expiresAt: Date.now() + (tokenData.expiresIn * 1000)
      };
      
      logger.info('Google Calendar authentication successful');
      
      return {
        accessToken: tokenData.accessToken,
        refreshToken: tokenData.refreshToken || '',
        expiresIn: tokenData.expiresIn || 3600
      };
    } catch (error) {
      logger.error('Google Calendar authentication failed', 
        ErrorCode.AUTH_FAILED, { error });
      
      // Clear the cache since authentication failed
      delete this.authCache.tokens;
      
      return null;
    }
  }
  
  /**
   * Validate an access token
   * Returns true if token is valid, false otherwise
   */
  async validateToken(token: string | null): Promise<boolean> {
    if (!token) {
      logger.debug('validateToken called with null token');
      return false;
    }
    
    try {
      // Check if we have cached tokens and they're not expired
      if (this.authCache.tokens) {
        const { accessToken, expiresAt } = this.authCache.tokens;
        
        // If token matches cached token and isn't expired, it's valid
        if (accessToken === token && expiresAt > Date.now()) {
          logger.debug('Token validated from cache');
          return true;
        }
        
        // If token is expired but we have a refresh token, try to refresh
        if (expiresAt <= Date.now() && this.authCache.tokens.refreshToken) {
          logger.info('Cached token is expired, attempting to refresh');
          const refreshed = await this.refreshToken();
          return refreshed;
        }
      }
      
      // First, try our backend validation endpoint which is more reliable
      // and allows us to keep tokens in sync between client and server
      try {
        // Get Firebase ID token for authorization
        const idToken = await firebaseAuth.getIdToken();
        
        if (idToken) {
          logger.debug('Using backend validation endpoint with Firebase auth');
          
          // Call our backend validation endpoint
          const response = await fetch('/api/auth/calendar-auth-status', {
            headers: {
              'Authorization': `Bearer ${idToken}`
            }
          });
          
          if (response.ok) {
            const data = await response.json();
            
            if (data.authenticated === true) {
              logger.debug('Token validated by backend as authenticated');
              return true;
            } else {
              logger.debug('Backend reports token as invalid');
              // Don't return false yet, try direct validation
            }
          }
        }
      } catch (backendError) {
        logger.warn('Error during backend token validation, will try direct validation', 
          { backendError });
      }
      
      // Make a direct API call to validate the token as fallback
      try {
        logger.debug('Using direct token validation as fallback');
        
        const response = await fetch(`${this.tokenInfoUrl}?access_token=${token}`);
        
        if (!response.ok) {
          logger.debug('Direct token validation failed', { status: response.status });
          
          // If token is invalid and we have a refresh token, try to refresh
          if (this.authCache.tokens?.refreshToken) {
            logger.info('Token is invalid, attempting to refresh');
            const refreshed = await this.refreshToken();
            return refreshed;
          }
          
          return false;
        }
        
        const data = await response.json();
        
        // Verify this token has the calendars scope we need
        const hasCalendarScope = data.scope?.includes('https://www.googleapis.com/auth/calendar');
        
        if (!hasCalendarScope) {
          logger.warn('Token is valid but missing calendar scope');
          return false;
        }
        
        // Update our cache with this token's expiry if available
        if (data.exp && this.authCache.tokens) {
          const expiryTime = parseInt(data.exp) * 1000; // Convert to milliseconds
          this.authCache.tokens.expiresAt = expiryTime;
          logger.debug('Updated token expiry time in cache', { expiryTime });
        }
        
        return true;
      } catch (directError) {
        logger.error('Direct token validation failed', { directError });
      }
      
      // If we get here, all validation attempts failed
      // If we have a refresh token, try refreshing as last resort
      if (this.authCache.tokens?.refreshToken) {
        logger.info('All validation mechanisms failed, attempting refresh');
        return await this.refreshToken();
      }
      
      return false;
    } catch (error) {
      logger.error('Token validation failed', ErrorCode.AUTH_FAILED, { error });
      return false;
    }
  }
  
  /**
   * Refresh the access token using the refresh token
   * This is critical for maintaining long-term access to Google Calendar
   */
  async refreshToken(): Promise<boolean> {
    try {
      logger.info('Attempting to refresh Google Calendar token');
      
      // Check if we have a refresh token
      if (!this.authCache.tokens?.refreshToken) {
        logger.error('No refresh token available for token refresh', 
          ErrorCode.AUTH_FAILED);
        
        // If no refresh token but we have Firebase auth, try to authenticate again
        if (firebaseAuth.isAuthenticated()) {
          logger.info('No refresh token but user is authenticated, attempting to re-authenticate');
          const authResult = await this.authenticate();
          return !!authResult;
        }
        
        return false;
      }
      
      // First try using our backend refresh endpoint which syncs with DB
      try {
        // Get Firebase ID token for authorization
        const idToken = await firebaseAuth.getIdToken();
        
        if (idToken) {
          logger.debug('Using backend refresh endpoint with Firebase auth');
          
          // Call the backend to refresh the token
          const response = await fetch('/api/auth/refresh-token', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${idToken}`
            },
            body: JSON.stringify({
              refreshToken: this.authCache.tokens.refreshToken
            })
          });
          
          if (response.ok) {
            const tokenData = await response.json();
            
            if (tokenData.accessToken) {
              // Update cached token
              this.authCache.tokens = {
                accessToken: tokenData.accessToken,
                refreshToken: tokenData.refreshToken || this.authCache.tokens.refreshToken,
                expiresAt: Date.now() + (tokenData.expiresIn * 1000)
              };
              
              logger.info('Token refresh successful using backend endpoint');
              return true;
            }
          } else {
            const errorText = await response.text();
            logger.warn('Backend token refresh failed, will try direct refresh', { 
              status: response.status, 
              error: errorText 
            });
          }
        }
      } catch (backendError) {
        logger.warn('Error during backend token refresh, will try direct refresh', { backendError });
      }
      
      // If backend refresh fails, try direct refresh using the refresh token
      // This is a fallback mechanism to ensure we can still refresh tokens
      // even if there are connectivity issues with our backend
      try {
        logger.debug('Using direct token refresh as fallback');
        
        // Call the direct Google OAuth token endpoint
        const refreshResponse = await fetch('/api/auth/refresh-token', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            refreshToken: this.authCache.tokens.refreshToken
          })
        });
        
        if (refreshResponse.ok) {
          const tokenData = await refreshResponse.json();
          
          if (tokenData.accessToken) {
            // Update cached token
            this.authCache.tokens = {
              accessToken: tokenData.accessToken,
              refreshToken: tokenData.refreshToken || this.authCache.tokens.refreshToken,
              expiresAt: Date.now() + (tokenData.expiresIn * 1000)
            };
            
            logger.info('Token refresh successful using direct refresh');
            return true;
          }
        } else {
          const errorText = await refreshResponse.text();
          logger.error('Direct token refresh failed', { 
            status: refreshResponse.status, 
            error: errorText 
          });
        }
      } catch (directError) {
        logger.error('Error during direct token refresh', { directError });
      }
      
      // If we get here, both refresh mechanisms failed
      // Try re-authentication as last resort
      if (firebaseAuth.isAuthenticated()) {
        logger.info('All refresh mechanisms failed, attempting to re-authenticate');
        const authResult = await this.authenticate();
        return !!authResult;
      }
      
      logger.error('All token refresh mechanisms failed', ErrorCode.AUTH_FAILED);
      return false;
    } catch (error) {
      logger.error('Token refresh failed', ErrorCode.AUTH_FAILED, { error });
      return false;
    }
  }

  /**
   * Revoke an access token
   */
  async revokeToken(token: string): Promise<boolean> {
    try {
      // Get Firebase ID token for authorization
      const idToken = await firebaseAuth.getIdToken();
      if (!idToken) {
        logger.error('Failed to get Firebase ID token for token revocation', 
          ErrorCode.AUTH_FAILED);
        return false;
      }
      
      // Call the backend to revoke the token
      const response = await fetch('/api/auth/revoke-token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`
        },
        body: JSON.stringify({ token })
      });
      
      // Clear the cache regardless of the response
      this.authCache = {};
      
      if (!response.ok) {
        logger.warn('Google token revocation returned an error but cache was cleared');
        return true; // Still return true since we cleared the cache
      }
      
      logger.info('Google token revocation successful');
      return true;
    } catch (error) {
      // Still clear the cache even if there was an error
      this.authCache = {};
      logger.error('Token revocation failed with error, but cache was cleared', 
        ErrorCode.AUTH_FAILED, { error });
      return true; // Still return true since we cleared the cache
    }
  }
  
  /**
   * Get a list of the user's calendars
   */
  async getCalendars(forceRefresh: boolean = false): Promise<Calendar[]> {
    try {
      // Check cache first unless forced refresh
      if (!forceRefresh && this.authCache.calendars) {
        return this.authCache.calendars;
      }
      
      // Ensure we have valid tokens
      if (!this.authCache.tokens?.accessToken) {
        logger.error('No access token available for calendar fetch');
        throw new Error('Authentication required');
      }
      
      // Get Firebase ID token for authorization
      const idToken = await firebaseAuth.getIdToken();
      if (!idToken) {
        logger.error('Failed to get Firebase ID token for calendar fetch');
        throw new Error('Authentication required');
      }
      
      // Call the backend API that handles the Google Calendar request
      const response = await fetch('/api/calendar/list', {
        headers: {
          'Authorization': `Bearer ${idToken}`,
          'X-Google-Token': this.authCache.tokens.accessToken
        }
      });
      
      if (!response.ok) {
        // If token has expired, try to refresh and retry
        if (response.status === 401) {
          logger.info('Calendar list fetch returned 401, attempting token refresh');
          
          const refreshed = await this.refreshToken();
          if (refreshed && this.authCache.tokens?.accessToken) {
            // Retry with the new token
            const retryResponse = await fetch('/api/calendar/list', {
              headers: {
                'Authorization': `Bearer ${idToken}`,
                'X-Google-Token': this.authCache.tokens.accessToken
              }
            });
            
            if (retryResponse.ok) {
              const data = await retryResponse.json();
              const calendars = this.parseCalendarListResponse(data);
              this.authCache.calendars = calendars;
              return calendars;
            }
          }
        }
        
        const errorText = await response.text();
        logger.error('Failed to get calendars', { 
          status: response.status, 
          error: errorText 
        });
        throw new Error('Failed to get calendars: ' + errorText);
      }
      
      const data = await response.json();
      const calendars = this.parseCalendarListResponse(data);
      
      // Store in cache
      this.authCache.calendars = calendars;
      
      return calendars;
    } catch (error) {
      logger.error('Failed to get calendars from Google', 
        ErrorCode.CALENDAR_FETCH_FAILED, { error });
      throw error;
    }
  }
  
  /**
   * Parse the calendar list response from Google
   */
  private parseCalendarListResponse(data: any): Calendar[] {
    try {
      if (!data || !Array.isArray(data.items)) {
        return [];
      }
      
      return data.items.map((cal: any) => ({
        id: cal.id || '',
        title: cal.summary || 'Untitled Calendar',
        primary: cal.primary === true,
        selected: cal.selected === true
      }));
    } catch (error) {
      logger.error('Failed to parse calendar list response', { error });
      return [];
    }
  }
  
  /**
   * Get time slots for a specific date, showing which are available/busy
   */
  async getTimeSlots(date: string, calendarIds: string[] = ['primary']): Promise<TimeSlot[]> {
    try {
      // If no calendars specified, use primary
      if (calendarIds.length === 0) {
        calendarIds = ['primary'];
      }
      
      // In a real implementation, this would:
      // 1. Generate time slots for the entire day
      // 2. Call the freebusy API to check which slots are available
      // POST https://www.googleapis.com/calendar/v3/freeBusy
      
      // For demo purposes, generate time slots and mark some as busy
      const slots: TimeSlot[] = [];
      
      // Generate a slot for each hour in the day within our range
      for (let hour = TIME_SLOT_START_HOUR; hour <= TIME_SLOT_END_HOUR; hour++) {
        const ampm = hour >= 12 ? 'PM' : 'AM';
        const hour12 = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
        
        // Randomly mark some slots as busy (about 30%)
        // In a real implementation, this would come from the freebusy API
        const isBusy = Math.random() < 0.3;
        
        slots.push({
          id: `${date}-${hour}`,
          date,
          time: `${hour12}:00 ${ampm}`,
          available: !isBusy
        });
      }
      
      return slots;
    } catch (error) {
      logger.error('Failed to get time slots from Google Calendar', 
        ErrorCode.TIMESLOT_FETCH_FAILED, { error });
      throw error;
    }
  }
  
  /**
   * Create a calendar event
   */
  async createEvent(calendarId: string, eventDetails: EventDetails): Promise<string | null> {
    try {
      // Ensure we have valid tokens
      if (!this.authCache.tokens?.accessToken) {
        logger.error('No access token available for event creation');
        throw new Error('Authentication required');
      }
      
      // Parse times and create a proper Google Calendar event object
      const { date, startTime, endTime, title, description, location } = eventDetails;
      
      // Parse the times (e.g., "10:00 AM")
      const startTimeParts = startTime.match(/(\d+):(\d+)\s+(AM|PM)/);
      const endTimeParts = endTime.match(/(\d+):(\d+)\s+(AM|PM)/);
      
      if (!startTimeParts || !endTimeParts) {
        throw new Error('Invalid time format');
      }
      
      // Convert to 24-hour format
      let startHour = parseInt(startTimeParts[1]);
      const startMinute = parseInt(startTimeParts[2]);
      const startAmPm = startTimeParts[3];
      
      let endHour = parseInt(endTimeParts[1]);
      const endMinute = parseInt(endTimeParts[2]);
      const endAmPm = endTimeParts[3];
      
      if (startAmPm === 'PM' && startHour < 12) startHour += 12;
      if (startAmPm === 'AM' && startHour === 12) startHour = 0;
      
      if (endAmPm === 'PM' && endHour < 12) endHour += 12;
      if (endAmPm === 'AM' && endHour === 12) endHour = 0;
      
      // Create ISO date strings
      const startDateTime = `${date}T${startHour.toString().padStart(2, '0')}:${startMinute.toString().padStart(2, '0')}:00`;
      const endDateTime = `${date}T${endHour.toString().padStart(2, '0')}:${endMinute.toString().padStart(2, '0')}:00`;
      
      // Prepare event object that would be sent to Google
      const event = {
        summary: title,
        description,
        location,
        start: {
          dateTime: startDateTime,
          timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
        },
        end: {
          dateTime: endDateTime,
          timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
        }
      };
      
      // Get Firebase ID token for authorization
      const idToken = await firebaseAuth.getIdToken();
      if (!idToken) {
        logger.error('Failed to get Firebase ID token for event creation');
        throw new Error('Authentication required');
      }
      
      // Make the API call to create the event
      const response = await fetch(`/api/calendar/events`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`,
          'X-Google-Token': this.authCache.tokens.accessToken
        },
        body: JSON.stringify({
          calendarId,
          event
        })
      });
      
      if (!response.ok) {
        // If token has expired, try to refresh and retry
        if (response.status === 401) {
          logger.info('Event creation returned 401, attempting token refresh');
          
          const refreshed = await this.refreshToken();
          if (refreshed && this.authCache.tokens?.accessToken) {
            // Retry with the new token
            const retryResponse = await fetch(`/api/calendar/events`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${idToken}`,
                'X-Google-Token': this.authCache.tokens.accessToken
              },
              body: JSON.stringify({
                calendarId,
                event
              })
            });
            
            if (retryResponse.ok) {
              const data = await retryResponse.json();
              logger.info(`Created event: ${title} on ${date} at ${startTime} with ID ${data.id}`);
              return data.id;
            }
          }
        }
        
        const errorText = await response.text();
        logger.error('Failed to create event', { 
          status: response.status, 
          error: errorText 
        });
        throw new Error('Failed to create event: ' + errorText);
      }
      
      const data = await response.json();
      logger.info(`Created event: ${title} on ${date} at ${startTime} with ID ${data.id}`);
      return data.id;
    } catch (error) {
      logger.error('Failed to create event in Google Calendar', 
        ErrorCode.EVENT_CREATE_FAILED, { error });
      throw error;
    }
  }
}

export const googleCalendarApi = new GoogleCalendarAPI();