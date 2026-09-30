import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useAuth } from '../context/AuthContext';

const workerItems = [
  ['Nutrition', 'restaurant', 'Record meals and nutrition'],
  ['Vaccination', 'vaccines', 'Track doses and due dates'],
  ['Attendance', 'fact-check', 'Mark today’s attendance'],
  ['OCR', 'document-scanner', 'Scan a health document'],
  ['Chatbot', 'chat', 'Ask PoshanAI for help'],
];
const supervisorItems = [
  ['Reports', 'assessment', 'View centre reports'],
  ['Map', 'map', 'Find and monitor centres'],
];
const parentItems = [
  ['Nutrition', 'restaurant', 'View nutrition guidance'],
  ['Vaccination', 'vaccines', 'Check vaccination schedule'],
];

export default function MoreScreen({ navigation }) {
  const { user } = useAuth();
  const items = user?.role === 'supervisor' ? supervisorItems : user?.role === 'parent' ? parentItems : workerItems;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.heading}>
        <Text style={styles.title}>More</Text>
        <Text style={styles.subtitle}>Tools and account settings</Text>
      </View>
      <View style={styles.list}>
        {items.map(([name, icon, description]) => (
          <TouchableOpacity key={name} style={styles.row} onPress={() => navigation.navigate(name)}>
            <View style={styles.icon}><Icon name={icon} size={22} color="#165C55" /></View>
            <View style={styles.copy}><Text style={styles.name}>{name}</Text><Text style={styles.description}>{description}</Text></View>
            <Icon name="chevron-right" size={25} color="#9AA8A6" />
          </TouchableOpacity>
        ))}
      </View>
      <Text style={styles.section}>ACCOUNT</Text>
      <TouchableOpacity style={styles.row} onPress={() => navigation.navigate('Profile')}>
        <View style={styles.icon}><Icon name="person-outline" size={22} color="#165C55" /></View>
        <View style={styles.copy}><Text style={styles.name}>Profile</Text><Text style={styles.description}>View account and sign out</Text></View>
        <Icon name="chevron-right" size={25} color="#9AA8A6" />
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F6F8F7' },
  content: { padding: 20, paddingBottom: 32 },
  heading: { marginBottom: 22 }, title: { fontSize: 28, color: '#172B2A', fontWeight: '700' }, subtitle: { marginTop: 5, color: '#647473', fontSize: 15 },
  list: { overflow: 'hidden', borderRadius: 14, backgroundColor: '#FFFFFF' },
  row: { minHeight: 73, paddingHorizontal: 15, alignItems: 'center', flexDirection: 'row', borderBottomWidth: StyleSheet.hairlineWidth, borderColor: '#E5EBE9' },
  icon: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center', backgroundColor: '#E6F2EE' },
  copy: { flex: 1, marginLeft: 13 }, name: { color: '#172B2A', fontSize: 16, fontWeight: '700' }, description: { marginTop: 3, color: '#6B7B79', fontSize: 13 },
  section: { marginTop: 26, marginBottom: 9, marginLeft: 4, color: '#70807E', fontSize: 12, fontWeight: '700', letterSpacing: 0.7 },
});
