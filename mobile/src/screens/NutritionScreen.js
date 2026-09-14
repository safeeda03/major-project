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

const NutritionScreen = ({ navigation }) => {
  const [formData, setFormData] = useState({
    beneficiaryId: '',
    nutritionStatus: '',
    meals: '',
    recommendations: '',
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!formData.beneficiaryId || !formData.nutritionStatus) {
      Alert.alert('Error', 'Please fill in required fields');
      return;
    }

    setLoading(true);
    try {
      await API.nutrition.create(formData);
      Alert.alert('Success', 'Nutrition record saved successfully');
      setFormData({
        ...formData,
        beneficiaryId: '',
        nutritionStatus: '',
        meals: '',
        recommendations: '',
      });
    } catch (error) {
      Alert.alert('Error', 'Failed to save nutrition record');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Nutrition Records</Text>
      </View>

      <ScrollView style={styles.content}>
        <View style={styles.formContainer}>
          <Text style={styles.formTitle}>Add Nutrition Assessment</Text>
          
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
            <Text style={styles.label}>Nutrition Status</Text>
            <TextInput
              style={styles.input}
              value={formData.nutritionStatus}
              onChangeText={(text) => setFormData({ ...formData, nutritionStatus: text })}
              placeholder="Normal, Underweight, Overweight, etc."
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Meals Provided</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={formData.meals}
              onChangeText={(text) => setFormData({ ...formData, meals: text })}
              placeholder="Breakfast, Lunch, Snacks details..."
              multiline
              numberOfLines={4}
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Recommendations</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={formData.recommendations}
              onChangeText={(text) => setFormData({ ...formData, recommendations: text })}
              placeholder="Dietary recommendations..."
              multiline
              numberOfLines={4}
            />
          </View>

          <TouchableOpacity
            style={[styles.submitButton, loading && styles.submitButtonDisabled]}
            onPress={handleSubmit}
            disabled={loading}
          >
            <Text style={styles.submitButtonText}>
              {loading ? 'Saving...' : 'Save Nutrition Record'}
            </Text>
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
  formContainer: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 20,
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
  textArea: {
    height: 100,
    textAlignVertical: 'top',
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
});

export default NutritionScreen;