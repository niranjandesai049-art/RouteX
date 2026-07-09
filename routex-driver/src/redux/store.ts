import { configureStore, combineReducers } from '@reduxjs/toolkit';
import {
  persistStore,
  persistReducer,
  FLUSH,
  REHYDRATE,
  PAUSE,
  PERSIST,
  PURGE,
  REGISTER,
} from 'redux-persist';
import AsyncStorage from '@react-native-async-storage/async-storage';

import authReducer from './slices/authSlice';
import driverReducer from './slices/driverSlice';
import jobsReducer from './slices/jobsSlice';
import walletReducer from './slices/walletSlice';
import notificationReducer from './slices/notificationSlice';
import locationReducer from './slices/locationSlice';

const rootReducer = combineReducers({
  auth: authReducer,
  driver: driverReducer,
  jobs: jobsReducer,
  wallet: walletReducer,
  notification: notificationReducer,
  location: locationReducer,
});

const persistConfig = {
  key: 'root',
  storage: AsyncStorage,
  whitelist: ['auth', 'driver'], // Persist auth and driver info across sessions
};

const persistedReducer = persistReducer(persistConfig, rootReducer);

export const store = configureStore({
  reducer: persistedReducer,
  middleware: getDefaultMiddleware =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: [FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER],
      },
    }),
});

export const persistor = persistStore(store);

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
