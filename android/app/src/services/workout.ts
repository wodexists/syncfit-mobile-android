import { api, endpoints } from './api';
import { reliability } from './reliability';
import { calendarService, type EventDetails } from './calendar';
import { firestore } from './firebase';

// Types
export interface Workout {
  id: number;
  title: string;
  description: string;
  duration: string;
  category: string;
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced';
  muscles: string[];
  equipment?: string[];
  imageUrl?: string;
}

export interface WorkoutCategory {
  id: number;
  name: string;
  description: string;
  imageUrl?: string;
}

export interface ScheduledWorkout {
  id: number;
  workoutId: number;
  userId: number;
  title: string;
  startTime: string;
  endTime: string;
  date: string;
  duration: string;
  status: 'scheduled' | 'completed' | 'missed' | 'cancelled';
  calendarEventId?: string;
  recurring?: boolean;
  recurrenceRule?: string;
}

export interface SlotStat {
  id: number;
  userId: number;
  dayOfWeek: string;
  timeSlot: string;
  successCount: number;
  totalCount: number;
  lastUpdated: string;
}

/**
 * Workout Service
 * Handles workout-related operations including
 * fetching workouts, scheduling, and tracking stats
 */
class WorkoutService {
  private workoutsCache: Workout[] = [];
  private categoriesCache: WorkoutCategory[] = [];
  private lastWorkoutsCacheUpdate: number = 0;
  private lastCategoriesCacheUpdate: number = 0;
  private CACHE_EXPIRY_MS: number = 30 * 60 * 1000; // 30 minutes

  /**
   * Get all workouts
   */
  async getWorkouts(forceRefresh = false): Promise<Workout[]> {
    // Use cached data if available and not expired
    const now = Date.now();
    if (
      !forceRefresh && 
      this.workoutsCache.length > 0 && 
      now - this.lastWorkoutsCacheUpdate < this.CACHE_EXPIRY_MS
    ) {
      return this.workoutsCache;
    }

    try {
      const response = await api.get<Workout[]>(endpoints.workouts.all);
      
      if (response.data) {
        this.workoutsCache = response.data;
        this.lastWorkoutsCacheUpdate = now;
        return response.data;
      } else {
        // If API call fails, try to get from Firestore
        const snapshot = await firestore.collection('workouts').get();
        const workouts: Workout[] = [];
        
        snapshot.forEach(doc => {
          workouts.push(doc.data() as Workout);
        });
        
        if (workouts.length > 0) {
          this.workoutsCache = workouts;
          return workouts;
        }
        
        throw new Error(response.error || 'Failed to get workouts');
      }
    } catch (error) {
      console.error('Error getting workouts:', error);
      throw error;
    }
  }

  /**
   * Get workout by ID
   */
  async getWorkoutById(id: number): Promise<Workout | null> {
    // Check cache first
    const cachedWorkout = this.workoutsCache.find(w => w.id === id);
    if (cachedWorkout) {
      return cachedWorkout;
    }

    try {
      // Try to find in Firestore first (faster than API call)
      const docSnapshot = await firestore.collection('workouts').doc(id.toString()).get();
      
      if (docSnapshot.exists) {
        return docSnapshot.data() as Workout;
      }
      
      // If not in Firestore, load all workouts (will update cache)
      await this.getWorkouts(true);
      
      // Try to find in the refreshed cache
      return this.workoutsCache.find(w => w.id === id) || null;
    } catch (error) {
      console.error(`Error getting workout with id ${id}:`, error);
      return null;
    }
  }

  /**
   * Get workouts by category
   */
  async getWorkoutsByCategory(categoryId: number): Promise<Workout[]> {
    try {
      // Try to use cache first
      if (this.workoutsCache.length > 0) {
        const filteredWorkouts = this.workoutsCache.filter(
          w => w.category === this.getCategoryNameById(categoryId)
        );
        
        if (filteredWorkouts.length > 0) {
          return filteredWorkouts;
        }
      }

      const response = await api.get<Workout[]>(endpoints.workouts.byCategory(categoryId));
      
      if (response.data) {
        return response.data;
      } else {
        throw new Error(response.error || 'Failed to get workouts by category');
      }
    } catch (error) {
      console.error(`Error getting workouts for category ${categoryId}:`, error);
      throw error;
    }
  }

  /**
   * Get recommended workouts
   */
  async getRecommendedWorkouts(): Promise<Workout[]> {
    try {
      const response = await api.get<Workout[]>(endpoints.workouts.recommended);
      
      if (response.data) {
        return response.data;
      } else {
        // If API call fails, return a subset of cached workouts
        // This ensures the user still sees content even if the recommendation service is down
        if (this.workoutsCache.length > 0) {
          return this.workoutsCache.slice(0, 5);
        }
        
        throw new Error(response.error || 'Failed to get recommended workouts');
      }
    } catch (error) {
      console.error('Error getting recommended workouts:', error);
      
      // Return subset of cached workouts as fallback
      if (this.workoutsCache.length > 0) {
        return this.workoutsCache.slice(0, 5);
      }
      
      throw error;
    }
  }

  /**
   * Get all workout categories
   */
  async getWorkoutCategories(forceRefresh = false): Promise<WorkoutCategory[]> {
    // Use cached data if available and not expired
    const now = Date.now();
    if (
      !forceRefresh && 
      this.categoriesCache.length > 0 && 
      now - this.lastCategoriesCacheUpdate < this.CACHE_EXPIRY_MS
    ) {
      return this.categoriesCache;
    }

    try {
      const response = await api.get<WorkoutCategory[]>(endpoints.workouts.categories);
      
      if (response.data) {
        this.categoriesCache = response.data;
        this.lastCategoriesCacheUpdate = now;
        return response.data;
      } else {
        // If API call fails, try to get from Firestore
        const snapshot = await firestore.collection('workoutCategories').get();
        const categories: WorkoutCategory[] = [];
        
        snapshot.forEach(doc => {
          categories.push(doc.data() as WorkoutCategory);
        });
        
        if (categories.length > 0) {
          this.categoriesCache = categories;
          return categories;
        }
        
        throw new Error(response.error || 'Failed to get workout categories');
      }
    } catch (error) {
      console.error('Error getting workout categories:', error);
      throw error;
    }
  }

  /**
   * Helper to get category name by ID
   */
  private getCategoryNameById(categoryId: number): string {
    const category = this.categoriesCache.find(c => c.id === categoryId);
    return category ? category.name : '';
  }

  /**
   * Get scheduled workouts
   */
  async getScheduledWorkouts(): Promise<ScheduledWorkout[]> {
    try {
      const response = await api.get<ScheduledWorkout[]>(endpoints.scheduledWorkouts.all);
      
      if (response.data) {
        return response.data;
      } else {
        // If API call fails, try to get from Firestore
        const snapshot = await firestore.collection('scheduledWorkouts').get();
        const workouts: ScheduledWorkout[] = [];
        
        snapshot.forEach(doc => {
          workouts.push(doc.data() as ScheduledWorkout);
        });
        
        if (workouts.length > 0) {
          return workouts;
        }
        
        throw new Error(response.error || 'Failed to get scheduled workouts');
      }
    } catch (error) {
      console.error('Error getting scheduled workouts:', error);
      throw error;
    }
  }

  /**
   * Get upcoming scheduled workouts
   */
  async getUpcomingWorkouts(): Promise<ScheduledWorkout[]> {
    try {
      const response = await api.get<ScheduledWorkout[]>(endpoints.scheduledWorkouts.upcoming);
      
      if (response.data) {
        return response.data;
      } else {
        throw new Error(response.error || 'Failed to get upcoming workouts');
      }
    } catch (error) {
      console.error('Error getting upcoming workouts:', error);
      throw error;
    }
  }

  /**
   * Schedule a workout
   * This will also create a calendar event if integration is enabled
   */
  async scheduleWorkout(
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
  ): Promise<{ success: boolean; scheduledWorkout?: ScheduledWorkout; error?: string }> {
    try {
      // Get the workout details first
      const workout = await this.getWorkoutById(workoutId);
      if (!workout) {
        return { success: false, error: 'Workout not found' };
      }
      
      // Parse duration into minutes for end time calculation
      const durationMatch = workout.duration.match(/(\d+)/);
      const durationMinutes = durationMatch ? parseInt(durationMatch[1]) : 30;
      
      // Calculate end time
      const [hours, minutes] = startTime.split(':');
      const startDate = new Date();
      startDate.setHours(parseInt(hours));
      startDate.setMinutes(parseInt(minutes));
      
      const endDate = new Date(startDate);
      endDate.setMinutes(endDate.getMinutes() + durationMinutes);
      
      const endTime = `${endDate.getHours().toString().padStart(2, '0')}:${endDate.getMinutes().toString().padStart(2, '0')}`;
      
      // Prepare workout data
      const scheduledWorkoutData = {
        workoutId,
        title: workout.title,
        startTime,
        endTime,
        date,
        duration: workout.duration,
        status: 'scheduled',
        recurring: !!options?.recurring,
        recurrenceRule: options?.recurring ? JSON.stringify(options.recurring) : undefined
      };
      
      // Create calendar event if requested
      let calendarEventId: string | undefined;
      
      if (options?.createCalendarEvent) {
        const eventDetails: EventDetails = {
          title: `Workout: ${workout.title}`,
          description: workout.description,
          startTime,
          endTime,
          date,
          recurrence: options.recurring
        };
        
        const calendarResult = options.recurring
          ? await calendarService.createRecurringEvents(eventDetails)
          : await calendarService.createEvent(eventDetails);
        
        if (calendarResult.success) {
          if (options.recurring && 'eventIds' in calendarResult) {
            // For recurring events, just store the main event ID
            calendarEventId = (calendarResult.eventIds || [])[0];
          } else if ('eventId' in calendarResult) {
            calendarEventId = calendarResult.eventId;
          }
        } else {
          console.warn('Failed to create calendar event:', calendarResult.error);
          // Continue scheduling even if calendar event creation fails
        }
      }
      
      // Schedule workout
      const result = await reliability.post<ScheduledWorkout>(
        endpoints.scheduledWorkouts.create,
        {
          ...scheduledWorkoutData,
          calendarEventId
        },
        { 
          priority: 'high',
          syncTarget: 'scheduledWorkouts'
        }
      );
      
      if (result.success && result.data) {
        return { success: true, scheduledWorkout: result.data };
      } else if (result.queued) {
        // Create a temporary object to show to the user while operation is queued
        const tempScheduledWorkout: ScheduledWorkout = {
          id: -1, // Temporary ID
          workoutId,
          userId: -1, // Will be set by server
          title: workout.title,
          startTime,
          endTime,
          date,
          duration: workout.duration,
          status: 'scheduled',
          calendarEventId,
          recurring: !!options?.recurring,
          recurrenceRule: options?.recurring ? JSON.stringify(options.recurring) : undefined
        };
        
        return { 
          success: false,
          scheduledWorkout: tempScheduledWorkout,
          error: 'Workout scheduling queued for when online'
        };
      } else {
        return { success: false, error: result.error || 'Failed to schedule workout' };
      }
    } catch (error) {
      console.error('Error scheduling workout:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  /**
   * Update scheduled workout status
   */
  async updateWorkoutStatus(
    id: number,
    status: 'completed' | 'missed' | 'cancelled'
  ): Promise<boolean> {
    try {
      const result = await reliability.put(
        endpoints.scheduledWorkouts.update(id),
        { status },
        { 
          priority: 'medium',
          syncTarget: 'scheduledWorkouts'
        }
      );
      
      return result.success;
    } catch (error) {
      console.error(`Error updating workout ${id} status to ${status}:`, error);
      return false;
    }
  }

  /**
   * Delete scheduled workout
   */
  async deleteScheduledWorkout(id: number): Promise<boolean> {
    try {
      const result = await reliability.delete(
        endpoints.scheduledWorkouts.delete(id),
        { 
          priority: 'medium',
          syncTarget: 'scheduledWorkouts'
        }
      );
      
      return result.success;
    } catch (error) {
      console.error(`Error deleting scheduled workout ${id}:`, error);
      return false;
    }
  }

  /**
   * Get slot statistics for learning mode
   */
  async getSlotStats(): Promise<SlotStat[]> {
    try {
      const response = await api.get<SlotStat[]>(endpoints.slotStats.all);
      
      if (response.data) {
        return response.data;
      } else {
        // If API call fails, try to get from Firestore
        const snapshot = await firestore.collection('slotStats').get();
        const stats: SlotStat[] = [];
        
        snapshot.forEach(doc => {
          stats.push(doc.data() as SlotStat);
        });
        
        if (stats.length > 0) {
          return stats;
        }
        
        throw new Error(response.error || 'Failed to get slot stats');
      }
    } catch (error) {
      console.error('Error getting slot stats:', error);
      throw error;
    }
  }

  /**
   * Record workout completion for a time slot
   * This is used by the learning system to improve recommendations
   */
  async recordTimeSlotResult(
    dayOfWeek: string,
    timeSlot: string,
    completed: boolean
  ): Promise<boolean> {
    try {
      const result = await reliability.post(
        endpoints.slotStats.record,
        { dayOfWeek, timeSlot, completed },
        { priority: 'low' }
      );
      
      return result.success;
    } catch (error) {
      console.error('Error recording time slot result:', error);
      return false;
    }
  }

  /**
   * Reset all slot statistics
   */
  async resetAllSlotStats(): Promise<boolean> {
    try {
      const result = await reliability.post(
        endpoints.slotStats.reset,
        {},
        { priority: 'low' }
      );
      
      return result.success;
    } catch (error) {
      console.error('Error resetting slot stats:', error);
      return false;
    }
  }
}

// Export singleton instance
export const workoutService = new WorkoutService();