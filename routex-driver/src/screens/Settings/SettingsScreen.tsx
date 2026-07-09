import React, { useState } from 'react';
import { StyleSheet, View, Text } from 'react-native';
import { Button, Switch } from 'react-native-paper';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../../types/navigation.types';

type NavigationProp = StackNavigationProp<RootStackParamList, 'Settings'>;

interface Props {
  navigation: NavigationProp;
}

export function SettingsScreen({ navigation }: Props) {
  const [pushEnabled, setPushEnabled] = useState(true);
  const [offlineTracking, setOfflineTracking] = useState(false);

  return (
    <View style={styles.container}>
      <Text style={[styles.title, { fontSize: 22 }]}>Settings</Text>

      <View style={styles.settingRow}>
        <View>
          <Text style={styles.settingLabel}>Push Notifications</Text>
          <Text style={styles.settingDesc}>
            Receive realtime shipment alerts
          </Text>
        </View>
        <Switch
          value={pushEnabled}
          onValueChange={setPushEnabled}
          color="#10B981"
        />
      </View>

      <View style={styles.settingRow}>
        <View>
          <Text style={styles.settingLabel}>Aggressive Location Updates</Text>
          <Text style={styles.settingDesc}>
            Updates GPS telemetry every 2 seconds
          </Text>
        </View>
        <Switch
          value={offlineTracking}
          onValueChange={setOfflineTracking}
          color="#10B981"
        />
      </View>

      <Button
        mode="text"
        textColor="#9CA3AF"
        style={styles.backBtn}
        onPress={() => navigation.navigate('Profile')}>
        Back to Profile
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
    marginBottom: 24,
    marginTop: 8,
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#374151',
  },
  settingLabel: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 16,
  },
  settingDesc: {
    color: '#9CA3AF',
    fontSize: 12,
    marginTop: 4,
  },
  backBtn: {
    marginTop: 'auto',
  },
});

export default SettingsScreen;
