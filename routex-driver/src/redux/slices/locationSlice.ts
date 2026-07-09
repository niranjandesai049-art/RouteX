import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface Coordinates {
  latitude: number;
  longitude: number;
  heading: number;
  speed: number;
}

interface LocationState {
  currentLocation: Coordinates | null;
  isTracking: boolean;
  error: string | null;
}

const initialState: LocationState = {
  currentLocation: null,
  isTracking: false,
  error: null,
};

const locationSlice = createSlice({
  name: 'location',
  initialState,
  reducers: {
    updateLocationState(state, action: PayloadAction<Coordinates>) {
      state.currentLocation = action.payload;
      state.error = null;
    },
    setTrackingStatus(state, action: PayloadAction<boolean>) {
      state.isTracking = action.payload;
    },
    setLocationError(state, action: PayloadAction<string | null>) {
      state.error = action.payload;
    },
  },
});

export const { updateLocationState, setTrackingStatus, setLocationError } =
  locationSlice.actions;

export default locationSlice.reducer;
