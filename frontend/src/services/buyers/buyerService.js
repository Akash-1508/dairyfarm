/**
 * Buyer Service
 * Handle buyer operations
 */

import { apiClient } from '../api/apiClient';

export const buyerService = {
  getBuyers: async () => {
    try {
      const response = await apiClient.get('/buyers');
      if (!Array.isArray(response)) {
        console.warn('[buyerService] Response is not an array:', response);
        return [];
      }
      return response.map((buyer) => ({
        ...buyer,
        id: buyer._id || buyer.id,
        userId: buyer.userId ? buyer.userId.toString() : (buyer._id || buyer.id),
      }));
    } catch (error) {
      console.error('[buyerService] Error fetching buyers:', error);
      // Return empty array instead of throwing to allow graceful degradation
      return [];
    }
  },
};

