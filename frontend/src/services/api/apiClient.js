/**
 * API Client
 * Base configuration for API calls
 */

import { API_BASE_URL as ENV_API_BASE_URL } from '@env';

if (!ENV_API_BASE_URL || typeof ENV_API_BASE_URL !== 'string' || !ENV_API_BASE_URL.trim()) {
  throw new Error('API_BASE_URL is not set. Define it in frontend/.env');
}
const API_BASE_URL = ENV_API_BASE_URL.trim();

let authToken = null;

export function setAuthToken(token) {
  authToken = token;
}

/**
 * Sanitize sensitive data before logging
 * Removes passwords and other sensitive fields
 */
function sanitizeForLogging(data) {
  if (!data || typeof data !== 'object') {
    return data;
  }
  
  const sensitiveFields = ['password', 'confirmPassword', 'oldPassword', 'newPassword'];
  const sanitized = { ...data };
  
  sensitiveFields.forEach(field => {
    if (sanitized[field]) {
      sanitized[field] = '***HIDDEN***';
    }
  });
  
  return sanitized;
}

async function request(method, endpoint, data) {
  const headers = {
    'Accept': 'application/json',
    'Content-Type': 'application/json',
  };
  if (authToken) {
    headers['Authorization'] = `Bearer ${authToken}`;
  }
  
  const url = `${API_BASE_URL}${endpoint}`;
  const sanitizedData = sanitizeForLogging(data);
  console.log(`[apiClient] ${method} ${url}`, { hasToken: !!authToken, data: sanitizedData });
  
  try {
    const res = await fetch(url, {
      method,
      headers,
      body: data ? JSON.stringify(data) : undefined,
    });
    
    const text = await res.text();
    console.log(`[apiClient] Response status: ${res.status}`, { text: text.substring(0, 200) });
    
    const json = text ? JSON.parse(text) : null;
    
    
    if (!res.ok) {
      // Try to extract detailed error message
      let errorMessage = 'Request failed';
      if (json?.error) {
        if (typeof json.error === 'string') {
          errorMessage = json.error;
        } else if (json.error?.message) {
          errorMessage = json.error.message;
        } else if (json.error?.fieldErrors) {
          // Format validation errors
          const fieldErrors = Object.entries(json.error.fieldErrors)
            .map(([field, errors]) => `${field}: ${Array.isArray(errors) ? errors.join(', ') : errors}`)
            .join('\n');
          errorMessage = fieldErrors || json.error.message || 'Validation failed';
        }
      } else if (json?.message) {
        errorMessage = json.message;
      } else {
        errorMessage = res.statusText || 'Request failed';
      }
      console.error(`[apiClient] Request failed:`, { status: res.status, message: errorMessage, json });
      throw new Error(errorMessage);
    }
    
    return json;
  } catch (error) {
    console.error(`[apiClient] Request error:`, error);
    throw error;
  }
}

export const apiClient = {
  get: async (endpoint) => {
    return request('GET', endpoint);
  },
  post: async (endpoint, data) => {
    return request('POST', endpoint, data);
  },
  put: async (endpoint, data) => {
    return request('PUT', endpoint, data);
  },
  delete: async (endpoint) => {
    return request('DELETE', endpoint);
  },
};

export { API_BASE_URL };
