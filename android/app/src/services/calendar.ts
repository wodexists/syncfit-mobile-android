/**
 * Calendar Service
 * 
 * This service provides a unified interface for working with calendars,
 * primarily Google Calendar. It handles calendar integration, scheduling,
 * and synchronization.
 */

import { googleCalendarApi } from './googleCalendar';
import { logger, ErrorCode } from './logging';
import { firebaseAuth } from './firebase';

export interface Calendar {
  id: string;
  title: string;
  primary: boolean;
  selected: boolean;
}

export interface TimeSlot {
  id: string;
  date: string;
  time: string;
  available: boolean;
  score?: number;
  recommended?: boolean;
}

export interface EventDetails {
  id?: string;
  title: string;
  description?: string;
  location?: string;
  startTime: string;
  endTime: string;
  date: string;
  calendarId?: string;
}

export interface SyncStatus {
  status: 'synced' | 'syncing' | 'error';
  lastSyncTime?: string;
  pendingEvents?: number;
  error?: string;
}

class CalendarService {
  private selectedCalendars: string[] = [];
  private syncStatus: SyncStatus = { status: 'synced' };
  private accessToken: string | null = null;
  private refreshToken: string | null = null;

  /**
   * Check if the user is authenticated with the calendar service
   */
  async isAuthenticated(): Promise<boolean> {
    try {
      // Check if we have tokens
      if (this.accessToken && this.refreshToken) {
        return true;
      }

      // Check if tokens are stored in user profile
      const user = firebaseAuth.getCurrentUser();
      if (!user) {
        return false;
      }

      // Get ID token to make authenticated request to backend
      const idToken = await firebaseAuth.getIdToken();
      if (!idToken) {
        return false;
      }

      // Try to validate tokens with API
      const isValid = await googleCalendarApi.validateToken(this.accessToken);
      return isValid;
    } catch (error) {
      logger.error('Failed to check calendar authentication', 
        ErrorCode.AUTH_FAILED, { error });
      return false;
    }
  }

  /**
   * Authenticate with the calendar service
   */
  async authenticate(): Promise<boolean> {
    try {
      // Start authentication flow
      const result = await googleCalendarApi.authenticate();
      
      if (result && result.accessToken && result.refreshToken) {
        this.accessToken = result.accessToken;
        this.refreshToken = result.refreshToken;
        
        // Update sync status
        this.syncStatus = { 
          status: 'synced', 
          lastSyncTime: new Date().toISOString() 
        };
        
        return true;
      }
      
      return false;
    } catch (error) {
      logger.error('Calendar authentication failed', 
        ErrorCode.AUTH_FAILED, { error });
      
      this.syncStatus = { 
        status: 'error', 
        error: 'Authentication failed' 
      };
      
      return false;
    }
  }

  /**
   * Sign out from the calendar service
   */
  async signOut(): Promise<boolean> {
    try {
      // Revoke tokens
      if (this.accessToken) {
        await googleCalendarApi.revokeToken(this.accessToken);
      }
      
      // Clear tokens
      this.accessToken = null;
      this.refreshToken = null;
      
      // Update sync status
      this.syncStatus = { status: 'synced' };
      
      return true;
    } catch (error) {
      logger.error('Calendar sign out failed', 
        ErrorCode.AUTH_FAILED, { error });
      return false;
    }
  }

  /**
   * Get list of available calendars
   */
  async getCalendars(forceRefresh: boolean = false): Promise<Calendar[]> {
    try {
      // Check authentication
      if (!await this.isAuthenticated()) {
        throw new Error('Not authenticated with calendar service');
      }
      
      // Get calendars from API
      const calendars = await googleCalendarApi.getCalendars(forceRefresh);
      
      // Mark selected calendars
      return calendars.map(calendar => ({
        ...calendar,
        selected: this.selectedCalendars.includes(calendar.id)
      }));
    } catch (error) {
      logger.error('Failed to get calendars', 
        ErrorCode.CALENDAR_FETCH_FAILED, { error });
      return [];
    }
  }

  /**
   * Update selected calendars
   */
  async updateSelectedCalendars(calendarIds: string[]): Promise<boolean> {
    try {
      this.selectedCalendars = calendarIds;
      return true;
    } catch (error) {
      logger.error('Failed to update selected calendars', 
        ErrorCode.CALENDAR_UPDATE_FAILED, { error });
      return false;
    }
  }

  /**
   * Get available time slots for a given date
   */
  async getTimeSlots(date: string): Promise<TimeSlot[]> {
    try {
      // Check authentication
      if (!await this.isAuthenticated()) {
        throw new Error('Not authenticated with calendar service');
      }
      
      // Get time slots from API
      let timeSlots = await googleCalendarApi.getTimeSlots(date, this.selectedCalendars);
      
      // If no calendars are selected, use the primary calendar
      if (this.selectedCalendars.length === 0) {
        const calendars = await this.getCalendars();
        const primaryCalendar = calendars.find(calendar => calendar.primary);
        
        if (primaryCalendar) {
          this.selectedCalendars = [primaryCalendar.id];
          timeSlots = await googleCalendarApi.getTimeSlots(date, this.selectedCalendars);
        }
      }
      
      // Apply intelligence/scoring to time slots
      const scoredTimeSlots = await this.applyIntelligentScoring(timeSlots);
      
      return scoredTimeSlots;
    } catch (error) {
      logger.error('Failed to get time slots', 
        ErrorCode.TIMESLOT_FETCH_FAILED, { error });
      return [];
    }
  }

  /**
   * Apply intelligent scoring to time slots
   * This is where we apply learning algorithms to suggest optimal times
   */
  private async applyIntelligentScoring(timeSlots: TimeSlot[]): Promise<TimeSlot[]> {
    try {
      // This would integrate with a learning system
      // For now, we'll just mark some slots as recommended
      return timeSlots.map(slot => {
        // For demonstration purposes, mark slots between 7-9 AM and 5-7 PM
        // as recommended (these are common workout times)
        const time = slot.time;
        const hourMatch = time.match(/(\d+):(\d+)\s+(AM|PM)/);
        
        if (hourMatch) {
          let hour = parseInt(hourMatch[1]);
          const ampm = hourMatch[3];
          
          if (ampm === 'PM' && hour !== 12) {
            hour += 12;
          } else if (ampm === 'AM' && hour === 12) {
            hour = 0;
          }
          
          const isRecommendedTime = 
            (hour >= 7 && hour <= 9) || 
            (hour >= 17 && hour <= 19);
          
          if (isRecommendedTime && slot.available) {
            return {
              ...slot,
              recommended: true,
              score: 85 // High score for recommended slots
            };
          }
        }
        
        return {
          ...slot,
          recommended: false,
          score: slot.available ? 50 : 0 // Medium score for available slots, 0 for unavailable
        };
      });
    } catch (error) {
      logger.error('Failed to apply intelligent scoring', 
        ErrorCode.SCORING_FAILED, { error });
      return timeSlots;
    }
  }

  /**
   * Create a calendar event
   */
  async createEvent(eventDetails: EventDetails): Promise<string | null> {
    try {
      // Check authentication
      if (!await this.isAuthenticated()) {
        throw new Error('Not authenticated with calendar service');
      }
      
      // Update sync status
      this.syncStatus = { status: 'syncing' };
      
      // Create event
      const calendarId = eventDetails.calendarId || 
        (this.selectedCalendars.length > 0 ? this.selectedCalendars[0] : 'primary');
      
      const result = await googleCalendarApi.createEvent(calendarId, eventDetails);
      
      // Update sync status
      this.syncStatus = { 
        status: 'synced', 
        lastSyncTime: new Date().toISOString() 
      };
      
      return result;
    } catch (error) {
      logger.error('Failed to create event', 
        ErrorCode.EVENT_CREATE_FAILED, { error });
      
      this.syncStatus = { 
        status: 'error', 
        error: 'Failed to create event' 
      };
      
      return null;
    }
  }

  /**
   * Get current sync status
   */
  getSyncStatus(): SyncStatus {
    return this.syncStatus;
  }

  /**
   * Trigger manual sync
   */
  async triggerSync(): Promise<boolean> {
    try {
      // Check authentication
      if (!await this.isAuthenticated()) {
        throw new Error('Not authenticated with calendar service');
      }
      
      // Update sync status
      this.syncStatus = { status: 'syncing' };
      
      // Simulate sync delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Update sync status
      this.syncStatus = { 
        status: 'synced', 
        lastSyncTime: new Date().toISOString() 
      };
      
      return true;
    } catch (error) {
      logger.error('Failed to trigger sync', 
        ErrorCode.SYNC_FAILED, { error });
      
      this.syncStatus = { 
        status: 'error', 
        error: 'Synchronization failed' 
      };
      
      return false;
    }
  }
}

export const calendarService = new CalendarService();