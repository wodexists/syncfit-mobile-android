import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, Dimensions, RefreshControl } from 'react-native';
import { Text, Card, Title, Chip, Button } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import { LineChart, BarChart, PieChart } from 'react-native-chart-kit';

const { width } = Dimensions.get('window');

// Time period options for filtering
const TIME_PERIODS = ['Week', 'Month', 'Year', 'All Time'];

const Stats = () => {
  const [selectedPeriod, setSelectedPeriod] = useState('Month');
  const [refreshing, setRefreshing] = useState(false);

  // Mock data for charts
  const workoutsByCategory = {
    labels: ['Cardio', 'Strength', 'Yoga', 'HIIT', 'Recovery'],
    datasets: [
      {
        data: [8, 12, 4, 6, 2],
      },
    ],
  };
  
  const workoutCompletion = {
    labels: ['Completed', 'Skipped'],
    data: [0.75, 0.25],
    colors: ['#4F46E5', '#D1D5DB'],
    legendFontColor: '#6B7280',
  };
  
  const workoutProgress = {
    labels: ['Week 1', 'Week 2', 'Week 3', 'Week 4'],
    datasets: [
      {
        data: [3, 5, 4, 7],
        color: () => '#4F46E5',
        strokeWidth: 2,
      },
    ],
  };
  
  const bestTimeSlots = [
    { time: 'Morning (6-9 AM)', completionRate: '85%', count: 12 },
    { time: 'Evening (5-8 PM)', completionRate: '70%', count: 18 },
    { time: 'Afternoon (12-3 PM)', completionRate: '60%', count: 5 },
  ];

  // Chart configuration
  const chartConfig = {
    backgroundGradientFrom: '#FFFFFF',
    backgroundGradientTo: '#FFFFFF',
    color: (opacity = 1) => `rgba(79, 70, 229, ${opacity})`,
    strokeWidth: 2,
    barPercentage: 0.5,
    useShadowColorFromDataset: false,
    decimalPlaces: 0,
    labelColor: () => '#6B7280',
  };

  const onRefresh = React.useCallback(() => {
    setRefreshing(true);
    
    // Simulate refresh
    setTimeout(() => {
      setRefreshing(false);
    }, 1000);
  }, []);

  return (
    <ScrollView 
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      {/* Time period filter */}
      <View style={styles.periodFilter}>
        {TIME_PERIODS.map((period) => (
          <Chip
            key={period}
            mode="outlined"
            selected={selectedPeriod === period}
            onPress={() => setSelectedPeriod(period)}
            style={[
              styles.periodChip,
              selectedPeriod === period && styles.selectedPeriodChip
            ]}
            textStyle={[
              styles.periodChipText,
              selectedPeriod === period && styles.selectedPeriodChipText
            ]}
          >
            {period}
          </Chip>
        ))}
      </View>

      {/* Summary Card */}
      <Card style={styles.card}>
        <Card.Content>
          <Title style={styles.cardTitle}>Summary</Title>
          <View style={styles.summaryGrid}>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryValue}>31</Text>
              <Text style={styles.summaryLabel}>Total Workouts</Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryValue}>75%</Text>
              <Text style={styles.summaryLabel}>Completion Rate</Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryValue}>5</Text>
              <Text style={styles.summaryLabel}>Day Streak</Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryValue}>22h</Text>
              <Text style={styles.summaryLabel}>Total Time</Text>
            </View>
          </View>
        </Card.Content>
      </Card>

      {/* Workouts by Category Chart */}
      <Card style={styles.card}>
        <Card.Content>
          <Title style={styles.cardTitle}>Workouts by Category</Title>
          <View style={styles.chartContainer}>
            <BarChart
              data={workoutsByCategory}
              width={width - 64}
              height={220}
              chartConfig={chartConfig}
              verticalLabelRotation={30}
              fromZero
              showValuesOnTopOfBars
              style={styles.chart}
            />
          </View>
        </Card.Content>
      </Card>

      {/* Completion Rate Chart */}
      <Card style={styles.card}>
        <Card.Content>
          <Title style={styles.cardTitle}>Completion Rate</Title>
          <View style={styles.chartContainer}>
            <PieChart
              data={workoutCompletion}
              width={width - 64}
              height={220}
              chartConfig={chartConfig}
              accessor="data"
              backgroundColor="transparent"
              paddingLeft="20"
              style={styles.chart}
            />
          </View>
        </Card.Content>
      </Card>

      {/* Progress Chart */}
      <Card style={styles.card}>
        <Card.Content>
          <Title style={styles.cardTitle}>Workout Progress</Title>
          <View style={styles.chartContainer}>
            <LineChart
              data={workoutProgress}
              width={width - 64}
              height={220}
              chartConfig={chartConfig}
              bezier
              style={styles.chart}
            />
          </View>
        </Card.Content>
      </Card>

      {/* Best Time Slots */}
      <Card style={styles.card}>
        <Card.Content>
          <Title style={styles.cardTitle}>Best Time Slots</Title>
          <View style={styles.bestTimesContainer}>
            {bestTimeSlots.map((slot, index) => (
              <View key={index} style={styles.bestTimeSlot}>
                <View style={styles.bestTimeIconContainer}>
                  <Ionicons 
                    name={index === 0 ? "trophy" : "time-outline"} 
                    size={24} 
                    color={index === 0 ? "#F59E0B" : "#6B7280"} 
                  />
                </View>
                <View style={styles.bestTimeDetails}>
                  <Text style={styles.bestTimeTitle}>{slot.time}</Text>
                  <View style={styles.bestTimeMeta}>
                    <Text style={styles.bestTimeMetaText}>
                      {slot.completionRate} completion rate
                    </Text>
                    <Text style={styles.bestTimeMetaText}>
                      {slot.count} workouts
                    </Text>
                  </View>
                </View>
                <Text style={styles.bestTimeRank}>{index + 1}</Text>
              </View>
            ))}
          </View>
        </Card.Content>
      </Card>

      {/* Export Button */}
      <View style={styles.buttonContainer}>
        <Button 
          mode="outlined" 
          onPress={() => console.log('Export data pressed')}
          icon={({ size, color }) => (
            <Ionicons name="download-outline" size={size} color={color} />
          )}
        >
          Export Stats
        </Button>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  periodFilter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  periodChip: {
    backgroundColor: '#F3F4F6',
  },
  selectedPeriodChip: {
    backgroundColor: '#EEF2FF',
    borderColor: '#4F46E5',
  },
  periodChipText: {
    color: '#6B7280',
  },
  selectedPeriodChipText: {
    color: '#4F46E5',
  },
  card: {
    margin: 16,
    marginTop: 8,
    marginBottom: 8,
    elevation: 2,
  },
  cardTitle: {
    fontSize: 18,
    color: '#1F2937',
    marginBottom: 16,
  },
  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  summaryItem: {
    width: '45%',
    backgroundColor: '#F3F4F6',
    padding: 16,
    borderRadius: 8,
    marginBottom: 16,
    alignItems: 'center',
  },
  summaryValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#4F46E5',
    marginBottom: 4,
  },
  summaryLabel: {
    fontSize: 14,
    color: '#4B5563',
  },
  chartContainer: {
    alignItems: 'center',
    marginTop: 8,
  },
  chart: {
    marginVertical: 8,
    borderRadius: 8,
  },
  bestTimesContainer: {
    marginTop: 8,
  },
  bestTimeSlot: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
  bestTimeIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  bestTimeDetails: {
    flex: 1,
  },
  bestTimeTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 4,
  },
  bestTimeMeta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  bestTimeMetaText: {
    fontSize: 12,
    color: '#6B7280',
    marginRight: 8,
  },
  bestTimeRank: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#9CA3AF',
    marginLeft: 8,
  },
  buttonContainer: {
    margin: 16,
    marginBottom: 24,
  },
});

export default Stats;