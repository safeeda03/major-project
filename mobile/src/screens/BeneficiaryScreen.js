import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  Modal,
} from 'react-native';
import { API } from '../services/api';

const BeneficiaryScreen = ({ navigation }) => {
  const [formData, setFormData] = useState({
    name: '',
    dob: '',
    gender: '',
    parentId: '',
    anganwadiId: '',
  });
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [beneficiaries, setBeneficiaries] = useState([]);
  const [query, setQuery] = useState('');

  const loadBeneficiaries = useCallback(async () => {
    try {
      const result = await API.beneficiaries.getAll();
      setBeneficiaries(Array.isArray(result) ? result : []);
    } catch (_) {
      setBeneficiaries([]);
    }
  }, []);

  useEffect(() => { loadBeneficiaries(); }, [loadBeneficiaries]);

  const handleSubmit = async () => {
    if (!formData.name || !formData.dob || !formData.gender || !formData.parentId || !formData.anganwadiId) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    setLoading(true);
    try {
      await API.beneficiaries.create({
        name: formData.name,
        dob: formData.dob,
        gender: formData.gender.toLowerCase(),
        parent_id: formData.parentId,
        anganwadi_id: formData.anganwadiId,
      });
      Alert.alert('Success', 'Beneficiary added successfully');
      setFormData({
        name: '',
        dob: '',
        gender: '',
        parentId: '',
        anganwadiId: '',
      });
      setShowModal(false);
      loadBeneficiaries();
    } catch (error) {
      Alert.alert('Error', 'Failed to add beneficiary');
    } finally {
      setLoading(false);
    }
  };

  const ageText = (dob) => {
    const birthDate = new Date(dob);
    if (Number.isNaN(birthDate.getTime())) return 'Age unavailable';
    const years = Math.max(0, new Date().getFullYear() - birthDate.getFullYear());
    return `${years} year${years === 1 ? '' : 's'}`;
  };

  const visibleBeneficiaries = beneficiaries.filter((beneficiary) =>
    beneficiary.name?.toLowerCase().includes(query.trim().toLowerCase()),
  );

  const InputField = ({ label, value, onChangeText, placeholder, keyboardType }) => (
    <View style={styles.inputContainer}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        style={styles.input}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        keyboardType={keyboardType}
      />
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Beneficiaries</Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => setShowModal(true)}
        >
          <Text style={styles.addButtonText}>+ Add New</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content}>
        <View style={styles.searchContainer}>
          <TextInput
            style={styles.searchInput}
            placeholder="Search beneficiaries..."
            placeholderTextColor="#7f8c8d"
            value={query}
            onChangeText={setQuery}
          />
        </View>

        <View style={styles.listContainer}>
          {visibleBeneficiaries.map((beneficiary) => (
            <TouchableOpacity
              key={beneficiary._id || beneficiary.beneficiary_id}
              style={styles.card}
              onPress={() => navigation.navigate('Health', { beneficiaryId: beneficiary._id })}
            >
              <View style={styles.cardHeader}>
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>{beneficiary.name?.slice(0, 1)?.toUpperCase() || 'C'}</Text>
                </View>
                <View style={styles.cardInfo}>
                  <Text style={styles.cardName}>{beneficiary.name}</Text>
                  <Text style={styles.cardDetail}>Age: {ageText(beneficiary.dob)}</Text>
                  <Text style={styles.cardDetail}>Gender: {beneficiary.gender}</Text>
                </View>
                <Text style={[styles.status, styles.activeStatus]}>Active</Text>
              </View>
            </TouchableOpacity>
          ))}
          {!visibleBeneficiaries.length && <Text style={styles.emptyText}>No beneficiaries found. Add the first child to begin.</Text>}
        </View>
      </ScrollView>

      <Modal
        visible={showModal}
        animationType="slide"
        onRequestClose={() => setShowModal(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Add New Beneficiary</Text>
            <TouchableOpacity onPress={() => setShowModal(false)}>
              <Text style={styles.closeButton}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            <InputField
              label="Child Name"
              value={formData.name}
              onChangeText={(text) => setFormData({ ...formData, name: text })}
              placeholder="Enter child name"
            />
            <InputField
              label="Date of Birth"
              value={formData.dob}
              onChangeText={(text) => setFormData({ ...formData, dob: text })}
              placeholder="YYYY-MM-DD"
            />
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Gender</Text>
              <View style={styles.genderContainer}>
                {['Male', 'Female'].map((gender) => (
                  <TouchableOpacity
                    key={gender}
                    style={[
                      styles.genderButton,
                      formData.gender === gender && styles.genderButtonActive,
                    ]}
                    onPress={() => setFormData({ ...formData, gender })}
                  >
                    <Text
                      style={[
                        styles.genderText,
                        formData.gender === gender && styles.genderTextActive,
                      ]}
                    >
                      {gender}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
            <InputField
              label="Parent/Guardian ID"
              value={formData.parentId}
              onChangeText={(text) => setFormData({ ...formData, parentId: text })}
              placeholder="Enter parent ID"
              keyboardType="default"
            />
            <InputField
              label="Anganwadi Centre ID"
              value={formData.anganwadiId}
              onChangeText={(text) => setFormData({ ...formData, anganwadiId: text })}
              placeholder="Enter centre ID"
              keyboardType="default"
            />

            <TouchableOpacity
              style={[styles.submitButton, loading && styles.submitButtonDisabled]}
              onPress={handleSubmit}
              disabled={loading}
            >
              <Text style={styles.submitButtonText}>
                {loading ? 'Adding...' : 'Add Beneficiary'}
              </Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#2c3e50',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  addButton: {
    backgroundColor: '#3498db',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
  },
  addButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  content: {
    flex: 1,
  },
  searchContainer: {
    padding: 15,
  },
  searchInput: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 15,
    fontSize: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  listContainer: {
    padding: 15,
  },
  emptyText: {
    color: '#7f8c8d',
    fontSize: 14,
    textAlign: 'center',
    marginTop: 30,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 15,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#3498db',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  avatarText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
  },
  cardInfo: {
    flex: 1,
  },
  cardName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 3,
  },
  cardDetail: {
    fontSize: 14,
    color: '#7f8c8d',
  },
  status: {
    fontSize: 12,
    fontWeight: '600',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  activeStatus: {
    backgroundColor: '#2ecc71',
    color: '#fff',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#2c3e50',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  closeButton: {
    fontSize: 24,
    color: '#fff',
    fontWeight: 'bold',
  },
  modalContent: {
    padding: 20,
  },
  inputContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#34495e',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  genderContainer: {
    flexDirection: 'row',
    gap: 10,
  },
  genderButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    alignItems: 'center',
  },
  genderButtonActive: {
    backgroundColor: '#2c3e50',
    borderColor: '#2c3e50',
  },
  genderText: {
    fontSize: 14,
    color: '#7f8c8d',
  },
  genderTextActive: {
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
});

export default BeneficiaryScreen;
