import * as firebaseTesting from '@firebase/rules-unit-testing';
import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  signInWithEmailAndPassword, 
  GoogleAuthProvider, 
  signInWithCredential 
} from 'firebase/auth';
import { 
  getFirestore, 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  getDocs, 
  query, 
  where, 
  Timestamp 
} from 'firebase/firestore';

// Test project configuration
const TEST_PROJECT_ID = 'syncfit-test-project';
const TEST_PROJECT_CONFIG = {
  apiKey: 'AIzaSyDtxMF9uQZgHvlZLZQ6vrr2-RfT3PQfQoY', // This is a test API key, only works with the test project
  projectId: TEST_PROJECT_ID,
  authDomain: `${TEST_PROJECT_ID}.firebaseapp.com`
};

// Test user credentials for authentication
const TEST_USER_EMAIL = 'test@syncfit.example.com';
const TEST_USER_PASSWORD = 'Test123456!';
const TEST_USER_UID = 'test-user-uid-123456';

// Test Google credentials (these are for testing purposes only)
const TEST_GOOGLE_ID_TOKEN = 'test-google-id-token';
const TEST_GOOGLE_ACCESS_TOKEN = 'test-google-access-token';

/**
 * Initialize Firestore test app with auth
 */
export async function initializeTestFirestore() {
  // Clear any previous test environment
  await firebaseTesting.clearFirestoreData({ projectId: TEST_PROJECT_ID });

  // Initialize auth test app
  const testApp = firebaseTesting.initializeTestApp({
    projectId: TEST_PROJECT_ID,
    auth: { uid: TEST_USER_UID, email: TEST_USER_EMAIL }
  });

  return testApp.firestore();
}

/**
 * Initialize Firestore admin test app
 */
export async function initializeTestFirestoreAdmin() {
  const adminApp = firebaseTesting.initializeAdminApp({
    projectId: TEST_PROJECT_ID
  });

  return adminApp.firestore();
}

/**
 * Create test user document with necessary fields for testing
 */
export async function createTestUserDocument(adminFirestore) {
  await adminFirestore.collection('users').doc(TEST_USER_UID).set({
    id: 1,
    email: TEST_USER_EMAIL,
    displayName: 'Test User',
    photoURL: 'https://via.placeholder.com/150',
    googleId: 'test-google-id',
    createdAt: Timestamp.now(),
    calendarConnected: true,
    accessToken: TEST_GOOGLE_ACCESS_TOKEN,
    refreshToken: 'test-refresh-token'
  });
}

/**
 * Create test calendar data for user
 */
export async function createTestCalendarData(adminFirestore) {
  // Create user calendars
  await adminFirestore.collection('userCalendars').doc('primary').set({
    id: 'primary',
    userId: TEST_USER_UID,
    title: 'Primary Calendar',
    primary: true,
    selected: true
  });
  
  await adminFirestore.collection('userCalendars').doc('secondary').set({
    id: 'secondary',
    userId: TEST_USER_UID,
    title: 'Workout Calendar',
    primary: false,
    selected: true
  });
  
  // Create scheduled workouts with calendar event IDs
  await adminFirestore.collection('scheduledWorkouts').doc('workout1').set({
    id: 1,
    workoutId: 1,
    userId: TEST_USER_UID,
    title: 'Morning Run',
    startTime: '08:00',
    endTime: '08:30',
    date: '2025-05-12',
    duration: '30 min',
    status: 'scheduled',
    calendarEventId: 'event1',
    recurring: false
  });
  
  await adminFirestore.collection('scheduledWorkouts').doc('workout2').set({
    id: 2,
    workoutId: 2,
    userId: TEST_USER_UID,
    title: 'Evening Yoga',
    startTime: '18:00',
    endTime: '19:00',
    date: '2025-05-13',
    duration: '60 min',
    status: 'scheduled',
    calendarEventId: 'event2',
    recurring: true,
    recurrenceRule: JSON.stringify({
      frequency: 'weekly',
      interval: 1,
      count: 8
    })
  });
  
  // Create calendar events
  await adminFirestore.collection('calendarEvents').doc('event1').set({
    id: 'event1',
    userId: TEST_USER_UID,
    calendarId: 'primary',
    title: 'Workout: Morning Run',
    startTime: '08:00',
    endTime: '08:30',
    date: '2025-05-12',
    description: 'A morning cardio workout',
    created: Timestamp.now(),
    lastSynced: Timestamp.now()
  });
  
  await adminFirestore.collection('calendarEvents').doc('event2').set({
    id: 'event2',
    userId: TEST_USER_UID,
    calendarId: 'secondary',
    title: 'Workout: Evening Yoga',
    startTime: '18:00',
    endTime: '19:00',
    date: '2025-05-13',
    description: 'Relaxing yoga session',
    created: Timestamp.now(),
    lastSynced: Timestamp.now(),
    recurring: true,
    recurrenceId: 'recurrence1'
  });
  
  // Create slot stats for learning mode
  await adminFirestore.collection('slotStats').doc('slot1').set({
    id: 1,
    userId: TEST_USER_UID,
    dayOfWeek: 'Monday',
    timeSlot: '08:00',
    successCount: 12,
    totalCount: 15,
    lastUpdated: Timestamp.now()
  });
  
  await adminFirestore.collection('slotStats').doc('slot2').set({
    id: 2,
    userId: TEST_USER_UID,
    dayOfWeek: 'Wednesday',
    timeSlot: '18:00',
    successCount: 8,
    totalCount: 10,
    lastUpdated: Timestamp.now()
  });
}

/**
 * Initialize Firebase with test configuration for development testing
 */
export function initializeTestFirebase() {
  const app = initializeApp(TEST_PROJECT_CONFIG, 'test-app');
  const auth = getAuth(app);
  const firestore = getFirestore(app);
  
  return { app, auth, firestore };
}

/**
 * Sign in with test user credentials
 */
export async function signInWithTestUser(auth) {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, TEST_USER_EMAIL, TEST_USER_PASSWORD);
    return userCredential.user;
  } catch (error) {
    console.error('Error signing in with test user:', error);
    return null;
  }
}

/**
 * Sign in with test Google credentials
 */
export async function signInWithTestGoogleCredentials(auth) {
  try {
    // Create Google credential with test tokens
    const googleCredential = GoogleAuthProvider.credential(
      TEST_GOOGLE_ID_TOKEN,
      TEST_GOOGLE_ACCESS_TOKEN
    );
    
    // Sign in with credential
    const userCredential = await signInWithCredential(auth, googleCredential);
    return userCredential.user;
  } catch (error) {
    console.error('Error signing in with test Google credentials:', error);
    return null;
  }
}

/**
 * Create a mock calendar event in Firestore for testing
 */
export async function createMockCalendarEvent(firestore, eventData) {
  try {
    const eventId = `test-event-${Date.now()}`;
    const eventRef = doc(collection(firestore, 'calendarEvents'), eventId);
    
    await setDoc(eventRef, {
      id: eventId,
      userId: TEST_USER_UID,
      created: Timestamp.now(),
      lastSynced: Timestamp.now(),
      ...eventData
    });
    
    return eventId;
  } catch (error) {
    console.error('Error creating mock calendar event:', error);
    return null;
  }
}

/**
 * Get all mock calendar events for the test user
 */
export async function getMockCalendarEvents(firestore) {
  try {
    const eventsQuery = query(
      collection(firestore, 'calendarEvents'),
      where('userId', '==', TEST_USER_UID)
    );
    
    const querySnapshot = await getDocs(eventsQuery);
    const events = [];
    
    querySnapshot.forEach((doc) => {
      events.push({
        id: doc.id,
        ...doc.data()
      });
    });
    
    return events;
  } catch (error) {
    console.error('Error getting mock calendar events:', error);
    return [];
  }
}

/**
 * Clean up test data after tests
 */
export async function cleanupTestData() {
  await firebaseTesting.clearFirestoreData({ projectId: TEST_PROJECT_ID });
}

// Main function to setup everything for testing
export async function setupTestEnvironment() {
  const adminFirestore = await initializeTestFirestoreAdmin();
  await createTestUserDocument(adminFirestore);
  await createTestCalendarData(adminFirestore);
  
  const { auth, firestore } = initializeTestFirebase();
  const user = await signInWithTestUser(auth);
  
  return { user, auth, firestore };
}