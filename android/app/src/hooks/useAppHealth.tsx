import { useState, useEffect, useCallback, useRef } from 'react';
import { logger } from '../services/logging';
import { reliability } from '../services/reliability';
import { AppState, AppStateStatus } from 'react-native';
import NetInfo from '@react-native-community/netinfo';

// Types
interface HealthStatus {
  isHealthy: boolean;
  isConnected: boolean;
  hasPendingOperations: boolean;
  hasSyncErrors: boolean;
  lastCheckTime: Date | null;
  appUptime: number;
}

/**
 * Custom hook for monitoring app health
 * This hook provides functionality to monitor and maintain app health
 */
export function useAppHealth() {
  const [healthStatus, setHealthStatus] = useState<HealthStatus>({
    isHealthy: true,
    isConnected: true,
    hasPendingOperations: false,
    hasSyncErrors: false,
    lastCheckTime: null,
    appUptime: 0,
  });
  
  const [isMonitoring, setIsMonitoring] = useState(false);
  const appStateRef = useRef(AppState.currentState);
  const monitoringIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const appStartTime = useRef(Date.now());

  /**
   * Perform health check
   */
  const checkHealth = useCallback(async () => {
    const healthData = await logger.performHealthCheck();
    const pendingCount = reliability.getPendingCount();
    const hasPendingHighPriority = reliability.hasHighPriorityPending();
    
    // Update health status
    setHealthStatus({
      isHealthy: healthData.status === 'healthy',
      isConnected: healthData.connectivityStatus,
      hasPendingOperations: pendingCount > 0,
      hasSyncErrors: healthData.status === 'unhealthy',
      lastCheckTime: new Date(),
      appUptime: Date.now() - appStartTime.current,
    });
    
    // If we're back online and have high priority pending operations, sync them
    if (healthData.connectivityStatus && hasPendingHighPriority) {
      await reliability.sync();
    }
    
    return healthData;
  }, []);

  /**
   * Start continuous health monitoring
   */
  const startMonitoring = useCallback((intervalMs = 60000) => {
    if (monitoringIntervalRef.current) {
      clearInterval(monitoringIntervalRef.current);
    }
    
    // Perform initial check
    checkHealth();
    
    // Set up interval for regular checks
    monitoringIntervalRef.current = setInterval(checkHealth, intervalMs);
    setIsMonitoring(true);
    
    return () => {
      if (monitoringIntervalRef.current) {
        clearInterval(monitoringIntervalRef.current);
        monitoringIntervalRef.current = null;
      }
      setIsMonitoring(false);
    };
  }, [checkHealth]);

  /**
   * Stop health monitoring
   */
  const stopMonitoring = useCallback(() => {
    if (monitoringIntervalRef.current) {
      clearInterval(monitoringIntervalRef.current);
      monitoringIntervalRef.current = null;
    }
    setIsMonitoring(false);
  }, []);

  /**
   * Fix health issues
   */
  const fixHealthIssues = useCallback(async () => {
    // Check if there are any pending operations to sync
    if (healthStatus.hasPendingOperations) {
      await reliability.sync();
    }
    
    // Run a new health check to verify fixes
    return await checkHealth();
  }, [healthStatus.hasPendingOperations, checkHealth]);

  /**
   * Send diagnostic logs to server
   */
  const sendDiagnosticLogs = useCallback(async () => {
    return await logger.sendLogsToServer();
  }, []);

  // Monitor app state changes
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState: AppStateStatus) => {
      // If app is coming to the foreground from background or inactive
      if (
        (appStateRef.current === 'background' || appStateRef.current === 'inactive') &&
        nextAppState === 'active'
      ) {
        // Perform a health check when app comes to the foreground
        checkHealth();
      }
      
      appStateRef.current = nextAppState;
    });
    
    return () => {
      subscription.remove();
    };
  }, [checkHealth]);

  // Monitor network state changes
  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener(state => {
      if (state.isConnected && !healthStatus.isConnected) {
        // If we just came back online, run a health check
        checkHealth();
      }
    });
    
    return () => {
      unsubscribe();
    };
  }, [checkHealth, healthStatus.isConnected]);

  // Clean up interval on unmount
  useEffect(() => {
    return () => {
      if (monitoringIntervalRef.current) {
        clearInterval(monitoringIntervalRef.current);
      }
    };
  }, []);

  return {
    healthStatus,
    isMonitoring,
    checkHealth,
    startMonitoring,
    stopMonitoring,
    fixHealthIssues,
    sendDiagnosticLogs,
  };
}