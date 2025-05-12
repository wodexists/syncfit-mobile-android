import { useState, useEffect, useCallback } from 'react';
import { workoutService, Workout, WorkoutCategory, ScheduledWorkout } from '../services/workout';
import { logger, ErrorCode } from '../services/logging';
import { Alert } from 'react-native';
import { useCalendar } from './useCalendar';

/**
 * Custom hook for workout operations
 * This hook provides a React interface to the workout service
 */
export function useWorkouts() {
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [isLoadingWorkouts, setIsLoadingWorkouts] = useState(false);
  const [workoutsError, setWorkoutsError] = useState<string | null>(null);
  
  const [categories, setCategories] = useState<WorkoutCategory[]>([]);
  const [isLoadingCategories, setIsLoadingCategories] = useState(false);
  const [categoriesError, setCategoriesError] = useState<string | null>(null);
  
  const [scheduledWorkouts, setScheduledWorkouts] = useState<ScheduledWorkout[]>([]);
  const [isLoadingScheduled, setIsLoadingScheduled] = useState(false);
  const [scheduledError, setScheduledError] = useState<string | null>(null);
  
  const [upcomingWorkouts, setUpcomingWorkouts] = useState<ScheduledWorkout[]>([]);
  const [isLoadingUpcoming, setIsLoadingUpcoming] = useState(false);
  const [upcomingError, setUpcomingError] = useState<string | null>(null);
  
  const { createEvent, createRecurringEvent } = useCalendar();

  /**
   * Load all workouts
   */
  const loadWorkouts = useCallback(async (forceRefresh = false) => {
    setIsLoadingWorkouts(true);
    setWorkoutsError(null);
    
    try {
      const allWorkouts = await workoutService.getWorkouts(forceRefresh);
      setWorkouts(allWorkouts);
    } catch (error) {
      logger.error('Failed to load workouts', ErrorCode.DATA_NOT_FOUND, error);
      setWorkoutsError('Could not load workouts. Please try again.');
    } finally {
      setIsLoadingWorkouts(false);
    }
  }, []);

  /**
   * Load workout categories
   */
  const loadCategories = useCallback(async (forceRefresh = false) => {
    setIsLoadingCategories(true);
    setCategoriesError(null);
    
    try {
      const workoutCategories = await workoutService.getWorkoutCategories(forceRefresh);
      setCategories(workoutCategories);
    } catch (error) {
      logger.error('Failed to load workout categories', ErrorCode.DATA_NOT_FOUND, error);
      setCategoriesError('Could not load workout categories. Please try again.');
    } finally {
      setIsLoadingCategories(false);
    }
  }, []);

  /**
   * Load workouts by category
   */
  const loadWorkoutsByCategory = useCallback(async (categoryId: number) => {
    setIsLoadingWorkouts(true);
    setWorkoutsError(null);
    
    try {
      const categoryWorkouts = await workoutService.getWorkoutsByCategory(categoryId);
      setWorkouts(categoryWorkouts);
    } catch (error) {
      logger.error('Failed to load workouts by category', ErrorCode.DATA_NOT_FOUND, error);
      setWorkoutsError('Could not load workouts for this category. Please try again.');
    } finally {
      setIsLoadingWorkouts(false);
    }
  }, []);

  /**
   * Load recommended workouts
   */
  const loadRecommendedWorkouts = useCallback(async () => {
    setIsLoadingWorkouts(true);
    setWorkoutsError(null);
    
    try {
      const recommended = await workoutService.getRecommendedWorkouts();
      setWorkouts(recommended);
    } catch (error) {
      logger.error('Failed to load recommended workouts', ErrorCode.DATA_NOT_FOUND, error);
      setWorkoutsError('Could not load recommended workouts. Please try again.');
    } finally {
      setIsLoadingWorkouts(false);
    }
  }, []);

  /**
   * Get a specific workout by ID
   */
  const getWorkoutById = useCallback(async (id: number) => {
    try {
      // Check if the workout is already in the state
      const cachedWorkout = workouts.find(workout => workout.id === id);
      if (cachedWorkout) {
        return cachedWorkout;
      }
      
      // If not in cache, fetch it
      const workout = await workoutService.getWorkoutById(id);
      return workout;
    } catch (error) {
      logger.error(`Failed to get workout with ID ${id}`, ErrorCode.DATA_NOT_FOUND, error);
      Alert.alert('Error', 'Could not load workout details. Please try again.');
      return null;
    }
  }, [workouts]);

  /**
   * Load scheduled workouts
   */
  const loadScheduledWorkouts = useCallback(async () => {
    setIsLoadingScheduled(true);
    setScheduledError(null);
    
    try {
      const scheduled = await workoutService.getScheduledWorkouts();
      setScheduledWorkouts(scheduled);
    } catch (error) {
      logger.error('Failed to load scheduled workouts', ErrorCode.DATA_NOT_FOUND, error);
      setScheduledError('Could not load your scheduled workouts. Please try again.');
    } finally {
      setIsLoadingScheduled(false);
    }
  }, []);

  /**
   * Load upcoming workouts
   */
  const loadUpcomingWorkouts = useCallback(async () => {
    setIsLoadingUpcoming(true);
    setUpcomingError(null);
    
    try {
      const upcoming = await workoutService.getUpcomingWorkouts();
      setUpcomingWorkouts(upcoming);
    } catch (error) {
      logger.error('Failed to load upcoming workouts', ErrorCode.DATA_NOT_FOUND, error);
      setUpcomingError('Could not load your upcoming workouts. Please try again.');
    } finally {
      setIsLoadingUpcoming(false);
    }
  }, []);

  /**
   * Schedule a workout
   */
  const scheduleWorkout = useCallback(async (
    workoutId: number,
    date: string,
    startTime: string,
    options?: {
      createCalendarEvent?: boolean;
      recurring?: {
        frequency: 'daily' | 'weekly' | 'monthly';
        interval: number;
        count?: number;
        endDate?: string;
        byDay?: ('MO' | 'TU' | 'WE' | 'TH' | 'FR' | 'SA' | 'SU')[];
      };
    }
  ) => {
    try {
      // Get the workout details first
      const workout = await getWorkoutById(workoutId);
      
      if (!workout) {
        Alert.alert('Error', 'Workout not found. Please try again.');
        return { success: false, error: 'Workout not found' };
      }
      
      // Create calendar event if requested
      let calendarEventId: string | undefined;
      let eventIds: string[] | undefined;
      
      if (options?.createCalendarEvent) {
        // Parse duration to minutes
        const durationMatch = workout.duration.match(/(\d+)/);
        const durationMinutes = durationMatch ? parseInt(durationMatch[1]) : 30;
        
        // Calculate end time
        const [hours, minutes] = startTime.split(':').map(Number);
        const startDate = new Date();
        startDate.setHours(hours);
        startDate.setMinutes(minutes);
        
        const endDate = new Date(startDate);
        endDate.setMinutes(endDate.getMinutes() + durationMinutes);
        
        const endTime = `${endDate.getHours().toString().padStart(2, '0')}:${endDate.getMinutes().toString().padStart(2, '0')}`;
        
        const eventDetails = {
          title: `Workout: ${workout.title}`,
          description: workout.description,
          startTime,
          endTime,
          date,
          recurrence: options.recurring
        };
        
        if (options.recurring) {
          const recurringResult = await createRecurringEvent(eventDetails);
          if (recurringResult.success) {
            eventIds = recurringResult.eventIds;
            calendarEventId = eventIds?.[0]; // Use first event ID as reference
          }
        } else {
          const eventResult = await createEvent(eventDetails);
          if (eventResult.success) {
            calendarEventId = eventResult.eventId;
          }
        }
      }
      
      // Now schedule the workout
      const result = await workoutService.scheduleWorkout(
        workoutId,
        date,
        startTime,
        {
          createCalendarEvent: !!calendarEventId,
          recurring: options?.recurring
        }
      );
      
      if (result.success) {
        // Update local state
        if (result.scheduledWorkout) {
          setScheduledWorkouts(prev => [...prev, result.scheduledWorkout!]);
          setUpcomingWorkouts(prev => [...prev, result.scheduledWorkout!]);
        }
        
        return { success: true, scheduledWorkout: result.scheduledWorkout };
      } else {
        logger.warn('Workout scheduling unsuccessful', ErrorCode.DATA_VALIDATION_FAILED, {
          error: result.error,
          workoutId,
          date,
          startTime
        });
        
        if (result.error?.includes('queued')) {
          Alert.alert(
            'Offline Mode',
            'Your workout has been saved and will be scheduled when you\'re back online.'
          );
          return { success: true, queued: true, scheduledWorkout: result.scheduledWorkout };
        } else {
          Alert.alert('Error', result.error || 'Failed to schedule workout');
          return { success: false, error: result.error };
        }
      }
    } catch (error) {
      logger.error('Failed to schedule workout', ErrorCode.UNKNOWN_ERROR, error);
      Alert.alert('Error', 'Failed to schedule workout. Please try again.');
      return { success: false, error: 'Workout scheduling failed' };
    }
  }, [getWorkoutById, createEvent, createRecurringEvent]);

  /**
   * Mark scheduled workout as completed
   */
  const completeWorkout = useCallback(async (id: number) => {
    try {
      const success = await workoutService.updateWorkoutStatus(id, 'completed');
      
      if (success) {
        // Update local state
        setScheduledWorkouts(prev => 
          prev.map(workout => 
            workout.id === id ? { ...workout, status: 'completed' } : workout
          )
        );
        setUpcomingWorkouts(prev => prev.filter(workout => workout.id !== id));
        
        // Record time slot result for learning mode
        const workout = scheduledWorkouts.find(w => w.id === id);
        if (workout) {
          const date = new Date(workout.date);
          const dayOfWeek = date.toLocaleDateString('en-US', { weekday: 'long' });
          await workoutService.recordTimeSlotResult(dayOfWeek, workout.startTime, true);
        }
        
        return true;
      } else {
        Alert.alert('Error', 'Failed to mark workout as completed. Please try again.');
        return false;
      }
    } catch (error) {
      logger.error(`Failed to complete workout ${id}`, ErrorCode.API_SERVER_ERROR, error);
      Alert.alert('Error', 'Failed to update workout status. Please try again.');
      return false;
    }
  }, [scheduledWorkouts]);

  /**
   * Mark scheduled workout as missed
   */
  const missWorkout = useCallback(async (id: number) => {
    try {
      const success = await workoutService.updateWorkoutStatus(id, 'missed');
      
      if (success) {
        // Update local state
        setScheduledWorkouts(prev => 
          prev.map(workout => 
            workout.id === id ? { ...workout, status: 'missed' } : workout
          )
        );
        setUpcomingWorkouts(prev => prev.filter(workout => workout.id !== id));
        
        // Record time slot result for learning mode
        const workout = scheduledWorkouts.find(w => w.id === id);
        if (workout) {
          const date = new Date(workout.date);
          const dayOfWeek = date.toLocaleDateString('en-US', { weekday: 'long' });
          await workoutService.recordTimeSlotResult(dayOfWeek, workout.startTime, false);
        }
        
        return true;
      } else {
        Alert.alert('Error', 'Failed to mark workout as missed. Please try again.');
        return false;
      }
    } catch (error) {
      logger.error(`Failed to mark workout ${id} as missed`, ErrorCode.API_SERVER_ERROR, error);
      Alert.alert('Error', 'Failed to update workout status. Please try again.');
      return false;
    }
  }, [scheduledWorkouts]);

  /**
   * Cancel scheduled workout
   */
  const cancelWorkout = useCallback(async (id: number) => {
    try {
      const success = await workoutService.deleteScheduledWorkout(id);
      
      if (success) {
        // Update local state
        setScheduledWorkouts(prev => prev.filter(workout => workout.id !== id));
        setUpcomingWorkouts(prev => prev.filter(workout => workout.id !== id));
        return true;
      } else {
        Alert.alert('Error', 'Failed to cancel workout. Please try again.');
        return false;
      }
    } catch (error) {
      logger.error(`Failed to cancel workout ${id}`, ErrorCode.API_SERVER_ERROR, error);
      Alert.alert('Error', 'Failed to cancel workout. Please try again.');
      return false;
    }
  }, []);

  // Load data on mount
  useEffect(() => {
    loadWorkouts();
    loadCategories();
  }, [loadWorkouts, loadCategories]);

  return {
    // Workouts
    workouts,
    isLoadingWorkouts,
    workoutsError,
    loadWorkouts,
    loadWorkoutsByCategory,
    loadRecommendedWorkouts,
    getWorkoutById,
    
    // Categories
    categories,
    isLoadingCategories,
    categoriesError,
    loadCategories,
    
    // Scheduled workouts
    scheduledWorkouts,
    isLoadingScheduled,
    scheduledError,
    loadScheduledWorkouts,
    
    // Upcoming workouts
    upcomingWorkouts,
    isLoadingUpcoming,
    upcomingError,
    loadUpcomingWorkouts,
    
    // Operations
    scheduleWorkout,
    completeWorkout,
    missWorkout,
    cancelWorkout,
  };
}