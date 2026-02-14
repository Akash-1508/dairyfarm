/**
 * Milk Service
 * Handle milk sales and purchase operations
 */

import { apiClient } from '../api/apiClient';

export const milkService = {
  recordSale: async (transaction) => {
    const payload = {
      date: transaction.date.toISOString(),
      quantity: transaction.quantity,
      pricePerLiter: transaction.pricePerLiter,
      totalAmount: transaction.totalAmount,
      buyer: transaction.buyer,
      buyerPhone: transaction.buyerPhone,
      notes: transaction.notes,
      fixedPrice: transaction.fixedPrice,
    };
    if (transaction.paymentType) payload.paymentType = transaction.paymentType;
    if (transaction.amountReceived != null) payload.amountReceived = transaction.amountReceived;
    const response = await apiClient.post('/milk/sale', payload);
    
    // Convert date string back to Date object
    return {
      ...response,
      date: new Date(response.date),
    };
  },

  recordPurchase: async (transaction) => {
    const payload = {
      date: transaction.date.toISOString(),
      quantity: transaction.quantity,
      pricePerLiter: transaction.pricePerLiter,
      totalAmount: transaction.totalAmount,
      seller: transaction.seller,
      sellerPhone: transaction.sellerPhone,
      notes: transaction.notes,
    };
    if (transaction.paymentType) payload.paymentType = transaction.paymentType;
    if (transaction.amountReceived != null) payload.amountReceived = transaction.amountReceived;
    const response = await apiClient.post('/milk/purchase', payload);
    
    // Convert date string back to Date object
    return {
      ...response,
      date: new Date(response.date),
    };
  },

  getTransactions: async (startDate, endDate) => {
    const response = await apiClient.get('/milk');
    
    // Convert date strings back to Date objects
    return response.map((tx) => ({
      ...tx,
      date: new Date(tx.date),
    }));
  },

  updateTransaction: async (transactionId, transaction) => {
    const payload = {
      date: transaction.date.toISOString(),
      quantity: transaction.quantity,
      pricePerLiter: transaction.pricePerLiter,
      totalAmount: transaction.totalAmount,
      notes: transaction.notes,
    };
    
    // Add buyer/seller fields based on transaction type
    if (transaction.type === 'sale') {
      payload.buyer = transaction.buyer;
      payload.buyerPhone = transaction.buyerPhone;
      if (transaction.fixedPrice) payload.fixedPrice = transaction.fixedPrice;
    } else {
      payload.seller = transaction.seller;
      payload.sellerPhone = transaction.sellerPhone;
    }
    
    if (transaction.paymentType) payload.paymentType = transaction.paymentType;
    if (transaction.amountReceived != null) payload.amountReceived = transaction.amountReceived;
    
    const response = await apiClient.patch(`/milk/${transactionId}`, payload);
    
    // Convert date string back to Date object
    return {
      ...response,
      date: new Date(response.date),
    };
  },

  deleteTransaction: async (id) => {
    await apiClient.delete(`/milk/${id}`);
  },
};

