import Geolocation from 'react-native-geolocation-service';
import BackgroundJob from 'react-native-background-actions';
// @ts-ignore
import { check, request, PERMISSIONS, RESULTS } from 'react-native-permissions';
import { Platform } from 'react-native';
import { BookingsApi } from '../../api/bookings.api';
import { socketService } from '../socket/socketService';
import { store } from '../../redux/store';
import {
  updateLocationState,
  setTrackingStatus,
  setLocationError,
} from '../../redux/slices/locationSlice';

const sleep = (time: number) =>
  new Promise(resolve => setTimeout(resolve, time));

const backgroundOptions = {
  taskName: 'RouteXTracking',
  taskTitle: 'RouteX GPS Active',
  taskDesc: 'Sharing active location with marketplace.',
  taskIcon: {
    name: 'ic_launcher',
    type: 'mipmap',
  },
  color: '#2563EB', // Primary RouteX brand blue
  parameters: {
    delay: 5000, // 5 seconds interval
  },
};

class LocationService {
  private isTrackingActive = false;

  static async requestPermissions(): Promise<boolean> {
    if (Platform.OS === 'android') {
      try {
        // Request Fine Location Permission
        const fineStatus = await check(
          PERMISSIONS.ANDROID.ACCESS_FINE_LOCATION,
        );
        if (fineStatus !== RESULTS.GRANTED) {
          const fineRequest = await request(
            PERMISSIONS.ANDROID.ACCESS_FINE_LOCATION,
          );
          if (fineRequest !== RESULTS.GRANTED) {
            return false;
          }
        }

        // Request Background Location Permission (required for Android 10+ / API 29+)
        if (Platform.Version >= 29) {
          const bgStatus = await check(
            PERMISSIONS.ANDROID.ACCESS_BACKGROUND_LOCATION,
          );
          if (bgStatus !== RESULTS.GRANTED) {
            const bgRequest = await request(
              PERMISSIONS.ANDROID.ACCESS_BACKGROUND_LOCATION,
            );
            return bgRequest === RESULTS.GRANTED;
          }
        }

        return true;
      } catch (err) {
        console.error('Failed to request location permissions:', err);
        return false;
      }
    }
    return true;
  }

  private trackingTask = async (taskDataArguments?: { delay: number }) => {
    const delay = taskDataArguments?.delay || 5000;
    while (BackgroundJob.isRunning() && this.isTrackingActive) {
      const state = store.getState();
      const driverId = state.auth.driverId;

      if (driverId) {
        Geolocation.getCurrentPosition(
          async position => {
            const { latitude, longitude, heading, speed } = position.coords;
            console.log(`GPS Update: Lat ${latitude}, Lon ${longitude}`);

            // 1. Dispatch location to Redux locationSlice
            store.dispatch(
              updateLocationState({
                latitude,
                longitude,
                heading: heading || 0,
                speed: speed || 0,
              }),
            );

            // 2. Send update via HTTPS API Client
            try {
              await BookingsApi.updateLocation(
                latitude,
                longitude,
                heading || 0,
                speed || 0,
              );
            } catch (err: any) {
              console.warn('HTTP Geolocation report failed:', err.message);
            }

            // 3. Emit update via Socket.IO
            socketService.emitLocationUpdate({
              latitude,
              longitude,
              heading: heading || 0,
              speed: speed || 0,
              driverId,
            });
          },
          error => {
            console.error('Geolocation retrieval failed:', error);
            store.dispatch(setLocationError(error.message));
          },
          { enableHighAccuracy: true, timeout: 15000, maximumAge: 10000 },
        );
      }
      await sleep(delay);
    }
  };

  async startTracking() {
    if (this.isTrackingActive) {
      return;
    }

    const hasPermission = await LocationService.requestPermissions();
    if (!hasPermission) {
      store.dispatch(setLocationError('Location tracking permission denied.'));
      throw new Error('Location tracking permission denied.');
    }

    this.isTrackingActive = true;
    store.dispatch(setTrackingStatus(true));
    try {
      await BackgroundJob.start(this.trackingTask, backgroundOptions);
      console.log('Background location tracking started successfully.');
    } catch (err: any) {
      this.isTrackingActive = false;
      store.dispatch(setTrackingStatus(false));
      store.dispatch(setLocationError(err.message));
      console.error('Failed to start background tracking task:', err);
    }
  }

  async stopTracking() {
    this.isTrackingActive = false;
    store.dispatch(setTrackingStatus(false));
    await BackgroundJob.stop();
    console.log('Background location tracking stopped.');
  }
}

export const locationService = new LocationService();
export default locationService;
