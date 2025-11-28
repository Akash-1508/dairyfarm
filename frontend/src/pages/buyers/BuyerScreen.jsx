import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Modal,
} from 'react-native';
import HeaderWithMenu from '../../components/common/HeaderWithMenu';
import Input from '../../components/common/Input';
import Button from '../../components/common/Button';
import { milkService } from '../../services/milk/milkService';
import { buyerService } from '../../services/buyers/buyerService';
import { formatCurrency } from '../../utils/currencyUtils';
import { authService } from '../../services/auth/authService';

export default function BuyerScreen({ onNavigate, onLogout }) {
  const [transactions, setTransactions] = useState([]);
  const [buyersData, setBuyersData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedBuyer, setSelectedBuyer] = useState(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    mobile: '',
    email: '',
    milkFixedPrice: '',
    dailyMilkQuantity: '',
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [txData, buyersList] = await Promise.all([
        milkService.getTransactions(),
        buyerService.getBuyers().catch(() => []),
      ]);
      setTransactions(txData);
      setBuyersData(buyersList);
    } catch (error) {
      console.error('Failed to load data:', error);
      Alert.alert('Error', 'Failed to load buyer data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Get all buyers with their statistics
  const buyers = useMemo(() => {
    const buyerMap = new Map();

    // Add buyers from buyers table
    buyersData.forEach((buyer) => {
      if (buyer.mobile) {
        const key = buyer.mobile.trim();
        buyerMap.set(key, {
          name: buyer.name,
          phone: buyer.mobile,
          totalQuantity: 0,
          totalAmount: 0,
          transactionCount: 0,
          fixedPrice: buyer.rate, // rate from buyers table
          dailyQuantity: buyer.quantity, // quantity from buyers table
        });
      }
    });

    // Process transactions and calculate statistics
    transactions.forEach((tx) => {
      if (tx.type === 'sale' && tx.buyerPhone) {
        const key = tx.buyerPhone.trim();
        const buyer = buyerMap.get(key);
        
        if (buyer) {
          buyer.totalQuantity += tx.quantity;
          buyer.totalAmount += tx.totalAmount;
          buyer.transactionCount += 1;

          const txDate = new Date(tx.date);
          if (!buyer.lastTransactionDate || txDate > buyer.lastTransactionDate) {
            buyer.lastTransactionDate = txDate;
          }

          buyerMap.set(key, buyer);
        }
      }
    });

    // Return all buyers (including those with no transactions yet)
    // Sort by total amount (highest first), then by name
    return Array.from(buyerMap.values())
      .sort((a, b) => {
        // First sort by total amount (descending)
        if (b.totalAmount !== a.totalAmount) {
          return b.totalAmount - a.totalAmount;
        }
        // If amounts are equal, sort by name (ascending)
        return a.name.localeCompare(b.name);
      });
  }, [transactions, buyersData]);

  const getBuyerTransactions = (phone) => {
    return transactions
      .filter((tx) => tx.type === 'sale' && tx.buyerPhone?.trim() === phone.trim())
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  const handleCreateBuyer = async () => {
    // Validation
    if (!formData.name || !formData.mobile) {
      Alert.alert('Error', 'Please fill name and mobile number');
      return;
    }

    if (!/^[0-9]{10}$/.test(formData.mobile.trim())) {
      Alert.alert('Error', 'Mobile must be exactly 10 digits');
      return;
    }

    try {
      setLoading(true);
      // Parse fixed price and daily quantity, only if not empty
      const fixedPrice = formData.milkFixedPrice && formData.milkFixedPrice.trim() 
        ? parseFloat(formData.milkFixedPrice.trim()) 
        : undefined;
      const dailyQuantity = formData.dailyMilkQuantity && formData.dailyMilkQuantity.trim()
        ? parseFloat(formData.dailyMilkQuantity.trim())
        : undefined;
      
      // Validate parsed values
      if (formData.milkFixedPrice && formData.milkFixedPrice.trim()) {
        if (isNaN(fixedPrice) || fixedPrice <= 0) {
          Alert.alert('Error', 'Please enter a valid fixed price (greater than 0)');
          setLoading(false);
          return;
        }
      }
      if (formData.dailyMilkQuantity && formData.dailyMilkQuantity.trim()) {
        if (isNaN(dailyQuantity) || dailyQuantity <= 0) {
          Alert.alert('Error', 'Please enter a valid daily milk quantity (greater than 0)');
          setLoading(false);
          return;
        }
      }
      
      // Create buyer with fixed password 123456#
      await authService.signup(
        formData.name.trim(),
        formData.email.trim() || '',
        '123456#', // Fixed password
        formData.mobile.trim(),
        undefined, // gender
        undefined, // address
        fixedPrice,
        dailyQuantity,
        2 // role: CONSUMER (Buyer)
      );

      // Reset form
      setFormData({ name: '', mobile: '', email: '', milkFixedPrice: '', dailyMilkQuantity: '' });
      setShowAddForm(false);
      
      // Reload data to show new buyer immediately
      await loadData();
      
      // Show success message after data is loaded
      Alert.alert('Success', 'Buyer created successfully!');
    } catch (error) {
      console.error('Failed to create buyer:', error);
      Alert.alert('Error', error.message || 'Failed to create buyer. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <HeaderWithMenu
        title="Dairy Farm Management"
        subtitle="Buyers"
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
          <Text style={styles.addButtonText}>+ Add New Buyer</Text>
        </TouchableOpacity>

        {loading ? (
          <View style={styles.centerContainer}>
            <Text style={styles.loadingText}>Loading buyers...</Text>
          </View>
        ) : buyers.length === 0 ? (
          <View style={styles.centerContainer}>
            <Text style={styles.emptyText}>No buyers found</Text>
            <Text style={styles.emptySubtext}>Click "Add New Buyer" to create a buyer</Text>
          </View>
        ) : (
          <>
            <View style={styles.summaryCard}>
              <Text style={styles.summaryTitle} numberOfLines={2}>
                Total Buyers
              </Text>
              <Text style={styles.summaryValue}>{buyers.length}</Text>
            </View>

            {buyers.map((buyer, index) => {
              const buyerTransactions = getBuyerTransactions(buyer.phone);
              const isExpanded = selectedBuyer === buyer.phone;

              return (
                <View key={index} style={styles.buyerCard}>
                  <TouchableOpacity
                    onPress={() => setSelectedBuyer(isExpanded ? null : buyer.phone)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.buyerHeader}>
                      <View style={styles.buyerHeaderLeft}>
                        <Text style={styles.buyerName}>{buyer.name}</Text>
                        <Text style={styles.buyerPhone}>{buyer.phone}</Text>
                      </View>
                      <View style={styles.buyerHeaderRight}>
                        <Text style={styles.buyerAmount}>{formatCurrency(buyer.totalAmount)}</Text>
                        <Text style={styles.buyerQuantity}>{buyer.totalQuantity.toFixed(2)} L</Text>
                        <Text style={styles.expandIcon}>{isExpanded ? '▲' : '▼'}</Text>
                      </View>
                    </View>
                    <View style={styles.buyerStats}>
                      <Text style={styles.statText}>
                        {buyer.transactionCount} Transaction{buyer.transactionCount !== 1 ? 's' : ''}
                      </Text>
                      {buyer.lastTransactionDate && (
                        <Text style={styles.statText}>
                          Last: {formatDate(buyer.lastTransactionDate)}
                        </Text>
                      )}
                    </View>
                    {(buyer.fixedPrice || buyer.dailyQuantity) && (
                      <View style={styles.buyerDetails}>
                        {buyer.fixedPrice && (
                          <Text style={styles.buyerDetailText}>
                            Fixed Price: {formatCurrency(buyer.fixedPrice)}/L
                          </Text>
                        )}
                        {buyer.dailyQuantity && (
                          <Text style={styles.buyerDetailText}>
                            Daily Quantity: {buyer.dailyQuantity.toFixed(2)} L
                          </Text>
                        )}
                      </View>
                    )}
                  </TouchableOpacity>

                  {isExpanded && buyerTransactions.length > 0 && (
                    <View style={styles.transactionsContainer}>
                      <Text style={styles.transactionsTitle}>Transaction History</Text>
                      {buyerTransactions.map((tx) => (
                        <View key={tx._id} style={styles.transactionItem}>
                          <View style={styles.transactionRow}>
                            <Text style={styles.transactionDate}>{formatDate(new Date(tx.date))}</Text>
                            <Text style={styles.transactionAmount}>{formatCurrency(tx.totalAmount)}</Text>
                          </View>
                          <View style={styles.transactionRow}>
                            <Text style={styles.transactionDetails}>
                              {tx.quantity.toFixed(2)} L @ {formatCurrency(tx.pricePerLiter)}/L
                            </Text>
                          </View>
                          {tx.notes && (
                            <Text style={styles.transactionNotes}>{tx.notes}</Text>
                          )}
                        </View>
                      ))}
                    </View>
                  )}
                </View>
              );
            })}
          </>
        )}
      </ScrollView>

      {/* Add Buyer Modal */}
      <Modal
        visible={showAddForm}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowAddForm(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add New Buyer</Text>
              <TouchableOpacity
                onPress={() => {
                  setShowAddForm(false);
                  setFormData({ name: '', mobile: '', email: '', milkFixedPrice: '', dailyMilkQuantity: '' });
                }}
                style={styles.closeButton}
              >
                <Text style={styles.closeButtonText}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.formContainer}>
              <Text style={styles.label}>Name *</Text>
              <Input
                placeholder="Enter buyer name"
                value={formData.name}
                onChangeText={(text) => setFormData({ ...formData, name: text })}
                style={styles.input}
              />

              <Text style={styles.label}>Mobile Number *</Text>
              <Input
                placeholder="Enter 10 digit mobile number"
                value={formData.mobile}
                onChangeText={(text) => setFormData({ ...formData, mobile: text })}
                keyboardType="phone-pad"
                style={styles.input}
              />

              <Text style={styles.label}>Email (Optional)</Text>
              <Input
                placeholder="Enter email address"
                value={formData.email}
                onChangeText={(text) => setFormData({ ...formData, email: text })}
                keyboardType="email-address"
                autoCapitalize="none"
                style={styles.input}
              />

              <Text style={styles.label}>Fixed Milk Price (₹/L) (Optional)</Text>
              <Input
                placeholder="Enter fixed price per liter"
                value={formData.milkFixedPrice}
                onChangeText={(text) => setFormData({ ...formData, milkFixedPrice: text })}
                keyboardType="decimal-pad"
                style={styles.input}
              />

              <Text style={styles.label}>Daily Milk Quantity (Liters) (Optional)</Text>
              <Input
                placeholder="Enter expected daily milk quantity"
                value={formData.dailyMilkQuantity}
                onChangeText={(text) => setFormData({ ...formData, dailyMilkQuantity: text })}
                keyboardType="decimal-pad"
                style={styles.input}
              />

              <Text style={styles.infoText}>
                Password will be set to: 123456#
              </Text>

              <Button
                title={loading ? 'Creating...' : 'Create Buyer'}
                onPress={handleCreateBuyer}
                disabled={loading}
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
  summaryCard: {
    backgroundColor: '#2196F3',
    borderRadius: 10,
    padding: 20,
    marginBottom: 15,
    alignItems: 'center',
    width: '100%',
  },
  summaryTitle: {
    fontSize: 16,
    color: '#FFFFFF',
    marginBottom: 8,
    textAlign: 'center',
    flexShrink: 1,
    paddingHorizontal: 5,
  },
  summaryValue: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  buyerCard: {
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
  buyerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  buyerHeaderLeft: {
    flex: 1,
  },
  buyerName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  buyerPhone: {
    fontSize: 14,
    color: '#666',
  },
  buyerHeaderRight: {
    alignItems: 'flex-end',
  },
  buyerAmount: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2196F3',
    marginBottom: 4,
  },
  buyerQuantity: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  expandIcon: {
    fontSize: 12,
    color: '#666',
  },
  buyerStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  statText: {
    fontSize: 12,
    color: '#999',
  },
  transactionsContainer: {
    marginTop: 15,
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  transactionsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 10,
  },
  transactionItem: {
    backgroundColor: '#F9F9F9',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
  transactionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  transactionDate: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  transactionAmount: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2196F3',
  },
  transactionDetails: {
    fontSize: 13,
    color: '#666',
  },
  transactionNotes: {
    fontSize: 12,
    color: '#999',
    fontStyle: 'italic',
    marginTop: 4,
  },
  addButton: {
    backgroundColor: '#2196F3',
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
  infoText: {
    fontSize: 12,
    color: '#666',
    fontStyle: 'italic',
    marginTop: 8,
    marginBottom: 15,
  },
  createButton: {
    marginTop: 10,
    marginBottom: 10,
  },
  buyerDetails: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
    flexDirection: 'row',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
  },
  buyerDetailText: {
    fontSize: 13,
    color: '#4CAF50',
    fontWeight: '600',
    marginTop: 4,
  },
});

