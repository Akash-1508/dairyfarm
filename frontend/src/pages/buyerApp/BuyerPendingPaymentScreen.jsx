import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Linking,
} from 'react-native';
import HeaderWithMenu from '../../components/common/HeaderWithMenu';
import { milkService } from '../../services/milk/milkService';
import { paymentService } from '../../services/payments/paymentService';
import { formatCurrency } from '../../utils/currencyUtils';

// Farm UPI ID - replace with actual farm UPI for production. GPay/PhonePe don't provide an in-app API; we open UPI intent so user pays via their app.
const FARM_UPI_ID = 'errahul690@oksbi'; // e.g. 9876543210@ybl or yourname@paytm
const FARM_UPI_NAME = 'HiTech Dairy Farm';

export default function BuyerPendingPaymentScreen({ onNavigate, onLogout }) {
  const [transactions, setTransactions] = useState([]);
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [txData, paymentData] = await Promise.all([
        milkService.getTransactions(),
        paymentService.getPayments().catch(() => []),
      ]);
      const sales = (Array.isArray(txData) ? txData : []).filter((t) => t.type === 'sale');
      setTransactions(sales);
      setPayments(Array.isArray(paymentData) ? paymentData : []);
    } catch (error) {
      Alert.alert('Error', 'Failed to load data.');
    } finally {
      setLoading(false);
    }
  };

  const totalMilkAmount = useMemo(
    () => transactions.reduce((sum, t) => sum + (Number(t.totalAmount) || 0), 0),
    [transactions]
  );
  const totalPaid = useMemo(
    () => payments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0),
    [payments]
  );
  const pendingAmount = totalMilkAmount - totalPaid;

  const openPayViaUPI = () => {
    if (pendingAmount <= 0) {
      Alert.alert('Info', 'No pending amount to pay.');
      return;
    }
    const amount = pendingAmount.toFixed(2);
    const encodedName = encodeURIComponent(FARM_UPI_NAME);
    const url = `upi://pay?pa=${FARM_UPI_ID}&pn=${encodedName}&am=${amount}&cu=INR`;
    Linking.openURL(url).catch(() => {
      Alert.alert(
        'Cannot open UPI',
        'Install GPay, PhonePe or any UPI app. Or pay manually and share the reference number to the farm.'
      );
    });
  };

  return (
    <View style={styles.container}>
      <HeaderWithMenu
        title="HiTech Dairy Farm"
        subtitle="Pending Payment"
        onNavigate={onNavigate}
        isAuthenticated={true}
        onLogout={onLogout}
      />
      <ScrollView style={styles.content}>
        {loading ? (
          <ActivityIndicator size="large" color="#4CAF50" style={styles.loader} />
        ) : (
          <>
            <View style={styles.card}>
              <Text style={styles.cardLabel}>Pending Amount</Text>
              <Text style={[styles.cardValue, pendingAmount > 0 && styles.pendingText]}>
                {formatCurrency(pendingAmount)}
              </Text>
            </View>

            <TouchableOpacity
              style={[styles.payButton, pendingAmount <= 0 && styles.payButtonDisabled]}
              onPress={openPayViaUPI}
              disabled={pendingAmount <= 0}
            >
              <Text style={styles.payButtonText}>Pay via GPay / UPI</Text>
            </TouchableOpacity>

            <Text style={styles.note}>
              This will open your UPI app (GPay, PhonePe, etc.) with the pending amount. There is no in-app payment API; pay and share the transaction reference to the farm for confirmation.
            </Text>
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  content: { flex: 1, padding: 16 },
  loader: { marginTop: 40 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 24,
    marginBottom: 20,
    alignItems: 'center',
    elevation: 2,
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  cardLabel: { fontSize: 14, color: '#666', marginBottom: 8 },
  cardValue: { fontSize: 28, fontWeight: '700', color: '#333' },
  pendingText: { color: '#d32f2f' },
  payButton: {
    backgroundColor: '#4CAF50',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 16,
  },
  payButtonDisabled: { backgroundColor: '#9e9e9e' },
  payButtonText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  note: { fontSize: 12, color: '#666', textAlign: 'center', paddingHorizontal: 16 },
});
