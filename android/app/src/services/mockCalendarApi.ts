/**
 * Mock Google Calendar API for testing calendar operations
 * This file provides a consistent testing interface for calendar operations
 * without requiring actual Google Calendar access
 */

import { ErrorCode } from './logging';
import { firestore } from './firebase';
import { collection, addDoc, query, where, getDocs, Timestamp, doc, setDoc, deleteDoc } from 'firebase/firestore';

// Types
export interface MockCalendar {
  id: string;
  title: string;
  primary: boolean;
  accessRole: string;
}

export interface MockEvent {
  id: string;
  calendarId: string;
  summary: string;
  description?: string;
  location?: string;
  start: {
    dateTime: string;
    timeZone: string;
  };
  end: {
    dateTime: string;
    timeZone: string;
  };
  recurrence?: string[];
  creator: {
    email: string;
    displayName?: string;
  };
  created: string;
  updated: string;
  status: 'confirmed' | 'tentative' | 'cancelled';
  reminders?: {
    useDefault: boolean;
    overrides?: {
      method: 'email' | 'popup';
      minutes: number;
    }[];
  };
}

export interface MockTimeSlot {
  start: string;
  end: string;
  date: string;
  busy: boolean;
}

// Possible error scenarios for testing
export enum MockErrorScenario {
  NONE = 'none',
  UNAUTHORIZED = 'unauthorized',
  NOT_FOUND = 'not_found',
  RATE_LIMIT = 'rate_limit',
  SERVER_ERROR = 'server_error',
  NETWORK_ERROR = 'network_error',
  CONFLICT = 'conflict',
}

// Test data generation options
interface MockOptions {
  errorScenario?: MockErrorScenario;
  simulateDelay?: number;
  userId?: string;
}

/**
 * Mock Google Calendar API service for testing
 */
class MockCalendarApi {
  private mockCalendars: MockCalendar[] = [];
  private mockEvents: MockEvent[] = [];
  private mockTimeSlots: Record<string, MockTimeSlot[]> = {};
  private currentErrorScenario: MockErrorScenario = MockErrorScenario.NONE;
  private simulateDelay: number = 200; // Default delay in ms
  private userId: string = 'test-user-uid-123456'; // Default test user
  
  constructor() {
    this.initializeTestData();
  }
  
  /**
   * Set test options for the mock service
   */
  setOptions(options: MockOptions): void {
    if (options.errorScenario !== undefined) {
      this.currentErrorScenario = options.errorScenario;
    }
    
    if (options.simulateDelay !== undefined) {
      this.simulateDelay = options.simulateDelay;
    }
    
    if (options.userId !== undefined) {
      this.userId = options.userId;
    }
  }
  
  /**
   * Initialize test data for the mock service
   */
  private initializeTestData(): void {
    // Create mock calendars
    this.mockCalendars = [
      {
        id: 'primary',
        title: 'Test User',
        primary: true,
        accessRole: 'owner'
      },
      {
        id: 'workout-calendar',
        title: 'Workouts',
        primary: false,
        accessRole: 'owner'
      },
      {
        id: 'work-calendar',
        title: 'Work',
        primary: false,
        accessRole: 'owner'
      }
    ];
    
    // Create some mock events
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    // Format dates for the mock events
    const todayStr = today.toISOString().split('T')[0];
    const tomorrowStr = tomorrow.toISOString().split('T')[0];
    
    this.mockEvents = [
      {
        id: 'event1',
        calendarId: 'primary',
        summary: 'Morning Run',
        description: 'A refreshing morning run to start the day',
        start: {
          dateTime: `${todayStr}T08:00:00Z`,
          timeZone: 'UTC'
        },
        end: {
          dateTime: `${todayStr}T08:30:00Z`,
          timeZone: 'UTC'
        },
        creator: {
          email: 'test@example.com',
          displayName: 'Test User'
        },
        created: new Date().toISOString(),
        updated: new Date().toISOString(),
        status: 'confirmed'
      },
      {
        id: 'event2',
        calendarId: 'work-calendar',
        summary: 'Team Meeting',
        description: 'Weekly team sync',
        start: {
          dateTime: `${todayStr}T15:00:00Z`,
          timeZone: 'UTC'
        },
        end: {
          dateTime: `${todayStr}T16:00:00Z`,
          timeZone: 'UTC'
        },
        creator: {
          email: 'test@example.com',
          displayName: 'Test User'
        },
        created: new Date().toISOString(),
        updated: new Date().toISOString(),
        status: 'confirmed'
      },
      {
        id: 'event3',
        calendarId: 'workout-calendar',
        summary: 'Evening Yoga',
        description: 'Relaxing yoga session',
        start: {
          dateTime: `${tomorrowStr}T18:00:00Z`,
          timeZone: 'UTC'
        },
        end: {
          dateTime: `${tomorrowStr}T19:00:00Z`,
          timeZone: 'UTC'
        },
        recurrence: [
          'RRULE:FREQ=WEEKLY;COUNT=8'
        ],
        creator: {
          email: 'test@example.com',
          displayName: 'Test User'
        },
        created: new Date().toISOString(),
        updated: new Date().toISOString(),
        status: 'confirmed',
        reminders: {
          useDefault: false,
          overrides: [
            {
              method: 'popup',
              minutes: 30
            }
          ]
        }
      }
    ];
    
    // Generate mock time slots for today and tomorrow
    this.generateMockTimeSlots(todayStr);
    this.generateMockTimeSlots(tomorrowStr);
  }
  
  /**
   * Generate mock time slots for a given date
   */
  private generateMockTimeSlots(date: string): void {
    const slots: MockTimeSlot[] = [];
    
    // Generate slots from 6 AM to 10 PM at 30 minute intervals
    for (let hour = 6; hour < 22; hour++) {
      for (let minute = 0; minute < 60; minute += 30) {
        const startHour = hour.toString().padStart(2, '0');
        const startMinute = minute.toString().padStart(2, '0');
        
        const endHour = minute === 30 ? hour.toString().padStart(2, '0') : (hour + 1).toString().padStart(2, '0');
        const endMinute = minute === 30 ? '00' : '30';
        
        // Check if this slot overlaps with any existing event
        const startTimeStr = `${date}T${startHour}:${startMinute}:00Z`;
        const endTimeStr = `${date}T${endHour}:${endMinute}:00Z`;
        
        const isBusy = this.checkIfTimeSlotIsBusy(date, startTimeStr, endTimeStr);
        
        slots.push({
          start: startTimeStr,
          end: endTimeStr,
          date,
          busy: isBusy
        });
      }
    }
    
    this.mockTimeSlots[date] = slots;
  }
  
  /**
   * Check if a time slot overlaps with any existing events
   */
  private checkIfTimeSlotIsBusy(date: string, startTime: string, endTime: string): boolean {
    const start = new Date(startTime).getTime();
    const end = new Date(endTime).getTime();
    
    return this.mockEvents.some(event => {
      const eventStart = new Date(event.start.dateTime).getTime();
      const eventEnd = new Date(event.end.dateTime).getTime();
      
      // Check for overlap
      return (
        (start >= eventStart && start < eventEnd) || // Start time is within event
        (end > eventStart && end <= eventEnd) || // End time is within event
        (start <= eventStart && end >= eventEnd) // Event is completely within slot
      );
    });
  }
  
  /**
   * Simulate API delay and potential errors
   */
  private async simulateRequest<T>(data: T): Promise<T> {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, this.simulateDelay));
    
    // Check for error scenarios
    switch (this.currentErrorScenario) {
      case MockErrorScenario.UNAUTHORIZED:
        throw { 
          status: 401, 
          message: 'Request is missing required authentication credential',
          errorCode: ErrorCode.AUTH_REQUIRED
        };
      
      case MockErrorScenario.NOT_FOUND:
        throw { 
          status: 404, 
          message: 'Requested entity was not found',
          errorCode: ErrorCode.API_NOT_FOUND
        };
      
      case MockErrorScenario.RATE_LIMIT:
        throw { 
          status: 429, 
          message: 'Rate limit exceeded',
          errorCode: ErrorCode.API_RATE_LIMITED
        };
      
      case MockErrorScenario.SERVER_ERROR:
        throw { 
          status: 500, 
          message: 'Internal server error',
          errorCode: ErrorCode.API_SERVER_ERROR
        };
      
      case MockErrorScenario.NETWORK_ERROR:
        throw { 
          message: 'Network request failed',
          errorCode: ErrorCode.NETWORK_REQUEST_FAILED
        };
      
      case MockErrorScenario.CONFLICT:
        throw { 
          status: 409, 
          message: 'The requested operation could not be completed due to a conflict',
          errorCode: ErrorCode.DATA_CONFLICT
        };
      
      default:
        return data;
    }
  }
  
  /**
   * Get all calendars for the current user
   */
  async getCalendars(): Promise<MockCalendar[]> {
    return this.simulateRequest(this.mockCalendars);
  }
  
  /**
   * Get events from a specific calendar
   */
  async getEvents(calendarId: string): Promise<MockEvent[]> {
    const events = this.mockEvents.filter(event => event.calendarId === calendarId);
    return this.simulateRequest(events);
  }
  
  /**
   * Get all events across all calendars
   */
  async getAllEvents(): Promise<MockEvent[]> {
    return this.simulateRequest(this.mockEvents);
  }
  
  /**
   * Get available time slots for a specific date
   */
  async getTimeSlots(date: string): Promise<MockTimeSlot[]> {
    // Generate slots if they don't exist for this date
    if (!this.mockTimeSlots[date]) {
      this.generateMockTimeSlots(date);
    }
    
    return this.simulateRequest(this.mockTimeSlots[date]);
  }
  
  /**
   * Create a new event in the specified calendar
   */
  async createEvent(calendarId: string, eventData: Partial<MockEvent>): Promise<MockEvent> {
    const eventId = `event-${Date.now()}`;
    
    const now = new Date().toISOString();
    const newEvent: MockEvent = {
      id: eventId,
      calendarId,
      summary: eventData.summary || 'Untitled Event',
      description: eventData.description,
      location: eventData.location,
      start: eventData.start || { dateTime: now, timeZone: 'UTC' },
      end: eventData.end || { dateTime: now, timeZone: 'UTC' },
      creator: {
        email: 'test@example.com',
        displayName: 'Test User'
      },
      created: now,
      updated: now,
      status: 'confirmed',
      recurrence: eventData.recurrence,
      reminders: eventData.reminders
    };
    
    // Check for conflict scenario
    if (this.currentErrorScenario === MockErrorScenario.CONFLICT) {
      throw { 
        status: 409, 
        message: 'The requested operation could not be completed due to a conflict',
        errorCode: ErrorCode.DATA_CONFLICT
      };
    }
    
    // Add to mock events
    this.mockEvents.push(newEvent);
    
    // Save to Firestore for testing purposes
    try {
      await addDoc(collection(firestore, 'testCalendarEvents'), {
        ...newEvent,
        userId: this.userId,
        created: Timestamp.now(),
        updated: Timestamp.now()
      });
    } catch (error) {
      console.error('Error saving mock event to Firestore:', error);
    }
    
    return this.simulateRequest(newEvent);
  }
  
  /**
   * Update an existing event
   */
  async updateEvent(calendarId: string, eventId: string, updates: Partial<MockEvent>): Promise<MockEvent> {
    const eventIndex = this.mockEvents.findIndex(
      event => event.id === eventId && event.calendarId === calendarId
    );
    
    if (eventIndex === -1) {
      throw { 
        status: 404, 
        message: 'Event not found',
        errorCode: ErrorCode.DATA_NOT_FOUND
      };
    }
    
    const updatedEvent = {
      ...this.mockEvents[eventIndex],
      ...updates,
      updated: new Date().toISOString()
    };
    
    this.mockEvents[eventIndex] = updatedEvent;
    
    // Update in Firestore for testing purposes
    try {
      const eventDoc = doc(firestore, 'testCalendarEvents', eventId);
      await setDoc(eventDoc, {
        ...updatedEvent,
        userId: this.userId,
        updated: Timestamp.now()
      }, { merge: true });
    } catch (error) {
      console.error('Error updating mock event in Firestore:', error);
    }
    
    return this.simulateRequest(updatedEvent);
  }
  
  /**
   * Delete an event
   */
  async deleteEvent(calendarId: string, eventId: string): Promise<boolean> {
    const eventIndex = this.mockEvents.findIndex(
      event => event.id === eventId && event.calendarId === calendarId
    );
    
    if (eventIndex === -1) {
      throw { 
        status: 404, 
        message: 'Event not found',
        errorCode: ErrorCode.DATA_NOT_FOUND
      };
    }
    
    // Remove from mock events
    this.mockEvents.splice(eventIndex, 1);
    
    // Remove from Firestore for testing purposes
    try {
      await deleteDoc(doc(firestore, 'testCalendarEvents', eventId));
    } catch (error) {
      console.error('Error deleting mock event from Firestore:', error);
    }
    
    return this.simulateRequest(true);
  }
  
  /**
   * Get calendar freebusy information
   */
  async getFreebusy(calendarIds: string[], timeMin: string, timeMax: string): Promise<Record<string, {busy: {start: string; end: string}[]}>> {
    const result: Record<string, {busy: {start: string; end: string}[]}> = {};
    
    for (const calendarId of calendarIds) {
      const events = this.mockEvents.filter(event => 
        event.calendarId === calendarId && 
        new Date(event.end.dateTime).getTime() > new Date(timeMin).getTime() &&
        new Date(event.start.dateTime).getTime() < new Date(timeMax).getTime()
      );
      
      result[calendarId] = {
        busy: events.map(event => ({
          start: event.start.dateTime,
          end: event.end.dateTime
        }))
      };
    }
    
    return this.simulateRequest(result);
  }
  
  /**
   * Create a recurring event series
   */
  async createRecurringEvents(calendarId: string, eventData: Partial<MockEvent>, recurringOptions: {
    frequency: 'daily' | 'weekly' | 'monthly';
    interval: number;
    count: number;
    byDay?: string[];
  }): Promise<string[]> {
    // Convert recurring options to RRULE format
    const rrule = `RRULE:FREQ=${recurringOptions.frequency.toUpperCase()};INTERVAL=${recurringOptions.interval};COUNT=${recurringOptions.count}${recurringOptions.byDay ? `;BYDAY=${recurringOptions.byDay.join(',')}` : ''}`;
    
    const eventWithRecurrence = {
      ...eventData,
      recurrence: [rrule]
    };
    
    const createdEvent = await this.createEvent(calendarId, eventWithRecurrence);
    
    // For testing purposes, also create individual instance events
    const eventIds = [createdEvent.id];
    const startDate = new Date(createdEvent.start.dateTime);
    const endDate = new Date(createdEvent.end.dateTime);
    const duration = endDate.getTime() - startDate.getTime();
    
    // Create individual instances (simplified - doesn't handle all recurrence rules)
    for (let i = 1; i < recurringOptions.count; i++) {
      const instanceStart = new Date(startDate);
      
      if (recurringOptions.frequency === 'daily') {
        instanceStart.setDate(instanceStart.getDate() + (i * recurringOptions.interval));
      } else if (recurringOptions.frequency === 'weekly') {
        instanceStart.setDate(instanceStart.getDate() + (i * 7 * recurringOptions.interval));
      } else if (recurringOptions.frequency === 'monthly') {
        instanceStart.setMonth(instanceStart.getMonth() + (i * recurringOptions.interval));
      }
      
      const instanceEnd = new Date(instanceStart.getTime() + duration);
      
      // Create instance event
      const instanceId = `${createdEvent.id}_instance_${i}`;
      this.mockEvents.push({
        ...createdEvent,
        id: instanceId,
        start: {
          dateTime: instanceStart.toISOString(),
          timeZone: 'UTC'
        },
        end: {
          dateTime: instanceEnd.toISOString(),
          timeZone: 'UTC'
        },
        recurrence: undefined // Instances don't have recurrence rules
      });
      
      eventIds.push(instanceId);
    }
    
    return this.simulateRequest(eventIds);
  }
  
  /**
   * Get details for a specific recurrence instance
   */
  async getRecurrenceInstance(calendarId: string, eventId: string, instanceId: string): Promise<MockEvent | null> {
    const instance = this.mockEvents.find(
      event => event.id === instanceId && event.calendarId === calendarId
    );
    
    if (!instance) {
      return null;
    }
    
    return this.simulateRequest(instance);
  }
}

// Create and export singleton instance
export const mockCalendarApi = new MockCalendarApi();

// Export error scenarios
export { MockErrorScenario };