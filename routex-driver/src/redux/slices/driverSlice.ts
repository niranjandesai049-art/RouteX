import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface VehicleDetails {
  type: string;
  plateNumber: string;
  capacity: number;
}

export interface DriverProfile {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  licenseNumber: string;
  experienceYears: number;
  status: 'active' | 'inactive' | 'verified';
  vehicle: VehicleDetails | null;
}

interface DriverState {
  profile: DriverProfile | null;
  loading: boolean;
  error: string | null;
}

const initialState: DriverState = {
  profile: null,
  loading: false,
  error: null,
};

const driverSlice = createSlice({
  name: 'driver',
  initialState,
  reducers: {
    setDriverProfile(state, action: PayloadAction<DriverProfile>) {
      state.profile = action.payload;
      state.error = null;
    },
    clearDriverProfile(state) {
      state.profile = null;
      state.error = null;
    },
    updateVehicle(state, action: PayloadAction<VehicleDetails>) {
      if (state.profile) {
        state.profile.vehicle = action.payload;
      }
    },
    setDriverError(state, action: PayloadAction<string>) {
      state.error = action.payload;
    },
  },
});

export const {
  setDriverProfile,
  clearDriverProfile,
  updateVehicle,
  setDriverError,
} = driverSlice.actions;

export default driverSlice.reducer;
