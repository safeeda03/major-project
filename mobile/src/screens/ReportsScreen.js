import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { API } from '../services/api';

const ReportsScreen = ({ navigation }) => {
  const [reportType, setReportType] = useState('beneficiary');
  const [dateRange, setDateRange] = useState({
    startDate: '',
    endDate: '',
  });
  const [loading, setLoading] = useState(false);
  const [alerts, setAlerts] = useState([
    { type: 'health', severity: 'high', message: '5 children showing stunted growth' },
    { type: 'vaccination', severity: 'medium', message: '12 children due for vaccination this week' },
    { type: 'attendance', severity: 'low', message: '3 centres below 80% attendance rate' },
  ]);

  const handleGenerateReport = async () => {
    setLoading(true);
    try {
      const result = await API.reports.generate(reportType, dateRange);
      Alert.alert('Success', `Report generated: ${result.count} records`);
    } catch (error) {
      Alert.alert('Error', 'Failed to generate report');
    } finally {
      setLoading(false);
    }
  };

  const reportTypes = [
    { value: 'beneficiary', label: 'Beneficiary Report' },
    { value: 'health', label: 'Health Report' },
    { value: 'nutrition', label: 'Nutrition Report' },
    { value: 'vaccination', label: 'Vaccination Report' },
    { value: 'attendance', label: 'Attendance Report' },
    { value: 'centre', label: 'Centre Report' },
  ];

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Reports & Alerts</Text>
      </View>

      <ScrollView style={styles.content}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Generate Report</Text>
          
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Report Type</Text>
            <View style={styles.reportTypeContainer}>
              {reportTypes.map((type) => (
                <TouchableOpacity
                  key={type.value}
                  style={[
                    styles.reportTypeButton,
                    reportType === type.value && styles.reportTypeButtonActive,
                  ]}
                  onPress={() => setReportType(type.value)}
                >
                  <Text
                    style={[
                      styles.reportTypeText,
                      reportType === type.value && styles.reportTypeTextActive,
                    ]}
                  >
                    {type.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={styles.dateContainer}>
            <View style={styles.dateInput}>
              <Text style={styles.label}>Start Date</Text>
              <TextInput
                style={styles.input}
                placeholder="YYYY-MM-DD"
                value={dateRange.startDate}
                onChangeText={(text) => setDateRange({ ...dateRange, startDate: text })}
              />
            </View>
            <View style={styles.dateInput}>
              <Text style={styles.label}>End Date</Text>
              <TextInput
                style={styles.input}
                placeholder="YYYY-MM-DD"
                value={dateRange.endDate}
                onChangeText={(text) => setDateRange({ ...dateRange, endDate: text })}
              />
            </View>
          </View>

          <TouchableOpacity
            style={[styles.generateButton, loading && styles.generateButtonDisabled]}
            onPress={handleGenerateReport}
            disabled={loading}
          >
            <Text style={styles.generateButtonText}>
              {loading ? 'Generating...' : 'Generate Report'}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Alerts</Text>
          {alerts.map((alert, index) => (
            <View
              key={index}
              style={[
                styles.alertCard,
                alert.severity === 'high' && styles.highAlert,
                alert.severity === 'medium' && styles.mediumAlert,
                alert.severity === 'low' && styles.lowAlert,
              ]}
            >
              <View style={styles.alertHeader}>
                <Text style={styles.alertType}>{alert.type.toUpperCase()}</Text>
                <View style={[
                  styles.severityBadge,
                  alert.severity === 'high' && styles.highSeverity,
                  alert.severity === 'medium' && styles.mediumSeverity,
                  alert.severity === 'low' && styles.lowSeverity,
                ]}>
                  <Text style={styles.severityText}>{alert.severity}</Text>
                </View>
              </View>
              <Text style={styles.alertMessage}>{alert.message}</Text>
            </View>
          ))}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => {/* Download PDF */}}
          >
            <Text style={styles.actionButtonText}>Download PDF Report</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => {/* Share report */}}
          >
            <Text style={styles.actionButtonText}>Share Report</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => {/* Email report */}}
          >
            <Text style={styles.actionButtonText}>Email Report</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
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
  content: {
    flex: 1,
    padding: 15,
  },
  section: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 20,
    marginBottom: 20,
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
  inputContainer: {
    marginBottom: 15,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#34495e',
    marginBottom: 8,
  },
  reportTypeContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  reportTypeButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#ddd',
    backgroundColor: '#f8f9fa',
  },
  reportTypeButtonActive: {
    backgroundColor: '#2c3e50',
    borderColor: '#2c3e50',
  },
  reportTypeText: {
    fontSize: 12,
    color: '#7f8c8d',
  },
  reportTypeTextActive: {
    color: '#fff',
    fontWeight: '600',
  },
  dateContainer: {
    flexDirection: 'row',
    gap: 15,
    marginBottom: 15,
  },
  dateInput: {
    flex: 1,
  },
  input: {
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  generateButton: {
    backgroundColor: '#3498db',
    borderRadius: 8,
    padding: 15,
    alignItems: 'center',
  },
  generateButtonDisabled: {
    backgroundColor: '#95a5a6',
  },
  generateButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  alertCard: {
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 15,
    marginBottom: 10,
    borderLeftWidth: 4,
  },
  highAlert: {
    borderLeftColor: '#e74c3c',
    backgroundColor: '#fee',
  },
  mediumAlert: {
    borderLeftColor: '#f39c12',
    backgroundColor: '#fef9e7',
  },
  lowAlert: {
    borderLeftColor: '#27ae60',
    backgroundColor: '#eafaf1',
  },
  alertHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  alertType: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#7f8c8d',
  },
  severityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  highSeverity: {
    backgroundColor: '#e74c3c',
  },
  mediumSeverity: {
    backgroundColor: '#f39c12',
  },
  lowSeverity: {
    backgroundColor: '#27ae60',
  },
  severityText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '600',
  },
  alertMessage: {
    fontSize: 14,
    color: '#34495e',
  },
  actionButton: {
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 15,
    alignItems: 'center',
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  actionButtonText: {
    color: '#2c3e50',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default ReportsScreen;
