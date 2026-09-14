import React from 'react';
import { Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useAuth } from '../context/AuthContext';

export default function ProfileScreen() {
  const { user, signOut } = useAuth();
  const confirmSignOut = () => Alert.alert('Sign out', 'Do you want to sign out of PoshanAI?', [
    { text: 'Cancel', style: 'cancel' },
    { text: 'Sign out', style: 'destructive', onPress: signOut },
  ]);
  return <View style={styles.container}>
    <View style={styles.avatar}><Text style={styles.avatarText}>{user?.name?.slice(0, 1)?.toUpperCase() || 'U'}</Text></View>
    <Text style={styles.name}>{user?.name || 'PoshanAI user'}</Text>
    <Text style={styles.detail}>{user?.phone || 'No phone number available'}</Text>
    <Text style={styles.role}>{user?.role || 'worker'}</Text>
    <TouchableOpacity style={styles.button} onPress={confirmSignOut}><Text style={styles.buttonText}>Sign out</Text></TouchableOpacity>
  </View>;
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', padding: 28, backgroundColor: '#F6F8F7' }, avatar: { width: 92, height: 92, marginTop: 32, borderRadius: 46, alignItems: 'center', justifyContent: 'center', backgroundColor: '#165C55' }, avatarText: { color: '#fff', fontSize: 36, fontWeight: '700' }, name: { marginTop: 18, color: '#172B2A', fontSize: 22, fontWeight: '700' }, detail: { marginTop: 8, color: '#5F6F6E', fontSize: 15 }, role: { marginTop: 12, overflow: 'hidden', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, color: '#165C55', backgroundColor: '#DDEFE9', textTransform: 'capitalize' }, button: { width: '100%', marginTop: 42, alignItems: 'center', borderRadius: 10, padding: 15, backgroundColor: '#C0392B' }, buttonText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
