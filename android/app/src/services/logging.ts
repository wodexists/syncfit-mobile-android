/**
 * Logging Service
 * 
 * This service provides centralized logging for the application.
 * It handles different log levels, error codes, and can send logs
 * to different outputs (console, remote service, etc.).
 */

// Define error codes for better tracking and debugging
export enum ErrorCode {
  // Authentication errors
  AUTH_FAILED = 'AUTH_001',
  TOKEN_EXPIRED = 'AUTH_002',
  TOKEN_INVALID = 'AUTH_003',
  PERMISSION_DENIED = 'AUTH_004',
  
  // Calendar errors
  CALENDAR_SYNC_FAILED = 'CAL_001',
  CALENDAR_FETCH_FAILED = 'CAL_002',
  CALENDAR_UPDATE_FAILED = 'CAL_003',
  CALENDAR_DELETE_FAILED = 'CAL_004',
  CALENDAR_NOT_FOUND = 'CAL_005',
  
  // Event errors
  EVENT_CREATE_FAILED = 'EVT_001',
  EVENT_UPDATE_FAILED = 'EVT_002',
  EVENT_DELETE_FAILED = 'EVT_003',
  EVENT_NOT_FOUND = 'EVT_004',
  
  // Time slot errors
  TIMESLOT_FETCH_FAILED = 'SLOT_001',
  TIMESLOT_UNAVAILABLE = 'SLOT_002',
  
  // API errors
  API_NETWORK_ERROR = 'API_001',
  API_TIMEOUT = 'API_002',
  API_RATE_LIMIT = 'API_003',
  API_SERVER_ERROR = 'API_004',
  
  // Data errors
  DATA_VALIDATION_FAILED = 'DATA_001',
  DATA_PARSE_FAILED = 'DATA_002',
  DATA_SYNC_FAILED = 'DATA_003',
  
  // Learning system errors
  SCORING_FAILED = 'LEARN_001',
  PREDICTION_FAILED = 'LEARN_002',
  
  // General errors
  UNEXPECTED_ERROR = 'GEN_001',
  SYNC_FAILED = 'GEN_002',
}

export type LogLevel = 'debug' | 'info' | 'warning' | 'error';

interface LogOptions {
  timestamp?: Date;
  errorCode?: ErrorCode;
  data?: any;
}

/**
 * Logging service to centralize application logging
 */
class LoggingService {
  /**
   * Log a message at the debug level
   */
  debug(message: string, data?: any): void {
    this.log('debug', message, { data });
  }
  
  /**
   * Log a message at the info level
   */
  info(message: string, data?: any): void {
    this.log('info', message, { data });
  }
  
  /**
   * Log a message at the warning level
   */
  warning(message: string, errorCode?: ErrorCode, data?: any): void {
    this.log('warning', message, { errorCode, data });
  }
  
  /**
   * Log a message at the error level
   */
  error(message: string, errorCode: ErrorCode = ErrorCode.UNEXPECTED_ERROR, data?: any): void {
    this.log('error', message, { errorCode, data });
  }
  
  /**
   * General logging function
   */
  private log(level: LogLevel, message: string, options: LogOptions = {}): void {
    const timestamp = options.timestamp || new Date();
    const errorCode = options.errorCode;
    const data = options.data;
    
    // Create the log entry
    const logEntry = {
      level,
      timestamp,
      message,
      ...(errorCode && { errorCode }),
      ...(data && { data })
    };
    
    // Log to console in development
    if (process.env.NODE_ENV !== 'production') {
      const consoleMethod = 
        level === 'error' 
          ? console.error 
          : level === 'warning' 
            ? console.warn 
            : level === 'info' 
              ? console.info 
              : console.log;
      
      if (errorCode) {
        consoleMethod(`[${level.toUpperCase()}] [${errorCode}] ${message}`, data || '');
      } else {
        consoleMethod(`[${level.toUpperCase()}] ${message}`, data || '');
      }
    }
    
    // In production, we would send logs to a remote service
    if (process.env.NODE_ENV === 'production') {
      // Remote logging would go here
      // e.g., send to Firebase Analytics, Sentry, etc.
    }
  }
}

// Export singleton instance
export const logger = new LoggingService();