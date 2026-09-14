import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { API } from '../services/api';

const WorkerDashboard = ({ navigation }) => {
  const [stats, setStats] = useState({
    totalBeneficiaries: 0,
    todayAttendance: 0,
    vaccinationDue: 0,
    healthAlerts: 0,
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadStats = async () => {
    try {
      // Load dashboard statistics
      // This would be replaced with actual API calls
      setStats({
        totalBeneficiaries: 150,
        todayAttendance: 142,
        vaccinationDue: 12,
        healthAlerts: 5,
      });
    } catch (error) {
      console.error('Error loading stats:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadStats();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    loadStats();
  };

  const StatCard = ({ title, value, subtitle, color }) => (
    <TouchableOpacity
      style={[styles.statCard, { borderLeftColor: color }]}
      onPress={() => {
        // Navigate based on card type
        if (title.includes('Beneficiaries')) {
          navigation.navigate('Beneficiaries');
        } else if (title.includes('Attendance')) {
          navigation.navigate('Attendance');
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
        <Text style={styles.headerTitle}>Worker Dashboard</Text>
        <Text style={styles.headerSubtitle}>Welcome back!</Text>
      </View>

      <View style={styles.statsContainer}>
        <StatCard
          title="Total Beneficiaries"
          value={stats.totalBeneficiaries}
          subtitle="Children registered"
          color="#3498db"
        />
        <StatCard
          title="Today's Attendance"
          value={stats.todayAttendance}
          subtitle="94.6% attendance"
          color="#2ecc71"
        />
        <StatCard
          title="Vaccination Due"
          value={stats.vaccinationDue}
          subtitle="This month"
          color="#f39c12"
        />
        <StatCard
          title="Health Alerts"
          value={stats.healthAlerts}
          subtitle="Action required"
          color="#e74c3c"
        />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Recent Activities</Text>
        <View style={styles.activityItem}>
          <View style={styles.activityDot} />
          <Text style={styles.activityText}>Added 3 new beneficiaries</Text>
        </View>
        <View style={styles.activityItem}>
          <View style={styles.activityDot} />
          <Text style={styles.activityText}>Updated health records for 5 children</Text>
        </View>
        <View style={styles.activityItem}>
          <View style={styles.activityDot} />
          <Text style={styles.activityText}>Recorded attendance for today</Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Pending Tasks</Text>
        <View style={styles.taskItem}>
          <Text style={styles.taskText}>• Follow up on missed vaccinations</Text>
        </View>
        <View style={styles.taskItem}>
          <Text style={styles.taskText}>• Complete nutrition assessment</Text>
        </View>
        <View style={styles.taskItem}>
          <Text style={styles.taskText}>• Review OCR uploaded documents</Text>
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
    fontSize: 24,
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
  activityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  activityDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#3498db',
    marginRight: 10,
  },
  activityText: {
    fontSize: 14,
    color: '#34495e',
  },
  taskItem: {
    marginBottom: 10,
  },
  taskText: {
    fontSize: 14,
    color: '#34495e',
  },
});

export default WorkerDashboard;