import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  UserPlus, 
  Mail, 
  Lock, 
  User, 
  AlertCircle, 
  Eye,
  EyeOff,
  ArrowLeft,
  Zap,
  CheckCircle,
  Shield,
  Star,
  Globe,
  Smartphone,
  ChevronRight
} from 'lucide-react';

export function Register() {
  const navigate = useNavigate();
  const { signUp, signInWithGoogle } = useAuthStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSocialLoading, setIsSocialLoading] = useState<'google' | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [isFocused, setIsFocused] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      await signUp(email, password, username);
      navigate('/login', { 
        state: { 
          message: 'Registration successful! Please check your email to verify your account.' 
        } 
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create account');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignUp = async () => {
    setError('');
    setIsSocialLoading('google');
    try {
      await signInWithGoogle();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to sign up with Google');
      setIsSocialLoading(null);
    }
  };



  return (
    <div className="min-h-screen bg-gray-50 relative overflow-hidden">
      {/* Background Elements */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute top-0 right-1/4 w-96 h-96 bg-gray-100/30 rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 left-1/4 w-80 h-80 bg-blue-100/30 rounded-full blur-3xl"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-gray-50/20 rounded-full blur-3xl"></div>
      </div>

      {/* Back to Home Link */}
      <div className="absolute top-6 left-6 z-10">
        <Link
          to="/"
          className="inline-flex items-center space-x-2 text-gray-600 hover:text-gray-900 transition-colors group"
        >
          <ArrowLeft className="h-5 w-5 group-hover:-translate-x-1 transition-transform duration-200" />
          <span className="font-medium">Back to Home</span>
        </Link>
      </div>

      <div className="min-h-screen flex items-center justify-center py-6 px-4 sm:py-12 sm:px-6 lg:px-8">
        <motion.div 
          className="w-full max-w-md space-y-8 bg-white/80 backdrop-blur-sm p-8 sm:p-10 rounded-3xl shadow-2xl border border-white/20"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          {/* Header Section */}
          <motion.div 
            className="text-center space-y-6"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
          >
            <div className="flex justify-center">
              <div className="relative">
                <div className="h-20 w-20 rounded-2xl flex items-center justify-center shadow-xl" style={{backgroundColor: '#800000'}}>
                  <img src="/images/logo.jpg" alt="CARS-G Logo" className="h-12 w-12 rounded-lg object-cover" />
                </div>
                <div className="absolute -top-1 -right-1 h-6 w-6 bg-green-500 rounded-full border-2 border-white animate-pulse"></div>
              </div>
            </div>
            <div className="space-y-3">
              <h1 className="text-3xl sm:text-4xl font-bold text-gray-900">
                Join CARS-G
              </h1>
              <p className="text-gray-600 text-lg">
                Create your account and start protecting your community
              </p>
            </div>
          </motion.div>
        
          {/* Form Section */}
          <motion.form 
            className="space-y-6"
            onSubmit={handleSubmit}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            {/* Error Alert */}
            <AnimatePresence>
              {error && (
                <motion.div 
                  className="bg-red-50 border-2 border-red-200 text-red-700 px-4 py-4 rounded-2xl flex items-center text-sm"
                  initial={{ opacity: 0, y: -10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -10, scale: 0.95 }}
                  transition={{ duration: 0.3 }}
                >
                  <AlertCircle className="h-5 w-5 mr-3 flex-shrink-0" />
                  <span className="font-medium">{error}</span>
                </motion.div>
              )}
            </AnimatePresence>
          
            {/* Input Fields */}
            <div className="space-y-6">
              {/* Username Field */}
              <div className="space-y-2">
                <label htmlFor="username" className="text-sm font-semibold text-gray-700 flex items-center space-x-2">
                  <User className="h-4 w-4" />
                  <span>Username</span>
                </label>
                <div className="relative group">
                  <div            className={`absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none transition-colors duration-200 ${
             isFocused === 'username' ? 'text-red-600' : 'text-gray-400'
           }`}>
                    <User className="h-5 w-5" />
                  </div>
                  <input
                    id="username"
                    name="username"
                    type="text"
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    onFocus={() => setIsFocused('username')}
                    onBlur={() => setIsFocused(null)}
                    className="block w-full pl-12 pr-4 py-4 border-2 border-gray-200 rounded-2xl placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all duration-200 bg-gray-50/50 hover:bg-white group-hover:border-gray-300"
                    placeholder="Choose a unique username"
                  />
                </div>
              </div>

              {/* Email Field */}
              <div className="space-y-2">
                <label htmlFor="email" className="text-sm font-semibold text-gray-700 flex items-center space-x-2">
                  <Mail className="h-4 w-4" />
                  <span>Email address</span>
                </label>
                <div className="relative group">
                  <div className={`absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none transition-colors duration-200 ${
                    isFocused === 'email' ? 'text-red-600' : 'text-gray-400'
                  }`}>
                    <Mail className="h-5 w-5" />
                  </div>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    onFocus={() => setIsFocused('email')}
                    onBlur={() => setIsFocused(null)}
                    className="block w-full pl-12 pr-4 py-4 border-2 border-gray-200 rounded-2xl placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all duration-200 bg-gray-50/50 hover:bg-white group-hover:border-gray-300"
                    placeholder="Enter your email address"
                  />
                </div>
              </div>
              
              {/* Password Field */}
              <div className="space-y-2">
                <label htmlFor="password" className="text-sm font-semibold text-gray-700 flex items-center space-x-2">
                  <Lock className="h-4 w-4" />
                  <span>Password</span>
                </label>
                <div className="relative group">
                  <div className={`absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none transition-colors duration-200 ${
                    isFocused === 'password' ? 'text-red-600' : 'text-gray-400'
                  }`}>
                    <Lock className="h-5 w-5" />
                  </div>
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onFocus={() => setIsFocused('password')}
                    onBlur={() => setIsFocused(null)}
                    className="block w-full pl-12 pr-12 py-4 border-2 border-gray-200 rounded-2xl placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all duration-200 bg-gray-50/50 hover:bg-white group-hover:border-gray-300"
                    placeholder="Create a strong password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-400 hover:text-gray-600 transition-colors duration-200"
                  >
                    {showPassword ? (
                      <EyeOff className="h-5 w-5" />
                    ) : (
                      <Eye className="h-5 w-5" />
                    )}
                  </button>
                </div>
              </div>
            </div>

            {/* Create Account Button */}
            <motion.button
              type="submit"
              disabled={isLoading}
              className="group w-full flex justify-center items-center py-4 px-6 border border-transparent rounded-2xl text-lg font-semibold text-white focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105 disabled:transform-none"
              style={{backgroundColor: '#800000'}}
              onMouseEnter={(e) => e.target.style.backgroundColor = '#660000'}
              onMouseLeave={(e) => e.target.style.backgroundColor = '#800000'}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              {isLoading ? (
                <div className="flex items-center space-x-3">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white"></div>
                  <span>Creating account...</span>
                </div>
              ) : (
                <div className="flex items-center space-x-3">
                  <Zap className="h-5 w-5 group-hover:rotate-12 transition-transform duration-300" />
                  <span>Create Account</span>
                  <ChevronRight className="h-5 w-5 group-hover:translate-x-1 transition-transform duration-300" />
                </div>
              )}
            </motion.button>
          </motion.form>
        
          {/* Social Login Section */}
          <motion.div 
            className="space-y-6"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
          >
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-200"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-4 bg-white text-gray-500 font-medium">Or continue with</span>
              </div>
            </div>

            <motion.button
              onClick={handleGoogleSignUp}
              disabled={isSocialLoading === 'google'}
              className="group w-full flex justify-center items-center py-4 px-6 border-2 border-gray-200 rounded-2xl text-lg font-semibold text-gray-700 bg-white hover:bg-gray-50 hover:border-gray-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 shadow-md hover:shadow-lg"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              {isSocialLoading === 'google' ? (
                <div className="flex items-center space-x-3">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-700"></div>
                  <span>Signing up...</span>
                </div>
              ) : (
                <div className="flex items-center space-x-3">
                  <svg className="h-6 w-6" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M23.745 12.27c0-.79-.07-1.54-.19-2.27h-11.01v4.51h6.27c-.29 1.48-1.14 2.73-2.4 3.58v3h3.86c2.26-2.09 3.47-5.17 3.47-8.82z"
                    />
                    <path
                      fill="#34A853"
                      d="M12.545 24c3.24 0 5.95-1.08 7.93-2.91l-3.86-3c-1.08.72-2.45 1.16-4.07 1.16-3.13 0-5.78-2.11-6.73-4.96h-3.98v3.09C3.915 21.3 7.935 24 12.545 24z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.815 14.29c-.25-.72-.38-1.49-.38-2.29s.14-1.57.38-2.29V6.62h-3.98a11.86 11.86 0 000 10.76l3.98-3.09z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12.545 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C18.535 1.19 15.825 0 12.545 0c-4.61 0-8.63 2.7-10.63 6.62l3.98 3.09c.95-2.85 3.6-4.96 6.73-4.96z"
                    />
                  </svg>
                  <span>Sign up with Google</span>
                </div>
              )}
            </motion.button>
          </motion.div>

          {/* Footer */}
          <motion.div 
            className="text-center"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.5 }}
          >
            <p className="text-gray-600">
              Already have an account?{' '}
              <Link 
                to="/login" 
                className="font-semibold text-purple-600 hover:text-purple-700 transition-colors underline decoration-2 underline-offset-2 hover:decoration-purple-700"
              >
                Sign in here
              </Link>
            </p>
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
} 