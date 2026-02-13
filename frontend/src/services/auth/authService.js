/**
 * Authentication Service
 * Handle user login, signup, and authentication
 */

import { apiClient, setAuthToken, getAuthToken } from '../api/apiClient';
import AsyncStorage from '@react-native-async-storage/async-storage';

const USER_DATA_KEY = '@user_data';

export const authService = {
  login: async (emailOrMobile, password) => {
    const res = await apiClient.post('/auth/login', { emailOrMobile, password });
    if (res?.token) {
      await setAuthToken(res.token);
      // Save user data to AsyncStorage
      if (res.user) {
        try {
          await AsyncStorage.setItem(USER_DATA_KEY, JSON.stringify(res.user));
          console.log('[authService] User data saved to storage');
        } catch (error) {
          console.error('[authService] Error saving user data:', error);
        }
      }
    }
    return res.user;
  },

  signup: async (
    name,
    email,
    password,
    mobile,
    gender,
    address,
    milkFixedPrice,
    dailyMilkQuantity,
    role
  ) => {
    const emailValue = (email != null && String(email).trim()) ? String(email).trim() : '';
    const res = await apiClient.post('/auth/signup', {
      name,
      email: emailValue,
      password,
      mobile,
      gender,
      address,
      milkFixedPrice,
      dailyMilkQuantity,
      role,
    });
    return res;
  },

  logout: async () => {
    await setAuthToken(null);
    try {
      await AsyncStorage.removeItem(USER_DATA_KEY);
      console.log('[authService] User data removed from storage');
    } catch (error) {
      console.error('[authService] Error removing user data:', error);
    }
  },

  getCurrentUser: async () => {
    try {
      const userData = await AsyncStorage.getItem(USER_DATA_KEY);
      if (userData) {
        return JSON.parse(userData);
      }
    } catch (error) {
      console.error('[authService] Error getting user data:', error);
    }
    return null;
  },

  checkAuthToken: async () => {
    const token = await getAuthToken();
    if (token) {
      return token;
    }
    return null;
  },

  forgotPassword: async (mobile) => {
    const res = await apiClient.post('/auth/forgot-password', { mobile });
    return res;
  },

  resetPassword: async (mobile, otp, newPassword) => {
    const res = await apiClient.post('/auth/reset-password', {
      mobile,
      otp,
      newPassword,
    });
    return res;
  },
};

