/**
 * API Service
 *
 * Central module for making API requests to the SyncFit server.
 * Handles authentication, error handling, and response parsing.
 */

import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { logger, ErrorCode } from './logging';
import NetInfo from '@react-native-community/netinfo';

// Define API base URL from configuration
const API_URL = Constants.expoConfig?.extra?.apiUrl || 'https://api.syncfitapp.com';

// Generate a unique request ID for each API call
const generateRequestId = (): string => {
  return Math.random().toString(36).substring(2, 15) + 
    Math.random().toString(36).substring(2, 15);
};

// API endpoints
export const endpoints = {
  auth: {
    login: '/api/auth/login',
    register: '/api/auth/register',
    logout: '/api/auth/logout',
    session: '/api/auth/session',
    googleAuth: '/api/auth/google',
  },
  user: {
    profile: '/api/user/profile',
    preferences: '/api/user/preferences',
  },
  workouts: {
    list: '/api/workouts',
    categories: '/api/workouts/categories',
    details: (id: string) => `/api/workouts/${id}`,
    schedule: '/api/workouts/schedule',
    complete: (id: string) => `/api/workouts/${id}/complete`,
    cancel: (id: string) => `/api/workouts/${id}/cancel`,
    history: '/api/workouts/history',
  },
  calendar: {
    calendars: '/api/calendar/calendars',
    selectedCalendars: '/api/calendar/selected',
    availability: '/api/calendar/availability',
    createEvent: '/api/calendar/events',
    syncStatus: '/api/calendar/sync/status',
    triggerSync: '/api/calendar/sync/trigger',
  },
  stats: {
    summary: '/api/stats/summary',
    workoutsByType: '/api/stats/by-type',
    completionRates: '/api/stats/completion-rates',
    streaks: '/api/stats/streaks',
  },
};

// Response type definitions
interface ApiResponse<T = any> {
  data?: T;
  error?: string;
  status: number;
}

// Request options for the fetch API
interface RequestOptions extends RequestInit {
  timeout?: number; // Timeout in milliseconds
}

/**
 * The API service provides methods for making API requests
 */
class ApiService {
  private readonly DEFAULT_TIMEOUT = 10000; // 10 seconds
  
  /**
   * Check if network is available
   */
  private async isNetworkAvailable(): Promise<boolean> {
    const netInfo = await NetInfo.fetch();
    return netInfo.isConnected === true;
  }
  
  /**
   * Add timeout to a fetch request
   */
  private withTimeout<T>(
    promise: Promise<T>,
    timeoutMs: number,
    errorMessage = 'Request timed out'
  ): Promise<T> {
    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        reject(new Error(errorMessage));
      }, timeoutMs);
      
      promise.then(
        (result) => {
          clearTimeout(timeoutId);
          resolve(result);
        },
        (error) => {
          clearTimeout(timeoutId);
          reject(error);
        }
      );
    });
  }
  
  /**
   * Make an API request with proper error handling and logging
   */
  private async request<T = any>(
    endpoint: string,
    method: string = 'GET',
    data?: any,
    options: RequestOptions = {}
  ): Promise<ApiResponse<T>> {
    // Generate a unique request ID
    const requestId = generateRequestId();
    
    // Start timing the request
    const startTime = Date.now();
    
    // Check network connectivity
    if (!(await this.isNetworkAvailable())) {
      logger.error('Network is not available', ErrorCode.NETWORK_OFFLINE);
      return {
        error: 'Network is not available',
        status: 0,
      };
    }
    
    try {
      // Prepare headers
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'X-Request-ID': requestId,
        'X-Client-Platform': Platform.OS,
        'X-Client-Version': Constants.expoConfig?.version || '1.0.0',
        ...(options.headers || {}),
      };
      
      // Prepare request options
      const requestOptions: RequestInit = {
        method,
        headers,
        credentials: 'include', // Include cookies for session management
        ...options,
      };
      
      // Add body for non-GET requests
      if (method !== 'GET' && data) {
        requestOptions.body = JSON.stringify(data);
      }
      
      // Build full URL (handle query parameters for GET requests)
      let url = `${API_URL}${endpoint}`;
      if (method === 'GET' && data) {
        const queryParams = new URLSearchParams();
        Object.entries(data).forEach(([key, value]) => {
          if (value !== null && value !== undefined) {
            queryParams.append(key, String(value));
          }
        });
        
        const queryString = queryParams.toString();
        if (queryString) {
          url += `?${queryString}`;
        }
      }
      
      // Make the request with timeout
      const timeout = options.timeout || this.DEFAULT_TIMEOUT;
      const response = await this.withTimeout(
        fetch(url, requestOptions),
        timeout,
        'Request timed out'
      );
      
      // Calculate response time
      const responseTime = Date.now() - startTime;
      
      // Parse response
      let responseData: any;
      let responseText = '';
      
      try {
        responseText = await response.text();
        responseData = responseText ? JSON.parse(responseText) : {};
      } catch (error) {
        logger.error('Failed to parse API response', 
          ErrorCode.API_BAD_REQUEST, { responseText, error });
        responseData = { error: 'Invalid response format' };
      }
      
      // Prepare the API response
      const apiResponse: ApiResponse<T> = {
        status: response.status,
      };
      
      if (response.ok) {
        apiResponse.data = responseData;
      } else {
        apiResponse.error = responseData.error || 'Request failed';
      }
      
      // Log the API call
      logger.logApiCall(
        url,
        method,
        response.status,
        data,
        responseData,
        !response.ok ? this.mapStatusToErrorCode(response.status) : undefined,
        requestId,
        responseTime
      );
      
      return apiResponse;
    } catch (error) {
      // Calculate response time even for errors
      const responseTime = Date.now() - startTime;
      
      // Determine error type
      let errorCode = ErrorCode.API_REQUEST_FAILED;
      let errorMessage = 'Request failed';
      
      if (error instanceof Error) {
        if (error.message === 'Request timed out') {
          errorCode = ErrorCode.NETWORK_TIMEOUT;
          errorMessage = 'Request timed out';
        } else if (error.message.includes('Network request failed')) {
          errorCode = ErrorCode.NETWORK_REQUEST_FAILED;
          errorMessage = 'Network request failed';
        }
      }
      
      // Log the error
      logger.error(`API request failed: ${endpoint}`, errorCode, {
        error,
        method,
        endpoint,
        requestData: data,
      });
      
      // Log the API call (failure)
      logger.logApiCall(
        `${API_URL}${endpoint}`,
        method,
        0, // No status code for failed requests
        data,
        { error: errorMessage },
        errorCode,
        requestId,
        responseTime
      );
      
      return {
        error: errorMessage,
        status: 0,
      };
    }
  }
  
  /**
   * Map HTTP status code to error code
   */
  private mapStatusToErrorCode(status: number): ErrorCode {
    switch (status) {
      case 400:
        return ErrorCode.API_BAD_REQUEST;
      case 401:
        return ErrorCode.AUTH_REQUIRED;
      case 403:
        return ErrorCode.AUTH_INVALID_TOKEN;
      case 404:
        return ErrorCode.API_NOT_FOUND;
      case 429:
        return ErrorCode.API_RATE_LIMITED;
      case 500:
      case 502:
      case 503:
      case 504:
        return ErrorCode.API_SERVER_ERROR;
      default:
        return ErrorCode.API_REQUEST_FAILED;
    }
  }
  
  /**
   * Make a GET request
   */
  async get<T = any>(endpoint: string, params?: any, options?: RequestOptions): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, 'GET', params, options);
  }
  
  /**
   * Make a POST request
   */
  async post<T = any>(endpoint: string, data?: any, options?: RequestOptions): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, 'POST', data, options);
  }
  
  /**
   * Make a PUT request
   */
  async put<T = any>(endpoint: string, data?: any, options?: RequestOptions): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, 'PUT', data, options);
  }
  
  /**
   * Make a DELETE request
   */
  async delete<T = any>(endpoint: string, data?: any, options?: RequestOptions): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, 'DELETE', data, options);
  }
  
  /**
   * Make a PATCH request
   */
  async patch<T = any>(endpoint: string, data?: any, options?: RequestOptions): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, 'PATCH', data, options);
  }
}

// Create and export the API service instance
export const api = new ApiService();