import auth from '@react-native-firebase/auth';

export type AuthStackParamList = {
  Login: undefined;
  OTP: {
    phone: string; // e.g. "9876543210" (without +91, for display)
  };
};

export type AppStackParamList = {
  Dashboard: undefined;
  Jobs: undefined;
  Wallet: undefined;
  Notifications: undefined;
  Profile: undefined;
  Settings: undefined;
};

/** Legacy flat param list — kept so existing screen imports don't break */
export type RootStackParamList = {
  Splash: undefined;
  Login: undefined;
  OTP: {
    phone: string;
  };
  Dashboard: undefined;
  Jobs: undefined;
  Wallet: undefined;
  Notifications: undefined;
  Profile: undefined;
  Settings: undefined;
};
