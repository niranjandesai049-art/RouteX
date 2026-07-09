import React, { useEffect, useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  Linking,
  Alert,
} from 'react-native';
import { AppMapView } from '../../components/MapView';
import { BookingsApi } from '../../api/bookings.api';
import { socketService } from '../../services/socket/socketService';
import Icon from 'react-native-vector-icons/Feather';

export function ActiveShipmentScreen({ route, navigation }: any) {
  const { bookingId } = route.params;
  const [booking, setBooking] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [driverLocation, setDriverLocation] = useState<any>(null);

  const fetchDetails = async () => {
    try {
      const details = await BookingsApi.getBookingDetails(bookingId);
      setBooking(details);
    } catch (error) {
      console.error('Fetch active shipment details error:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDetails();

    // Set up WebSocket listener
    const socket = socketService.getSocket();
    if (socket) {
      console.log(`Joining booking room ${bookingId} as shipper`);
      socket.emit('shipper:join', { bookingId });

      socket.on('driver:locationUpdate', (data: any) => {
        console.log('Driver location update received:', data);
        if (
          data.bookingId === bookingId ||
          data.driverId === booking?.driver_id
        ) {
          setDriverLocation({
            latitude: data.latitude,
            longitude: data.longitude,
          });
        }
      });

      // Listen for waypoint completions
      socket.on('booking:waypoint_completed', () => {
        fetchDetails();
      });
    }

    // Fallback polling every 8 seconds
    const interval = setInterval(fetchDetails, 8000);

    return () => {
      clearInterval(interval);
      if (socket) {
        socket.off('driver:locationUpdate');
        socket.off('booking:waypoint_completed');
      }
    };
  }, [bookingId]);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2563EB" />
        <Text style={styles.loadingText}>
          Initializing live tracking map...
        </Text>
      </View>
    );
  }

  if (!booking) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.errorText}>Shipment not found.</Text>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => navigation.navigate('Dashboard')}>
          <Text style={styles.backBtnText}>Go to Dashboard</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const pickupLoc = booking.pickup_address
    ? {
        latitude: Number(booking.pickup_address.latitude),
        longitude: Number(booking.pickup_address.longitude),
      }
    : null;

  const deliveryLoc = booking.delivery_address
    ? {
        latitude: Number(booking.delivery_address.latitude),
        longitude: Number(booking.delivery_address.longitude),
      }
    : null;

  const waypointsList = booking.booking_stops
    ? booking.booking_stops
        .filter((s: any) => s.stop_type === 'waypoint')
        .map((s: any) => ({
          latitude: Number(s.latitude),
          longitude: Number(s.longitude),
        }))
    : [];

  const handleCallDriver = () => {
    const phone = booking.drivers?.profiles?.phone_number;
    if (phone) {
      Linking.openURL(`tel:${phone}`).catch(() => {
        Alert.alert('Error', 'Could not initiate phone call.');
      });
    } else {
      Alert.alert(
        'Unavailable',
        'Driver contact information is not available.',
      );
    }
  };

  // Find the current active stop
  const currentStop = booking.booking_stops?.find(
    (s: any) => s.status !== 'completed',
  );

  return (
    <View style={styles.container}>
      {/* Full Screen Live Map */}
      <AppMapView
        driverLocation={driverLocation}
        pickupLocation={pickupLoc}
        deliveryLocation={deliveryLoc}
        waypoints={waypointsList}
        showRoute={true}
      />

      {/* Top Floating Back Button */}
      <TouchableOpacity
        style={styles.floatingBack}
        onPress={() => navigation.navigate('BookingSummary', { bookingId })}>
        <Icon name="arrow-left" size={24} color="#0F172A" />
      </TouchableOpacity>

      {/* Bottom Driver Tracking Card */}
      <View style={styles.bottomCard}>
        <View style={styles.cardHeader}>
          <View style={styles.pulseContainer}>
            <View style={styles.pulseDot} />
            <Text style={styles.liveTrackingText}>LIVE TRACKING</Text>
          </View>
          <View style={styles.statusBadge}>
            <Text style={styles.statusText}>
              {booking.status.toUpperCase()}
            </Text>
          </View>
        </View>

        {currentStop ? (
          <View style={styles.stopInfoBox}>
            <Text style={styles.headingToLabel}>
              HEADING TO STOP {currentStop.stop_order}
            </Text>
            <Text style={styles.stopAddress} numberOfLines={2}>
              {currentStop.address}
            </Text>
          </View>
        ) : (
          <View style={styles.stopInfoBox}>
            <Text style={styles.headingToLabel}>SHIPMENT ARRIVED</Text>
            <Text style={styles.stopAddress}>Completed all deliveries.</Text>
          </View>
        )}

        <View style={styles.divider} />

        {/* Driver Profile */}
        {booking.drivers ? (
          <View style={styles.driverRow}>
            <View style={styles.avatar}>
              <Icon name="truck" size={20} color="#2563EB" />
            </View>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={styles.driverName}>
                {booking.drivers.profiles.first_name}{' '}
                {booking.drivers.profiles.last_name}
              </Text>
              <Text style={styles.vehicleText}>Verified RouteX Partner</Text>
            </View>
            <TouchableOpacity style={styles.callBtn} onPress={handleCallDriver}>
              <Icon name="phone" size={20} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.searchingBox}>
            <ActivityIndicator size="small" color="#F59E0B" />
            <Text style={styles.searchingText}>
              Matching cargo with nearest drivers...
            </Text>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
  },
  loadingText: { marginTop: 12, fontSize: 16, color: '#64748B' },
  errorText: { fontSize: 16, color: '#EF4444', marginBottom: 20 },
  backBtn: { backgroundColor: '#2563EB', padding: 12, borderRadius: 8 },
  backBtnText: { color: '#FFFFFF', fontWeight: '700' },
  floatingBack: {
    position: 'absolute',
    top: 50,
    left: 16,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 5,
    zIndex: 30,
  },
  bottomCard: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    paddingBottom: 36,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 10,
    zIndex: 20,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  pulseContainer: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  pulseDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#EF4444',
  },
  liveTrackingText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#EF4444',
    letterSpacing: 1,
  },
  statusBadge: {
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  statusText: { fontSize: 11, fontWeight: '700', color: '#2563EB' },
  stopInfoBox: { marginBottom: 16 },
  headingToLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#64748B',
    letterSpacing: 0.5,
  },
  stopAddress: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
    marginTop: 4,
  },
  divider: { height: 1, backgroundColor: '#F1F5F9', marginBottom: 16 },
  driverRow: { flexDirection: 'row', alignItems: 'center' },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  driverName: { fontSize: 15, fontWeight: '700', color: '#0F172A' },
  vehicleText: { fontSize: 13, color: '#64748B', marginTop: 2 },
  callBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#10B981',
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchingBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFBEB',
    borderRadius: 12,
    padding: 14,
    gap: 10,
  },
  searchingText: { fontSize: 14, fontWeight: '600', color: '#D97706' },
});
