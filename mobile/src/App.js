import React from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { AuthProvider, useAuth } from './context/AuthContext';

import LoginScreen from './screens/LoginScreen';
import WorkerDashboard from './screens/WorkerDashboard';
import SupervisorDashboard from './screens/SupervisorDashboard';
import ParentDashboard from './screens/ParentDashboard';
import BeneficiaryScreen from './screens/BeneficiaryScreen';
import HealthScreen from './screens/HealthScreen';
import NutritionScreen from './screens/NutritionScreen';
import VaccinationScreen from './screens/VaccinationScreen';
import AttendanceScreen from './screens/AttendanceScreen';
import ReportsScreen from './screens/ReportsScreen';
import ChatbotScreen from './screens/ChatbotScreen';
import MapScreen from './screens/MapScreen';
import ProfileScreen from './screens/ProfileScreen';

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

const tabIcon = (route) => ({
  Dashboard: 'dashboard', Beneficiaries: 'people', Health: 'favorite', Chatbot: 'chat',
  Centres: 'location-city', Map: 'map', Reports: 'assessment', Profile: 'account-circle',
  Child: 'child-care', Vaccination: 'vaccines',
}[route.name] || 'home');

const tabOptions = ({ route }) => ({
  headerShown: false,
  tabBarActiveTintColor: '#165C55',
  tabBarInactiveTintColor: '#6B7280',
  tabBarIcon: ({ color, size }) => <Icon name={tabIcon(route)} size={size} color={color} />,
});

function WorkerTabs() {
  return <Tab.Navigator screenOptions={tabOptions}>
    <Tab.Screen name="Dashboard" component={WorkerDashboard} />
    <Tab.Screen name="Beneficiaries" component={BeneficiaryScreen} />
    <Tab.Screen name="Health" component={HealthScreen} />
    <Tab.Screen name="Chatbot" component={ChatbotScreen} />
    <Tab.Screen name="Profile" component={ProfileScreen} />
  </Tab.Navigator>;
}

function SupervisorTabs() {
  return <Tab.Navigator screenOptions={tabOptions}>
    <Tab.Screen name="Dashboard" component={SupervisorDashboard} />
    <Tab.Screen name="Centres" component={BeneficiaryScreen} />
    <Tab.Screen name="Map" component={MapScreen} />
    <Tab.Screen name="Reports" component={ReportsScreen} />
    <Tab.Screen name="Profile" component={ProfileScreen} />
  </Tab.Navigator>;
}

function ParentTabs() {
  return <Tab.Navigator screenOptions={tabOptions}>
    <Tab.Screen name="Dashboard" component={ParentDashboard} />
    <Tab.Screen name="Child" component={BeneficiaryScreen} />
    <Tab.Screen name="Health" component={HealthScreen} />
    <Tab.Screen name="Vaccination" component={VaccinationScreen} />
    <Tab.Screen name="Profile" component={ProfileScreen} />
  </Tab.Navigator>;
}

function AppNavigator() {
  const { isRestoring, user } = useAuth();
  if (isRestoring) return <View style={styles.loading}><ActivityIndicator size="large" color="#165C55" /></View>;

  const role = user?.role || 'worker';
  const HomeTabs = role === 'supervisor' ? SupervisorTabs : role === 'parent' ? ParentTabs : WorkerTabs;
  return <NavigationContainer>
    <Stack.Navigator screenOptions={{ headerStyle: { backgroundColor: '#165C55' }, headerTintColor: '#FFFFFF' }}>
      {user ? <>
        <Stack.Screen name="Home" component={HomeTabs} options={{ headerShown: false }} />
        <Stack.Screen name="Nutrition" component={NutritionScreen} />
        <Stack.Screen name="Vaccination" component={VaccinationScreen} />
        <Stack.Screen name="Attendance" component={AttendanceScreen} />
        <Stack.Screen name="Reports" component={ReportsScreen} />
        <Stack.Screen name="Map" component={MapScreen} />
      </> : <Stack.Screen name="Login" component={LoginScreen} options={{ headerShown: false }} />}
    </Stack.Navigator>
  </NavigationContainer>;
}

export default function App() {
  return <AuthProvider><AppNavigator /></AuthProvider>;
}

const styles = StyleSheet.create({ loading: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F6F8F7' } });
