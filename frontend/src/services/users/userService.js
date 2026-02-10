/**
 * User Service
 * Handle user-related operations
 */

import { apiClient } from '../api/apiClient';

export const userService = {
  /**
   * Get users by role
   * @param {number} role - User role (0 = Super Admin, 1 = Admin, 2 = Consumer)
   * @returns {Promise<Array>}
   */
  getUsersByRole: async (role) => {
    try {
      console.log('[userService] Fetching users with role:', role);
      const response = await apiClient.get(`/users?role=${role}`);
      console.log('[userService] API response:', response);
      console.log('[userService] Response type:', typeof response);
      console.log('[userService] Is array:', Array.isArray(response));
      
      // Handle different response formats
      if (Array.isArray(response)) {
        return response;
      } else if (response && Array.isArray(response.data)) {
        return response.data;
      } else if (response && response.users && Array.isArray(response.users)) {
        return response.users;
      } else {
        console.warn('[userService] Unexpected response format:', response);
        return [];
      }
    } catch (error) {
      console.error('[userService] Error fetching users:', error);
      console.error('[userService] Error details:', {
        message: error.message,
        stack: error.stack,
      });
      throw error;
    }
  },

  /**
   * Update user (only admin/super_admin should call)
   * @param {string} userId
   * @param {Object} data - name?, email?, mobile?, address?, isActive?, milkFixedPrice?, dailyMilkQuantity?
   */
  updateUser: async (userId, data) => {
    const response = await apiClient.patch(`/users/${userId}`, data);
    return response;
  },
};

