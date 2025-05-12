import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { 
  Text, 
  Avatar, 
  Card, 
  List, 
  Switch, 
  Button, 
  Divider, 
  TouchableRipple,
  Dialog,
  Portal
} from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../hooks/useAuth';

const Profile = () => {
  const { user, logout } = useAuth();
  const [syncEnabled, setSyncEnabled] = useState(true);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [darkModeEnabled, setDarkModeEnabled] = useState(false);
  const [logoutDialogVisible, setLogoutDialogVisible] = useState(false);

  // User preferences
  const preferences = {
    preferredWorkoutTimes: ['Morning', 'Evening'],
    preferredWorkoutDuration: '30-45 min',
    fitnessGoals: ['Build Strength', 'Improve Flexibility'],
    syncFrequency: 'Real-time'
  };

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error('Logout error:', error);
      Alert.alert('Logout Error', 'Failed to log out. Please try again.');
    }
  };

  const toggleSync = () => {
    setSyncEnabled(!syncEnabled);
  };

  const toggleNotifications = () => {
    setNotificationsEnabled(!notificationsEnabled);
  };

  const toggleDarkMode = () => {
    setDarkModeEnabled(!darkModeEnabled);
  };

  return (
    <ScrollView style={styles.container}>
      {/* Profile Header */}
      <View style={styles.profileHeader}>
        <Avatar.Image 
          size={80} 
          source={{ uri: user?.photoURL || 'https://via.placeholder.com/80' }} 
          style={styles.avatar}
        />
        <View style={styles.profileInfo}>
          <Text style={styles.name}>{user?.displayName || 'User'}</Text>
          <Text style={styles.email}>{user?.email || 'user@example.com'}</Text>
          <TouchableOpacity style={styles.editProfileButton}>
            <Text style={styles.editProfileText}>Edit Profile</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Account Settings */}
      <Card style={styles.card}>
        <Card.Content>
          <Text style={styles.sectionTitle}>Account Settings</Text>
          
          <List.Item
            title="Connected Accounts"
            description="Google"
            left={props => <List.Icon {...props} icon={({ size, color }) => (
              <Ionicons name="logo-google" size={size} color="#4F46E5" />
            )} />}
            right={props => <List.Icon {...props} icon="chevron-right" />}
            onPress={() => console.log('Connected Accounts pressed')}
          />
          
          <Divider />
          
          <List.Item
            title="Change Password"
            description="Last changed 2 months ago"
            left={props => <List.Icon {...props} icon={({ size, color }) => (
              <Ionicons name="lock-closed-outline" size={size} color="#4F46E5" />
            )} />}
            right={props => <List.Icon {...props} icon="chevron-right" />}
            onPress={() => console.log('Change Password pressed')}
          />
          
          <Divider />
          
          <List.Item
            title="Privacy Settings"
            left={props => <List.Icon {...props} icon={({ size, color }) => (
              <Ionicons name="shield-outline" size={size} color="#4F46E5" />
            )} />}
            right={props => <List.Icon {...props} icon="chevron-right" />}
            onPress={() => console.log('Privacy Settings pressed')}
          />
        </Card.Content>
      </Card>

      {/* Preferences */}
      <Card style={styles.card}>
        <Card.Content>
          <Text style={styles.sectionTitle}>Workout Preferences</Text>
          
          <View style={styles.preferencesContainer}>
            <View style={styles.preference}>
              <Text style={styles.preferenceLabel}>Preferred Times</Text>
              <View style={styles.preferenceChips}>
                {preferences.preferredWorkoutTimes.map((time, index) => (
                  <View key={index} style={styles.preferenceChip}>
                    <Text style={styles.preferenceChipText}>{time}</Text>
                  </View>
                ))}
              </View>
            </View>
            
            <View style={styles.preference}>
              <Text style={styles.preferenceLabel}>Workout Duration</Text>
              <Text style={styles.preferenceValue}>{preferences.preferredWorkoutDuration}</Text>
            </View>
            
            <View style={styles.preference}>
              <Text style={styles.preferenceLabel}>Fitness Goals</Text>
              <View style={styles.preferenceChips}>
                {preferences.fitnessGoals.map((goal, index) => (
                  <View key={index} style={styles.preferenceChip}>
                    <Text style={styles.preferenceChipText}>{goal}</Text>
                  </View>
                ))}
              </View>
            </View>
          </View>
          
          <Button 
            mode="text" 
            onPress={() => console.log('Edit preferences pressed')}
            style={styles.editButton}
          >
            Edit Preferences
          </Button>
        </Card.Content>
      </Card>

      {/* App Settings */}
      <Card style={styles.card}>
        <Card.Content>
          <Text style={styles.sectionTitle}>App Settings</Text>
          
          <List.Item
            title="Google Calendar Sync"
            description={syncEnabled ? "Enabled" : "Disabled"}
            left={props => <List.Icon {...props} icon={({ size, color }) => (
              <Ionicons name="calendar-outline" size={size} color="#4F46E5" />
            )} />}
            right={() => (
              <Switch
                value={syncEnabled}
                onValueChange={toggleSync}
                color="#4F46E5"
              />
            )}
          />
          
          <Divider />
          
          <List.Item
            title="Notifications"
            description={notificationsEnabled ? "Enabled" : "Disabled"}
            left={props => <List.Icon {...props} icon={({ size, color }) => (
              <Ionicons name="notifications-outline" size={size} color="#4F46E5" />
            )} />}
            right={() => (
              <Switch
                value={notificationsEnabled}
                onValueChange={toggleNotifications}
                color="#4F46E5"
              />
            )}
          />
          
          <Divider />
          
          <List.Item
            title="Dark Mode"
            description={darkModeEnabled ? "Enabled" : "Disabled"}
            left={props => <List.Icon {...props} icon={({ size, color }) => (
              <Ionicons name="moon-outline" size={size} color="#4F46E5" />
            )} />}
            right={() => (
              <Switch
                value={darkModeEnabled}
                onValueChange={toggleDarkMode}
                color="#4F46E5"
              />
            )}
          />
          
          <Divider />
          
          <List.Item
            title="Sync Frequency"
            description={preferences.syncFrequency}
            left={props => <List.Icon {...props} icon={({ size, color }) => (
              <Ionicons name="sync-outline" size={size} color="#4F46E5" />
            )} />}
            right={props => <List.Icon {...props} icon="chevron-right" />}
            onPress={() => console.log('Sync Frequency pressed')}
          />
          
          <Divider />
          
          <List.Item
            title="Help & Support"
            left={props => <List.Icon {...props} icon={({ size, color }) => (
              <Ionicons name="help-circle-outline" size={size} color="#4F46E5" />
            )} />}
            right={props => <List.Icon {...props} icon="chevron-right" />}
            onPress={() => console.log('Help & Support pressed')}
          />
        </Card.Content>
      </Card>

      {/* About Section */}
      <Card style={styles.card}>
        <Card.Content>
          <Text style={styles.sectionTitle}>About</Text>
          
          <List.Item
            title="About SyncFit"
            left={props => <List.Icon {...props} icon={({ size, color }) => (
              <Ionicons name="information-circle-outline" size={size} color="#4F46E5" />
            )} />}
            right={props => <List.Icon {...props} icon="chevron-right" />}
            onPress={() => console.log('About SyncFit pressed')}
          />
          
          <Divider />
          
          <List.Item
            title="Privacy Policy"
            left={props => <List.Icon {...props} icon={({ size, color }) => (
              <Ionicons name="document-text-outline" size={size} color="#4F46E5" />
            )} />}
            right={props => <List.Icon {...props} icon="chevron-right" />}
            onPress={() => console.log('Privacy Policy pressed')}
          />
          
          <Divider />
          
          <List.Item
            title="Terms of Service"
            left={props => <List.Icon {...props} icon={({ size, color }) => (
              <Ionicons name="document-outline" size={size} color="#4F46E5" />
            )} />}
            right={props => <List.Icon {...props} icon="chevron-right" />}
            onPress={() => console.log('Terms of Service pressed')}
          />
          
          <Divider />
          
          <List.Item
            title="App Version"
            description="1.0.0"
            left={props => <List.Icon {...props} icon={({ size, color }) => (
              <Ionicons name="code-outline" size={size} color="#4F46E5" />
            )} />}
          />
        </Card.Content>
      </Card>

      {/* Logout Button */}
      <View style={styles.logoutContainer}>
        <Button 
          mode="outlined" 
          onPress={() => setLogoutDialogVisible(true)}
          icon={({ size, color }) => (
            <Ionicons name="log-out-outline" size={size} color="#EF4444" />
          )}
          style={styles.logoutButton}
          labelStyle={styles.logoutButtonText}
        >
          Log Out
        </Button>
      </View>

      {/* Logout Confirmation Dialog */}
      <Portal>
        <Dialog
          visible={logoutDialogVisible}
          onDismiss={() => setLogoutDialogVisible(false)}
        >
          <Dialog.Title>Log Out</Dialog.Title>
          <Dialog.Content>
            <Text>Are you sure you want to log out?</Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setLogoutDialogVisible(false)}>Cancel</Button>
            <Button onPress={() => {
              setLogoutDialogVisible(false);
              handleLogout();
            }} textColor="#EF4444">Log Out</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  profileHeader: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  avatar: {
    backgroundColor: '#E5E7EB',
  },
  profileInfo: {
    marginLeft: 16,
    justifyContent: 'center',
  },
  name: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  email: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 8,
  },
  editProfileButton: {
    paddingVertical: 4,
  },
  editProfileText: {
    fontSize: 14,
    color: '#4F46E5',
  },
  card: {
    margin: 16,
    marginTop: 8,
    marginBottom: 8,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 16,
  },
  preferencesContainer: {
    marginBottom: 8,
  },
  preference: {
    marginBottom: 16,
  },
  preferenceLabel: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 8,
  },
  preferenceValue: {
    fontSize: 16,
    color: '#1F2937',
  },
  preferenceChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  preferenceChip: {
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginRight: 8,
    marginBottom: 8,
  },
  preferenceChipText: {
    fontSize: 12,
    color: '#4F46E5',
  },
  editButton: {
    alignSelf: 'flex-end',
  },
  logoutContainer: {
    margin: 16,
    marginTop: 8,
    marginBottom: 32,
  },
  logoutButton: {
    borderColor: '#EF4444',
  },
  logoutButtonText: {
    color: '#EF4444',
  },
});

export default Profile;