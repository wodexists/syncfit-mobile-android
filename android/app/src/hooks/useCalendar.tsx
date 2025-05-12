/**
 * useCalendar Hook
 *
 * This hook provides access to calendar functionality for React components.
 * It integrates with the calendar service for fetching data and performing actions.
 */

import { useState, useEffect, useCallback } from 'react';
import { 
  calendarService, 
  Calendar, 
  TimeSlot, 
  EventDetails, 
  SyncStatus 
} from '../services/calendar';
import { logger, ErrorCode } from '../services/logging';

interface UseCalendarResult {
  // Calendar data
  calendars: Calendar[];
  timeSlots: TimeSlot[];
  syncStatus: SyncStatus;
  
  // Loading states
  isLoadingCalendars: boolean;
  isLoadingTimeSlots: boolean;
  isCreatingEvent: boolean;
  
  // Error states
  calendarError: string | null;
  timeSlotsError: string | null;
  createEventError: string | null;
  
  // Methods
  getCalendars: (forceRefresh?: boolean) => Promise<Calendar[]>;
  getTimeSlots: (date: string) => Promise<TimeSlot[]>;
  createEvent: (eventDetails: EventDetails) => Promise<string | null>;
  updateSelectedCalendars: (calendarIds: string[]) => Promise<boolean>;
  triggerSync: () => Promise<boolean>;
}

/**
 * Hook to access calendar functionality
 */
export function useCalendar(): UseCalendarResult {
  // Calendar data
  const [calendars, setCalendars] = useState<Calendar[]>([]);
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>(calendarService.getSyncStatus());
  
  // Loading states
  const [isLoadingCalendars, setIsLoadingCalendars] = useState(false);
  const [isLoadingTimeSlots, setIsLoadingTimeSlots] = useState(false);
  const [isCreatingEvent, setIsCreatingEvent] = useState(false);
  
  // Error states
  const [calendarError, setCalendarError] = useState<string | null>(null);
  const [timeSlotsError, setTimeSlotsError] = useState<string | null>(null);
  const [createEventError, setCreateEventError] = useState<string | null>(null);
  
  // Update sync status when it changes
  useEffect(() => {
    // Poll for sync status changes
    const intervalId = setInterval(() => {
      setSyncStatus(calendarService.getSyncStatus());
    }, 1000);
    
    return () => clearInterval(intervalId);
  }, []);
  
  /**
   * Get calendars from the calendar service
   */
  const getCalendars = useCallback(async (forceRefresh: boolean = false): Promise<Calendar[]> => {
    setIsLoadingCalendars(true);
    setCalendarError(null);
    
    try {
      const result = await calendarService.getCalendars(forceRefresh);
      setCalendars(result);
      return result;
    } catch (error) {
      const errorMessage = 'Failed to get calendars';
      setCalendarError(errorMessage);
      logger.error(errorMessage, ErrorCode.CALENDAR_FETCH_FAILED, { error });
      return [];
    } finally {
      setIsLoadingCalendars(false);
    }
  }, []);
  
  /**
   * Get time slots for a specific date
   */
  const getTimeSlots = useCallback(async (date: string): Promise<TimeSlot[]> => {
    setIsLoadingTimeSlots(true);
    setTimeSlotsError(null);
    
    try {
      const result = await calendarService.getTimeSlots(date);
      setTimeSlots(result);
      return result;
    } catch (error) {
      const errorMessage = 'Failed to get available time slots';
      setTimeSlotsError(errorMessage);
      logger.error(errorMessage, ErrorCode.TIMESLOT_FETCH_FAILED, { error });
      return [];
    } finally {
      setIsLoadingTimeSlots(false);
    }
  }, []);
  
  /**
   * Create a calendar event
   */
  const createEvent = useCallback(async (eventDetails: EventDetails): Promise<string | null> => {
    setIsCreatingEvent(true);
    setCreateEventError(null);
    
    try {
      const result = await calendarService.createEvent(eventDetails);
      return result;
    } catch (error) {
      const errorMessage = 'Failed to create event';
      setCreateEventError(errorMessage);
      logger.error(errorMessage, ErrorCode.EVENT_CREATE_FAILED, { error });
      return null;
    } finally {
      setIsCreatingEvent(false);
    }
  }, []);
  
  /**
   * Update selected calendars
   */
  const updateSelectedCalendars = useCallback(async (calendarIds: string[]): Promise<boolean> => {
    try {
      return await calendarService.updateSelectedCalendars(calendarIds);
    } catch (error) {
      logger.error('Failed to update selected calendars', 
        ErrorCode.CALENDAR_UPDATE_FAILED, { error });
      return false;
    }
  }, []);
  
  /**
   * Trigger manual sync
   */
  const triggerSync = useCallback(async (): Promise<boolean> => {
    try {
      return await calendarService.triggerSync();
    } catch (error) {
      logger.error('Failed to trigger sync', 
        ErrorCode.SYNC_FAILED, { error });
      return false;
    }
  }, []);
  
  return {
    // Calendar data
    calendars,
    timeSlots,
    syncStatus,
    
    // Loading states
    isLoadingCalendars,
    isLoadingTimeSlots,
    isCreatingEvent,
    
    // Error states
    calendarError,
    timeSlotsError,
    createEventError,
    
    // Methods
    getCalendars,
    getTimeSlots,
    createEvent,
    updateSelectedCalendars,
    triggerSync,
  };
}