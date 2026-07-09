import React from 'react';
import { StyleSheet, View, Text } from 'react-native';
import { Button, Card } from 'react-native-paper';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../../types/navigation.types';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../../redux/store';
import { clearCredentials } from '../../redux/slices/authSlice';
import { clearDriverProfile } from '../../redux/slices/driverSlice';
import { SecureStorage } from '../../services/secureStorage';
import { socketService } from '../../services/socket/socketService';
import { locationService } from '../../services/location/locationService';

type NavigationProp = StackNavigationProp<RootStackParamList, 'Profile'>;

interface Props {
  navigation: NavigationProp;
}

export function ProfileScreen({ navigation }: Props) {
  const dispatch = useDispatch();
  const { driverName, driverId } = useSelector(
    (state: RootState) => state.auth,
  );
  const driverProfile = useSelector((state: RootState) => state.driver.profile);

  const handleLogout = async () => {
    // 1. Terminate sockets
    socketService.disconnect();

    // 2. Stop GPS background trackers
    await locationService.stopTracking();

    // 3. Clear storage tokens (auth and fcm)
    await SecureStorage.clearTokens();
    await SecureStorage.clearFcmToken();

    // 4. Dispatch Redux
    dispatch(clearCredentials());
    dispatch(clearDriverProfile());

    navigation.replace('Login');
  };

  return (
    <View style={styles.container}>
      <Text style={[styles.title, { fontSize: 22 }]}>Driver Profile</Text>

      <Card style={styles.profileCard}>
        <Card.Content style={styles.cardContent}>
          <Text style={[styles.nameText, { fontSize: 24 }]}>
            {driverName || 'Driver'}
          </Text>
          <Text style={styles.idText}>ID: {driverId || 'N/A'}</Text>
          <Text style={styles.badge}>
            Status:{' '}
            {driverProfile?.status
              ? driverProfile.status.toUpperCase()
              : 'VERIFIED'}
          </Text>
        </Card.Content>
      </Card>

      <Card style={styles.infoCard}>
        <Card.Content>
          <Text style={[styles.infoHeader, { fontSize: 16 }]}>
            Contact & License Details
          </Text>
          <Text style={styles.bodyText}>
            <Text style={styles.boldLabel}>Email: </Text>
            {driverProfile?.email || 'N/A'}
          </Text>
          <Text style={styles.bodyText}>
            <Text style={styles.boldLabel}>Phone: </Text>
            {driverProfile?.phone || 'N/A'}
          </Text>
          <Text style={styles.bodyText}>
            <Text style={styles.boldLabel}>License No: </Text>
            {driverProfile?.licenseNumber || 'DL-9238472948'}
          </Text>
          <Text style={styles.bodyText}>
            <Text style={styles.boldLabel}>Experience: </Text>
            {driverProfile?.experienceYears || 8} Years
          </Text>
        </Card.Content>
      </Card>

      {driverProfile?.vehicle && (
        <Card style={styles.infoCard}>
          <Card.Content>
            <Text style={[styles.infoHeader, { fontSize: 16 }]}>
              Vehicle Details
            </Text>
            <Text style={styles.bodyText}>
              <Text style={styles.boldLabel}>Type: </Text>
              {driverProfile.vehicle.type}
            </Text>
            <Text style={styles.bodyText}>
              <Text style={styles.boldLabel}>Plate No: </Text>
              {driverProfile.vehicle.plateNumber}
            </Text>
            <Text style={styles.bodyText}>
              <Text style={styles.boldLabel}>Capacity: </Text>
              {driverProfile.vehicle.capacity} Tons
            </Text>
          </Card.Content>
        </Card>
      )}

      <View style={styles.btnSection}>
        <Button
          mode="outlined"
          textColor="#FFFFFF"
          style={styles.settingsBtn}
          onPress={() => navigation.navigate('Settings')}>
          Settings
        </Button>
        <Button
          mode="contained"
          buttonColor="#EF4444"
          style={styles.logoutBtn}
          onPress={handleLogout}>
          Log Out
        </Button>
      </View>

      <Button
        mode="text"
        textColor="#9CA3AF"
        style={styles.backBtn}
        onPress={() => navigation.navigate('Dashboard')}>
        Back to Dashboard
      </Button>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#111827',
    padding: 16,
  },
  title: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    marginBottom: 20,
    marginTop: 8,
  },
  profileCard: {
    backgroundColor: '#1F2937',
    marginBottom: 16,
  },
  cardContent: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  nameText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  idText: {
    color: '#9CA3AF',
    marginTop: 4,
    marginBottom: 12,
  },
  badge: {
    backgroundColor: '#10B981',
    color: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    overflow: 'hidden',
    fontWeight: 'bold',
    fontSize: 12,
  },
  infoCard: {
    backgroundColor: '#1F2937',
    marginBottom: 16,
  },
  infoHeader: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    marginBottom: 12,
  },
  bodyText: {
    color: '#D1D5DB',
    marginBottom: 8,
  },
  boldLabel: {
    fontWeight: 'bold',
    color: '#9CA3AF',
  },
  btnSection: {
    marginTop: 'auto',
    gap: 12,
  },
  settingsBtn: {
    borderColor: '#374151',
  },
  logoutBtn: {
    paddingVertical: 4,
  },
  backBtn: {
    marginTop: 8,
  },
});

export default ProfileScreen;
