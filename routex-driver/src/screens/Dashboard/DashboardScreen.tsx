import React, { useEffect, useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Modal,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { Button, Switch, IconButton, Badge } from 'react-native-paper';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../../types/navigation.types';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../../redux/store';
import { setOnlineStatus } from '../../redux/slices/authSlice';
import { locationService } from '../../services/location/locationService';
import { AppMapView } from '../../components/MapView';
import { socketService } from '../../services/socket/socketService';
import Icon from 'react-native-vector-icons/Feather';

const { width } = Dimensions.get('window');

const getAddressString = (addressVal: any): string => {
  if (!addressVal) {
    return '';
  }
  if (typeof addressVal === 'string') {
    try {
      const parsed = JSON.parse(addressVal);
      return parsed.address || addressVal;
    } catch {
      return addressVal;
    }
  }
  return addressVal.address || String(addressVal);
};

export function DashboardScreen({ navigation }: any) {
  const dispatch = useDispatch();
  const { driverName, isOnline, driverId } = useSelector(
    (state: RootState) => state.auth,
  );
  const activeJob = useSelector((state: RootState) => state.jobs.activeJob);
  const wallet = useSelector((state: RootState) => state.wallet);
  const currentLocation = useSelector(
    (state: RootState) => state.location.currentLocation,
  );
  const unreadNotifications = useSelector(
    (state: RootState) => state.notification.unreadCount,
  );

  const [newJobRequest, setNewJobRequest] = useState<any>(null);

  useEffect(() => {
    // Listen for new booking matches from socket (broadcasted to nearby drivers)
    const socket = socketService.getSocket();
    if (!socket) {
      return;
    }

    const handleNewBooking = (data: any) => {
      // Only show if we don't have an active job
      if (!activeJob && isOnline) {
        setNewJobRequest(data);
      }
    };

    // The backend broadcasts `shipment:searching` or `booking:searching` when a new load is created
    // Actually backend sends notification. But we can also listen to socket events.
    socket.on('booking:searching', handleNewBooking);

    return () => {
      socket.off('booking:searching', handleNewBooking);
    };
  }, [activeJob, isOnline]);

  const handleToggleOnline = async (value: boolean) => {
    dispatch(setOnlineStatus(value));
    if (value) {
      try {
        await locationService.startTracking();
      } catch (err) {
        console.error('Location service start failed:', err);
        dispatch(setOnlineStatus(false));
      }
    } else {
      await locationService.stopTracking();
      setNewJobRequest(null); // Clear incoming requests
    }
  };

  const acceptJob = () => {
    setNewJobRequest(null);
    navigation.navigate('Jobs');
    // Usually triggers API call to assign driver
  };

  const declineJob = () => {
    setNewJobRequest(null);
  };

  return (
    <View style={styles.container}>
      {/* Full Screen Map */}
      <View style={styles.mapContainer}>
        <AppMapView driverLocation={currentLocation} />
        {!isOnline && (
          <View style={styles.offlineOverlay}>
            <Icon
              name="power"
              size={48}
              color="#94A3B8"
              style={{ marginBottom: 16 }}
            />
            <Text style={styles.offlineTitle}>You are Offline</Text>
            <Text style={styles.offlineSubtitle}>
              Go online to start receiving ride requests
            </Text>
          </View>
        )}
      </View>

      {/* Top Header Overlay */}
      <View style={styles.header}>
        <View style={styles.profileBadge}>
          <View style={styles.avatar}>
            <Icon name="user" size={20} color="#2563EB" />
          </View>
          <View>
            <Text style={styles.welcomeText}>Hello,</Text>
            <Text style={styles.nameText}>{driverName || 'Driver'}</Text>
          </View>
        </View>

        <View style={styles.headerRight}>
          <TouchableOpacity
            style={styles.iconButton}
            onPress={() => navigation.navigate('Notifications')}>
            <Icon name="bell" size={20} color="#0F172A" />
            {unreadNotifications > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{unreadNotifications}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* Bottom Status Card */}
      <View style={styles.bottomCard}>
        {/* Toggle Online/Offline */}
        <View style={styles.toggleRow}>
          <View>
            <Text style={styles.statusLabel}>
              {isOnline ? 'You are Online' : 'You are Offline'}
            </Text>
            <Text style={styles.statusSub}>
              {isOnline
                ? 'Searching for trips...'
                : 'Go online to start earning'}
            </Text>
          </View>
          <Switch
            value={isOnline}
            onValueChange={handleToggleOnline}
            color="#2563EB"
          />
        </View>

        <View style={styles.divider} />

        {/* Stats Row */}
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Icon name="dollar-sign" size={20} color="#10B981" />
            <Text style={styles.statLabel}>Today</Text>
            <Text style={styles.statValue}>₹{wallet.balance.toFixed(2)}</Text>
          </View>

          <View style={styles.statDivider} />

          <View style={styles.statItem}>
            <Icon name="truck" size={20} color="#2563EB" />
            <Text style={styles.statLabel}>Trips</Text>
            <Text style={styles.statValue}>{activeJob ? '1 Active' : '0'}</Text>
          </View>
        </View>

        {/* Active Trip CTA */}
        {activeJob && (
          <TouchableOpacity
            style={styles.activeJobBtn}
            onPress={() => navigation.navigate('Jobs')}>
            <View style={styles.activeJobContent}>
              <View style={styles.pulseIndicator} />
              <Text style={styles.activeJobText}>View Active Trip</Text>
            </View>
            <Icon name="chevron-right" size={20} color="#FFFFFF" />
          </TouchableOpacity>
        )}
      </View>

      {/* Incoming Job Modal */}
      <Modal visible={!!newJobRequest} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.jobModalCard}>
            <View style={styles.jobModalHeader}>
              <Text style={styles.jobModalTitle}>New Load Available!</Text>
              <Text style={styles.jobModalSub}>
                Est. Earnings: ₹{newJobRequest?.quoted_price || '---'}
              </Text>
            </View>

            <View style={styles.jobDetails}>
              <View style={styles.locationRow}>
                <View style={styles.dotPickup} />
                <Text style={styles.locationText} numberOfLines={2}>
                  {newJobRequest?.pickup || 'Pickup Location'}
                </Text>
              </View>
              <View style={styles.routeLine} />
              <View style={styles.locationRow}>
                <View style={styles.dotDropoff} />
                <Text style={styles.locationText} numberOfLines={2}>
                  {newJobRequest?.destination || 'Dropoff Location'}
                </Text>
              </View>
            </View>

            <View style={styles.jobModalActions}>
              <TouchableOpacity style={styles.declineBtn} onPress={declineJob}>
                <Text style={styles.declineBtnText}>Decline</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.acceptBtn} onPress={acceptJob}>
                <Text style={styles.acceptBtnText}>Accept</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  mapContainer: {
    flex: 1,
    position: 'relative',
  },
  offlineOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  offlineTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 8,
  },
  offlineSubtitle: {
    fontSize: 15,
    color: '#64748B',
  },
  header: {
    position: 'absolute',
    top: 50, // SafeArea roughly
    left: 16,
    right: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    zIndex: 20,
  },
  profileBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 10,
    paddingRight: 16,
    borderRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
    gap: 10,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  welcomeText: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '600',
  },
  nameText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
  },
  headerRight: {
    alignItems: 'center',
  },
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
  },
  badge: {
    position: 'absolute',
    top: 0,
    right: 0,
    backgroundColor: '#EF4444',
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: 'bold',
  },
  bottomCard: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 30, // Extra padding for tabs
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 10,
    zIndex: 20,
  },
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  statusLabel: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0F172A',
  },
  statusSub: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 4,
  },
  divider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginBottom: 20,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  statDivider: {
    width: 1,
    height: 40,
    backgroundColor: '#E2E8F0',
  },
  statLabel: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '500',
  },
  statValue: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
  },
  activeJobBtn: {
    backgroundColor: '#0F172A',
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  activeJobContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  pulseIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#10B981',
  },
  activeJobText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    justifyContent: 'flex-end',
  },
  jobModalCard: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 40,
  },
  jobModalHeader: {
    alignItems: 'center',
    marginBottom: 24,
  },
  jobModalTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0F172A',
  },
  jobModalSub: {
    fontSize: 18,
    fontWeight: '700',
    color: '#10B981',
    marginTop: 8,
  },
  jobDetails: {
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  dotPickup: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#2563EB',
  },
  dotDropoff: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#EF4444',
  },
  routeLine: {
    width: 2,
    height: 20,
    backgroundColor: '#E2E8F0',
    marginLeft: 5,
    marginVertical: 4,
  },
  locationText: {
    flex: 1,
    fontSize: 15,
    color: '#334155',
    fontWeight: '500',
  },
  jobModalActions: {
    flexDirection: 'row',
    gap: 16,
  },
  declineBtn: {
    flex: 1,
    padding: 16,
    borderRadius: 14,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
  },
  declineBtnText: {
    color: '#64748B',
    fontSize: 16,
    fontWeight: '700',
  },
  acceptBtn: {
    flex: 2,
    padding: 16,
    borderRadius: 14,
    backgroundColor: '#2563EB',
    alignItems: 'center',
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
  },
  acceptBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
});

export default DashboardScreen;
