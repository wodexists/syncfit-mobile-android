import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, Dimensions } from 'react-native';
import { Text, Card, Button, Title, ProgressBar, Chip, ActivityIndicator } from 'react-native-paper';
import { Calendar as CalendarComponent, DateData } from 'react-native-calendars';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { StackNavigationProp } from '@react-navigation/stack';

// Mock time slot data to demonstrate the UI without requiring authentication
interface TimeSlot {
  id: string;
  time: string;
  available: boolean;
  score?: number;
  recommended?: boolean;
}

const CalendarDemo = () => {
  const navigation = useNavigation<StackNavigationProp<any>>();
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);
  const [isLoadingSlots, setIsLoadingSlots] = useState(false);
  const [smartSchedulingEnabled, setSmartSchedulingEnabled] = useState(true);
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<TimeSlot | null>(null);
  const [isCreatingEvent, setIsCreatingEvent] = useState(false);
  const [eventCreationSuccess, setEventCreationSuccess] = useState(false);
  const [createdEventId, setCreatedEventId] = useState<string | null>(null);
  
  // Generate demo time slots for the selected date
  useEffect(() => {
    if (selectedDate) {
      setIsLoadingSlots(true);
      
      // Simulate API delay
      setTimeout(() => {
        const slots = generateDemoTimeSlots(selectedDate);
        setTimeSlots(slots);
        setIsLoadingSlots(false);
      }, 800);
    }
  }, [selectedDate, smartSchedulingEnabled]);
  
  // Mark selected date on calendar
  const markedDates = {
    [selectedDate]: { selected: true, selectedColor: '#4F46E5' }
  };
  
  // Handle date selection
  const onDayPress = (day: DateData) => {
    setSelectedDate(day.dateString);
  };
  
  // Generate demo time slots based on date
  const generateDemoTimeSlots = (date: string): TimeSlot[] => {
    const slots: TimeSlot[] = [];
    
    // Morning slots (7 AM - 11 AM)
    for (let hour = 7; hour <= 11; hour++) {
      const available = Math.random() > 0.3; // 70% chance of available
      const recommended = smartSchedulingEnabled && available && Math.random() > 0.5; // 50% chance of recommended if available and smart scheduling is on
      const score = smartSchedulingEnabled && available 
        ? (recommended ? Math.floor(Math.random() * 30) + 70 : Math.floor(Math.random() * 50) + 20)
        : undefined;
      
      slots.push({
        id: `${date}-${hour}`,
        time: `${hour}:00 AM`,
        available,
        recommended,
        score
      });
    }
    
    // Afternoon slots (12 PM - 6 PM)
    for (let hour = 12; hour <= 18; hour++) {
      const available = Math.random() > 0.3; // 70% chance of available
      const recommended = smartSchedulingEnabled && available && Math.random() > 0.5; // 50% chance of recommended if available and smart scheduling is on
      const score = smartSchedulingEnabled && available 
        ? (recommended ? Math.floor(Math.random() * 30) + 70 : Math.floor(Math.random() * 50) + 20)
        : undefined;
      
      const displayHour = hour > 12 ? hour - 12 : hour;
      const ampm = hour >= 12 ? 'PM' : 'AM';
      
      slots.push({
        id: `${date}-${hour}`,
        time: `${displayHour}:00 ${ampm}`,
        available,
        recommended,
        score
      });
    }
    
    // Sort slots: available first, then by recommendation and score
    return slots.sort((a, b) => {
      if (!a.available && b.available) return 1;
      if (a.available && !b.available) return -1;
      if (smartSchedulingEnabled) {
        if (a.recommended && !b.recommended) return -1;
        if (!a.recommended && b.recommended) return 1;
        if (a.score && b.score) return b.score - a.score;
      }
      return 0;
    });
  };
  
  // Handle back to login
  const handleBackToLogin = () => {
    navigation.goBack();
  };
  
  // Format date for display
  const formatSelectedDate = () => {
    if (!selectedDate) return '';
    
    const date = new Date(selectedDate);
    return date.toLocaleDateString('en-US', { 
      weekday: 'long', 
      month: 'long', 
      day: 'numeric' 
    });
  };
  
  // Handle time slot selection
  const handleTimeSlotSelect = (timeSlot: TimeSlot) => {
    if (!timeSlot.available) return;
    
    setSelectedTimeSlot(timeSlot);
    setEventCreationSuccess(false);
    setCreatedEventId(null);
  };
  
  // Handle creating a workout event
  const handleCreateWorkout = async () => {
    if (!selectedTimeSlot) return;
    
    setIsCreatingEvent(true);
    
    try {
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // In a real app, this would call an API to create the event
      // For the demo, we'll simulate a successful event creation
      const mockEventId = `event-${Date.now()}`;
      setCreatedEventId(mockEventId);
      setEventCreationSuccess(true);
    } catch (error) {
      console.error('Error creating workout event:', error);
    } finally {
      setIsCreatingEvent(false);
    }
  };
  
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Button
          icon={({ size, color }) => (
            <Ionicons name="arrow-back" size={size} color={color} />
          )}
          onPress={handleBackToLogin}
          mode="text"
        >
          Back
        </Button>
        <Text style={styles.demoText}>Calendar Demo</Text>
      </View>
      
      <ScrollView>
        {/* Calendar Component */}
        <Card style={styles.card}>
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
        
        {/* Smart Scheduling Toggle */}
        <Card style={styles.card}>
          <Card.Content>
            <View style={styles.toggleContainer}>
              <View style={styles.toggleInfo}>
                <Ionicons 
                  name="bulb-outline" 
                  size={24} 
                  color={smartSchedulingEnabled ? '#4F46E5' : '#9CA3AF'} 
                />
                <View style={styles.toggleTextContainer}>
                  <Text style={styles.toggleTitle}>Smart Scheduling</Text>
                  <Text style={styles.toggleDescription}>
                    Recommend optimal time slots based on your calendar and past behavior
                  </Text>
                </View>
              </View>
              <TouchableOpacity
                style={[
                  styles.toggle,
                  smartSchedulingEnabled ? styles.toggleOn : styles.toggleOff
                ]}
                onPress={() => setSmartSchedulingEnabled(!smartSchedulingEnabled)}
              >
                <View 
                  style={[
                    styles.toggleThumb,
                    smartSchedulingEnabled ? styles.toggleThumbOn : styles.toggleThumbOff
                  ]} 
                />
              </TouchableOpacity>
            </View>
          </Card.Content>
        </Card>
        
        {/* Available Time Slots */}
        <Card style={styles.card}>
          <Card.Content>
            <Title style={styles.title}>{formatSelectedDate()}</Title>
            <Text style={styles.subtitle}>Available Time Slots</Text>
            
            {isLoadingSlots ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator color="#4F46E5" size="large" />
                <Text style={styles.loadingText}>Finding available slots...</Text>
                <ProgressBar 
                  progress={0.6} 
                  color="#4F46E5" 
                  style={styles.progressBar} 
                />
              </View>
            ) : (
              <View style={styles.timeSlotsContainer}>
                {timeSlots.map((slot) => (
                  <TouchableOpacity
                    key={slot.id}
                    style={[
                      styles.timeSlot,
                      !slot.available && styles.unavailableSlot,
                      slot.recommended && styles.recommendedSlot,
                      selectedTimeSlot?.id === slot.id && styles.selectedTimeSlot
                    ]}
                    disabled={!slot.available}
                    onPress={() => handleTimeSlotSelect(slot)}
                  >
                    <Text 
                      style={[
                        styles.timeSlotText,
                        !slot.available && styles.unavailableSlotText
                      ]}
                    >
                      {slot.time}
                    </Text>
                    
                    {smartSchedulingEnabled && slot.available && slot.score !== undefined && (
                      <View style={styles.scoreContainer}>
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
                    )}
                    
                    {slot.recommended && (
                      <View style={styles.recommendedBadge}>
                        <Ionicons name="star" size={12} color="#FFFFFF" />
                      </View>
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </Card.Content>
        </Card>
        
        {/* Create Workout Event Section */}
        {selectedTimeSlot && (
          <Card style={styles.card}>
            <Card.Content>
              <View style={styles.stepHeader}>
                <View style={styles.stepBadge}>
                  <Text style={styles.stepNumber}>5</Text>
                </View>
                <Text style={styles.stepTitle}>Create Workout Event</Text>
              </View>
              
              <View style={styles.workoutEventCard}>
                <Text style={styles.workoutTitle}>HIIT Workout</Text>
                <View style={styles.workoutDetailsRow}>
                  <Ionicons name="calendar-outline" size={16} color="#6B7280" />
                  <Text style={styles.workoutDetailsText}>{selectedDate}</Text>
                </View>
                <View style={styles.workoutDetailsRow}>
                  <Ionicons name="time-outline" size={16} color="#6B7280" />
                  <Text style={styles.workoutDetailsText}>{selectedTimeSlot.time}</Text>
                </View>
                
                <Button
                  mode="contained"
                  onPress={handleCreateWorkout}
                  disabled={isCreatingEvent}
                  loading={isCreatingEvent}
                  style={styles.createButton}
                >
                  Create Workout Event
                </Button>
                
                {eventCreationSuccess && createdEventId && (
                  <View style={styles.successMessage}>
                    <Ionicons name="checkmark-circle" size={20} color="#10B981" />
                    <Text style={styles.successText}>
                      Workout created successfully!
                    </Text>
                  </View>
                )}
              </View>
            </Card.Content>
          </Card>
        )}
        
        {/* Info Card */}
        <Card style={[styles.card, styles.infoCard]}>
          <Card.Content>
            <View style={styles.infoHeader}>
              <Ionicons name="information-circle-outline" size={24} color="#4F46E5" />
              <Text style={styles.infoTitle}>Demo Features</Text>
            </View>
            <Text style={styles.infoText}>
              This is a demonstration of SyncFit's intelligent scheduling features. In the full app:
            </Text>
            <View style={styles.featureList}>
              <View style={styles.featureItem}>
                <Ionicons name="checkmark-circle" size={16} color="#10B981" />
                <Text style={styles.featureText}>Connect with your real Google Calendar</Text>
              </View>
              <View style={styles.featureItem}>
                <Ionicons name="checkmark-circle" size={16} color="#10B981" />
                <Text style={styles.featureText}>Schedule workouts in available time slots</Text>
              </View>
              <View style={styles.featureItem}>
                <Ionicons name="checkmark-circle" size={16} color="#10B981" />
                <Text style={styles.featureText}>Get personalized time slot recommendations</Text>
              </View>
              <View style={styles.featureItem}>
                <Ionicons name="checkmark-circle" size={16} color="#10B981" />
                <Text style={styles.featureText}>Track your workout progress and stats</Text>
              </View>
            </View>
            <Button 
              mode="contained" 
              style={styles.signupButton}
              onPress={handleBackToLogin}
            >
              Sign Up to Get Started
            </Button>
          </Card.Content>
        </Card>
      </ScrollView>
    </View>
  );
};

const { width } = Dimensions.get('window');

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
  },
  demoText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1F2937',
    marginLeft: 8,
  },
  card: {
    margin: 16,
    marginTop: 8,
    marginBottom: 8,
    elevation: 2,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: '#6B7280',
    marginBottom: 16,
  },
  toggleContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  toggleInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  toggleTextContainer: {
    marginLeft: 12,
    flex: 1,
  },
  toggleTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  toggleDescription: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
    flexWrap: 'wrap',
  },
  toggle: {
    width: 50,
    height: 30,
    borderRadius: 15,
    padding: 2,
  },
  toggleOn: {
    backgroundColor: '#4F46E5',
  },
  toggleOff: {
    backgroundColor: '#D1D5DB',
  },
  toggleThumb: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#FFFFFF',
  },
  toggleThumbOn: {
    marginLeft: 'auto',
  },
  toggleThumbOff: {
    marginRight: 'auto',
  },
  timeSlotsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 8,
  },
  timeSlot: {
    width: (width - 64) / 3,
    padding: 12,
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    marginRight: 8,
    marginBottom: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  unavailableSlot: {
    backgroundColor: '#F3F4F6',
    borderColor: '#D1D5DB',
  },
  recommendedSlot: {
    borderColor: '#4F46E5',
    borderWidth: 2,
  },
  selectedTimeSlot: {
    backgroundColor: '#EEF2FF',
    borderColor: '#4F46E5',
    borderWidth: 2,
  },
  timeSlotText: {
    fontSize: 14,
    color: '#1F2937',
    marginBottom: 4,
    fontWeight: '500',
  },
  unavailableSlotText: {
    color: '#9CA3AF',
  },
  scoreContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  scoreIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 4,
  },
  scoreText: {
    fontSize: 10,
    color: '#6B7280',
  },
  recommendedBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#4F46E5',
    borderRadius: 10,
    width: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  loadingText: {
    marginTop: 16,
    marginBottom: 12,
    color: '#6B7280',
  },
  progressBar: {
    width: '60%',
    height: 4,
    marginTop: 8,
  },
  // Step and workout event styles
  stepHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  stepBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#4F46E5',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  stepNumber: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
  },
  stepTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  workoutEventCard: {
    backgroundColor: '#F0F9FF',
    borderRadius: 8,
    padding: 16,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  workoutTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 12,
  },
  workoutDetailsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  workoutDetailsText: {
    fontSize: 14,
    color: '#4B5563',
    marginLeft: 8,
  },
  createButton: {
    backgroundColor: '#4F46E5',
    marginTop: 16,
  },
  successMessage: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#D1FAE5',
    borderRadius: 8,
    padding: 12,
    marginTop: 16,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  successText: {
    fontSize: 14,
    color: '#065F46',
    marginLeft: 8,
  },
  infoCard: {
    backgroundColor: '#EEF2FF',
    marginBottom: 24,
  },
  infoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#4F46E5',
    marginLeft: 8,
  },
  infoText: {
    fontSize: 14,
    color: '#1F2937',
    marginBottom: 16,
  },
  featureList: {
    marginBottom: 16,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  featureText: {
    fontSize: 14,
    color: '#4B5563',
    marginLeft: 8,
  },
  signupButton: {
    backgroundColor: '#4F46E5',
  },
});

export default CalendarDemo;