import React from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Provider as PaperProvider } from 'react-native-paper';
import { StatusBar } from 'expo-status-bar';
import { LogBox } from 'react-native';

// Navigation
import Navigation from './src/navigation';
import { AuthProvider } from './src/hooks/useAuth';

// Ignore specific warnings
LogBox.ignoreLogs([
  'Setting a timer',
  'AsyncStorage has been extracted',
  'Non-serializable values were found in the navigation state',
]);

// Define custom theme
const theme = {
  colors: {
    primary: '#4F46E5',
    accent: '#10B981',
    background: '#F9FAFB',
    surface: '#FFFFFF',
    error: '#EF4444',
    text: '#1F2937',
    onSurface: '#1F2937',
    disabled: '#9CA3AF',
    placeholder: '#6B7280',
    backdrop: 'rgba(0, 0, 0, 0.5)',
    notification: '#4F46E5',
  },
  fonts: {
    regular: {
      fontFamily: 'System',
      fontWeight: 'normal',
    },
    medium: {
      fontFamily: 'System',
      fontWeight: '500',
    },
    light: {
      fontFamily: 'System',
      fontWeight: '300',
    },
    thin: {
      fontFamily: 'System',
      fontWeight: '100',
    },
  },
  animation: {
    scale: 1.0,
  },
  roundness: 8,
};

export default function App() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <PaperProvider theme={theme}>
          <Navigation />
          <StatusBar style="auto" />
        </PaperProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}