import React, { useEffect, useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { BookingsApi } from '../../api/bookings.api';
import Icon from 'react-native-vector-icons/Feather';

export function BookingSummaryScreen({ route, navigation }: any) {
  const { bookingId } = route.params;
  const [booking, setBooking] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchDetails = async () => {
    try {
      const details = await BookingsApi.getBookingDetails(bookingId);
      setBooking(details);
    } catch (error) {
      console.error('Fetch booking details error:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDetails();

    // Poll for status updates (e.g. matching a driver)
    const interval = setInterval(fetchDetails, 5000);
    return () => clearInterval(interval);
  }, [bookingId]);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2563EB" />
        <Text style={styles.loadingText}>Fetching shipment details...</Text>
      </View>
    );
  }

  if (!booking) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.errorText}>Shipment not found.</Text>
        <TouchableOpacity
          style={styles.primaryBtn}
          onPress={() => navigation.goBack()}>
          <Text style={styles.primaryBtnText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'searching':
        return '#F59E0B'; // Amber
      case 'assigned':
      case 'dispatched':
        return '#3B82F6'; // Blue
      case 'in_transit':
      case 'at_pickup':
        return '#8B5CF6'; // Purple
      case 'completed':
        return '#10B981'; // Emerald
      default:
        return '#64748B';
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => navigation.navigate('Dashboard')}>
          <Icon name="x" size={24} color="#0F172A" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Booking Summary</Text>
        <TouchableOpacity style={styles.refreshBtn} onPress={fetchDetails}>
          <Icon name="refresh-cw" size={20} color="#0F172A" />
        </TouchableOpacity>
      </View>

      {/* Main Info Card */}
      <View style={styles.card}>
        <View style={styles.refRow}>
          <View>
            <Text style={styles.refLabel}>BOOKING REF</Text>
            <Text style={styles.refValue}>{booking.booking_reference}</Text>
          </View>
          <View
            style={[
              styles.statusBadge,
              { backgroundColor: getStatusColor(booking.status) + '15' },
            ]}>
            <Text
              style={[
                styles.statusText,
                { color: getStatusColor(booking.status) },
              ]}>
              {booking.status.toUpperCase()}
            </Text>
          </View>
        </View>

        <View style={styles.divider} />

        <View style={styles.priceRow}>
          <View>
            <Text style={styles.priceLabel}>Quoted Price</Text>
            <Text style={styles.priceValue}>
              ₹{Number(booking.quoted_price).toLocaleString('en-IN')}
            </Text>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={styles.priceLabel}>Estimated Weight</Text>
            <Text style={styles.weightValue}>
              {(Number(booking.estimated_weight_kg) / 1000).toFixed(1)} Tons
            </Text>
          </View>
        </View>
      </View>

      {/* Driver Info Card */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Driver Details</Text>
        {booking.drivers ? (
          <View style={styles.driverRow}>
            <View style={styles.avatar}>
              <Icon name="user" size={24} color="#3B82F6" />
            </View>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={styles.driverName}>
                {booking.drivers.profiles.first_name}{' '}
                {booking.drivers.profiles.last_name}
              </Text>
              <Text style={styles.driverPhone}>
                {booking.drivers.profiles.phone_number}
              </Text>
            </View>
            <TouchableOpacity style={styles.callBtn}>
              <Icon name="phone" size={20} color="#10B981" />
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.noDriverBox}>
            <ActivityIndicator size="small" color="#F59E0B" />
            <Text style={styles.noDriverText}>Finding nearest driver...</Text>
          </View>
        )}
      </View>

      {/* Route Timeline Card */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Delivery Timeline</Text>

        {booking.booking_stops &&
          booking.booking_stops.map((stop: any, index: number) => {
            const isLast = index === booking.booking_stops.length - 1;
            const isCompleted = stop.status === 'completed';

            return (
              <View key={stop.id} style={styles.timelineItem}>
                <View style={styles.timelineLeft}>
                  <View
                    style={[
                      styles.timelineDot,
                      { backgroundColor: isCompleted ? '#10B981' : '#E2E8F0' },
                    ]}>
                    {isCompleted ? (
                      <Icon name="check" size={10} color="#FFFFFF" />
                    ) : (
                      <View style={styles.innerDot} />
                    )}
                  </View>
                  {!isLast && (
                    <View
                      style={[
                        styles.timelineLine,
                        {
                          backgroundColor: isCompleted ? '#10B981' : '#E2E8F0',
                        },
                      ]}
                    />
                  )}
                </View>
                <View style={styles.timelineRight}>
                  <View style={styles.stopHeader}>
                    <Text style={styles.stopType}>
                      {stop.stop_type.toUpperCase()} (Stop {stop.stop_order})
                    </Text>
                    {stop.otp && !isCompleted && (
                      <View style={styles.otpBadge}>
                        <Text style={styles.otpText}>OTP: {stop.otp}</Text>
                      </View>
                    )}
                  </View>
                  <Text style={styles.stopAddress}>{stop.address}</Text>
                  {isCompleted && stop.departure_time && (
                    <Text style={styles.completedTime}>
                      Cleared at:{' '}
                      {new Date(stop.departure_time).toLocaleTimeString()}
                    </Text>
                  )}
                </View>
              </View>
            );
          })}
      </View>

      {/* Active Tracking CTA */}
      <TouchableOpacity
        style={styles.trackBtn}
        onPress={() =>
          navigation.navigate('ActiveShipment', { bookingId: booking.id })
        }>
        <Icon name="map" size={20} color="#FFFFFF" />
        <Text style={styles.trackBtnText}>Live Route Tracking</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  content: { padding: 16, paddingBottom: 40 },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: { marginTop: 12, fontSize: 16, color: '#64748B' },
  errorText: { fontSize: 16, color: '#EF4444', marginBottom: 20 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    marginTop: 10,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 3,
  },
  refreshBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 3,
  },
  headerTitle: { fontSize: 20, fontWeight: '800', color: '#0F172A' },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.02,
    shadowRadius: 10,
    elevation: 2,
  },
  refRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  refLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#94A3B8',
    letterSpacing: 1,
  },
  refValue: { fontSize: 22, fontWeight: '900', color: '#0F172A', marginTop: 4 },
  statusBadge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12 },
  statusText: { fontSize: 11, fontWeight: '700' },
  divider: { height: 1, backgroundColor: '#F1F5F9', marginVertical: 14 },
  priceRow: { flexDirection: 'row', justifyContent: 'space-between' },
  priceLabel: { fontSize: 12, color: '#64748B', fontWeight: '500' },
  priceValue: {
    fontSize: 20,
    fontWeight: '800',
    color: '#2563EB',
    marginTop: 4,
  },
  weightValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
    marginTop: 4,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 14,
  },
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
  driverPhone: { fontSize: 13, color: '#64748B', marginTop: 2 },
  callBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#ECFDF5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  noDriverBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFBEB',
    borderRadius: 12,
    padding: 16,
    gap: 10,
  },
  noDriverText: { fontSize: 14, fontWeight: '600', color: '#D97706' },
  timelineItem: { flexDirection: 'row', minHeight: 65 },
  timelineLeft: { alignItems: 'center', width: 24, marginRight: 12 },
  timelineDot: {
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  innerDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#94A3B8',
  },
  timelineLine: { width: 2, flex: 1, position: 'absolute', top: 18, bottom: 0 },
  timelineRight: { flex: 1, paddingBottom: 16 },
  stopHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  stopType: { fontSize: 11, fontWeight: '800', color: '#64748B' },
  otpBadge: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  otpText: { fontSize: 11, fontWeight: '700', color: '#334155' },
  stopAddress: {
    fontSize: 14,
    fontWeight: '500',
    color: '#334155',
    marginTop: 4,
  },
  completedTime: {
    fontSize: 12,
    color: '#10B981',
    marginTop: 4,
    fontWeight: '600',
  },
  trackBtn: {
    backgroundColor: '#2563EB',
    borderRadius: 16,
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  trackBtnText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
  primaryBtn: {
    backgroundColor: '#2563EB',
    borderRadius: 12,
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  primaryBtnText: { color: '#FFFFFF', fontWeight: '700' },
});
