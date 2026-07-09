import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface WalletTransaction {
  id: string;
  amount: number;
  type: 'credit' | 'debit';
  description: string;
  createdAt: string;
}

interface WalletState {
  balance: number;
  currency: string;
  transactions: WalletTransaction[];
}

const initialState: WalletState = {
  balance: 0.0,
  currency: 'INR',
  transactions: [],
};

const walletSlice = createSlice({
  name: 'wallet',
  initialState,
  reducers: {
    setWalletState(
      state,
      action: PayloadAction<{ balance: number; currency: string }>,
    ) {
      state.balance = action.payload.balance;
      state.currency = action.payload.currency;
    },
    setTransactions(state, action: PayloadAction<WalletTransaction[]>) {
      state.transactions = action.payload;
    },
  },
});

export const { setWalletState, setTransactions } = walletSlice.actions;
export default walletSlice.reducer;
