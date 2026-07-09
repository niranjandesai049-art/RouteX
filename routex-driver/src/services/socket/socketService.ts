import { io, Socket } from 'socket.io-client';
import Config from 'react-native-config';
import { store } from '../../redux/store';
import {
  addAvailableJob,
  removeAvailableJob,
} from '../../redux/slices/jobsSlice';
import { addNotification } from '../../redux/slices/notificationSlice';

class SocketService {
  private socket: Socket | null = null;
  private socketUrl = Config.SOCKET_URL || 'http://10.0.2.2:3000';

  connect(driverId: string, token: string) {
    if (this.socket?.connected) {
      return;
    }

    console.log(`Connecting Socket.IO for driver: ${driverId}`);
    this.socket = io(this.socketUrl, {
      auth: { token },
      transports: ['websocket'],
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 2000,
    });

    this.socket.on('connect', () => {
      console.log('Socket.IO connected successfully.');
      // Join driver-specific room
      this.socket?.emit('join_room', { room: `driver:${driverId}` });
    });

    this.socket.on('disconnect', reason => {
      console.warn('Socket.IO disconnected:', reason);
    });

    // Handle realtime jobs broadcasted to driver
    this.socket.on('new_job_available', job => {
      console.log('New job received via WebSocket:', job);
      store.dispatch(addAvailableJob(job));
      // Dispatch notification slice as well to keep the driver alerted
      store.dispatch(
        addNotification({
          id: job.id,
          title: 'New Trip Available',
          body: `Load offer from ${job.pickup_address} to ${job.delivery_address}`,
        }),
      );
    });

    this.socket.on('job_cancelled', payload => {
      console.log('Job cancelled by shipper:', payload);
      store.dispatch(removeAvailableJob(payload.bookingId));
      store.dispatch(
        addNotification({
          id: payload.bookingId,
          title: 'Trip Cancelled',
          body: `Load offer ${payload.bookingReference || ''} was cancelled.`,
        }),
      );
    });

    this.socket.on('job_assigned_other', payload => {
      console.log('Job assigned to another driver:', payload);
      store.dispatch(removeAvailableJob(payload.bookingId));
    });
  }

  emitLocationUpdate(payload: {
    latitude: number;
    longitude: number;
    heading: number;
    speed: number;
    driverId: string;
  }) {
    if (this.socket?.connected) {
      this.socket.emit('location_update', payload);
      this.socket.emit('driver:locationUpdate', payload);
      this.socket.emit('driver:location', payload);
    }
  }

  disconnect() {
    if (this.socket) {
      console.log('Disconnecting Socket.IO client.');
      this.socket.disconnect();
      this.socket = null;
    }
  }

  getSocket() {
    return this.socket;
  }
}

export const socketService = new SocketService();
