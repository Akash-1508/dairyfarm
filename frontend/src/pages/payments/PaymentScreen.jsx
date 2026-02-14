import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Modal,
  ActivityIndicator,
} from 'react-native';
import HeaderWithMenu from '../../components/common/HeaderWithMenu';
import Input from '../../components/common/Input';
import Button from '../../components/common/Button';
import { paymentService } from '../../services/payments/paymentService';
import { buyerService } from '../../services/buyers/buyerService';
import { formatCurrency } from '../../utils/currencyUtils';
import { authService } from '../../services/auth/authService';

export default function PaymentScreen({ onNavigate, onLogout }) {
  const [payments, setPayments] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [formData, setFormData] = useState({
    customerId: '',
    customerName: '',
    customerMobile: '',
    amount: '',
    paymentDate: new Date().toISOString().split('T')[0],
    paymentType: 'cash',
    notes: '',
    referenceNumber: '',
  });

  useEffect(() => {
    loadData();
    loadCurrentUser();
  }, []);

  const loadCurrentUser = async () => {
    const user = await authService.getCurrentUser();
    setCurrentUser(user);
  };

  const loadData = async () => {
    try {
      setLoading(true);
      const [paymentsData, customersData] = await Promise.all([
        paymentService.getPayments(),
        buyerService.getBuyers().catch(() => []),
      ]);
      setPayments(paymentsData);
      setCustomers(customersData);
    } catch (error) {
      console.error('Failed to load data:', error);
      Alert.alert('Error', 'Failed to load payment data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleCustomerSelect = (customer) => {
    setSelectedCustomer(customer);
    setFormData({
      ...formData,
      customerId: customer.userId,
      customerName: customer.name,
      customerMobile: customer.mobile,
    });
  };

  const handleCreatePayment = async () => {
    // Validation
    if (!formData.customerId || !formData.customerName || !formData.customerMobile) {
      Alert.alert('Error', 'Please select a customer');
      return;
    }

    if (!formData.amount || parseFloat(formData.amount) <= 0) {
      Alert.alert('Error', 'Please enter a valid amount');
      return;
    }

    if (!formData.paymentDate) {
      Alert.alert('Error', 'Please select a payment date');
      return;
    }

    try {
      setLoading(true);
      await paymentService.createPayment({
        customerId: formData.customerId,
        customerName: formData.customerName,
        customerMobile: formData.customerMobile,
        amount: parseFloat(formData.amount),
        paymentDate: new Date(formData.paymentDate),
        paymentType: formData.paymentType,
        notes: formData.notes || '',
        referenceNumber: formData.referenceNumber || '',
      });

      // Reset form
      setFormData({
        customerId: '',
        customerName: '',
        customerMobile: '',
        amount: '',
        paymentDate: new Date().toISOString().split('T')[0],
        paymentType: 'cash',
        notes: '',
        referenceNumber: '',
      });
      setSelectedCustomer(null);
      setShowAddForm(false);

      // Reload data
      await loadData();
      Alert.alert('Success', 'Payment recorded successfully!');
    } catch (error) {
      console.error('Failed to create payment:', error);
      Alert.alert('Error', error.message || 'Failed to create payment. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleDeletePayment = (payment) => {
    Alert.alert(
      'Delete Payment',
      `Are you sure you want to delete this payment of ${formatCurrency(payment.amount)}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              setLoading(true);
              await paymentService.deletePayment(payment._id);
              await loadData();
              Alert.alert('Success', 'Payment deleted successfully');
            } catch (error) {
              console.error('Failed to delete payment:', error);
              Alert.alert('Error', 'Failed to delete payment. Please try again.');
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  const getTotalPayments = () => {
    return payments.reduce((sum, payment) => sum + payment.amount, 0);
  };

  const getPaymentsByCustomer = () => {
    const customerMap = new Map();
    payments.forEach((payment) => {
      const key = payment.customerMobile || payment.customerId;
      if (!customerMap.has(key)) {
        customerMap.set(key, {
          customerId: payment.customerId,
          customerName: payment.customerName,
          customerMobile: payment.customerMobile,
          totalAmount: 0,
          paymentCount: 0,
          payments: [],
        });
      }
      const customer = customerMap.get(key);
      customer.totalAmount += payment.amount;
      customer.paymentCount += 1;
      customer.payments.push(payment);
    });
    return Array.from(customerMap.values()).sort((a, b) => b.totalAmount - a.totalAmount);
  };

  const canEdit = currentUser?.role === 0 || currentUser?.role === 1;

  return (
    <View style={styles.container}>
      <HeaderWithMenu
        title="Cash Payments"
        subtitle="Manage customer payments"
        onNavigate={onNavigate}
        isAuthenticated={true}
        onLogout={onLogout}
      />
      <ScrollView style={styles.content}>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => setShowAddForm(true)}
          activeOpacity={0.7}
        >
          <Text style={styles.addButtonText}>+ Add Cash Payment</Text>
        </TouchableOpacity>

        {loading && payments.length === 0 ? (
          <View style={styles.centerContainer}>
            <ActivityIndicator size="large" color="#4CAF50" />
            <Text style={styles.loadingText}>Loading payments...</Text>
          </View>
        ) : (
          <>
            <View style={styles.summaryCard}>
              <Text style={styles.summaryTitle}>Total Payments</Text>
              <Text style={styles.summaryValue}>{formatCurrency(getTotalPayments())}</Text>
              <Text style={styles.summarySubtext}>{payments.length} Payment{payments.length !== 1 ? 's' : ''}</Text>
            </View>

            {payments.length === 0 ? (
              <View style={styles.centerContainer}>
                <Text style={styles.emptyText}>No payments recorded yet</Text>
                <Text style={styles.emptySubtext}>Click "Add Cash Payment" to record a payment</Text>
              </View>
            ) : (
              <>
                <Text style={styles.sectionTitle}>Payments by Customer</Text>
                {getPaymentsByCustomer().map((customer, index) => (
                  <View key={index} style={styles.customerCard}>
                    <View style={styles.customerHeader}>
                      <View style={styles.customerInfo}>
                        <Text style={styles.customerName}>{customer.customerName}</Text>
                        <Text style={styles.customerMobile}>{customer.customerMobile}</Text>
                      </View>
                      <View style={styles.customerAmount}>
                        <Text style={styles.amountText}>{formatCurrency(customer.totalAmount)}</Text>
                        <Text style={styles.paymentCount}>{customer.paymentCount} payment{customer.paymentCount !== 1 ? 's' : ''}</Text>
                      </View>
                    </View>
                    <View style={styles.paymentsList}>
                      {customer.payments.map((payment) => (
                        <View key={payment._id} style={styles.paymentItem}>
                          <View style={styles.paymentRow}>
                            <Text style={styles.paymentDate}>{formatDate(payment.paymentDate)}</Text>
                            <Text style={styles.paymentAmount}>{formatCurrency(payment.amount)}</Text>
                            {canEdit && (
                              <TouchableOpacity
                                style={styles.deleteButton}
                                onPress={() => handleDeletePayment(payment)}
                              >
                                <Text style={styles.deleteButtonText}>Delete</Text>
                              </TouchableOpacity>
                            )}
                          </View>
                          <View style={styles.paymentDetails}>
                            <Text style={styles.paymentType}>
                              {payment.paymentType === 'cash' ? '💵 Cash' : 
                               payment.paymentType === 'bank_transfer' ? '🏦 Bank Transfer' :
                               payment.paymentType === 'upi' ? '📱 UPI' : '💳 Other'}
                            </Text>
                            {payment.referenceNumber && (
                              <Text style={styles.referenceNumber}>Ref: {payment.referenceNumber}</Text>
                            )}
                            {payment.notes && (
                              <Text style={styles.paymentNotes}>{payment.notes}</Text>
                            )}
                          </View>
                        </View>
                      ))}
                    </View>
                  </View>
                ))}
              </>
            )}
          </>
        )}
      </ScrollView>

      {/* Add Payment Modal */}
      <Modal
        visible={showAddForm}
        animationType="slide"
        transparent={true}
        onRequestClose={() => {
          setShowAddForm(false);
          setSelectedCustomer(null);
          setFormData({
            customerId: '',
            customerName: '',
            customerMobile: '',
            amount: '',
            paymentDate: new Date().toISOString().split('T')[0],
            paymentType: 'cash',
            notes: '',
            referenceNumber: '',
          });
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add Cash Payment</Text>
              <TouchableOpacity
                onPress={() => {
                  setShowAddForm(false);
                  setSelectedCustomer(null);
                  setFormData({
                    customerId: '',
                    customerName: '',
                    customerMobile: '',
                    amount: '',
                    paymentDate: new Date().toISOString().split('T')[0],
                    paymentType: 'cash',
                    notes: '',
                    referenceNumber: '',
                  });
                }}
                style={styles.closeButton}
              >
                <Text style={styles.closeButtonText}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.formContainer}>
              <Text style={styles.label}>Select Customer *</Text>
              {selectedCustomer ? (
                <View style={styles.selectedCustomer}>
                  <Text style={styles.selectedCustomerName}>{selectedCustomer.name}</Text>
                  <Text style={styles.selectedCustomerMobile}>{selectedCustomer.mobile}</Text>
                  <TouchableOpacity
                    style={styles.changeCustomerButton}
                    onPress={() => setSelectedCustomer(null)}
                  >
                    <Text style={styles.changeCustomerText}>Change</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <ScrollView style={styles.customerList} nestedScrollEnabled>
                  {customers.length === 0 ? (
                    <Text style={styles.noCustomersText}>No customers found. Please add customers first.</Text>
                  ) : (
                    customers.map((customer) => (
                      <TouchableOpacity
                        key={customer.userId}
                        style={styles.customerOption}
                        onPress={() => handleCustomerSelect(customer)}
                      >
                        <Text style={styles.customerOptionName}>{customer.name}</Text>
                        <Text style={styles.customerOptionMobile}>{customer.mobile}</Text>
                      </TouchableOpacity>
                    ))
                  )}
                </ScrollView>
              )}

              <Text style={styles.label}>Amount (₹) *</Text>
              <Input
                placeholder="Enter payment amount"
                value={formData.amount}
                onChangeText={(text) => setFormData({ ...formData, amount: text.replace(/[^0-9.]/g, '') })}
                keyboardType="decimal-pad"
                style={styles.input}
              />

              <Text style={styles.label}>Payment Date *</Text>
              <Input
                placeholder="YYYY-MM-DD"
                value={formData.paymentDate}
                onChangeText={(text) => setFormData({ ...formData, paymentDate: text })}
                style={styles.input}
              />

              <Text style={styles.label}>Payment Type</Text>
              <View style={styles.paymentTypeRow}>
                {['cash', 'bank_transfer', 'upi', 'other'].map((type) => (
                  <TouchableOpacity
                    key={type}
                    style={[
                      styles.paymentTypeButton,
                      formData.paymentType === type && styles.paymentTypeButtonActive,
                    ]}
                    onPress={() => setFormData({ ...formData, paymentType: type })}
                  >
                    <Text
                      style={[
                        styles.paymentTypeButtonText,
                        formData.paymentType === type && styles.paymentTypeButtonTextActive,
                      ]}
                    >
                      {type === 'cash' ? '💵 Cash' :
                       type === 'bank_transfer' ? '🏦 Bank' :
                       type === 'upi' ? '📱 UPI' : '💳 Other'}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.label}>Reference Number (Optional)</Text>
              <Input
                placeholder="Enter reference/transaction number"
                value={formData.referenceNumber}
                onChangeText={(text) => setFormData({ ...formData, referenceNumber: text })}
                style={styles.input}
              />

              <Text style={styles.label}>Notes (Optional)</Text>
              <Input
                placeholder="Enter any additional notes"
                value={formData.notes}
                onChangeText={(text) => setFormData({ ...formData, notes: text })}
                multiline
                numberOfLines={3}
                style={styles.input}
              />

              <Button
                title={loading ? 'Saving...' : 'Save Payment'}
                onPress={handleCreatePayment}
                disabled={loading || !selectedCustomer}
                style={styles.createButton}
              />
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  content: {
    flex: 1,
    padding: 15,
  },
  centerContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
    marginTop: 12,
  },
  emptyText: {
    fontSize: 18,
    color: '#666',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
  },
  addButton: {
    backgroundColor: '#4CAF50',
    borderRadius: 8,
    padding: 15,
    alignItems: 'center',
    marginBottom: 15,
  },
  addButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  summaryCard: {
    backgroundColor: '#2196F3',
    borderRadius: 10,
    padding: 20,
    marginBottom: 15,
    alignItems: 'center',
  },
  summaryTitle: {
    fontSize: 16,
    color: '#FFFFFF',
    marginBottom: 8,
  },
  summaryValue: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  summarySubtext: {
    fontSize: 14,
    color: '#FFFFFF',
    opacity: 0.9,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
    marginTop: 8,
  },
  customerCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    padding: 15,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  customerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  customerInfo: {
    flex: 1,
  },
  customerName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  customerMobile: {
    fontSize: 14,
    color: '#666',
  },
  customerAmount: {
    alignItems: 'flex-end',
  },
  amountText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#4CAF50',
    marginBottom: 4,
  },
  paymentCount: {
    fontSize: 12,
    color: '#999',
  },
  paymentsList: {
    marginTop: 8,
  },
  paymentItem: {
    backgroundColor: '#F9F9F9',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
  paymentRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  paymentDate: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  paymentAmount: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2196F3',
  },
  deleteButton: {
    backgroundColor: '#F44336',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 4,
  },
  deleteButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  paymentDetails: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
  },
  paymentType: {
    fontSize: 12,
    color: '#666',
    marginRight: 12,
  },
  referenceNumber: {
    fontSize: 12,
    color: '#999',
    marginRight: 12,
  },
  paymentNotes: {
    fontSize: 12,
    color: '#999',
    fontStyle: 'italic',
    flex: 1,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  closeButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#F5F5F5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: 18,
    color: '#666',
  },
  formContainer: {
    padding: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
    marginTop: 12,
  },
  input: {
    backgroundColor: '#F9F9F9',
    borderColor: '#E0E0E0',
    marginBottom: 4,
  },
  customerList: {
    maxHeight: 200,
    marginBottom: 12,
  },
  customerOption: {
    backgroundColor: '#F9F9F9',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  customerOptionName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  customerOptionMobile: {
    fontSize: 14,
    color: '#666',
  },
  selectedCustomer: {
    backgroundColor: '#E8F5E9',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: '#4CAF50',
  },
  selectedCustomerName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  selectedCustomerMobile: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  changeCustomerButton: {
    alignSelf: 'flex-start',
    backgroundColor: '#FF9800',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  changeCustomerText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  noCustomersText: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    padding: 20,
  },
  paymentTypeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 12,
  },
  paymentTypeButton: {
    backgroundColor: '#F5F5F5',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    marginRight: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  paymentTypeButtonActive: {
    backgroundColor: '#4CAF50',
    borderColor: '#4CAF50',
  },
  paymentTypeButtonText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  paymentTypeButtonTextActive: {
    color: '#FFFFFF',
  },
  createButton: {
    marginTop: 10,
    marginBottom: 10,
  },
});

