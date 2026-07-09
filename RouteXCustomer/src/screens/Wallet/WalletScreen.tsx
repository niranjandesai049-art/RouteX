import React, { useEffect, useState } from 'react';
import {
  StyleSheet,
  View,
  FlatList,
  Text,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../../types/navigation.types';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../../redux/store';
import { WalletApi } from '../../api/wallet.api';
import {
  setWalletState,
  setTransactions,
} from '../../redux/slices/walletSlice';
import Icon from 'react-native-vector-icons/Feather';
import { TextInput } from 'react-native-paper';

type NavigationProp = StackNavigationProp<RootStackParamList, 'Wallet'>;

interface Props {
  navigation: NavigationProp;
}

const { width } = Dimensions.get('window');

export function WalletScreen({ navigation }: Props) {
  const dispatch = useDispatch();
  const wallet = useSelector((state: RootState) =>
    state.auth.driverId ? state.wallet : { balance: 0, transactions: [] },
  );
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [upiId, setUpiId] = useState('');
  const [isWithdrawing, setIsWithdrawing] = useState(false);

  const fetchWallet = async () => {
    try {
      const balanceRes = await WalletApi.getBalance();
      dispatch(
        setWalletState({
          balance: balanceRes.balance,
          currency: balanceRes.currency,
        }),
      );

      const historyRes = await WalletApi.getHistory();
      dispatch(setTransactions(historyRes));
    } catch (err) {
      console.error('Failed to fetch wallet info:', err);
    }
  };

  useEffect(() => {
    fetchWallet();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleWithdrawal = async () => {
    const amt = parseFloat(withdrawAmount);
    if (isNaN(amt) || amt <= 0) {
      return;
    }
    setIsWithdrawing(true);
    try {
      await WalletApi.requestWithdrawal(amt, 'upi', { upiId });
      setWithdrawAmount('');
      setUpiId('');
      fetchWallet();
    } catch (err) {
      console.error('Withdrawal failed:', err);
    } finally {
      setIsWithdrawing(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}>
          <Icon name="arrow-left" size={24} color="#0F172A" />
        </TouchableOpacity>
        <Text style={styles.title}>Earnings & Wallet</Text>
        <TouchableOpacity style={styles.infoButton}>
          <Icon name="help-circle" size={24} color="#64748B" />
        </TouchableOpacity>
      </View>

      <FlatList
        data={wallet.transactions}
        keyExtractor={item => item.id}
        onRefresh={fetchWallet}
        refreshing={false}
        contentContainerStyle={styles.scrollContent}
        ListHeaderComponent={
          <>
            {/* Balance Card */}
            <View style={styles.balanceCard}>
              <View style={styles.balanceHeader}>
                <Text style={styles.balanceLabel}>Available Balance</Text>
                <View style={styles.currencyBadge}>
                  <Text style={styles.currencyText}>INR</Text>
                </View>
              </View>
              <Text style={styles.balanceAmount}>
                ₹{wallet.balance.toFixed(2)}
              </Text>
            </View>

            {/* Withdrawal Form */}
            <View style={styles.formCard}>
              <View style={styles.formHeader}>
                <View style={styles.formIconContainer}>
                  <Icon name="zap" size={20} color="#2563EB" />
                </View>
                <Text style={styles.formTitle}>Instant UPI Payout</Text>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Withdrawal Amount</Text>
                <TextInput
                  mode="outlined"
                  keyboardType="numeric"
                  value={withdrawAmount}
                  onChangeText={setWithdrawAmount}
                  style={styles.input}
                  placeholder="₹ 0.00"
                  outlineColor="#E2E8F0"
                  activeOutlineColor="#2563EB"
                  textColor="#0F172A"
                  left={<TextInput.Affix text="₹ " />}
                  theme={{ colors: { background: '#F8FAFC' } }}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>UPI ID (VPA)</Text>
                <TextInput
                  mode="outlined"
                  value={upiId}
                  onChangeText={setUpiId}
                  style={styles.input}
                  placeholder="name@upi"
                  outlineColor="#E2E8F0"
                  activeOutlineColor="#2563EB"
                  textColor="#0F172A"
                  left={
                    <TextInput.Icon
                      icon={() => (
                        <Icon name="at-sign" size={18} color="#94A3B8" />
                      )}
                    />
                  }
                  theme={{ colors: { background: '#F8FAFC' } }}
                />
              </View>

              <TouchableOpacity
                style={[
                  styles.withdrawBtn,
                  (isWithdrawing || !withdrawAmount || !upiId) &&
                    styles.withdrawBtnDisabled,
                ]}
                onPress={handleWithdrawal}
                disabled={isWithdrawing || !withdrawAmount || !upiId}>
                <Text style={styles.withdrawBtnText}>
                  {isWithdrawing ? 'Processing...' : 'Transfer to Bank'}
                </Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.sectionTitle}>Recent Transactions</Text>
          </>
        }
        renderItem={({ item }) => (
          <View style={styles.txCard}>
            <View
              style={[
                styles.txIcon,
                item.type === 'credit'
                  ? styles.txIconCredit
                  : styles.txIconDebit,
              ]}>
              <Icon
                name={
                  item.type === 'credit' ? 'arrow-down-left' : 'arrow-up-right'
                }
                size={20}
                color={item.type === 'credit' ? '#10B981' : '#EF4444'}
              />
            </View>
            <View style={styles.txDetails}>
              <Text style={styles.txDesc} numberOfLines={1}>
                {item.description}
              </Text>
              <Text style={styles.txDate}>
                {new Date(item.createdAt).toLocaleDateString('en-US', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </Text>
            </View>
            <View style={styles.txAmountContainer}>
              <Text
                style={[
                  styles.txAmount,
                  item.type === 'credit' ? styles.creditText : styles.debitText,
                ]}>
                {item.type === 'credit' ? '+' : '-'}₹{item.amount.toFixed(2)}
              </Text>
            </View>
          </View>
        )}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIconCircle}>
              <Icon name="file-text" size={32} color="#94A3B8" />
            </View>
            <Text style={styles.emptyTitle}>No Transactions Yet</Text>
            <Text style={styles.emptySubtitle}>
              Your earnings and payouts will appear here.
            </Text>
          </View>
        }
      />
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
  infoButton: {
    padding: 8,
    marginRight: -8,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0F172A',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  balanceCard: {
    backgroundColor: '#0F172A',
    borderRadius: 20,
    padding: 24,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 12,
  },
  balanceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  balanceLabel: {
    color: '#94A3B8',
    fontSize: 14,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  currencyBadge: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  currencyText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  balanceAmount: {
    color: '#FFFFFF',
    fontSize: 40,
    fontWeight: '900',
    letterSpacing: -1,
  },
  formCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 4,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  formHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    gap: 12,
  },
  formIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  formTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#64748B',
    marginBottom: 8,
  },
  input: {
    height: 52,
    fontSize: 16,
    fontWeight: '600',
  },
  withdrawBtn: {
    backgroundColor: '#2563EB',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 8,
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  withdrawBtnDisabled: {
    backgroundColor: '#94A3B8',
    shadowOpacity: 0,
    elevation: 0,
  },
  withdrawBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 16,
    marginLeft: 4,
  },
  txCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  txIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  txIconCredit: {
    backgroundColor: '#ECFDF5',
  },
  txIconDebit: {
    backgroundColor: '#FEF2F2',
  },
  txDetails: {
    flex: 1,
    marginRight: 12,
  },
  txDesc: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 4,
  },
  txDate: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '500',
  },
  txAmountContainer: {
    alignItems: 'flex-end',
  },
  txAmount: {
    fontSize: 16,
    fontWeight: '800',
  },
  creditText: {
    color: '#10B981',
  },
  debitText: {
    color: '#EF4444',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#64748B',
  },
});

export default WalletScreen;
