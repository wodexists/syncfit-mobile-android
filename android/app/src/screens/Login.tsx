import React, { useState } from 'react';
import { View, StyleSheet, Image, Dimensions, ActivityIndicator } from 'react-native';
import { Text, Button } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../hooks/useAuth';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { AuthStackParamList } from '../navigation';

const { width, height } = Dimensions.get('window');

const Login = () => {
  const navigation = useNavigation<StackNavigationProp<AuthStackParamList>>();
  const { login, isLoading, error } = useAuth();
  const [loggingIn, setLoggingIn] = useState(false);

  const handleGoogleLogin = async () => {
    setLoggingIn(true);
    try {
      await login();
    } catch (error) {
      console.error('Login error:', error);
    } finally {
      setLoggingIn(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.logoContainer}>
        <Image 
          source={require('../../assets/icon.png')} 
          style={styles.logo}
          resizeMode="contain"
        />
        <Text style={styles.appName}>SyncFit</Text>
        <Text style={styles.tagline}>Your Intelligent Fitness Companion</Text>
      </View>

      <View style={styles.contentContainer}>
        <View style={styles.featureItem}>
          <Ionicons name="calendar-outline" size={24} color="#4F46E5" />
          <Text style={styles.featureText}>Intelligent workout scheduling</Text>
        </View>
        
        <View style={styles.featureItem}>
          <Ionicons name="sync-outline" size={24} color="#4F46E5" />
          <Text style={styles.featureText}>Google Calendar integration</Text>
        </View>
        
        <View style={styles.featureItem}>
          <Ionicons name="stats-chart-outline" size={24} color="#4F46E5" />
          <Text style={styles.featureText}>Track your progress and stats</Text>
        </View>
      </View>

      <View style={styles.buttonContainer}>
        {error && <Text style={styles.errorText}>{error}</Text>}
        
        <Button
          mode="contained"
          icon={({ size, color }) => (
            <Ionicons name="logo-google" size={size} color={color} />
          )}
          onPress={handleGoogleLogin}
          style={styles.googleButton}
          disabled={isLoading || loggingIn}
          loading={isLoading || loggingIn}
        >
          Sign in with Google
        </Button>
        
        <Button
          mode="outlined"
          icon={({ size, color }) => (
            <Ionicons name="calendar-outline" size={size} color={color} />
          )}
          onPress={() => navigation.navigate('CalendarDemo')}
          style={styles.demoButton}
        >
          Try Calendar Demo
        </Button>
        
        <Text style={styles.disclaimer}>
          By signing in, you agree to our Terms of Service and Privacy Policy
        </Text>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  logoContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: height * 0.1,
  },
  logo: {
    width: width * 0.3,
    height: width * 0.3,
    marginBottom: 16,
  },
  appName: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#4F46E5',
    marginBottom: 8,
  },
  tagline: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    paddingHorizontal: 24,
  },
  contentContainer: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 48,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
    backgroundColor: '#F3F4F6',
    padding: 16,
    borderRadius: 12,
  },
  featureText: {
    fontSize: 16,
    color: '#1F2937',
    marginLeft: 16,
  },
  buttonContainer: {
    padding: 24,
    marginBottom: 24,
  },
  googleButton: {
    backgroundColor: '#4F46E5',
    paddingVertical: 8,
    marginBottom: 12,
  },
  demoButton: {
    borderColor: '#4F46E5',
    borderWidth: 1,
    paddingVertical: 8,
  },
  disclaimer: {
    marginTop: 16,
    fontSize: 12,
    color: '#9CA3AF',
    textAlign: 'center',
  },
  errorText: {
    color: '#EF4444',
    marginBottom: 16,
    textAlign: 'center',
  },
});

export default Login;