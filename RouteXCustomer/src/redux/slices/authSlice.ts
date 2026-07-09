import { createSlice, PayloadAction, createAsyncThunk } from '@reduxjs/toolkit';
import { SecureStorage } from '../../services/secureStorage';
import { FirebaseAuthService } from '../../services/firebase/firebaseAuth.service';
import { socketService } from '../../services/socket/socketService';

interface AuthState {
  token: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  driverId: string | null;
  driverName: string | null;
  isOnline: boolean;
  /** Firebase UID from Firebase Phone Auth (null for legacy JWT-only sessions) */
  firebaseUid: string | null;
}

const initialState: AuthState = {
  token: null,
  refreshToken: null,
  isAuthenticated: false,
  driverId: null,
  driverName: null,
  isOnline: false,
  firebaseUid: null,
};

export const logout = createAsyncThunk(
  'auth/logout',
  async (_, { dispatch }) => {
    try {
      // 1. Sign out from Firebase
      await FirebaseAuthService.signOut();

      // 2. Clear secure keychain storage
      await SecureStorage.clearTokens();

      // 3. Disconnect real-time socket
      socketService.disconnect();

      // 4. Clear Redux state
      dispatch(clearCredentials());
    } catch (error) {
      console.error('Logout failed', error);
      // Force clear anyway
      await SecureStorage.clearTokens();
      dispatch(clearCredentials());
    }
  },
);

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setCredentials(
      state,
      action: PayloadAction<{
        token: string;
        refreshToken: string;
        driverId: string;
        name: string;
        firebaseUid?: string | null;
      }>,
    ) {
      state.token = action.payload.token;
      state.refreshToken = action.payload.refreshToken;
      state.isAuthenticated = true;
      state.driverId = action.payload.driverId;
      state.driverName = action.payload.name;
      state.firebaseUid = action.payload.firebaseUid ?? null;
    },
    clearCredentials(state) {
      state.token = null;
      state.refreshToken = null;
      state.isAuthenticated = false;
      state.driverId = null;
      state.driverName = null;
      state.isOnline = false;
      state.firebaseUid = null;
    },
    setOnlineStatus(state, action: PayloadAction<boolean>) {
      state.isOnline = action.payload;
    },
  },
});

export const { setCredentials, clearCredentials, setOnlineStatus } =
  authSlice.actions;
export default authSlice.reducer;
