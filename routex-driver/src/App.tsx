import React, { useEffect } from 'react';
import { StatusBar } from 'react-native';
import { Provider as PaperProvider, MD3DarkTheme } from 'react-native-paper';
import { Provider as ReduxProvider } from 'react-redux';
import { PersistGate } from 'redux-persist/integration/react';
import {
  NavigationContainer,
  DarkTheme as NavigationDarkTheme,
} from '@react-navigation/native';
import { store, persistor } from './redux/store';
import { AppNavigator } from './navigation/AppNavigator';
import { FcmService } from './services/firebase/fcmService';

import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

// Premium Brand Blue #2563EB
const paperDarkTheme = {
  ...MD3DarkTheme,
  colors: {
    ...MD3DarkTheme.colors,
    primary: '#2563EB',
    secondary: '#10B981',
    error: '#EF4444',
    background: '#111827',
    surface: '#1F2937',
  },
};

const navigationDarkTheme = {
  ...NavigationDarkTheme,
  colors: {
    ...NavigationDarkTheme.colors,
    primary: '#2563EB',
    background: '#111827',
    card: '#1F2937',
    text: '#FFFFFF',
    border: '#374151',
    notification: '#2563EB',
  },
};

export default function App() {
  useEffect(() => {
    // Bootstrap Firebase FCM when App mounts
    const initFirebase = async () => {
      // 1. Request notifications permissions (supports Android 13+)
      await FcmService.requestUserPermission();

      // 2. Fetch and sync FCM token (saves securely & uploads to server if logged in)
      await FcmService.getFcmTokenAndSync();

      // 3. Listen for token refreshes
      FcmService.listenToTokenRefresh();

      // 4. Initialize FCM notifications foreground/background click handlers
      FcmService.initializeNotificationHandlers();
    };

    initFirebase();
  }, []);

  return (
    <ReduxProvider store={store}>
      <PersistGate loading={null} persistor={persistor}>
        <PaperProvider
          theme={paperDarkTheme}
          settings={{
            icon: props => <MaterialCommunityIcons {...props} />,
          }}>
          <NavigationContainer theme={navigationDarkTheme}>
            <StatusBar barStyle="light-content" backgroundColor="#111827" />
            <AppNavigator />
          </NavigationContainer>
        </PaperProvider>
      </PersistGate>
    </ReduxProvider>
  );
}
