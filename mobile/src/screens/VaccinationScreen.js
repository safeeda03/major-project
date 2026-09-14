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

const VaccinationScreen = ({ navigation }) => {
  const [formData, setFormData] = useState({
    beneficiaryId: '',
    vaccine: '',
    date: new Date().toISOString().split('T')[0],
    nextDueDate: '',
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!formData.beneficiaryId || !formData.vaccine || !formData.date) {
      Alert.alert('Error', 'Please fill in required fields');
      return;
    }

    setLoading(true);
    try {
      await API.vaccination.create(formData);
      Alert.alert('Success', 'Vaccination record saved successfully');
      setFormData({
        ...formData,
        beneficiaryId: '',
        vaccine: '',
        nextDueDate: '',
      });
    } catch (error) {
      Alert.alert('Error', 'Failed to save vaccination record');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Vaccination Records</Text>
      </View>

      <ScrollView style={styles.content}>
        <View style={styles.formContainer}>
          <Text style={styles.formTitle}>Add Vaccination Record</Text>
          
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
            <Text style={styles.label}>Vaccine</Text>
            <TextInput
              style={styles.input}
              value={formData.vaccine}
              onChangeText={(text) => setFormData({ ...formData, vaccine: text })}
              placeholder="BCG, Polio, DPT, MMR, etc."
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Vaccination Date</Text>
            <TextInput
              style={styles.input}
              value={formData.date}
              onChangeText={(text) => setFormData({ ...formData, date: text })}
              placeholder="YYYY-MM-DD"
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Next Due Date</Text>
            <TextInput
              style={styles.input}
              value={formData.nextDueDate}
              onChangeText={(text) => setFormData({ ...formData, nextDueDate: text })}
              placeholder="YYYY-MM-DD (optional)"
            />
          </View>

          <TouchableOpacity
            style={[styles.submitButton, loading && styles.submitButtonDisabled]}
            onPress={handleSubmit}
            disabled={loading}
          >
            <Text style={styles.submitButtonText}>
              {loading ? 'Saving...' : 'Save Vaccination Record'}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.scheduleContainer}>
          <Text style={styles.scheduleTitle}>Vaccination Schedule</Text>
          {[
            { vaccine: 'BCG', age: 'At birth', status: 'Completed' },
            { vaccine: 'Polio', age: '6 weeks', status: 'Completed' },
            { vaccine: 'DPT', age: '6 weeks', status: 'Completed' },
            { vaccine: 'Hepatitis B', age: 'At birth', status: 'Completed' },
            { vaccine: 'MMR', age: '9 months', status: 'Due' },
          ].map((item, index) => (
            <View key={index} style={styles.scheduleCard}>
              <View style={styles.scheduleInfo}>
                <Text style={styles.vaccineName}>{item.vaccine}</Text>
                <Text style={styles.vaccineAge}>{item.age}</Text>
              </View>
              <View style={[
                styles.statusBadge,
                item.status === 'Completed' ? styles.completedStatus : styles.dueStatus
              ]}>
                <Text style={styles.statusText}>{item.status}</Text>
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
  scheduleContainer: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  scheduleTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 15,
  },
  scheduleCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 15,
    marginBottom: 10,
  },
  scheduleInfo: {
    flex: 1,
  },
  vaccineName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2c3e50',
  },
  vaccineAge: {
    fontSize: 14,
    color: '#7f8c8d',
    marginTop: 3,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  completedStatus: {
    backgroundColor: '#2ecc71',
  },
  dueStatus: {
    backgroundColor: '#f39c12',
  },
  statusText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
});

export default VaccinationScreen;