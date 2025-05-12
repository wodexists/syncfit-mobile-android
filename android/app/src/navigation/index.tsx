import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../hooks/useAuth';

// Screens
import Login from '../screens/Login';
import Dashboard from '../screens/Dashboard';
import Calendar from '../screens/Calendar';
import Workouts from '../screens/Workouts';
import WorkoutDetail from '../screens/WorkoutDetail';
import ScheduleWorkout from '../screens/ScheduleWorkout';
import Stats from '../screens/Stats';
import Profile from '../screens/Profile';
import CalendarDemo from '../screens/CalendarDemo';

// Stack navigator type definitions
export type AuthStackParamList = {
  Login: undefined;
  CalendarDemo: undefined;
};

export type MainStackParamList = {
  Tabs: undefined;
  WorkoutDetail: { workoutId: number };
  ScheduleWorkout: { workoutId?: number; date?: string };
};

export type TabStackParamList = {
  Dashboard: undefined;
  Calendar: undefined;
  Workouts: undefined;
  Stats: undefined;
  Profile: undefined;
};

// Create navigators
const AuthStack = createStackNavigator<AuthStackParamList>();
const MainStack = createStackNavigator<MainStackParamList>();
const Tab = createBottomTabNavigator<TabStackParamList>();

// Auth navigation stack (when user is not logged in)
const AuthNavigator = () => {
  return (
    <AuthStack.Navigator screenOptions={{ headerShown: false }}>
      <AuthStack.Screen name="Login" component={Login} />
      <AuthStack.Screen 
        name="CalendarDemo" 
        component={CalendarDemo} 
        options={{ headerShown: true, headerTitle: 'Calendar Demo' }}
      />
    </AuthStack.Navigator>
  );
};

// Tab navigation (main app navigation)
const TabNavigator = () => {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: string;

          if (route.name === 'Dashboard') {
            iconName = focused ? 'home' : 'home-outline';
          } else if (route.name === 'Calendar') {
            iconName = focused ? 'calendar' : 'calendar-outline';
          } else if (route.name === 'Workouts') {
            iconName = focused ? 'barbell' : 'barbell-outline';
          } else if (route.name === 'Stats') {
            iconName = focused ? 'stats-chart' : 'stats-chart-outline';
          } else if (route.name === 'Profile') {
            iconName = focused ? 'person' : 'person-outline';
          } else {
            iconName = 'ellipsis-horizontal';
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#4F46E5',
        tabBarInactiveTintColor: '#6B7280',
        headerShown: true,
        headerTitle: route.name,
        headerTitleStyle: {
          color: '#1F2937',
          fontWeight: 'bold',
        },
        headerTitleAlign: 'center',
        headerStyle: {
          elevation: 0,
          shadowOpacity: 0,
          borderBottomWidth: 1,
          borderBottomColor: '#E5E7EB',
        },
      })}
    >
      <Tab.Screen name="Dashboard" component={Dashboard} />
      <Tab.Screen name="Calendar" component={Calendar} />
      <Tab.Screen name="Workouts" component={Workouts} />
      <Tab.Screen name="Stats" component={Stats} />
      <Tab.Screen name="Profile" component={Profile} />
    </Tab.Navigator>
  );
};

// Main navigation stack (when user is logged in)
const MainNavigator = () => {
  return (
    <MainStack.Navigator>
      <MainStack.Screen 
        name="Tabs" 
        component={TabNavigator} 
        options={{ headerShown: false }}
      />
      <MainStack.Screen 
        name="WorkoutDetail" 
        component={WorkoutDetail}
        options={{ 
          headerTitle: 'Workout Details',
          headerBackTitleVisible: false,
          headerTitleAlign: 'center',
        }}
      />
      <MainStack.Screen 
        name="ScheduleWorkout" 
        component={ScheduleWorkout}
        options={{ 
          headerTitle: 'Schedule Workout',
          headerBackTitleVisible: false,
          headerTitleAlign: 'center',
        }}
      />
    </MainStack.Navigator>
  );
};

// Root navigator - switches between auth and main flows
const RootNavigator = () => {
  const { isAuthenticated, isLoading } = useAuth();

  // If still loading auth state, could show a splash screen here
  if (isLoading) {
    return null; // Or a loading component
  }

  return (
    <NavigationContainer>
      {isAuthenticated ? <MainNavigator /> : <AuthNavigator />}
    </NavigationContainer>
  );
};

export default RootNavigator;