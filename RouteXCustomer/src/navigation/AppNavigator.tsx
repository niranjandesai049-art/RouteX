import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useSelector } from 'react-redux';
import { RootState } from '../redux/store';
import { RootStackParamList } from '../types/navigation.types';
import Icon from 'react-native-vector-icons/Feather';

// Screens
import SplashScreen from '../screens/Splash/SplashScreen';
import LoginScreen from '../screens/Login/LoginScreen';
import OtpScreen from '../screens/OTP/OtpScreen';
import DashboardScreen from '../screens/Dashboard/DashboardScreen';
import WalletScreen from '../screens/Wallet/WalletScreen';
import ProfileScreen from '../screens/Profile/ProfileScreen';
import { CreateShipmentScreen } from '../screens/CreateShipment/CreateShipmentScreen';
import { BookingSummaryScreen } from '../screens/BookingSummary/BookingSummaryScreen';
import { ActiveShipmentScreen } from '../screens/ActiveShipment/ActiveShipmentScreen';

const Stack = createStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator();
const AppStack = createStackNavigator<RootStackParamList>();

/**
 * Auth stack — shown when the driver is NOT authenticated.
 * White background, no header.
 */
function AuthStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        cardStyle: { backgroundColor: '#FFFFFF' },
        animationEnabled: true,
      }}>
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen
        name="OTP"
        component={OtpScreen}
        options={{ gestureEnabled: false }}
      />
    </Stack.Navigator>
  );
}

/**
 * App tabs — Bottom Tab Navigator for premium modern UI.
 */
function AppTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarIcon: ({ color, size }) => {
          let iconName = 'home';
          if (route.name === 'Dashboard') {
            iconName = 'map';
          } else if (route.name === 'Wallet') {
            iconName = 'credit-card';
          } else if (route.name === 'Profile') {
            iconName = 'user';
          }

          return <Icon name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#2563EB',
        tabBarInactiveTintColor: '#94A3B8',
        tabBarStyle: {
          backgroundColor: '#FFFFFF',
          borderTopWidth: 1,
          borderTopColor: '#F1F5F9',
          height: 65,
          paddingBottom: 10,
          paddingTop: 5,
          elevation: 10,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: 0.05,
          shadowRadius: 10,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '600',
        },
      })}>
      <Tab.Screen name="Dashboard" component={DashboardScreen} />
      <Tab.Screen name="Wallet" component={WalletScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
}

/**
 * App stack — handles main application flow screens.
 */
function AppStackScreen() {
  return (
    <AppStack.Navigator screenOptions={{ headerShown: false }}>
      <AppStack.Screen name="HomeTabs" component={AppTabs} />
      <AppStack.Screen name="CreateShipment" component={CreateShipmentScreen} />
      <AppStack.Screen name="BookingSummary" component={BookingSummaryScreen} />
      <AppStack.Screen name="ActiveShipment" component={ActiveShipmentScreen} />
    </AppStack.Navigator>
  );
}

/**
 * Root navigator — handles Splash + auth guard.
 */
export function AppNavigator() {
  const isAuthenticated = useSelector(
    (state: RootState) => state.auth.isAuthenticated,
  );
  const [splashDone, setSplashDone] = React.useState(false);

  if (!splashDone) {
    return (
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Splash">
          {props => (
            <SplashScreen
              {...props}
              onSplashComplete={() => setSplashDone(true)}
            />
          )}
        </Stack.Screen>
      </Stack.Navigator>
    );
  }

  return isAuthenticated ? <AppStackScreen /> : <AuthStack />;
}

export default AppNavigator;
