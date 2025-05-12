import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Image, Dimensions } from 'react-native';
import { 
  Text, 
  Title, 
  Paragraph, 
  Button, 
  Card, 
  Chip, 
  Divider, 
  List 
} from 'react-native-paper';
import { useRoute, useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';

const { width } = Dimensions.get('window');

// Define workout details interface
interface WorkoutDetails {
  id: number;
  title: string;
  description: string;
  duration: string;
  category: string;
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced';
  calories: string;
  muscles: string[];
  equipment: string[];
  steps: { title: string; description: string }[];
  imageUrl?: string;
}

const WorkoutDetail = () => {
  const route = useRoute();
  const navigation = useNavigation();
  const { workoutId } = route.params || {};
  
  const [workout, setWorkout] = useState<WorkoutDetails | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Fetch workout details
  useEffect(() => {
    setLoading(true);
    
    // Mock API call
    setTimeout(() => {
      // Sample workout data
      const mockWorkoutDetails: WorkoutDetails = {
        id: parseInt(workoutId) || 1,
        title: 'Morning Cardio Run',
        description: 'A refreshing morning cardio workout designed to boost your energy levels and kickstart your metabolism. This workout combines running intervals with dynamic stretches for a complete cardio session.',
        duration: '30 min',
        category: 'Cardio',
        difficulty: 'Beginner',
        calories: '250-300',
        muscles: ['Legs', 'Core', 'Cardiovascular System'],
        equipment: ['Running Shoes', 'Water Bottle', 'Optional: Fitness Tracker'],
        steps: [
          {
            title: 'Warm Up (5 minutes)',
            description: 'Begin with a brisk walk for 2 minutes, followed by light jogging for 3 minutes to prepare your body for exercise.'
          },
          {
            title: 'Running Intervals (20 minutes)',
            description: 'Alternate between 2 minutes of moderate-paced running and 1 minute of fast walking. Complete 6-7 cycles.'
          },
          {
            title: 'Cool Down (5 minutes)',
            description: 'Gradually reduce your pace to a slow walk. Perform static stretches for your calves, hamstrings, and quadriceps.'
          }
        ],
        imageUrl: 'https://images.unsplash.com/photo-1476480862126-209bfaa8edc8?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=1050&q=80'
      };
      
      setWorkout(mockWorkoutDetails);
      setLoading(false);
    }, 1000);
  }, [workoutId]);

  const handleSchedule = () => {
    if (!workout) return;
    navigation.navigate('ScheduleWorkout', { workoutId: workout.id });
  };

  // Loading state or no workout
  if (loading || !workout) {
    return (
      <View style={styles.loadingContainer}>
        <Title>Loading workout details...</Title>
      </View>
    );
  }

  // Difficulty color
  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'Beginner':
        return '#10B981'; // Green
      case 'Intermediate':
        return '#F59E0B'; // Amber
      case 'Advanced':
        return '#EF4444'; // Red
      default:
        return '#6B7280'; // Gray
    }
  };

  return (
    <ScrollView style={styles.container}>
      {/* Workout Image */}
      {workout.imageUrl && (
        <Image 
          source={{ uri: workout.imageUrl }} 
          style={styles.workoutImage}
          resizeMode="cover"
        />
      )}
      
      {/* Workout Information */}
      <Card style={styles.card}>
        <Card.Content>
          <Title style={styles.title}>{workout.title}</Title>
          
          <View style={styles.tagsContainer}>
            <Chip 
              style={[styles.chip, { backgroundColor: '#EEF2FF' }]} 
              textStyle={{ color: '#4F46E5' }}
            >
              {workout.category}
            </Chip>
            
            <Chip 
              style={[styles.chip, { backgroundColor: '#F3F4F6' }]} 
              textStyle={{ color: getDifficultyColor(workout.difficulty) }}
            >
              {workout.difficulty}
            </Chip>
            
            <Chip 
              style={[styles.chip, { backgroundColor: '#F3F4F6' }]} 
              textStyle={{ color: '#6B7280' }}
            >
              {workout.duration}
            </Chip>
            
            <Chip 
              style={[styles.chip, { backgroundColor: '#FEF2F2' }]} 
              textStyle={{ color: '#EF4444' }}
              icon="fire"
            >
              {workout.calories} cal
            </Chip>
          </View>
          
          <Paragraph style={styles.description}>
            {workout.description}
          </Paragraph>
          
          <Divider style={styles.divider} />
          
          {/* Muscle Groups */}
          <View style={styles.sectionContainer}>
            <Text style={styles.sectionTitle}>Target Muscle Groups</Text>
            <View style={styles.muscleGroupsContainer}>
              {workout.muscles.map((muscle, index) => (
                <Chip 
                  key={index} 
                  style={styles.muscleChip}
                  textStyle={styles.muscleChipText}
                >
                  {muscle}
                </Chip>
              ))}
            </View>
          </View>
          
          <Divider style={styles.divider} />
          
          {/* Equipment Needed */}
          <View style={styles.sectionContainer}>
            <Text style={styles.sectionTitle}>Equipment Needed</Text>
            <View style={styles.equipmentContainer}>
              {workout.equipment.map((item, index) => (
                <View key={index} style={styles.equipmentItem}>
                  <Ionicons name="checkmark-circle" size={18} color="#10B981" />
                  <Text style={styles.equipmentText}>{item}</Text>
                </View>
              ))}
            </View>
          </View>
          
          <Divider style={styles.divider} />
          
          {/* Workout Steps */}
          <View style={styles.sectionContainer}>
            <Text style={styles.sectionTitle}>Workout Steps</Text>
            {workout.steps.map((step, index) => (
              <List.Item
                key={index}
                title={`${index + 1}. ${step.title}`}
                description={step.description}
                titleStyle={styles.stepTitle}
                descriptionStyle={styles.stepDescription}
                descriptionNumberOfLines={5}
                left={(props) => (
                  <List.Icon 
                    {...props} 
                    icon={({ size, color }) => (
                      <View style={styles.stepNumber}>
                        <Text style={styles.stepNumberText}>{index + 1}</Text>
                      </View>
                    )} 
                  />
                )}
                style={styles.stepItem}
              />
            ))}
          </View>
        </Card.Content>
        
        <Card.Actions style={styles.cardActions}>
          <Button 
            icon="share-variant" 
            mode="outlined" 
            onPress={() => console.log('Share pressed')}
            style={styles.shareButton}
          >
            Share
          </Button>
          <Button 
            icon="calendar-plus" 
            mode="contained" 
            onPress={handleSchedule}
            style={styles.scheduleButton}
          >
            Schedule
          </Button>
        </Card.Actions>
      </Card>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  workoutImage: {
    width: width,
    height: width * 0.6,
  },
  card: {
    margin: 16,
    marginTop: -40,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    elevation: 4,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 16,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 16,
  },
  chip: {
    marginRight: 8,
    marginBottom: 8,
  },
  description: {
    fontSize: 16,
    lineHeight: 24,
    color: '#4B5563',
  },
  divider: {
    marginVertical: 16,
  },
  sectionContainer: {
    marginVertical: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 12,
  },
  muscleGroupsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  muscleChip: {
    marginRight: 8,
    marginBottom: 8,
    backgroundColor: '#EEF2FF',
  },
  muscleChipText: {
    color: '#4F46E5',
  },
  equipmentContainer: {
    marginTop: 8,
  },
  equipmentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  equipmentText: {
    fontSize: 16,
    color: '#4B5563',
    marginLeft: 8,
  },
  stepItem: {
    paddingVertical: 8,
    backgroundColor: '#F9FAFB',
    marginBottom: 8,
    borderRadius: 8,
  },
  stepNumber: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#EEF2FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepNumberText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#4F46E5',
  },
  stepTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  stepDescription: {
    fontSize: 14,
    color: '#4B5563',
    lineHeight: 20,
  },
  cardActions: {
    padding: 16,
    justifyContent: 'space-between',
  },
  shareButton: {
    flex: 1,
    marginRight: 8,
  },
  scheduleButton: {
    flex: 2,
    backgroundColor: '#4F46E5',
  },
});

export default WorkoutDetail;