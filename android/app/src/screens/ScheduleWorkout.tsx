import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Alert } from 'react-native';
import { 
  Text, 
  Title, 
  Button, 
  Card, 
  Chip,
  RadioButton, 
  Divider,
  ActivityIndicator,
  ProgressBar
} from 'react-native-paper';
import { Calendar as CalendarComponent } from 'react-native-calendars';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import { useRoute, useNavigation } from '@react-navigation/native';

// Mock time slot data
interface TimeSlot {
  id: string;
  time: string;
  date: string;
  score?: number;
  available: boolean;
  recommended?: boolean;
}

const ScheduleWorkout = () => {
  const route = useRoute();
  const navigation = useNavigation();
  const { workoutId, date } = route.params || {};
  
  const [selectedWorkout, setSelectedWorkout] = useState<any>(null);
  const [selectedDate, setSelectedDate] = useState<string>(date || '');
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<string>('');
  const [schedulingMethod, setSchedulingMethod] = useState<'smart' | 'manual'>('smart');
  const [loading, setLoading] = useState(false);
  const [findingSlots, setFindingSlots] = useState(false);
  const [availableSlots, setAvailableSlots] = useState<TimeSlot[]>([]);
  
  // Mock workout data
  const WORKOUTS = [
    {
      id: 1,
      title: 'Morning Cardio Run',
      duration: '30 min',
      category: 'Cardio',
      difficulty: 'Beginner',
    },
    {
      id: 2,
      title: 'Full Body Strength',
      duration: '45 min',
      category: 'Strength',
      difficulty: 'Intermediate',
    },
    {
      id: 3,
      title: 'Yoga Flow',
      duration: '60 min',
      category: 'Yoga',
      difficulty: 'Beginner',
    },
  ];

  // Generate mock time slots based on date
  useEffect(() => {
    if (selectedDate && schedulingMethod === 'smart') {
      setFindingSlots(true);
      
      // Simulate API call delay
      setTimeout(() => {
        const slots = generateMockTimeSlots(selectedDate);
        setAvailableSlots(slots);
        setFindingSlots(false);
      }, 1500);
    }
  }, [selectedDate, schedulingMethod]);

  // Find workout by ID
  useEffect(() => {
    if (workoutId) {
      const workout = WORKOUTS.find(w => w.id === workoutId);
      if (workout) {
        setSelectedWorkout(workout);
      }
    }
  }, [workoutId]);

  const generateMockTimeSlots = (date: string): TimeSlot[] => {
    // Create some mock time slots
    const baseDate = new Date(date);
    const slots: TimeSlot[] = [];
    
    // Morning slots
    for (let hour = 6; hour <= 10; hour++) {
      const available = Math.random() > 0.3; // 70% chance of available
      const recommended = available && Math.random() > 0.5; // 50% chance of recommended if available
      const score = recommended ? Math.floor(Math.random() * 30) + 70 : Math.floor(Math.random() * 50) + 20;
      
      slots.push({
        id: `${date}-${hour}`,
        time: `${hour}:00 AM`,
        date,
        available,
        recommended,
        score
      });
    }
    
    // Afternoon and evening slots
    for (let hour = 12; hour <= 20; hour++) {
      const available = Math.random() > 0.3; // 70% chance of available
      const recommended = available && Math.random() > 0.5; // 50% chance of recommended if available
      const score = recommended ? Math.floor(Math.random() * 30) + 70 : Math.floor(Math.random() * 50) + 20;
      
      const formattedHour = hour <= 12 ? `${hour}:00 PM` : `${hour-12}:00 PM`;
      
      slots.push({
        id: `${date}-${hour}`,
        time: formattedHour,
        date,
        available,
        recommended,
        score
      });
    }
    
    return slots.sort((a, b) => {
      if (!a.available && b.available) return 1;
      if (a.available && !b.available) return -1;
      if (a.recommended && !b.recommended) return -1;
      if (!a.recommended && b.recommended) return 1;
      if (a.score && b.score) return b.score - a.score;
      return 0;
    });
  };

  const handleDateSelect = (day) => {
    setSelectedDate(day.dateString);
    setSelectedTimeSlot('');
  };

  const handleSchedule = () => {
    setLoading(true);
    
    // Simulate scheduling process
    setTimeout(() => {
      setLoading(false);
      
      Alert.alert(
        "Workout Scheduled",
        `Your ${selectedWorkout?.title || 'workout'} has been scheduled for ${selectedDate} at ${selectedTimeSlot}.`,
        [
          { 
            text: "OK", 
            onPress: () => navigation.goBack() 
          }
        ]
      );
    }, 1500);
  };

  // Marks for calendar
  const markedDates = {
    [selectedDate]: { selected: true, selectedColor: '#4F46E5' }
  };

  return (
    <ScrollView style={styles.container}>
      <Card style={styles.card}>
        <Card.Content>
          <Title style={styles.title}>Schedule Workout</Title>
          
          {/* Scheduling Method Selection */}
          <View style={styles.schedulingMethods}>
            <RadioButton.Group 
              onValueChange={(value) => setSchedulingMethod(value as 'smart' | 'manual')} 
              value={schedulingMethod}
            >
              <View style={styles.methodCard}>
                <View style={styles.methodContent}>
                  <RadioButton value="smart" color="#4F46E5" />
                  <View style={styles.methodInfo}>
                    <Text style={styles.methodTitle}>Smart Scheduling</Text>
                    <Text style={styles.methodDescription}>
                      Find the best time slots based on your calendar
                    </Text>
                  </View>
                </View>
                <Ionicons name="calendar" size={24} color="#4F46E5" />
              </View>
              
              <View style={styles.methodCard}>
                <View style={styles.methodContent}>
                  <RadioButton value="manual" color="#4F46E5" />
                  <View style={styles.methodInfo}>
                    <Text style={styles.methodTitle}>Manual Scheduling</Text>
                    <Text style={styles.methodDescription}>
                      Choose your own time for the workout
                    </Text>
                  </View>
                </View>
                <Ionicons name="time-outline" size={24} color="#4F46E5" />
              </View>
            </RadioButton.Group>
          </View>
          
          {/* Workout Selection Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Select Workout</Text>
            {WORKOUTS.map((workout) => (
              <View 
                key={workout.id}
                style={[
                  styles.workoutItem,
                  selectedWorkout?.id === workout.id && styles.selectedWorkoutItem
                ]}
              >
                <RadioButton
                  value={workout.id.toString()}
                  status={selectedWorkout?.id === workout.id ? 'checked' : 'unchecked'}
                  onPress={() => setSelectedWorkout(workout)}
                  color="#4F46E5"
                />
                <View style={styles.workoutInfo}>
                  <Text style={styles.workoutTitle}>{workout.title}</Text>
                  <View style={styles.workoutMeta}>
                    <Text style={styles.metaText}>{workout.duration}</Text>
                    <Chip style={styles.categoryChip} textStyle={styles.chipText}>
                      {workout.category}
                    </Chip>
                    <Chip style={styles.difficultyChip} textStyle={styles.chipText}>
                      {workout.difficulty}
                    </Chip>
                  </View>
                </View>
              </View>
            ))}
          </View>
          
          <Divider style={styles.divider} />
          
          {/* Date Selection */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Select Date</Text>
            <CalendarComponent
              onDayPress={handleDateSelect}
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
          </View>
          
          <Divider style={styles.divider} />
          
          {/* Time Selection */}
          {selectedDate && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Select Time</Text>
              
              {schedulingMethod === 'smart' ? (
                // Smart Scheduling - Show available time slots
                <>
                  {findingSlots ? (
                    <View style={styles.loadingContainer}>
                      <ActivityIndicator color="#4F46E5" size="large" />
                      <Text style={styles.loadingText}>Finding available slots...</Text>
                      <ProgressBar 
                        progress={0.6} 
                        color="#4F46E5" 
                        style={styles.progressBar} 
                      />
                    </View>
                  ) : availableSlots.length > 0 ? (
                    <View style={styles.timeSlotsList}>
                      {availableSlots.map((slot) => (
                        <TouchableOpacity
                          key={slot.id}
                          onPress={() => setSelectedTimeSlot(slot.time)}
                          disabled={!slot.available}
                        >
                          <View 
                            style={[
                              styles.timeSlot,
                              !slot.available && styles.unavailableTimeSlot,
                              selectedTimeSlot === slot.time && styles.selectedTimeSlot,
                              slot.recommended && styles.recommendedTimeSlot
                            ]}
                          >
                            <Text 
                              style={[
                                styles.timeSlotText,
                                !slot.available && styles.unavailableTimeSlotText,
                                selectedTimeSlot === slot.time && styles.selectedTimeSlotText
                              ]}
                            >
                              {slot.time}
                            </Text>
                            {slot.available && slot.score && (
                              <View style={styles.scoreContainer}>
                                <Text style={styles.scoreText}>{slot.score}%</Text>
                              </View>
                            )}
                            {slot.recommended && (
                              <View style={styles.recommendedBadge}>
                                <Ionicons name="star" size={12} color="#FFFFFF" />
                              </View>
                            )}
                          </View>
                        </TouchableOpacity>
                      ))}
                    </View>
                  ) : (
                    <Text style={styles.noSlotsText}>
                      No available time slots for this date. Try another date.
                    </Text>
                  )}
                </>
              ) : (
                // Manual Scheduling - Show time picker
                <View style={styles.manualTimeContainer}>
                  <Text style={styles.timePickerLabel}>
                    Select start time for your workout:
                  </Text>
                  <DateTimePicker
                    value={new Date()}
                    mode="time"
                    is24Hour={false}
                    display="default"
                    onChange={(event, date) => {
                      if (date) {
                        const hours = date.getHours();
                        const minutes = date.getMinutes();
                        const period = hours >= 12 ? 'PM' : 'AM';
                        const formattedHours = hours % 12 || 12;
                        const formattedMinutes = minutes < 10 ? `0${minutes}` : minutes;
                        setSelectedTimeSlot(`${formattedHours}:${formattedMinutes} ${period}`);
                      }
                    }}
                  />
                  {selectedTimeSlot && (
                    <Text style={styles.selectedTimeText}>
                      Selected time: {selectedTimeSlot}
                    </Text>
                  )}
                </View>
              )}
            </View>
          )}
          
          {/* Schedule Button */}
          <Button
            mode="contained"
            onPress={handleSchedule}
            disabled={loading || !selectedWorkout || !selectedDate || !selectedTimeSlot}
            loading={loading}
            style={[
              styles.scheduleButton,
              (!selectedWorkout || !selectedDate || !selectedTimeSlot) && styles.disabledButton
            ]}
          >
            Schedule Workout
          </Button>
        </Card.Content>
      </Card>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  card: {
    margin: 16,
    elevation: 2,
  },
  title: {
    fontSize: 20,
    color: '#1F2937',
    marginBottom: 24,
  },
  schedulingMethods: {
    marginBottom: 24,
  },
  methodCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  methodContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  methodInfo: {
    marginLeft: 12,
  },
  methodTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  methodDescription: {
    fontSize: 12,
    color: '#6B7280',
  },
  section: {
    marginVertical: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 12,
  },
  workoutItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  selectedWorkoutItem: {
    borderColor: '#4F46E5',
    backgroundColor: '#EEF2FF',
  },
  workoutInfo: {
    marginLeft: 12,
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
    flexWrap: 'wrap',
    alignItems: 'center',
  },
  metaText: {
    fontSize: 12,
    color: '#6B7280',
    marginRight: 8,
  },
  categoryChip: {
    backgroundColor: '#EEF2FF',
    height: 24,
    marginRight: 8,
  },
  difficultyChip: {
    backgroundColor: '#F3F4F6',
    height: 24,
  },
  chipText: {
    fontSize: 10,
  },
  divider: {
    marginVertical: 16,
  },
  timeSlotsList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 8,
  },
  timeSlot: {
    width: 100,
    padding: 12,
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    marginRight: 8,
    marginBottom: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  unavailableTimeSlot: {
    backgroundColor: '#F3F4F6',
    borderColor: '#D1D5DB',
  },
  selectedTimeSlot: {
    borderColor: '#4F46E5',
    backgroundColor: '#EEF2FF',
  },
  recommendedTimeSlot: {
    borderColor: '#4F46E5',
  },
  timeSlotText: {
    fontSize: 14,
    color: '#1F2937',
  },
  unavailableTimeSlotText: {
    color: '#9CA3AF',
  },
  selectedTimeSlotText: {
    color: '#4F46E5',
    fontWeight: 'bold',
  },
  scoreContainer: {
    marginTop: 4,
  },
  scoreText: {
    fontSize: 12,
    color: '#4B5563',
  },
  recommendedBadge: {
    position: 'absolute',
    top: -5,
    right: -5,
    backgroundColor: '#4F46E5',
    borderRadius: 10,
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  manualTimeContainer: {
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  timePickerLabel: {
    fontSize: 14,
    color: '#4B5563',
    marginBottom: 16,
  },
  selectedTimeText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#4F46E5',
    marginTop: 16,
  },
  scheduleButton: {
    marginTop: 24,
    backgroundColor: '#4F46E5',
    paddingVertical: 8,
  },
  disabledButton: {
    backgroundColor: '#D1D5DB',
  },
  loadingContainer: {
    padding: 24,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 14,
    color: '#4B5563',
  },
  progressBar: {
    height: 4,
    marginTop: 16,
    width: '100%',
  },
  noSlotsText: {
    padding: 24,
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
  },
});

export default ScheduleWorkout;