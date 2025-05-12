import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, RefreshControl } from 'react-native';
import { Text, Card, Button, Title, FAB, Divider, Chip } from 'react-native-paper';
import { Calendar as CalendarComponent, DateData } from 'react-native-calendars';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';

const Calendar = () => {
  const navigation = useNavigation();
  const [selectedDate, setSelectedDate] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  
  // Sample workout data
  const [workouts, setWorkouts] = useState({
    '2025-05-12': [
      { id: 1, title: 'Morning Cardio', time: '8:00 AM', duration: '30 min', category: 'Cardio' },
      { id: 2, title: 'Evening Yoga', time: '6:00 PM', duration: '45 min', category: 'Yoga' }
    ],
    '2025-05-15': [
      { id: 3, title: 'Upper Body Strength', time: '5:30 PM', duration: '45 min', category: 'Strength' }
    ],
    '2025-05-18': [
      { id: 4, title: 'HIIT Session', time: '9:00 AM', duration: '25 min', category: 'HIIT' }
    ]
  });

  // Sample marked dates for calendar
  const markedDates = {
    '2025-05-12': { marked: true, dotColor: '#4F46E5' },
    '2025-05-15': { marked: true, dotColor: '#4F46E5' },
    '2025-05-18': { marked: true, dotColor: '#4F46E5' },
    [selectedDate]: { selected: true, selectedColor: '#4F46E5' }
  };

  const onDayPress = (day: DateData) => {
    setSelectedDate(day.dateString);
  };

  const onRefresh = React.useCallback(() => {
    setRefreshing(true);
    
    // Simulate refresh
    setTimeout(() => {
      setRefreshing(false);
    }, 1000);
  }, []);

  const handleScheduleWorkout = () => {
    navigation.navigate('ScheduleWorkout', { date: selectedDate });
  };

  const getSelectedDateWorkouts = () => {
    return workouts[selectedDate] || [];
  };

  // Format date for header
  const formatSelectedDate = () => {
    if (!selectedDate) return '';
    
    const date = new Date(selectedDate);
    return date.toLocaleDateString('en-US', { 
      weekday: 'long', 
      month: 'long', 
      day: 'numeric' 
    });
  };

  return (
    <View style={styles.container}>
      <ScrollView
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Calendar component */}
        <Card style={styles.calendarCard}>
          <CalendarComponent
            onDayPress={onDayPress}
            markedDates={markedDates}
            theme={{
              calendarBackground: '#FFFFFF',
              textSectionTitleColor: '#6B7280',
              selectedDayBackgroundColor: '#4F46E5',
              selectedDayTextColor: '#FFFFFF',
              todayTextColor: '#4F46E5',
              dayTextColor: '#1F2937',
              textDisabledColor: '#D1D5DB',
              dotColor: '#4F46E5',
              arrowColor: '#4F46E5',
              monthTextColor: '#1F2937',
              indicatorColor: '#4F46E5',
            }}
          />
        </Card>

        {/* Workouts for selected date */}
        {selectedDate ? (
          <Card style={styles.workoutsCard}>
            <Card.Content>
              <Title style={styles.dateTitle}>{formatSelectedDate()}</Title>
              
              {getSelectedDateWorkouts().length === 0 ? (
                <View style={styles.emptyState}>
                  <Ionicons name="calendar-outline" size={40} color="#9CA3AF" />
                  <Text style={styles.emptyStateText}>No workouts scheduled</Text>
                  <Button 
                    mode="outlined" 
                    onPress={handleScheduleWorkout}
                    style={styles.emptyStateButton}
                  >
                    Schedule for this day
                  </Button>
                </View>
              ) : (
                <>
                  <Text style={styles.subtitle}>Scheduled Workouts</Text>
                  {getSelectedDateWorkouts().map((workout, index) => (
                    <React.Fragment key={workout.id}>
                      <View style={styles.workoutItem}>
                        <View style={styles.workoutTimeContainer}>
                          <Text style={styles.workoutTime}>{workout.time}</Text>
                          <Chip style={styles.categoryChip} textStyle={styles.categoryText}>
                            {workout.category}
                          </Chip>
                        </View>
                        <View style={styles.workoutDetails}>
                          <Text style={styles.workoutTitle}>{workout.title}</Text>
                          <View style={styles.workoutMeta}>
                            <Ionicons name="time-outline" size={14} color="#6B7280" />
                            <Text style={styles.metaText}>{workout.duration}</Text>
                          </View>
                        </View>
                      </View>
                      {index < getSelectedDateWorkouts().length - 1 && <Divider />}
                    </React.Fragment>
                  ))}
                </>
              )}
            </Card.Content>
          </Card>
        ) : (
          <Card style={styles.workoutsCard}>
            <Card.Content>
              <View style={styles.emptyState}>
                <Ionicons name="calendar-outline" size={40} color="#9CA3AF" />
                <Text style={styles.emptyStateText}>Select a date to view workouts</Text>
              </View>
            </Card.Content>
          </Card>
        )}
      </ScrollView>

      {/* FAB for adding workout */}
      <FAB
        style={styles.fab}
        icon="plus"
        color="#FFFFFF"
        onPress={handleScheduleWorkout}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  calendarCard: {
    margin: 16,
    elevation: 2,
  },
  workoutsCard: {
    margin: 16,
    marginTop: 0,
    elevation: 2,
  },
  dateTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 16,
  },
  subtitle: {
    fontSize: 16,
    color: '#4B5563',
    marginBottom: 12,
  },
  workoutItem: {
    flexDirection: 'row',
    paddingVertical: 12,
    alignItems: 'center',
  },
  workoutTimeContainer: {
    width: 100,
  },
  workoutTime: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 4,
  },
  categoryChip: {
    backgroundColor: '#EEF2FF',
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryText: {
    fontSize: 10,
    color: '#4F46E5',
  },
  workoutDetails: {
    flex: 1,
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
  metaText: {
    fontSize: 12,
    color: '#6B7280',
    marginLeft: 4,
  },
  emptyState: {
    alignItems: 'center',
    padding: 24,
  },
  emptyStateText: {
    marginTop: 8,
    marginBottom: 12,
    fontSize: 14,
    color: '#6B7280',
  },
  emptyStateButton: {
    marginTop: 8,
  },
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 0,
    backgroundColor: '#4F46E5',
  },
});

export default Calendar;