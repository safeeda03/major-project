import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API } from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [isRestoring, setIsRestoring] = useState(true);

  useEffect(() => {
    AsyncStorage.getItem('userInfo')
      .then((storedUser) => storedUser && setUser(JSON.parse(storedUser)))
      .catch(() => AsyncStorage.multiRemove(['userInfo', 'userToken']))
      .finally(() => setIsRestoring(false));
  }, []);

  const value = useMemo(() => ({
    user,
    isRestoring,
    signIn: async (credentials) => {
      const result = await API.auth.login(credentials);
      if (!result?.token || !result?.user) throw new Error('The server returned an invalid login response.');
      await AsyncStorage.multiSet([['userToken', result.token], ['userInfo', JSON.stringify(result.user)]]);
      setUser(result.user);
    },
    signOut: async () => {
      try { await API.auth.logout(); } catch (_) { /* Clear the local session even if offline. */ }
      await AsyncStorage.multiRemove(['userToken', 'userInfo']);
      setUser(null);
    },
  }), [isRestoring, user]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside AuthProvider');
  return context;
}
