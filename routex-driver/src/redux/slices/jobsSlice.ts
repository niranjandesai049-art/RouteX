import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface BookingJob {
  id: string;
  booking_reference: string;
  pickup_address: string;
  delivery_address: string;
  weight: number;
  quoted_price: number;
  status: string;
  pickup_latitude?: number;
  pickup_longitude?: number;
  delivery_latitude?: number;
  delivery_longitude?: number;
}

interface JobsState {
  availableJobs: BookingJob[];
  activeJob: BookingJob | null;
}

const initialState: JobsState = {
  availableJobs: [],
  activeJob: null,
};

const jobsSlice = createSlice({
  name: 'jobs',
  initialState,
  reducers: {
    setAvailableJobs(state, action: PayloadAction<BookingJob[]>) {
      state.availableJobs = action.payload;
    },
    addAvailableJob(state, action: PayloadAction<BookingJob>) {
      // Avoid duplicate insertion
      if (!state.availableJobs.some(j => j.id === action.payload.id)) {
        state.availableJobs.unshift(action.payload);
      }
    },
    removeAvailableJob(state, action: PayloadAction<string>) {
      state.availableJobs = state.availableJobs.filter(
        j => j.id !== action.payload,
      );
    },
    setActiveJob(state, action: PayloadAction<BookingJob | null>) {
      state.activeJob = action.payload;
    },
  },
});

export const {
  setAvailableJobs,
  addAvailableJob,
  removeAvailableJob,
  setActiveJob,
} = jobsSlice.actions;
export default jobsSlice.reducer;
