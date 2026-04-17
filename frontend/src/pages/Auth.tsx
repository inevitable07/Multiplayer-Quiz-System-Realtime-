import { FC, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import apiClient from '../services/api'
import { setToken } from '../utils/auth'

/**
 * Auth Page
 * Premium authentication UI with split layout
 * Supports login and signup modes with dynamic gradients
 * 
 * Features:
 * - Form validation
 * - JWT token storage
 * - Automatic redirect on successful auth
 * - Error handling and display
 */
const Auth: FC = () => {
  const navigate = useNavigate()
  const [isLogin, setIsLogin] = useState(true)
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
  })
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  // Dynamic gradient based on mode
  const gradientClass = isLogin
    ? 'bg-gradient-to-br from-sky-200 via-blue-100 to-blue-50'
    : 'bg-gradient-to-br from-orange-200 via-amber-100 to-orange-50'

  const illustrationImage = isLogin ? '/sign-in.png' : '/sign-up.png'
  const illustrationText = isLogin
    ? 'Welcome Back'
    : 'Join Our Community'

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }))
    // Clear error when user starts typing
    if (error) setError('')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError('')

    try {
      let response

      if (isLogin) {
        // Login API call
        response = await apiClient.post('/auth/login', {
          email: formData.email,
          password: formData.password,
        })
      } else {
        // Signup API call
        response = await apiClient.post('/auth/signup', {
          username: formData.username,
          email: formData.email,
          password: formData.password,
        })
      }

      // Extract token and user data from response
      const { data } = response
      const token = data.data?.token || data.token

      if (!token) {
        setError('No authentication token received. Please try again.')
        setIsLoading(false)
        return
      }

      // Store token in localStorage using utility function
      setToken(token)

      // Update axios default header for future requests
      apiClient.defaults.headers.common['Authorization'] = `Bearer ${token}`

      // Clear form and redirect to lobby
      setFormData({ username: '', email: '', password: '' })
      navigate('/lobby')
    } catch (err: any) {
      // Handle error response
      const errorMessage =
        err.response?.data?.message ||
        err.response?.data?.error ||
        err.message ||
        'An error occurred. Please try again.'

      setError(errorMessage)
      console.error('Auth error:', err)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex overflow-hidden bg-white">
      {/* ==================== LEFT SECTION (FORM) ==================== */}
      <div className="w-full lg:w-2/5 flex flex-col items-center justify-center px-6 py-12 lg:px-12 bg-white">
        {/* Form Container */}
        <div className="w-full max-w-md">
          {/* Header */}
          <div className="mb-8 text-center">
            <h1 className="text-4xl font-bold text-gray-900 mb-2">
              {isLogin ? 'Welcome Back' : 'Create Account'}
            </h1>
            <p className="text-gray-600">
              {isLogin
                ? 'Sign in to your account to continue'
                : 'Join us and start learning today'}
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Error Message Display */}
            {error && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-red-800 text-sm font-medium">{error}</p>
              </div>
            )}

            {/* Signup Only: Username Field */}
            {!isLogin && (
              <div>
                <label className="form-label">Username</label>
                <input
                  type="text"
                  name="username"
                  placeholder="Choose a username"
                  value={formData.username}
                  onChange={handleInputChange}
                  className="input-field"
                  required
                  disabled={isLoading}
                />
              </div>
            )}

            {/* Email Field */}
            <div>
              <label className="form-label">Email Address</label>
              <input
                type="email"
                name="email"
                placeholder="you@example.com"
                value={formData.email}
                onChange={handleInputChange}
                className="input-field"
                required
                disabled={isLoading}
              />
            </div>

            {/* Password Field */}
            <div>
              <label className="form-label">Password</label>
              <input
                type="password"
                name="password"
                placeholder="Enter your password"
                value={formData.password}
                onChange={handleInputChange}
                className="input-field"
                required
                disabled={isLoading}
              />
            </div>

            {/* Login Only: Forgot Password */}
            {isLogin && (
              <div className="text-right">
                <a
                  href="#"
                  className="text-sm text-black hover:underline font-medium"
                >
                  Forgot password?
                </a>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              className="btn-primary w-full text-lg disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={isLoading}
            >
              {isLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="inline-block w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin"></span>
                  {isLogin ? 'Signing In...' : 'Signing Up...'}
                </span>
              ) : (
                <span>{isLogin ? 'Sign In' : 'Sign Up'}</span>
              )}
            </button>
          </form>

          {/* Divider */}
          <div className="flex items-center gap-4 my-8">
            <div className="flex-1 h-px bg-gray-200"></div>
            <span className="text-sm text-gray-500 font-medium">OR</span>
            <div className="flex-1 h-px bg-gray-200"></div>
          </div>

          {/* Google OAuth Button */}
          <button
            type="button"
            className="btn-secondary w-full flex items-center justify-center gap-3 text-lg"
          >
            {/* Google Icon */}
            <svg
              className="w-5 h-5"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                fill="#4285F4"
              />
              <path
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                fill="#34A853"
              />
              <path
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                fill="#FBBC05"
              />
              <path
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                fill="#EA4335"
              />
            </svg>
            Continue with Google
          </button>

          {/* Toggle Auth Mode */}
          <div className="mt-8 text-center">
            <p className="text-gray-600">
              {isLogin ? "Don't have an account? " : 'Already have an account? '}
              <button
                onClick={() => {
                  setIsLogin(!isLogin)
                  setFormData({ username: '', email: '', password: '' })
                  setError('')
                }}
                className="text-black hover:underline font-semibold disabled:opacity-50"
                disabled={isLoading}
              >
                {isLogin ? 'Sign up' : 'Sign in'}
              </button>
            </p>
          </div>

          {/* Footer Links */}
          <div className="mt-6 flex items-center justify-center gap-4 text-xs text-gray-500">
            <a href="#" className="hover:text-gray-700">
              Privacy Policy
            </a>
            <span className="text-gray-300">•</span>
            <a href="#" className="hover:text-gray-700">
              Terms of Service
            </a>
          </div>
        </div>
      </div>

      {/* ==================== RIGHT SECTION (ILLUSTRATION + BACKGROUND) ==================== */}
      <div
        className={`hidden lg:flex w-3/5 ${gradientClass} flex-col items-center justify-center p-12 transition-all duration-500`}
      >
        <div className="flex flex-col items-center justify-center gap-12">
          {/* Illustration Image - Large Size */}
          <div className="w-96 h-96">
            <img
              src={illustrationImage}
              alt={illustrationText}
              className="w-full h-full object-contain"
            />
          </div>

          {/* Motivational Text - Large Font */}
          <h2 className="text-5xl font-bold text-gray-800 text-center leading-tight max-w-lg">
            {illustrationText}
          </h2>
          <p className="text-xl text-gray-700 text-center max-w-md font-medium">
            {isLogin
              ? 'Test your knowledge and compete with learners worldwide'
              : 'Explore, Learn, and Grow Together'}
          </p>
        </div>
      </div>

      {/* Mobile-only illustration message */}
      <div className="lg:hidden fixed bottom-6 left-6 right-6 text-center">
        <p className="text-sm text-gray-600">
          {isLogin
            ? 'Welcome back to the learning experience'
            : 'Join millions of learners worldwide'}
        </p>
      </div>
    </div>
  )
}

export default Auth
