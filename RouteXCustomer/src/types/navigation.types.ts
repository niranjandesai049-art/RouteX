export type AuthStackParamList = {
  Login: undefined;
  OTP: {
    phone: string; // e.g. "9876543210" (without +91, for display)
  };
};

export type AppStackParamList = {
  HomeTabs: undefined; // To wrap tabs
  CreateShipment: undefined;
  BookingSummary: { bookingId: string };
  ActiveShipment: { bookingId: string };
  Dashboard: undefined;
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
  HomeTabs: undefined;
  CreateShipment: undefined;
  BookingSummary: { bookingId: string };
  ActiveShipment: { bookingId: string };
  Dashboard: undefined;
  Wallet: undefined;
  Notifications: undefined;
  Profile: undefined;
  Settings: undefined;
};
