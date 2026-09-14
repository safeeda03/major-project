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

const AttendanceScreen = ({ navigation }) => {
  const [formData, setFormData] = useState({
    beneficiaryId: '',
    date: new Date().toISOString().split('T')[0],
    status: 'present',
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!formData.beneficiaryId || !formData.date) {
      Alert.alert('Error', 'Please fill in required fields');
      return;
    }

    setLoading(true);
    try {
      await API.attendance.create(formData);
      Alert.alert('Success', 'Attendance marked successfully');
      setFormData({
        ...formData,
        beneficiaryId: '',
        status: 'present',
      });
    } catch (error) {
      Alert.alert('Error', 'Failed to mark attendance');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Attendance Records</Text>
      </View>

      <ScrollView style={styles.content}>
        <View style={styles.formContainer}>
          <Text style={styles.formTitle}>Mark Attendance</Text>
          
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Beneficiary ID</Text>
            <TextInput
              style={styles.input}
              value={formData.beneficiaryId}
              onChangeText={(text) => setFormData({ ...formData, beneficiaryId: text })}
              placeholder="Enter beneficiary ID"
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Date</Text>
            <TextInput
              style={styles.input}
              value={formData.date}
              onChangeText={(text) => setFormData({ ...formData, date: text })}
              placeholder="YYYY-MM-DD"
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Status</Text>
            <View style={styles.statusContainer}>
              {['present', 'absent', 'half-day'].map((status) => (
                <TouchableOpacity
                  key={status}
                  style={[
                    styles.statusButton,
                    formData.status === status && styles.statusButtonActive,
                  ]}
                  onPress={() => setFormData({ ...formData, status })}
                >
                  <Text
                    style={[
                      styles.statusText,
                      formData.status === status && styles.statusTextActive,
                    ]}
                  >
                    {status.charAt(0).toUpperCase() + status.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <TouchableOpacity
            style={[styles.submitButton, loading && styles.submitButtonDisabled]}
            onPress={handleSubmit}
            disabled={loading}
          >
            <Text style={styles.submitButtonText}>
              {loading ? 'Marking...' : 'Mark Attendance'}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.quickMarkContainer}>
          <Text style={styles.quickMarkTitle}>Quick Mark - Today</Text>
          {[1, 2, 3, 4, 5].map((item) => (
            <View key={item} style={styles.quickMarkCard}>
              <View style={styles.quickMarkInfo}>
                <Text style={styles.childName}>Child {item}</Text>
                <Text style={styles.childId}>ID: B00{item}</Text>
              </View>
              <View style={styles.quickMarkButtons}>
                <TouchableOpacity
                  style={[styles.quickButton, styles.presentButton]}
                  onPress={() => {/* Mark present */}}
                >
                  <Text style={styles.quickButtonText}>✓</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.quickButton, styles.absentButton]}
                  onPress={() => {/* Mark absent */}}
                >
                  <Text style={styles.quickButtonText}>✗</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))}
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
  formContainer: {
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
  formTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 20,
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
  input: {
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  statusContainer: {
    flexDirection: 'row',
    gap: 10,
  },
  statusButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    alignItems: 'center',
  },
  statusButtonActive: {
    backgroundColor: '#2c3e50',
    borderColor: '#2c3e50',
  },
  statusText: {
    fontSize: 14,
    color: '#7f8c8d',
  },
  statusTextActive: {
    color: '#fff',
    fontWeight: '600',
  },
  submitButton: {
    backgroundColor: '#3498db',
    borderRadius: 8,
    padding: 15,
    alignItems: 'center',
    marginTop: 10,
  },
  submitButtonDisabled: {
    backgroundColor: '#95a5a6',
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  quickMarkContainer: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  quickMarkTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 15,
  },
  quickMarkCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 15,
    marginBottom: 10,
  },
  quickMarkInfo: {
    flex: 1,
  },
  childName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2c3e50',
  },
  childId: {
    fontSize: 14,
    color: '#7f8c8d',
    marginTop: 3,
  },
  quickMarkButtons: {
    flexDirection: 'row',
    gap: 10,
  },
  quickButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  presentButton: {
    backgroundColor: '#2ecc71',
  },
  absentButton: {
    backgroundColor: '#e74c3c',
  },
  quickButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
});

export default AttendanceScreen;