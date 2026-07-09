import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useSelector } from 'react-redux';
import { RootState } from '../../redux/store';
import { BookingsApi } from '../../api/bookings.api';
import Icon from 'react-native-vector-icons/Feather';

export function CreateShipmentScreen({ navigation }: any) {
  const shipperId = useSelector((state: RootState) => state.auth.driverId); // shipper/user ID stored in driverId field

  const [pickup, setPickup] = useState('');
  const [destination, setDestination] = useState('');
  const [waypoints, setWaypoints] = useState<string[]>([]);
  const [weight, setWeight] = useState('5.0');
  const [loadType, setLoadType] = useState('General Goods');
  const [truckCategory, setTruckCategory] = useState('open_body_truck');

  const [pricingQuote, setPricingQuote] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [bookingLoading, setBookingLoading] = useState(false);

  const addWaypoint = () => {
    setWaypoints([...waypoints, '']);
  };

  const removeWaypoint = (index: number) => {
    const updated = [...waypoints];
    updated.splice(index, 1);
    setWaypoints(updated);
  };

  const updateWaypoint = (text: string, index: number) => {
    const updated = [...waypoints];
    updated[index] = text;
    setWaypoints(updated);
  };

  const handleCalculatePrice = async () => {
    if (!pickup || !destination) {
      Alert.alert(
        'Error',
        'Please fill in both pickup and destination addresses.',
      );
      return;
    }

    setLoading(true);
    setPricingQuote(null);
    try {
      // Filter out any empty waypoints
      const activeWaypoints = waypoints.filter(w => w.trim() !== '');

      // Calculate a pseudo-distance based on route stops (OSRM or direct estimation)
      // Usually the app would call map service, let's estimate 120km + 30km per waypoint
      const distanceEst = 120 + activeWaypoints.length * 30;

      const quote = await BookingsApi.predictPricing({
        pickup,
        destination,
        waypoints: activeWaypoints.length > 0 ? activeWaypoints : undefined,
        distanceKm: distanceEst,
        weightTons: parseFloat(weight) || 1.0,
        truckCategory,
        weather: 'clear',
        fuelPrice: 96.5,
        demandLevel: 'normal',
      });
      setPricingQuote({ ...quote, distanceKm: distanceEst });
    } catch (error: any) {
      console.error('Pricing estimation error:', error);
      Alert.alert(
        'Error',
        error.response?.data?.message ||
          'Could not estimate pricing. Please try again.',
      );
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmBooking = async () => {
    if (!pricingQuote) {
      return;
    }

    setBookingLoading(true);
    try {
      const activeWaypoints = waypoints.filter(w => w.trim() !== '');
      const booking = await BookingsApi.createBooking({
        shipperId: shipperId || 'default-shipper',
        pickupAddress: pickup,
        destAddress: destination,
        waypoints: activeWaypoints.length > 0 ? activeWaypoints : undefined,
        distanceKm: pricingQuote.distanceKm,
        weightTons: parseFloat(weight) || 1.0,
        truckCategory,
        loadType,
        price: pricingQuote.estimatedPrice,
      });

      Alert.alert(
        'Success',
        'Your booking is created and we are matching a driver!',
        [
          {
            text: 'OK',
            onPress: () => {
              navigation.replace('BookingSummary', { bookingId: booking.id });
            },
          },
        ],
      );
    } catch (error: any) {
      console.error('Create booking error:', error);
      Alert.alert(
        'Error',
        error.response?.data?.message || 'Failed to create booking.',
      );
    } finally {
      setBookingLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => navigation.goBack()}>
          <Icon name="arrow-left" size={24} color="#0F172A" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>New Shipment</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Form Card */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Route Details</Text>

        <Text style={styles.label}>Pickup Address</Text>
        <View style={styles.inputWrapper}>
          <Icon
            name="map-pin"
            size={18}
            color="#10B981"
            style={styles.inputIcon}
          />
          <TextInput
            style={styles.input}
            placeholder="Enter pickup address"
            placeholderTextColor="#94A3B8"
            value={pickup}
            onChangeText={setPickup}
          />
        </View>

        {/* Dynamic Waypoints */}
        {waypoints.map((wp, index) => (
          <View key={`wp-field-${index}`} style={{ marginTop: 10 }}>
            <View style={styles.waypointHeader}>
              <Text style={styles.label}>Stop {index + 1} (Waypoint)</Text>
              <TouchableOpacity onPress={() => removeWaypoint(index)}>
                <Text style={styles.removeText}>Remove</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.inputWrapper}>
              <Icon
                name="map-pin"
                size={18}
                color="#F59E0B"
                style={styles.inputIcon}
              />
              <TextInput
                style={styles.input}
                placeholder="Enter intermediate stop address"
                placeholderTextColor="#94A3B8"
                value={wp}
                onChangeText={text => updateWaypoint(text, index)}
              />
            </View>
          </View>
        ))}

        <TouchableOpacity style={styles.addStopBtn} onPress={addWaypoint}>
          <Icon name="plus" size={16} color="#2563EB" />
          <Text style={styles.addStopText}>Add Intermediate Stop</Text>
        </TouchableOpacity>

        <Text style={styles.label}>Destination Address</Text>
        <View style={styles.inputWrapper}>
          <Icon
            name="navigation"
            size={18}
            color="#EF4444"
            style={styles.inputIcon}
          />
          <TextInput
            style={styles.input}
            placeholder="Enter final destination address"
            placeholderTextColor="#94A3B8"
            value={destination}
            onChangeText={setDestination}
          />
        </View>
      </View>

      {/* Load Details Card */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Cargo & Vehicle</Text>

        <View style={styles.row}>
          <View style={{ flex: 1 }}>
            <Text style={styles.label}>Weight (Tons)</Text>
            <TextInput
              style={styles.smallInput}
              keyboardType="decimal-pad"
              value={weight}
              onChangeText={setWeight}
            />
          </View>
          <View style={{ flex: 1.5, marginLeft: 16 }}>
            <Text style={styles.label}>Truck Type</Text>
            <TextInput
              style={styles.smallInput}
              placeholder="e.g. open_body_truck"
              value={truckCategory}
              onChangeText={setTruckCategory}
            />
          </View>
        </View>

        <Text style={styles.label}>Cargo Description</Text>
        <TextInput
          style={styles.textInputFull}
          placeholder="e.g. Industrial Steel Pipes"
          placeholderTextColor="#94A3B8"
          value={loadType}
          onChangeText={setLoadType}
        />
      </View>

      {/* Action Button */}
      <TouchableOpacity
        style={styles.primaryBtn}
        onPress={handleCalculatePrice}
        disabled={loading}>
        {loading ? (
          <ActivityIndicator color="#FFFFFF" />
        ) : (
          <Text style={styles.primaryBtnText}>Get AI Pricing Quote</Text>
        )}
      </TouchableOpacity>

      {/* Quote Result Card */}
      {pricingQuote && (
        <View style={styles.quoteCard}>
          <View style={styles.quoteHeader}>
            <View>
              <Text style={styles.quoteLabel}>ESTIMATED PRICE</Text>
              <Text style={styles.quotePrice}>
                ₹{pricingQuote.estimatedPrice.toLocaleString('en-IN')}
              </Text>
            </View>
            <View style={styles.confidenceBadge}>
              <Text style={styles.confidenceText}>
                {pricingQuote.confidence}% Match
              </Text>
            </View>
          </View>

          <View style={styles.divider} />

          <View style={styles.quoteRow}>
            <Text style={styles.quoteDetailLabel}>Recommended Truck:</Text>
            <Text style={styles.quoteDetailValue}>
              {pricingQuote.recommendedTruck}
            </Text>
          </View>
          <View style={styles.quoteRow}>
            <Text style={styles.quoteDetailLabel}>Estimated Duration:</Text>
            <Text style={styles.quoteDetailValue}>
              {pricingQuote.etaMinutes} mins
            </Text>
          </View>

          <Text style={styles.reasonText}>{pricingQuote.reason}</Text>

          <TouchableOpacity
            style={styles.bookBtn}
            onPress={handleConfirmBooking}
            disabled={bookingLoading}>
            {bookingLoading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.bookBtnText}>Confirm & Book Shipment</Text>
            )}
          </TouchableOpacity>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  content: { padding: 16, paddingBottom: 40 },
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
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 12,
  },
  label: { fontSize: 13, fontWeight: '600', color: '#64748B', marginBottom: 6 },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 12,
  },
  inputIcon: { marginRight: 10 },
  input: { flex: 1, height: 48, fontSize: 14, color: '#0F172A' },
  waypointHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  removeText: { fontSize: 12, color: '#EF4444', fontWeight: '600' },
  addStopBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 12,
  },
  addStopText: { fontSize: 14, color: '#2563EB', fontWeight: '600' },
  row: { flexDirection: 'row', marginBottom: 12 },
  smallInput: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    height: 48,
    fontSize: 14,
    color: '#0F172A',
    paddingHorizontal: 12,
  },
  textInputFull: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    height: 48,
    fontSize: 14,
    color: '#0F172A',
    paddingHorizontal: 12,
  },
  primaryBtn: {
    backgroundColor: '#2563EB',
    borderRadius: 16,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
    marginBottom: 20,
  },
  primaryBtnText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
  quoteCard: {
    backgroundColor: '#1E293B',
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 8,
  },
  quoteHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  quoteLabel: {
    fontSize: 10,
    color: '#94A3B8',
    fontWeight: '800',
    letterSpacing: 1,
  },
  quotePrice: {
    fontSize: 32,
    fontWeight: '900',
    color: '#F8FAFC',
    marginTop: 4,
  },
  confidenceBadge: {
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  confidenceText: { color: '#059669', fontSize: 12, fontWeight: '700' },
  divider: { height: 1, backgroundColor: '#334155', marginVertical: 16 },
  quoteRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  quoteDetailLabel: { fontSize: 14, color: '#94A3B8' },
  quoteDetailValue: { fontSize: 14, color: '#F8FAFC', fontWeight: '600' },
  reasonText: {
    fontSize: 13,
    color: '#94A3B8',
    fontStyle: 'italic',
    marginTop: 12,
    lineHeight: 18,
  },
  bookBtn: {
    backgroundColor: '#10B981',
    borderRadius: 16,
    height: 50,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  bookBtnText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
});
