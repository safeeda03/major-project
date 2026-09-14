import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';

const SupervisorDashboard = ({ navigation }) => {
  const [stats, setStats] = useState({
    totalCentres: 0,
    totalBeneficiaries: 0,
    highRiskAreas: 0,
    monthlyReports: 0,
  });
  const [refreshing, setRefreshing] = useState(false);

  const loadStats = async () => {
    try {
      setStats({
        totalCentres: 25,
        totalBeneficiaries: 3750,
        highRiskAreas: 3,
        monthlyReports: 45,
      });
    } catch (error) {
      console.error('Error loading stats:', error);
    } finally {
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
    <View style={[styles.statCard, { borderLeftColor: color }]}>
      <Text style={styles.statTitle}>{title}</Text>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statSubtitle}>{subtitle}</Text>
    </View>
  );

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Supervisor Dashboard</Text>
        <Text style={styles.headerSubtitle}>Regional Overview</Text>
      </View>

      <View style={styles.statsContainer}>
        <StatCard
          title="Total Centres"
          value={stats.totalCentres}
          subtitle="Under supervision"
          color="#3498db"
        />
        <StatCard
          title="Total Beneficiaries"
          value={stats.totalBeneficiaries}
          subtitle="Across all centres"
          color="#2ecc71"
        />
        <StatCard
          title="High Risk Areas"
          value={stats.highRiskAreas}
          subtitle="Require attention"
          color="#e74c3c"
        />
        <StatCard
          title="Monthly Reports"
          value={stats.monthlyReports}
          subtitle="Generated"
          color="#f39c12"
        />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Centre Performance</Text>
        <View style={styles.tableHeader}>
          <Text style={styles.tableHeaderText}>Centre</Text>
          <Text style={styles.tableHeaderText}>Attendance</Text>
          <Text style={styles.tableHeaderText}>Health</Text>
        </View>
        <View style={styles.tableRow}>
          <Text style={styles.tableCellText}>Centre A</Text>
          <Text style={styles.tableCellText}>92%</Text>
          <Text style={[styles.tableCellText, styles.goodStatus]}>Good</Text>
        </View>
        <View style={styles.tableRow}>
          <Text style={styles.tableCellText}>Centre B</Text>
          <Text style={styles.tableCellText}>88%</Text>
          <Text style={[styles.tableCellText, styles.moderateStatus]}>Moderate</Text>
        </View>
        <View style={styles.tableRow}>
          <Text style={styles.tableCellText}>Centre C</Text>
          <Text style={styles.tableCellText}>85%</Text>
          <Text style={[styles.tableCellText, styles.poorStatus]}>Needs Attention</Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Alerts & Notifications</Text>
        <View style={[styles.alertItem, styles.highAlert]}>
          <Text style={styles.alertText}>Centre C showing declining nutrition trends</Text>
        </View>
        <View style={[styles.alertItem, styles.mediumAlert]}>
          <Text style={styles.alertText}>Vaccination coverage below target in 5 centres</Text>
        </View>
        <View style={[styles.alertItem, styles.lowAlert]}>
          <Text style={styles.alertText}>Monthly reports pending from 2 centres</Text>
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
  tableHeader: {
    flexDirection: 'row',
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#ecf0f1',
  },
  tableHeaderText: {
    flex: 1,
    fontSize: 12,
    fontWeight: 'bold',
    color: '#2c3e50',
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#ecf0f1',
  },
  tableCellText: {
    flex: 1,
    fontSize: 14,
    color: '#34495e',
  },
  goodStatus: {
    color: '#2ecc71',
    fontWeight: '600',
  },
  moderateStatus: {
    color: '#f39c12',
    fontWeight: '600',
  },
  poorStatus: {
    color: '#e74c3c',
    fontWeight: '600',
  },
  alertItem: {
    padding: 12,
    borderRadius: 8,
    marginBottom: 10,
    borderLeftWidth: 4,
  },
  highAlert: {
    backgroundColor: '#fee',
    borderLeftColor: '#e74c3c',
  },
  mediumAlert: {
    backgroundColor: '#fef9e7',
    borderLeftColor: '#f39c12',
  },
  lowAlert: {
    backgroundColor: '#eafaf1',
    borderLeftColor: '#27ae60',
  },
  alertText: {
    fontSize: 14,
    color: '#34495e',
  },
});

export default SupervisorDashboard;