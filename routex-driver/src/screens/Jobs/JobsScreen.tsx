import React, { useEffect } from 'react';
import {
  StyleSheet,
  View,
  FlatList,
  Text,
  Dimensions,
  TouchableOpacity,
} from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../../types/navigation.types';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../../redux/store';
import { BookingsApi } from '../../api/bookings.api';
import {
  setAvailableJobs,
  setActiveJob,
  removeAvailableJob,
} from '../../redux/slices/jobsSlice';
import { AppMapView } from '../../components/MapView';
import Icon from 'react-native-vector-icons/Feather';

type NavigationProp = StackNavigationProp<RootStackParamList, 'Jobs'>;

interface Props {
  navigation: NavigationProp;
}

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

const getCoords = (
  addressVal: any,
  defaultCoords: { latitude: number; longitude: number },
) => {
  if (!addressVal) {
    return defaultCoords;
  }
  let parsed = addressVal;
  if (typeof addressVal === 'string') {
    try {
      parsed = JSON.parse(addressVal);
    } catch {
      return defaultCoords;
    }
  }
  const lat = Number(parsed.latitude);
  const lng = Number(parsed.longitude);
  if (!isNaN(lat) && !isNaN(lng)) {
    return { latitude: lat, longitude: lng };
  }
  return defaultCoords;
};

export function JobsScreen({ navigation }: Props) {
  const dispatch = useDispatch();
  const availableJobs = useSelector(
    (state: RootState) => state.jobs.availableJobs,
  );
  const activeJob = useSelector((state: RootState) => state.jobs.activeJob);
  const currentLocation = useSelector(
    (state: RootState) => state.location.currentLocation,
  );

  const fetchJobs = async () => {
    try {
      const jobs = await BookingsApi.getAvailableJobs();
      dispatch(setAvailableJobs(jobs));
    } catch (err: any) {
      console.error(
        'Failed to fetch available jobs:',
        err.message || String(err),
      );
    }
  };

  useEffect(() => {
    fetchJobs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleAcceptJob = async (jobId: string) => {
    try {
      const acceptedJob = await BookingsApi.acceptJob(jobId);

      // Inject mock coordinates for visualization if not present in payload
      const jobWithCoords = {
        ...acceptedJob,
        pickup_latitude: acceptedJob.pickup_latitude || 18.9438, // Mumbai Port
        pickup_longitude: acceptedJob.pickup_longitude || 72.8409,
        delivery_latitude: acceptedJob.delivery_latitude || 18.5204, // Pune
        delivery_longitude: acceptedJob.delivery_longitude || 73.8567,
      };

      dispatch(setActiveJob(jobWithCoords));
      dispatch(removeAvailableJob(jobId));
    } catch (err: any) {
      console.error('Accept job failed:', err.message || String(err));
    }
  };

  const handleRejectJob = async (jobId: string) => {
    try {
      await BookingsApi.rejectJob(jobId);
      dispatch(removeAvailableJob(jobId));
    } catch (err: any) {
      console.error('Reject job failed:', err.message || String(err));
    }
  };

  const handleCompleteTrip = async () => {
    if (!activeJob) {
      return;
    }
    try {
      // Submit a mock signature base64 image representation
      const mockSignature =
        'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADIA...';
      await BookingsApi.submitEpod(activeJob.id, mockSignature);
      dispatch(setActiveJob(null));
      navigation.navigate('Dashboard');
    } catch (err: any) {
      console.error('Trip completion failed:', err.message || String(err));
    }
  };

  // Define location coordinates for mapping
  const pickupCoords = getCoords(activeJob?.pickup_address, {
    latitude: 18.9438,
    longitude: 72.8409,
  });

  const deliveryCoords = getCoords(activeJob?.delivery_address, {
    latitude: 18.5204,
    longitude: 73.8567,
  });

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}>
          <Icon name="arrow-left" size={24} color="#0F172A" />
        </TouchableOpacity>
        <Text style={styles.title}>
          {activeJob ? 'Active Trip' : 'Available Loads'}
        </Text>
        <View style={{ width: 24 }} />
      </View>

      {activeJob ? (
        <View style={styles.activeContainer}>
          <View style={styles.mapContainer}>
            <AppMapView
              driverLocation={currentLocation}
              pickupLocation={pickupCoords}
              deliveryLocation={deliveryCoords}
              showRoute={true}
            />

            {/* Overlay Status Badge */}
            <View style={styles.statusBadge}>
              <View style={styles.statusDot} />
              <Text style={styles.statusText}>In Transit to Destination</Text>
            </View>
          </View>

          <View style={styles.activeCard}>
            <View style={styles.cardHeader}>
              <Text style={styles.refText}>
                Trip #{activeJob.booking_reference}
              </Text>
              <Text style={styles.priceText}>₹{activeJob.quoted_price}</Text>
            </View>

            <View style={styles.routeContainer}>
              <View style={styles.routeTimeline}>
                <View style={styles.timelineDotBlue} />
                <View style={styles.timelineLine} />
                <View style={styles.timelineDotRed} />
              </View>

              <View style={styles.routeDetails}>
                <View style={styles.locationBlock}>
                  <Text style={styles.locationLabel}>PICKUP</Text>
                  <Text style={styles.locationValue} numberOfLines={2}>
                    {getAddressString(activeJob.pickup_address)}
                  </Text>
                </View>
                <View style={styles.locationBlock}>
                  <Text style={styles.locationLabel}>DROPOFF</Text>
                  <Text style={styles.locationValue} numberOfLines={2}>
                    {getAddressString(activeJob.delivery_address)}
                  </Text>
                </View>
              </View>
            </View>

            <View style={styles.metaRow}>
              <View style={styles.metaItem}>
                <Icon name="package" size={16} color="#64748B" />
                <Text style={styles.metaText}>{activeJob.weight} Tons</Text>
              </View>
              <View style={styles.metaItem}>
                <Icon name="clock" size={16} color="#64748B" />
                <Text style={styles.metaText}>ETA: 2h 45m</Text>
              </View>
            </View>

            <TouchableOpacity
              style={styles.completeBtn}
              onPress={handleCompleteTrip}>
              <Text style={styles.completeBtnText}>
                Complete Trip & Upload ePOD
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        <View style={styles.listContainer}>
          <FlatList
            data={availableJobs}
            keyExtractor={item => item.id}
            onRefresh={fetchJobs}
            refreshing={false}
            contentContainerStyle={styles.listContent}
            renderItem={({ item }) => (
              <View style={styles.jobCard}>
                <View style={styles.cardHeader}>
                  <Text style={styles.refText}>#{item.booking_reference}</Text>
                  <Text style={styles.priceText}>₹{item.quoted_price}</Text>
                </View>

                <View style={styles.routeContainer}>
                  <View style={styles.routeTimeline}>
                    <View style={styles.timelineDotBlue} />
                    <View style={styles.timelineLine} />
                    <View style={styles.timelineDotRed} />
                  </View>

                  <View style={styles.routeDetails}>
                    <View style={styles.locationBlock}>
                      <Text style={styles.locationLabel}>PICKUP</Text>
                      <Text style={styles.locationValue} numberOfLines={1}>
                        {getAddressString(item.pickup_address)}
                      </Text>
                    </View>
                    <View style={styles.locationBlock}>
                      <Text style={styles.locationLabel}>DROPOFF</Text>
                      <Text style={styles.locationValue} numberOfLines={1}>
                        {getAddressString(item.delivery_address)}
                      </Text>
                    </View>
                  </View>
                </View>

                <View style={styles.cardActions}>
                  <TouchableOpacity
                    style={styles.rejectBtn}
                    onPress={() => handleRejectJob(item.id)}>
                    <Text style={styles.rejectBtnText}>Decline</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.acceptBtn}
                    onPress={() => handleAcceptJob(item.id)}>
                    <Text style={styles.acceptBtnText}>Accept Load</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <View style={styles.emptyIconCircle}>
                  <Icon name="map-pin" size={32} color="#94A3B8" />
                </View>
                <Text style={styles.emptyTitle}>No Loads Available</Text>
                <Text style={styles.emptySubtitle}>
                  Make sure you are online and stay in high-demand areas.
                </Text>
                <TouchableOpacity style={styles.refreshBtn} onPress={fetchJobs}>
                  <Text style={styles.refreshBtnText}>Refresh</Text>
                </TouchableOpacity>
              </View>
            }
          />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 50,
    paddingBottom: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  backButton: {
    padding: 8,
    marginLeft: -8,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0F172A',
  },
  activeContainer: {
    flex: 1,
  },
  mapContainer: {
    flex: 1,
    position: 'relative',
  },
  statusBadge: {
    position: 'absolute',
    top: 16,
    alignSelf: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    gap: 8,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#2563EB',
  },
  statusText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
  },
  activeCard: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 40,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 10,
    marginTop: -20,
  },
  listContainer: {
    flex: 1,
  },
  listContent: {
    padding: 16,
    paddingBottom: 40,
  },
  jobCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  refText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  priceText: {
    fontSize: 20,
    fontWeight: '800',
    color: '#10B981',
  },
  routeContainer: {
    flexDirection: 'row',
    marginBottom: 20,
  },
  routeTimeline: {
    width: 20,
    alignItems: 'center',
    marginRight: 12,
  },
  timelineDotBlue: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#2563EB',
    marginTop: 4,
  },
  timelineLine: {
    width: 2,
    flex: 1,
    backgroundColor: '#E2E8F0',
    marginVertical: 4,
  },
  timelineDotRed: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#EF4444',
    marginBottom: 4,
  },
  routeDetails: {
    flex: 1,
    justifyContent: 'space-between',
  },
  locationBlock: {
    marginBottom: 16,
  },
  locationLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#64748B',
    marginBottom: 2,
  },
  locationValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#334155',
  },
  metaRow: {
    flexDirection: 'row',
    gap: 20,
    marginBottom: 24,
    backgroundColor: '#F8FAFC',
    padding: 12,
    borderRadius: 12,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  metaText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#475569',
  },
  cardActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 4,
  },
  rejectBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
  },
  rejectBtnText: {
    color: '#64748B',
    fontWeight: '700',
    fontSize: 15,
  },
  acceptBtn: {
    flex: 2,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#2563EB',
    alignItems: 'center',
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  acceptBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 15,
  },
  completeBtn: {
    width: '100%',
    backgroundColor: '#0F172A',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  completeBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 16,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 60,
  },
  emptyIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 15,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: 32,
    marginBottom: 32,
  },
  refreshBtn: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  refreshBtnText: {
    color: '#0F172A',
    fontWeight: '700',
    fontSize: 15,
  },
});

export default JobsScreen;
