import React, { useState, useEffect } from 'react';
import { View, StyleSheet, FlatList, TouchableOpacity, RefreshControl } from 'react-native';
import { Text, Card, Chip, Searchbar, Title, Button, ActivityIndicator } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';

// Mock workout data type
interface Workout {
  id: number;
  title: string;
  description: string;
  duration: string;
  category: string;
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced';
  muscles: string[];
  imageUrl?: string;
}

// Mock workout categories
const CATEGORIES = [
  'All',
  'Cardio',
  'Strength',
  'Yoga',
  'HIIT',
  'Recovery',
];

// Mock workout data
const WORKOUTS: Workout[] = [
  {
    id: 1,
    title: 'Morning Cardio Run',
    description: 'A refreshing morning cardio workout to start your day energized',
    duration: '30 min',
    category: 'Cardio',
    difficulty: 'Beginner',
    muscles: ['Legs', 'Core'],
  },
  {
    id: 2,
    title: 'Full Body Strength',
    description: 'Complete strength training routine targeting all major muscle groups',
    duration: '45 min',
    category: 'Strength',
    difficulty: 'Intermediate',
    muscles: ['Chest', 'Back', 'Arms', 'Legs'],
  },
  {
    id: 3,
    title: 'Yoga Flow',
    description: 'Energizing yoga flow to improve flexibility and reduce stress',
    duration: '60 min',
    category: 'Yoga',
    difficulty: 'Beginner',
    muscles: ['Core', 'Back', 'Legs'],
  },
  {
    id: 4,
    title: 'HIIT Burn',
    description: 'High intensity interval training for maximum calorie burn',
    duration: '25 min',
    category: 'HIIT',
    difficulty: 'Advanced',
    muscles: ['Full Body'],
  },
  {
    id: 5,
    title: 'Recovery Stretch',
    description: 'Gentle stretching routine perfect for rest days',
    duration: '20 min',
    category: 'Recovery',
    difficulty: 'Beginner',
    muscles: ['Full Body'],
  },
  {
    id: 6,
    title: 'Upper Body Focus',
    description: 'Targeted strength training for your upper body',
    duration: '40 min',
    category: 'Strength',
    difficulty: 'Intermediate',
    muscles: ['Chest', 'Back', 'Arms', 'Shoulders'],
  },
];

const Workouts = () => {
  const navigation = useNavigation();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [filteredWorkouts, setFilteredWorkouts] = useState(WORKOUTS);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    filterWorkouts();
  }, [searchQuery, selectedCategory]);

  const filterWorkouts = () => {
    setLoading(true);
    
    // Filter by category first
    let result = WORKOUTS;
    if (selectedCategory !== 'All') {
      result = WORKOUTS.filter(workout => 
        workout.category === selectedCategory
      );
    }
    
    // Then filter by search query
    if (searchQuery) {
      const lowercaseQuery = searchQuery.toLowerCase();
      result = result.filter(workout => 
        workout.title.toLowerCase().includes(lowercaseQuery) ||
        workout.description.toLowerCase().includes(lowercaseQuery) ||
        workout.muscles.some(muscle => muscle.toLowerCase().includes(lowercaseQuery))
      );
    }
    
    // Simulate API delay
    setTimeout(() => {
      setFilteredWorkouts(result);
      setLoading(false);
    }, 300);
  };

  const onRefresh = React.useCallback(() => {
    setRefreshing(true);
    
    // Simulate refresh
    setTimeout(() => {
      setRefreshing(false);
    }, 1000);
  }, []);

  const handleWorkoutPress = (workout: Workout) => {
    // Navigate to workout details screen
    navigation.navigate('WorkoutDetail', { workoutId: workout.id });
  };

  const handleScheduleWorkout = (workout: Workout) => {
    // Navigate to schedule workout screen with pre-selected workout
    navigation.navigate('ScheduleWorkout', { workoutId: workout.id });
  };

  const renderCategoryItem = ({ item }) => (
    <Chip
      mode="outlined"
      selected={selectedCategory === item}
      style={[
        styles.categoryChip,
        selectedCategory === item && styles.selectedCategoryChip
      ]}
      textStyle={[
        styles.categoryChipText,
        selectedCategory === item && styles.selectedCategoryChipText
      ]}
      onPress={() => setSelectedCategory(item)}
    >
      {item}
    </Chip>
  );

  const renderWorkoutItem = ({ item }: { item: Workout }) => (
    <Card 
      style={styles.workoutCard}
      onPress={() => handleWorkoutPress(item)}
    >
      <Card.Content>
        <View style={styles.workoutHeader}>
          <View>
            <Title style={styles.workoutTitle}>{item.title}</Title>
            <View style={styles.workoutMeta}>
              <Ionicons name="time-outline" size={14} color="#6B7280" />
              <Text style={styles.metaText}>{item.duration}</Text>
              <Ionicons name="barbell-outline" size={14} color="#6B7280" />
              <Text style={styles.metaText}>{item.difficulty}</Text>
            </View>
          </View>
          <Chip style={styles.categoryChip} textStyle={styles.categoryChipText}>
            {item.category}
          </Chip>
        </View>
        
        <Text style={styles.workoutDescription} numberOfLines={2}>
          {item.description}
        </Text>
        
        <View style={styles.muscleGroupsContainer}>
          {item.muscles.map((muscle, index) => (
            <Chip 
              key={index} 
              style={styles.muscleChip}
              textStyle={styles.muscleChipText}
            >
              {muscle}
            </Chip>
          ))}
        </View>
      </Card.Content>
      <Card.Actions>
        <Button
          mode="text"
          onPress={() => handleWorkoutPress(item)}
        >
          Details
        </Button>
        <Button
          mode="contained"
          onPress={() => handleScheduleWorkout(item)}
          style={styles.scheduleButton}
        >
          Schedule
        </Button>
      </Card.Actions>
    </Card>
  );

  return (
    <View style={styles.container}>
      {/* Search bar */}
      <Searchbar
        placeholder="Search workouts..."
        onChangeText={setSearchQuery}
        value={searchQuery}
        style={styles.searchBar}
      />
      
      {/* Category filter */}
      <View style={styles.categoriesContainer}>
        <FlatList
          data={CATEGORIES}
          renderItem={renderCategoryItem}
          keyExtractor={(item) => item}
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.categoriesList}
        />
      </View>
      
      {/* Workouts list */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4F46E5" />
        </View>
      ) : filteredWorkouts.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="fitness-outline" size={48} color="#9CA3AF" />
          <Text style={styles.emptyStateText}>
            No workouts found for your search.
          </Text>
          <Button 
            mode="outlined" 
            onPress={() => {
              setSearchQuery('');
              setSelectedCategory('All');
            }}
            style={styles.resetButton}
          >
            Reset Filters
          </Button>
        </View>
      ) : (
        <FlatList
          data={filteredWorkouts}
          renderItem={renderWorkoutItem}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.workoutsList}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  searchBar: {
    margin: 16,
    backgroundColor: '#FFFFFF',
    elevation: 2,
  },
  categoriesContainer: {
    marginBottom: 8,
  },
  categoriesList: {
    paddingHorizontal: 16,
  },
  categoryChip: {
    marginRight: 8,
    backgroundColor: '#F3F4F6',
  },
  selectedCategoryChip: {
    backgroundColor: '#EEF2FF',
    borderColor: '#4F46E5',
  },
  categoryChipText: {
    color: '#4B5563',
  },
  selectedCategoryChipText: {
    color: '#4F46E5',
  },
  workoutsList: {
    padding: 16,
    paddingTop: 8,
  },
  workoutCard: {
    marginBottom: 16,
    elevation: 2,
  },
  workoutHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  workoutTitle: {
    fontSize: 18,
    color: '#1F2937',
  },
  workoutMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  metaText: {
    fontSize: 12,
    color: '#6B7280',
    marginLeft: 4,
    marginRight: 8,
  },
  workoutDescription: {
    fontSize: 14,
    color: '#4B5563',
    marginBottom: 12,
  },
  muscleGroupsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  muscleChip: {
    marginRight: 8,
    marginBottom: 8,
    backgroundColor: '#F3F4F6',
    height: 24,
  },
  muscleChipText: {
    fontSize: 10,
    color: '#4B5563',
  },
  scheduleButton: {
    backgroundColor: '#4F46E5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  emptyStateText: {
    marginTop: 16,
    marginBottom: 16,
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
  },
  resetButton: {
    marginTop: 8,
  },
});

export default Workouts;