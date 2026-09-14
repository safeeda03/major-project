import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';

const ParentDashboard = ({ navigation }) => {
  const [childData, setChildData] = useState({
    name: 'Rahul Kumar',
    age: '3 years 2 months',
    gender: 'Male',
    status: 'Healthy',
  });
  const [stats, setStats] = useState({
    growthStatus: 'Normal',
    nutritionStatus: 'Good',
    vaccination: 'Up to date',
    attendance: '95%',
  });
  const [refreshing, setRefreshing] = useState(false);

  const loadData = async () => {
    try {
      // Load child data from API
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const StatCard = ({ title, value, subtitle, color }) => (
    <TouchableOpacity
      style={[styles.statCard, { borderLeftColor: color }]}
      onPress={() => {
        if (title.includes('Growth')) {
          navigation.navigate('Health');
        } else if (title.includes('Nutrition')) {
          navigation.navigate('Nutrition');
        } else if (title.includes('Vaccination')) {
          navigation.navigate('Vaccination');
        }
      }}
    >
      <Text style={styles.statTitle}>{title}</Text>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statSubtitle}>{subtitle}</Text>
    </TouchableOpacity>
  );

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Parent Dashboard</Text>
        <Text style={styles.headerSubtitle}>Your Child's Health</Text>
      </View>

      <View style={styles.childCard}>
        <View style={styles.childAvatar}>
          <Text style={styles.avatarText}>RK</Text>
        </View>
        <View style={styles.childInfo}>
          <Text style={styles.childName}>{childData.name}</Text>
          <Text style={styles.childDetail}>Age: {childData.age}</Text>
          <Text style={styles.childDetail}>Gender: {childData.gender}</Text>
          <View style={styles.statusBadge}>
            <Text style={styles.statusText}>{childData.status}</Text>
          </View>
        </View>
      </View>

      <View style={styles.statsContainer}>
        <StatCard
          title="Growth Status"
          value={stats.growthStatus}
          subtitle="On track"
          color="#2ecc71"
        />
        <StatCard
          title="Nutrition Status"
          value={stats.nutritionStatus}
          subtitle="Balanced diet"
          color="#3498db"
        />
        <StatCard
          title="Vaccination"
          value={stats.vaccination}
          subtitle="Next due in 2 months"
          color="#f39c12"
        />
        <StatCard
          title="Attendance"
          value={stats.attendance}
          subtitle="This month"
          color="#9b59b6"
        />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Recent Recommendations</Text>
        <View style={styles.recommendationItem}>
          <Text style={styles.recommendationText}>
            • Continue iron-rich foods for better hemoglobin levels
          </Text>
        </View>
        <View style={styles.recommendationItem}>
          <Text style={styles.recommendationText}>
            • Ensure regular protein intake for growth
          </Text>
        </View>
        <View style={styles.recommendationItem}>
          <Text style={styles.recommendationText}>
            • Next vaccination due: Polio Booster - 15th Oct 2026
          </Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Growth Chart</Text>
        <View style={styles.chartPlaceholder}>
          <Text style={styles.chartText}>Weight and height tracking chart</Text>
          <Text style={styles.chartSubtext}>will be displayed here</Text>
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    padding: 20,
    backgroundColor: '#2c3e50',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#bdc3c7',
    marginTop: 5,
  },
  childCard: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    margin: 15,
    borderRadius: 10,
    padding: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  childAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#3498db',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  avatarText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  childInfo: {
    flex: 1,
  },
  childName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 5,
  },
  childDetail: {
    fontSize: 14,
    color: '#7f8c8d',
    marginBottom: 3,
  },
  statusBadge: {
    backgroundColor: '#2ecc71',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
    marginTop: 8,
  },
  statusText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  statsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 15,
    justifyContent: 'space-between',
  },
  statCard: {
    width: '48%',
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 15,
    marginBottom: 15,
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statTitle: {
    fontSize: 12,
    color: '#7f8c8d',
    marginBottom: 5,
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2c3e50',
  },
  statSubtitle: {
    fontSize: 11,
    color: '#95a5a6',
    marginTop: 5,
  },
  section: {
    backgroundColor: '#fff',
    margin: 15,
    borderRadius: 10,
    padding: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 15,
  },
  recommendationItem: {
    marginBottom: 12,
  },
  recommendationText: {
    fontSize: 14,
    color: '#34495e',
    lineHeight: 20,
  },
  chartPlaceholder: {
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chartText: {
    fontSize: 14,
    color: '#7f8c8d',
    textAlign: 'center',
  },
  chartSubtext: {
    fontSize: 12,
    color: '#95a5a6',
    marginTop: 5,
  },
});

export default ParentDashboard;