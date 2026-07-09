import React from 'react';
import { StyleSheet, View, FlatList, Text } from 'react-native';
import { Button, Card, IconButton } from 'react-native-paper';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../../types/navigation.types';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../../redux/store';
import {
  markAsRead,
  markAllAsRead,
  clearNotifications,
} from '../../redux/slices/notificationSlice';

type NavigationProp = StackNavigationProp<RootStackParamList, 'Notifications'>;

interface Props {
  navigation: NavigationProp;
}

export function NotificationsScreen({ navigation }: Props) {
  const dispatch = useDispatch();
  const notifications = useSelector(
    (state: RootState) => state.notification.notifications,
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={[styles.title, { fontSize: 22 }]}>Notifications</Text>
        {notifications.length > 0 && (
          <View style={styles.headerActions}>
            <Button
              compact
              mode="text"
              textColor="#2563EB"
              onPress={() => dispatch(markAllAsRead())}>
              Mark all read
            </Button>
            <IconButton
              icon="delete-outline"
              iconColor="#EF4444"
              size={20}
              onPress={() => dispatch(clearNotifications())}
            />
          </View>
        )}
      </View>

      <FlatList
        data={notifications}
        keyExtractor={item => item.id}
        renderItem={({ item }) => (
          <Card
            style={[styles.card, !item.read && styles.unreadCard]}
            onPress={() => dispatch(markAsRead(item.id))}>
            <Card.Content>
              <View style={styles.cardHeader}>
                <Text
                  style={[
                    styles.cardTitle,
                    { fontSize: 16 },
                    !item.read && styles.unreadText,
                  ]}>
                  {item.title}
                </Text>
                {!item.read && <View style={styles.unreadDot} />}
              </View>
              <Text style={styles.bodyText}>{item.body}</Text>
              <Text style={styles.dateText}>
                {new Date(item.date).toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </Text>
            </Card.Content>
          </Card>
        )}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>
              No notifications yet. Alerts about new bookings and earnings will
              appear here.
            </Text>
          </View>
        }
      />

      <Button
        mode="text"
        textColor="#9CA3AF"
        onPress={() => navigation.navigate('Dashboard')}
        style={styles.backBtn}>
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    marginTop: 8,
  },
  title: {
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  card: {
    backgroundColor: '#1F2937',
    marginBottom: 12,
    borderLeftWidth: 3,
    borderLeftColor: '#374151',
  },
  unreadCard: {
    borderLeftColor: '#2563EB',
    backgroundColor: '#1e2530',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardTitle: {
    color: '#D1D5DB',
  },
  unreadText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#2563EB',
  },
  bodyText: {
    color: '#9CA3AF',
    marginTop: 4,
    fontSize: 14,
    lineHeight: 18,
  },
  dateText: {
    color: '#6B7280',
    fontSize: 11,
    marginTop: 8,
    textAlign: 'right',
  },
  emptyContainer: {
    padding: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 80,
  },
  emptyText: {
    color: '#9CA3AF',
    textAlign: 'center',
    lineHeight: 20,
  },
  backBtn: {
    marginTop: 12,
  },
});

export default NotificationsScreen;
