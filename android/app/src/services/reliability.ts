import { NetInfo } from '@react-native-community/netinfo';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { api, endpoints } from './api';
import { firestore } from './firebase';

// Types
interface PendingOperation {
  id: string;
  endpoint: string;
  method: 'POST' | 'PUT' | 'DELETE';
  body: any;
  timestamp: number;
  retryCount: number;
  priority: 'high' | 'medium' | 'low';
}

// Constants
const PENDING_OPERATIONS_KEY = 'syncfit_pending_operations';
const MAX_RETRY_ATTEMPTS = 5;
const RETRY_BACKOFF_MS = 1000; // Start with 1 second, will be multiplied by retryCount

/**
 * Reliability Layer - Handles network resilience, offline operations,
 * retries, and synchronization with server
 */
class ReliabilityLayer {
  private isOnline: boolean = true;
  private pendingOperations: PendingOperation[] = [];
  private syncInProgress: boolean = false;
  private lastSyncAttempt: number = 0;

  constructor() {
    this.loadPendingOperations();
    this.setupNetworkListeners();
  }

  /**
   * Set up network state listeners
   */
  private setupNetworkListeners() {
    // Subscribe to network state changes
    NetInfo.addEventListener(state => {
      const prevOnlineState = this.isOnline;
      this.isOnline = state.isConnected === true && state.isInternetReachable !== false;
      
      // If we just came back online, trigger synchronization
      if (!prevOnlineState && this.isOnline) {
        console.log('📶 Network connection restored, syncing pending operations');
        this.syncPendingOperations();
      }
      
      // If we just went offline, log it
      if (prevOnlineState && !this.isOnline) {
        console.log('📶 Network connection lost, operations will be queued');
      }
    });
    
    // Initial network check
    NetInfo.fetch().then(state => {
      this.isOnline = state.isConnected === true && state.isInternetReachable !== false;
      console.log(`📶 Initial network status: ${this.isOnline ? 'online' : 'offline'}`);
    });
  }

  /**
   * Load pending operations from persistent storage
   */
  private async loadPendingOperations() {
    try {
      const storedOperations = await AsyncStorage.getItem(PENDING_OPERATIONS_KEY);
      if (storedOperations) {
        this.pendingOperations = JSON.parse(storedOperations);
        console.log(`📝 Loaded ${this.pendingOperations.length} pending operations`);
      }
    } catch (error) {
      console.error('Failed to load pending operations:', error);
    }
  }

  /**
   * Save pending operations to persistent storage
   */
  private async savePendingOperations() {
    try {
      await AsyncStorage.setItem(
        PENDING_OPERATIONS_KEY, 
        JSON.stringify(this.pendingOperations)
      );
    } catch (error) {
      console.error('Failed to save pending operations:', error);
    }
  }

  /**
   * Perform an operation with reliability guarantees
   * If offline, will queue the operation for later
   * If online, will try to execute immediately with retry on failure
   */
  async performOperation<T>(
    endpoint: string,
    method: 'POST' | 'PUT' | 'DELETE',
    body: any,
    options: {
      priority?: 'high' | 'medium' | 'low';
      offlineSupport?: boolean;
      syncTarget?: keyof typeof endpoints;
    } = {}
  ): Promise<{ success: boolean; data?: T; error?: string; queued?: boolean }> {
    const {
      priority = 'medium',
      offlineSupport = true,
      syncTarget,
    } = options;

    // Create a unique ID for this operation
    const operationId = `${method}_${endpoint}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // If we're offline and the operation supports offline mode, queue it
    if (!this.isOnline && offlineSupport) {
      const pendingOperation: PendingOperation = {
        id: operationId,
        endpoint,
        method,
        body,
        timestamp: Date.now(),
        retryCount: 0,
        priority,
      };
      
      this.pendingOperations.push(pendingOperation);
      await this.savePendingOperations();
      
      console.log(`📝 Queued operation (${method} ${endpoint}) for later execution`);
      return { success: false, queued: true };
    }
    
    // We're online or the operation doesn't support offline mode, try to execute immediately
    try {
      let result;
      switch (method) {
        case 'POST':
          result = await api.post<T>(endpoint, body);
          break;
        case 'PUT':
          result = await api.put<T>(endpoint, body);
          break;
        case 'DELETE':
          result = await api.delete<T>(endpoint);
          break;
      }
      
      if (result.status >= 200 && result.status < 300) {
        // If there's a sync target, also update the local Firestore mirror
        if (syncTarget && result.data) {
          await this.updateLocalMirror(syncTarget, result.data);
        }
        
        return { success: true, data: result.data };
      } else {
        // Operation failed with server error, queue for retry if supported
        if (offlineSupport) {
          const pendingOperation: PendingOperation = {
            id: operationId,
            endpoint,
            method,
            body,
            timestamp: Date.now(),
            retryCount: 0,
            priority,
          };
          
          this.pendingOperations.push(pendingOperation);
          await this.savePendingOperations();
          console.log(`📝 Server error, queued operation (${method} ${endpoint}) for retry`);
        }
        
        return { success: false, error: result.error || 'Server error' };
      }
    } catch (error) {
      // Network or client error, queue for retry if supported
      if (offlineSupport) {
        const pendingOperation: PendingOperation = {
          id: operationId,
          endpoint,
          method,
          body,
          timestamp: Date.now(),
          retryCount: 0,
          priority,
        };
        
        this.pendingOperations.push(pendingOperation);
        await this.savePendingOperations();
        console.log(`📝 Network error, queued operation (${method} ${endpoint}) for retry`);
      }
      
      const errorMessage = error instanceof Error ? error.message : 'Network error';
      return { success: false, error: errorMessage };
    }
  }

  /**
   * Synchronize pending operations with the server
   */
  async syncPendingOperations() {
    // Prevent multiple sync attempts running at the same time
    if (this.syncInProgress) {
      console.log('🔄 Sync already in progress, skipping');
      return;
    }
    
    // Check if we're online
    if (!this.isOnline) {
      console.log('📶 Cannot sync, device is offline');
      return;
    }
    
    // Prevent too frequent sync attempts
    const now = Date.now();
    if (now - this.lastSyncAttempt < 5000) { // 5 seconds minimum between syncs
      console.log('🔄 Skipping sync, too soon after last attempt');
      return;
    }
    
    this.syncInProgress = true;
    this.lastSyncAttempt = now;
    
    try {
      console.log(`🔄 Starting sync of ${this.pendingOperations.length} pending operations`);
      
      // Sort operations by priority and timestamp
      this.pendingOperations.sort((a, b) => {
        const priorityOrder = { high: 0, medium: 1, low: 2 };
        if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
          return priorityOrder[a.priority] - priorityOrder[b.priority];
        }
        return a.timestamp - b.timestamp;
      });
      
      // Process operations in batches to avoid overwhelming the server
      const operationsToProcess = [...this.pendingOperations];
      const successfulOperations: string[] = [];
      const failedOperations: string[] = [];
      
      for (const operation of operationsToProcess) {
        // Calculate backoff delay based on retry count
        const backoffDelay = RETRY_BACKOFF_MS * Math.pow(2, operation.retryCount);
        
        // Skip operations that have exceeded max retry attempts
        if (operation.retryCount >= MAX_RETRY_ATTEMPTS) {
          console.log(`❌ Operation ${operation.id} exceeded max retry attempts, removing`);
          failedOperations.push(operation.id);
          continue;
        }
        
        // Skip operations that haven't waited long enough since last retry
        if (operation.retryCount > 0 && now - operation.timestamp < backoffDelay) {
          console.log(`⏳ Operation ${operation.id} waiting for backoff: ${backoffDelay}ms`);
          continue;
        }
        
        try {
          console.log(`🔄 Executing operation: ${operation.method} ${operation.endpoint}`);
          
          let result;
          switch (operation.method) {
            case 'POST':
              result = await api.post(operation.endpoint, operation.body);
              break;
            case 'PUT':
              result = await api.put(operation.endpoint, operation.body);
              break;
            case 'DELETE':
              result = await api.delete(operation.endpoint);
              break;
          }
          
          if (result.status >= 200 && result.status < 300) {
            console.log(`✅ Operation ${operation.id} succeeded`);
            successfulOperations.push(operation.id);
          } else {
            console.log(`❌ Operation ${operation.id} failed: ${result.error}`);
            
            // Update retry count and timestamp for next attempt
            operation.retryCount++;
            operation.timestamp = now;
            
            // If max retries reached, mark as failed
            if (operation.retryCount >= MAX_RETRY_ATTEMPTS) {
              failedOperations.push(operation.id);
            }
          }
        } catch (error) {
          console.error(`❌ Error executing operation ${operation.id}:`, error);
          
          // Update retry count and timestamp for next attempt
          operation.retryCount++;
          operation.timestamp = now;
          
          // If max retries reached, mark as failed
          if (operation.retryCount >= MAX_RETRY_ATTEMPTS) {
            failedOperations.push(operation.id);
          }
        }
        
        // Small delay between operations to avoid overwhelming the server
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      
      // Remove successful and failed operations from the pending list
      this.pendingOperations = this.pendingOperations.filter(
        op => !successfulOperations.includes(op.id) && !failedOperations.includes(op.id)
      );
      
      // Save updated pending operations
      await this.savePendingOperations();
      
      console.log(`🔄 Sync completed: ${successfulOperations.length} succeeded, ${failedOperations.length} failed, ${this.pendingOperations.length} pending`);
    } catch (error) {
      console.error('Error during sync:', error);
    } finally {
      this.syncInProgress = false;
    }
  }

  /**
   * Update local Firestore mirror for offline access
   * This ensures data is available even when offline
   */
  private async updateLocalMirror(collectionKey: keyof typeof endpoints, data: any) {
    try {
      // Example implementation - expand based on actual data structure
      if (collectionKey === 'scheduledWorkouts' && data.id) {
        const docRef = firestore.collection('scheduledWorkouts').doc(data.id.toString());
        await docRef.set({
          ...data,
          localTimestamp: firestore.FieldValue.serverTimestamp(),
        }, { merge: true });
      } else if (collectionKey === 'calendar' && data.eventId) {
        const docRef = firestore.collection('calendarEvents').doc(data.eventId);
        await docRef.set({
          ...data,
          localTimestamp: firestore.FieldValue.serverTimestamp(),
        }, { merge: true });
      }
    } catch (error) {
      console.error('Error updating local mirror:', error);
    }
  }

  /**
   * Get the count of pending operations
   */
  getPendingOperationsCount(): number {
    return this.pendingOperations.length;
  }

  /**
   * Check if there are any high priority pending operations
   */
  hasHighPriorityPendingOperations(): boolean {
    return this.pendingOperations.some(op => op.priority === 'high');
  }

  /**
   * Manually trigger synchronization
   */
  async manualSync(): Promise<boolean> {
    if (!this.isOnline) {
      console.log('📶 Cannot sync, device is offline');
      return false;
    }
    
    if (this.syncInProgress) {
      console.log('🔄 Sync already in progress');
      return false;
    }
    
    await this.syncPendingOperations();
    return true;
  }
}

// Create singleton instance
export const reliabilityLayer = new ReliabilityLayer();

// Export helper functions
export const reliability = {
  /**
   * Perform a POST operation with reliability guarantees
   */
  post: <T>(
    endpoint: string,
    body: any,
    options?: {
      priority?: 'high' | 'medium' | 'low';
      offlineSupport?: boolean;
      syncTarget?: keyof typeof endpoints;
    }
  ) => reliabilityLayer.performOperation<T>(endpoint, 'POST', body, options),

  /**
   * Perform a PUT operation with reliability guarantees
   */
  put: <T>(
    endpoint: string,
    body: any,
    options?: {
      priority?: 'high' | 'medium' | 'low';
      offlineSupport?: boolean;
      syncTarget?: keyof typeof endpoints;
    }
  ) => reliabilityLayer.performOperation<T>(endpoint, 'PUT', body, options),

  /**
   * Perform a DELETE operation with reliability guarantees
   */
  delete: <T>(
    endpoint: string,
    options?: {
      priority?: 'high' | 'medium' | 'low';
      offlineSupport?: boolean;
      syncTarget?: keyof typeof endpoints;
    }
  ) => reliabilityLayer.performOperation<T>(endpoint, 'DELETE', {}, options),

  /**
   * Manually trigger synchronization
   */
  sync: () => reliabilityLayer.manualSync(),

  /**
   * Get the count of pending operations
   */
  getPendingCount: () => reliabilityLayer.getPendingOperationsCount(),

  /**
   * Check if there are any high priority pending operations
   */
  hasHighPriorityPending: () => reliabilityLayer.hasHighPriorityPendingOperations(),
};