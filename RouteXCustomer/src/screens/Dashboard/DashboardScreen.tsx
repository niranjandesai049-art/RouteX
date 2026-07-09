import React from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  SafeAreaView,
} from 'react-native';
import { useSelector } from 'react-redux';
import { RootState } from '../../redux/store';
import { AppMapView } from '../../components/MapView';
import Icon from 'react-native-vector-icons/Feather';

export function DashboardScreen({ navigation }: any) {
  const { driverName } = useSelector((state: RootState) => state.auth);
  // Using currentLocation from store (assuming the device gets location)
  const currentLocation = useSelector(
    (state: RootState) => state.location.currentLocation,
  );

  // Note: driverName holds the user's name from OTP login.
  // We can rename it in the store later, but for now it works.

  return (
    <View style={styles.container}>
      {/* Full Screen Map */}
      <View style={styles.mapContainer}>
        <AppMapView driverLocation={currentLocation} />
      </View>

      {/* Top Header Overlay */}
      <View style={styles.header}>
        <View style={styles.profileBadge}>
          <View style={styles.avatar}>
            <Icon name="user" size={20} color="#059669" />
          </View>
          <View>
            <Text style={styles.welcomeText}>Hello,</Text>
            <Text style={styles.nameText}>{driverName || 'Customer'}</Text>
          </View>
        </View>

        <View style={styles.headerRight}>
          <TouchableOpacity
            style={styles.iconButton}
            onPress={() => console.log('Notifications')}>
            <Icon name="bell" size={20} color="#0F172A" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Bottom Action Card */}
      <View style={styles.bottomCard}>
        <Text style={styles.greetingText}>Ready to ship?</Text>
        <Text style={styles.subGreeting}>
          Book a truck instantly with RouteX.
        </Text>

        <TouchableOpacity
          style={styles.bookBtn}
          onPress={() => navigation.navigate('CreateShipment')}>
          <View style={styles.bookBtnContent}>
            <Icon name="truck" size={20} color="#FFFFFF" />
            <Text style={styles.bookBtnText}>Book a Shipment</Text>
          </View>
          <Icon name="arrow-right" size={20} color="#FFFFFF" />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  mapContainer: { flex: 1, position: 'relative' },
  header: {
    position: 'absolute',
    top: 50,
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
    backgroundColor: '#ECFDF5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  welcomeText: { fontSize: 11, color: '#64748B', fontWeight: '600' },
  nameText: { fontSize: 15, fontWeight: '800', color: '#0F172A' },
  headerRight: { alignItems: 'center' },
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
  bottomCard: {
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
    zIndex: 20,
  },
  greetingText: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 4,
  },
  subGreeting: {
    fontSize: 14,
    color: '#64748B',
    marginBottom: 20,
  },
  bookBtn: {
    backgroundColor: '#059669', // Emerald Green
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 18,
    shadowColor: '#059669',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  bookBtnContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  bookBtnText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
  },
});

export default DashboardScreen;
