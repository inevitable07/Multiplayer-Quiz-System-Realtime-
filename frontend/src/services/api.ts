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

const API_BASE_URL = process.env.VITE_API_URL || 'http://localhost:5000/api'

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

/**
 * Request interceptor to attach JWT token to all requests
 * Token will be added to Authorization header once implemented
 */
apiClient.interceptors.request.use(
  (config) => {
    // TODO: Add JWT token from localStorage
    // const token = localStorage.getItem('token')
    // if (token) {
    //   config.headers.Authorization = `Bearer ${token}`
    // }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

/**
 * Response interceptor to handle errors globally
 * Can be used to handle 401 unauthorized, redirect to login, etc.
 */
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    // TODO: Handle 401 unauthorized, redirect to /auth
    // TODO: Log errors to console in development
    return Promise.reject(error)
  }
)

export default apiClient
