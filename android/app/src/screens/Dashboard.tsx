import React, { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, ScrollView, RefreshControl, Dimensions, TouchableOpacity } from 'react-native';
import { Text, Card, Button, Avatar, Title, ProgressBar, Chip, ActivityIndicator } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../hooks/useAuth';
import { useWorkouts } from '../hooks/useWorkouts';
import { useCalendar } from '../hooks/useCalendar';
import { useAppHealth } from '../hooks/useAppHealth';
import { logger, ErrorCode } from '../services/logging';

const { width } = Dimensions.get('window');

const Dashboard = () => {
  const navigation = useNavigation();
  const { user } = useAuth();
  const { 
    upcomingWorkouts, 
    isLoadingUpcoming, 
    loadUpcomingWorkouts 
  } = useWorkouts();
  
  const { 
    syncStatus, 
    isSyncing, 
    triggerSync 
  } = useCalendar();
  
  const { 
    healthStatus, 
    checkHealth 
  } = useAppHealth();
  
  const [refreshing, setRefreshing] = useState(false);
  const [workoutStats, setWorkoutStats] = useState({
    streak: 0,
    completedThisWeek: 0,
    totalCompleted: 0,
    completion: 0,
  });
  
  const [timeSlotRecommendations, setTimeSlotRecommendations] = useState<{
    day: string;
    slots: { time: string; score: number }[];
  }[]>([]);
  
  // Load initial data
  useEffect(() => {
    loadUpcomingWorkouts();
    loadWorkoutStats();
    loadRecommendations();
    // Start health monitoring
    checkHealth();
  }, [loadUpcomingWorkouts, checkHealth]);
  
  // Load workout statistics
  const loadWorkoutStats = useCallback(async () => {
    try {
      // This would normally be fetched from the API
      // For now, using sample data
      setWorkoutStats({
        streak: 5,
        completedThisWeek: 3,
        totalCompleted: 28,
        completion: 0.75,
      });
    } catch (error) {
      logger.error('Failed to load workout stats', ErrorCode.DATA_NOT_FOUND, error);
    }
  }, []);
  
  // Load time slot recommendations
  const loadRecommendations = useCallback(async () => {
    try {
      // This would normally be fetched from the API
      // For now, using sample data
      const today = new Date();
      const tomorrow = new Date();
      tomorrow.setDate(today.getDate() + 1);
      
      const todayStr = today.toLocaleDateString('en-US', { weekday: 'long' });
      const tomorrowStr = tomorrow.toLocaleDateString('en-US', { weekday: 'long' });
      
      setTimeSlotRecommendations([
        {
          day: 'Today',
          slots: [
            { time: '8:00 AM', score: 85 },
            { time: '12:30 PM', score: 65 },
            { time: '6:00 PM', score: 75 },
          ]
        },
        {
          day: 'Tomorrow',
          slots: [
            { time: '7:30 AM', score: 80 },
            { time: '5:30 PM', score: 90 },
          ]
        }
      ]);
    } catch (error) {
      logger.error('Failed to load time slot recommendations', ErrorCode.DATA_NOT_FOUND, error);
    }
  }, []);
  
  // Handle refresh
  const onRefresh = async () => {
    setRefreshing(true);
    
    try {
      // Refresh all data in parallel
      await Promise.all([
        loadUpcomingWorkouts(),
        loadWorkoutStats(),
        loadRecommendations(),
        checkHealth()
      ]);
    } catch (error) {
      logger.error('Error refreshing dashboard', ErrorCode.UNKNOWN_ERROR, error);
    } finally {
      setRefreshing(false);
    }
  };
  
  // Navigate to workout details
  const handleWorkoutPress = (workoutId: number) => {
    navigation.navigate('WorkoutDetail', { workoutId });
  };
  
  // Navigate to schedule workout screen
  const handleScheduleWorkout = (date?: string, time?: string) => {
    navigation.navigate('ScheduleWorkout', { date, time });
  };
  
  // Handle calendar sync retry
  const handleSyncRetry = async () => {
    try {
      await triggerSync();
    } catch (error) {
      logger.error('Failed to retry sync', ErrorCode.CALENDAR_SYNC_FAILED, error);
    }
  };
  
  // Format date for display
  const formatDate = (dateString: string) => {
    if (dateString === 'Today' || dateString === 'Tomorrow') {
      return dateString;
    }
    
    // Try to parse and format the date
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    } catch (error) {
      return dateString;
    }
  };

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      {/* Welcome and Sync Status */}
      <Card style={styles.welcomeCard}>
        <Card.Content style={styles.welcomeContent}>
          <View>
            <Text style={styles.welcomeText}>Welcome back,</Text>
            <Title style={styles.userName}>{user?.displayName || 'Fitness Enthusiast'}</Title>
          </View>
          <Avatar.Image 
            size={50} 
            source={{ uri: user?.photoURL || 'https://via.placeholder.com/50' }} 
          />
        </Card.Content>
        <Card.Content style={styles.syncStatusContainer}>
          <View style={styles.syncStatus}>
            <Ionicons 
              name={
                syncStatus.status === 'synced' ? 'checkmark-circle' : 
                syncStatus.status === 'syncing' ? 'sync' : 'alert-circle'
              } 
              size={16} 
              color={
                syncStatus.status === 'synced' ? '#10B981' : 
                syncStatus.status === 'syncing' ? '#F59E0B' : '#EF4444'
              } 
            />
            <Text style={styles.syncStatusText}>
              {syncStatus.status === 'synced' 
                ? 'Calendar synced' 
                : syncStatus.status === 'syncing' 
                  ? 'Syncing with calendar...' 
                  : 'Sync error'}
            </Text>
          </View>
          {syncStatus.status === 'error' && (
            <Button 
              compact
              mode="text"
              onPress={handleSyncRetry}
              loading={isSyncing}
              disabled={isSyncing}
            >
              Retry
            </Button>
          )}
        </Card.Content>
      </Card>

      {/* Workout Stats */}
      <Card style={styles.card}>
        <Card.Content>
          <Title style={styles.cardTitle}>Your Stats</Title>
          <View style={styles.statsContainer}>
            <View style={styles.statItem}>
              <Ionicons name="flame" size={24} color="#F59E0B" />
              <Text style={styles.statValue}>{workoutStats.streak}</Text>
              <Text style={styles.statLabel}>Day Streak</Text>
            </View>
            <View style={styles.statItem}>
              <Ionicons name="calendar" size={24} color="#4F46E5" />
              <Text style={styles.statValue}>{workoutStats.completedThisWeek}</Text>
              <Text style={styles.statLabel}>This Week</Text>
            </View>
            <View style={styles.statItem}>
              <Ionicons name="trophy" size={24} color="#10B981" />
              <Text style={styles.statValue}>{workoutStats.totalCompleted}</Text>
              <Text style={styles.statLabel}>Total</Text>
            </View>
          </View>
          <View style={styles.completionContainer}>
            <View style={styles.completionHeader}>
              <Text style={styles.completionTitle}>Completion Rate</Text>
              <Text style={styles.completionPercent}>
                {Math.round(workoutStats.completion * 100)}%
              </Text>
            </View>
            <ProgressBar 
              progress={workoutStats.completion} 
              color="#4F46E5" 
              style={styles.progressBar} 
            />
          </View>
        </Card.Content>
      </Card>

      {/* Upcoming Workouts */}
      <Card style={styles.card}>
        <Card.Content>
          <View style={styles.sectionHeader}>
            <Title style={styles.cardTitle}>Upcoming Workouts</Title>
            <Button 
              mode="text" 
              onPress={() => navigation.navigate('Calendar')}
              labelStyle={styles.viewAllButton}
            >
              View All
            </Button>
          </View>
          
          {isLoadingUpcoming ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator color="#4F46E5" />
              <Text style={styles.loadingText}>Loading workouts...</Text>
            </View>
          ) : upcomingWorkouts.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="calendar-outline" size={48} color="#9CA3AF" />
              <Text style={styles.emptyText}>No upcoming workouts</Text>
              <Button 
                mode="outlined" 
                onPress={() => handleScheduleWorkout()}
                style={styles.emptyButton}
              >
                Schedule Your First Workout
              </Button>
            </View>
          ) : (
            upcomingWorkouts.map((workout) => (
              <Card 
                key={workout.id} 
                style={styles.workoutCard}
                onPress={() => handleWorkoutPress(workout.workoutId)}
              >
                <Card.Content style={styles.workoutCardContent}>
                  <View style={styles.workoutTimeContainer}>
                    <Text style={styles.workoutTime}>{workout.startTime}</Text>
                    <Text style={styles.workoutDate}>{formatDate(workout.date)}</Text>
                  </View>
                  <View style={styles.workoutDetails}>
                    <Text style={styles.workoutTitle}>{workout.title}</Text>
                    <View style={styles.workoutMeta}>
                      <Chip style={styles.categoryChip} textStyle={styles.chipText}>
                        {workout.status}
                      </Chip>
                      <Text style={styles.duration}>{workout.duration}</Text>
                    </View>
                  </View>
                </Card.Content>
              </Card>
            ))
          )}
          
          <Button 
            mode="contained" 
            onPress={() => handleScheduleWorkout()}
            style={styles.scheduleButton}
            icon={({ size, color }) => (
              <Ionicons name="add-circle-outline" size={size} color={color} />
            )}
          >
            Schedule New Workout
          </Button>
        </Card.Content>
      </Card>

      {/* Recommendations */}
      <Card style={styles.card}>
        <Card.Content>
          <Title style={styles.cardTitle}>Recommended Time Slots</Title>
          <Text style={styles.recommendationsSubtitle}>
            Based on your calendar and past workout patterns
          </Text>
          
          {timeSlotRecommendations.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="time-outline" size={48} color="#9CA3AF" />
              <Text style={styles.emptyText}>
                No recommendations available yet.
                Complete more workouts to get personalized recommendations.
              </Text>
            </View>
          ) : (
            timeSlotRecommendations.map((day, index) => (
              <View key={index} style={styles.recommendationDay}>
                <Text style={styles.recommendationDayTitle}>{day.day}</Text>
                <View style={styles.recommendationSlots}>
                  {day.slots.map((slot, slotIndex) => (
                    <TouchableOpacity
                      key={slotIndex}
                      onPress={() => handleScheduleWorkout(
                        day.day === 'Today' 
                          ? new Date().toISOString().split('T')[0]
                          : day.day === 'Tomorrow'
                            ? new Date(Date.now() + 86400000).toISOString().split('T')[0]
                            : undefined,
                        slot.time
                      )}
                      style={styles.recommendationSlot}
                    >
                      <View style={styles.recommendationTime}>
                        <Ionicons name="time-outline" size={16} color="#4B5563" />
                        <Text style={styles.recommendationTimeText}>{slot.time}</Text>
                      </View>
                      <View style={styles.recommendationScore}>
                        <View 
                          style={[
                            styles.scoreIndicator, 
                            { 
                              backgroundColor: 
                                slot.score >= 80 ? '#10B981' : 
                                slot.score >= 60 ? '#F59E0B' : '#9CA3AF' 
                            }
                          ]} 
                        />
                        <Text style={styles.scoreText}>{slot.score}% match</Text>
                      </View>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            ))
          )}
          
          <Button 
            mode="text" 
            onPress={() => navigation.navigate('Stats')}
            style={styles.viewAnalyticsButton}
          >
            View Complete Analytics
          </Button>
        </Card.Content>
      </Card>
      
      {/* Health Status */}
      {!healthStatus.isHealthy && (
        <Card style={[styles.card, styles.alertCard]}>
          <Card.Content>
            <View style={styles.alertHeader}>
              <Ionicons name="alert-circle" size={24} color="#EF4444" />
              <Title style={styles.alertTitle}>Sync Issues Detected</Title>
            </View>
            <Text style={styles.alertDescription}>
              {!healthStatus.isConnected 
                ? "You're currently offline. Some features may be unavailable until you reconnect to the internet."
                : healthStatus.hasPendingOperations
                  ? "Some of your changes haven't been synchronized yet. They will be automatically synced when possible."
                  : "We're having trouble connecting to our servers. Please try again later."}
            </Text>
            <Button 
              mode="outlined" 
              onPress={checkHealth}
              style={styles.alertButton}
            >
              Check Connection
            </Button>
          </Card.Content>
        </Card>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  welcomeCard: {
    margin: 16,
    marginBottom: 8,
    backgroundColor: '#4F46E5',
    elevation: 2,
  },
  welcomeContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  welcomeText: {
    fontSize: 14,
    color: '#EEF2FF',
  },
  userName: {
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  syncStatusContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    backgroundColor: '#EEF2FF',
    padding: 8,
    borderRadius: 8,
  },
  syncStatus: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  syncStatusText: {
    fontSize: 12,
    color: '#4B5563',
    marginLeft: 4,
  },
  card: {
    margin: 16,
    marginTop: 8,
    marginBottom: 8,
    elevation: 2,
  },
  alertCard: {
    borderLeftWidth: 4,
    borderLeftColor: '#EF4444',
    backgroundColor: '#FEF2F2',
  },
  alertHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  alertTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#EF4444',
    marginLeft: 8,
  },
  alertDescription: {
    fontSize: 14,
    color: '#1F2937',
    marginBottom: 16,
  },
  alertButton: {
    alignSelf: 'flex-start',
    borderColor: '#EF4444',
  },
  cardTitle: {
    fontSize: 18,
    color: '#1F2937',
    marginBottom: 16,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1F2937',
    marginTop: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#6B7280',
  },
  completionContainer: {
    marginTop: 8,
  },
  completionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  completionTitle: {
    fontSize: 14,
    color: '#4B5563',
  },
  completionPercent: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#4F46E5',
  },
  progressBar: {
    height: 8,
    borderRadius: 4,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  viewAllButton: {
    fontSize: 12,
    color: '#4F46E5',
    marginRight: -8,
  },
  loadingContainer: {
    padding: 32,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 8,
    color: '#6B7280',
  },
  emptyContainer: {
    padding: 32,
    alignItems: 'center',
  },
  emptyText: {
    marginTop: 8,
    marginBottom: 16,
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
  },
  emptyButton: {
    marginTop: 8,
  },
  workoutCard: {
    marginBottom: 8,
    elevation: 1,
  },
  workoutCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  workoutTimeContainer: {
    width: 70,
    alignItems: 'center',
  },
  workoutTime: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  workoutDate: {
    fontSize: 12,
    color: '#6B7280',
  },
  workoutDetails: {
    flex: 1,
    marginLeft: 12,
  },
  workoutTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 4,
  },
  workoutMeta: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  categoryChip: {
    backgroundColor: '#EEF2FF',
    height: 24,
    marginRight: 8,
  },
  chipText: {
    fontSize: 10,
    color: '#4F46E5',
  },
  duration: {
    fontSize: 12,
    color: '#6B7280',
  },
  scheduleButton: {
    marginTop: 16,
    backgroundColor: '#4F46E5',
  },
  recommendationsSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: -8,
    marginBottom: 16,
  },
  recommendationDay: {
    marginBottom: 16,
  },
  recommendationDayTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 8,
  },
  recommendationSlots: {
    flexDirection: 'column',
  },
  recommendationSlot: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    width: width - 64,
    borderLeftWidth: 4,
    borderLeftColor: '#4F46E5',
  },
  recommendationTime: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  recommendationTimeText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#1F2937',
    marginLeft: 4,
  },
  recommendationScore: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  scoreIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 4,
  },
  scoreText: {
    fontSize: 12,
    color: '#4B5563',
  },
  viewAnalyticsButton: {
    alignSelf: 'center',
    marginTop: 8,
  },
});

export default Dashboard;