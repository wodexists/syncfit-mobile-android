/**
 * GoogleCalendarService
 * 
 * Handles Google Calendar API interactions for the mobile app
 */

import { API_BASE_URL } from '../config';
import { googleAuthManager } from './GoogleAuthManager';

export interface TimeSlot {
  start: string;
  end: string;
  label?: string;
}

export interface CalendarListItem {
  id: string;
  summary: string;
  description?: string;
  primary?: boolean;
  selected?: boolean;
  backgroundColor?: string;
  foregroundColor?: string;
}

export interface AvailabilitySlot {
  start: string;
  end: string;
  available: boolean;
  label: string;
}

export interface WorkoutEvent {
  id: string;
  summary: string;
  description?: string;
  start: {
    dateTime: string;
    timeZone?: string;
  };
  end: {
    dateTime: string;
    timeZone?: string;
  };
  reminders?: {
    useDefault?: boolean;
    overrides?: Array<{
      method: string;
      minutes: number;
    }>;
  };
}

export interface RecurringPattern {
  frequency: 'daily' | 'weekly';
  daysOfWeek?: number[]; // 0 = Sunday, 1 = Monday, etc.
  interval?: number; // Every X days or weeks
  count?: number; // Number of occurrences
  endDate?: string; // ISO date string when recurrence ends
}

class GoogleCalendarService {
  /**
   * Make an authenticated API request
   */
  private async apiRequest<T>(
    endpoint: string, 
    method: 'GET' | 'POST' | 'PUT' | 'DELETE' = 'GET',
    body?: any
  ): Promise<T> {
    try {
      // Get a fresh access token
      const accessToken = await googleAuthManager.getAccessToken();
      
      if (!accessToken) {
        throw new Error('No access token available');
      }
      
      const url = `${API_BASE_URL}${endpoint}`;
      
      const headers: HeadersInit = {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      };
      
      const options: RequestInit = {
        method,
        headers
      };
      
      if (body) {
        options.body = JSON.stringify(body);
      }
      
      const response = await fetch(url, options);
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`API request failed with status ${response.status}: ${errorText}`);
      }
      
      return await response.json() as T;
    } catch (error) {
      console.error(`Error making API request to ${endpoint}:`, error);
      throw error;
    }
  }
  
  /**
   * Get list of user's calendars
   */
  public async getCalendarList(): Promise<CalendarListItem[]> {
    try {
      const data = await this.apiRequest<{ items: CalendarListItem[] }>('/api/calendar/list');
      return data.items || [];
    } catch (error) {
      console.error('Error getting calendar list:', error);
      return [];
    }
  }
  
  /**
   * Find available time slots for scheduling workouts
   */
  public async findAvailableTimeSlots(
    date: Date = new Date(),
    durationMinutes: number = 60,
    timeHorizon: number = 3
  ): Promise<TimeSlot[]> {
    try {
      const formattedDate = date.toISOString().split('T')[0]; // YYYY-MM-DD
      
      const data = await this.apiRequest<{ slots: TimeSlot[] }>(
        `/api/calendar/available-slots?date=${formattedDate}&duration=${durationMinutes}&days=${timeHorizon}`
      );
      
      return data.slots || [];
    } catch (error) {
      console.error('Error finding available time slots:', error);
      return [];
    }
  }
  
  /**
   * Get events for a specific day
   */
  public async getEventsForDay(date: Date = new Date()): Promise<WorkoutEvent[]> {
    try {
      const formattedDate = date.toISOString().split('T')[0]; // YYYY-MM-DD
      
      const data = await this.apiRequest<{ events: WorkoutEvent[] }>(
        `/api/calendar/events/day?date=${formattedDate}`
      );
      
      return data.events || [];
    } catch (error) {
      console.error('Error getting events for day:', error);
      return [];
    }
  }
  
  /**
   * Create a calendar event for a scheduled workout
   */
  public async createWorkoutEvent(
    workoutName: string,
    startTime: Date,
    endTime: Date,
    reminderMinutes: number = 30
  ): Promise<WorkoutEvent | null> {
    try {
      const eventData = {
        summary: workoutName,
        start: { dateTime: startTime.toISOString() },
        end: { dateTime: endTime.toISOString() },
        reminders: {
          useDefault: false,
          overrides: [
            { method: 'popup', minutes: reminderMinutes }
          ]
        }
      };
      
      const result = await this.apiRequest<{ event: WorkoutEvent }>(
        '/api/calendar/events',
        'POST',
        eventData
      );
      
      return result.event || null;
    } catch (error) {
      console.error('Error creating workout event:', error);
      return null;
    }
  }
  
  /**
   * Check if a time slot has any conflicts with existing events
   */
  public async checkTimeSlotConflicts(
    startTime: Date,
    endTime: Date,
    selectedCalendars?: string[]
  ): Promise<boolean> {
    try {
      const params = new URLSearchParams({
        start: startTime.toISOString(),
        end: endTime.toISOString()
      });
      
      if (selectedCalendars && selectedCalendars.length > 0) {
        selectedCalendars.forEach(calId => {
          params.append('calendars', calId);
        });
      }
      
      const data = await this.apiRequest<{ hasConflict: boolean }>(
        `/api/calendar/check-conflicts?${params.toString()}`
      );
      
      return data.hasConflict;
    } catch (error) {
      console.error('Error checking time slot conflicts:', error);
      // Default to assuming there is a conflict if the API call fails
      return true;
    }
  }
  
  /**
   * Create recurring workout events
   */
  public async createRecurringWorkouts(
    workoutName: string,
    startTime: Date,
    endTime: Date,
    pattern: RecurringPattern,
    reminderMinutes: number = 30
  ): Promise<WorkoutEvent[]> {
    try {
      const eventData = {
        summary: workoutName,
        start: { dateTime: startTime.toISOString() },
        end: { dateTime: endTime.toISOString() },
        reminderMinutes,
        pattern
      };
      
      const result = await this.apiRequest<{ events: WorkoutEvent[] }>(
        '/api/calendar/recurring-events',
        'POST',
        eventData
      );
      
      return result.events || [];
    } catch (error) {
      console.error('Error creating recurring workout events:', error);
      return [];
    }
  }
  
  /**
   * Create availability timeline for a day
   */
  public async createAvailabilityTimeline(
    date: Date = new Date()
  ): Promise<AvailabilitySlot[]> {
    try {
      const formattedDate = date.toISOString().split('T')[0]; // YYYY-MM-DD
      
      const data = await this.apiRequest<{ timeline: AvailabilitySlot[] }>(
        `/api/calendar/availability-timeline?date=${formattedDate}`
      );
      
      return data.timeline || [];
    } catch (error) {
      console.error('Error creating availability timeline:', error);
      return [];
    }
  }
}

// Export a singleton instance
export const googleCalendarService = new GoogleCalendarService();