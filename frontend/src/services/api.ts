import axios from 'axios'

/**
 * API Service
 * Centralized Axios instance for all backend API calls
 * 
 * Base URL: http://localhost:5000/api
 * 
 * Note: API calls are not implemented yet.
 * This service will be used in upcoming modules for:
 * - Authentication (signup, login)
 * - Room management (create, join, get room details)
 * - Quiz operations
 */

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

/**
 * Request interceptor to attach JWT token to all requests
 * Token will be added to Authorization header from localStorage
 */
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

/**
 * Response interceptor to handle errors globally
 * Handles 401 unauthorized, error logging, etc.
 */
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    // Log error for debugging in development
    if (import.meta.env.DEV) {
      console.error('API Error:', error.response?.data || error.message)
    }

    // Handle 401 unauthorized - token expired or invalid
    if (error.response?.status === 401) {
      // Clear token and redirect to auth (will be handled by Auth component)
      localStorage.removeItem('token')
    }

    return Promise.reject(error)
  }
)

export default apiClient
