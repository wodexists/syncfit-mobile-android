/**
 * SyncFit Mobile App Configuration
 */

// Base URL for API requests
export const API_BASE_URL = process.env.API_BASE_URL || 'https://syncfit.replit.app';

// Firebase configuration
export const FIREBASE_CONFIG = {
  apiKey: process.env.VITE_FIREBASE_API_KEY || '',
  authDomain: `${process.env.VITE_FIREBASE_PROJECT_ID || ''}.firebaseapp.com`,
  projectId: process.env.VITE_FIREBASE_PROJECT_ID || '',
  storageBucket: `${process.env.VITE_FIREBASE_PROJECT_ID || ''}.appspot.com`,
  messagingSenderId: '420251650017',
  appId: process.env.VITE_FIREBASE_APP_ID || '',
};

// Whether to use test APIs instead of real ones
export const USE_TEST_APIS = process.env.USE_TEST_APIS === 'true';

// App version
export const APP_VERSION = '1.0.0';

// Google OAuth configuration for Android (uses FirebaseUI OAuth)
export const GOOGLE_AUTH_CONFIG = {
  // These will be populated from the Firebase config
  webClientId: process.env.VITE_FIREBASE_WEB_CLIENT_ID || '',
  scopes: [
    'https://www.googleapis.com/auth/calendar',
    'https://www.googleapis.com/auth/calendar.events',
    'profile',
    'email'
  ],
};

// API request timeout in milliseconds
export const API_TIMEOUT = 15000;

// Functionality flags for feature toggling
export const FEATURES = {
  enableLearningMode: true,
  enableRecommendations: true,
  enableNotifications: true,
  debugMode: process.env.DEBUG === 'true',
};