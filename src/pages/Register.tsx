import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { motion } from 'framer-motion';
import { 
  Mail, 
  Lock, 
  User, 
  AlertCircle, 
  Eye,
  EyeOff,
  ArrowLeft,
  CheckCircle,
  Shield,
  UserPlus,
  MapPin,
  Phone
} from 'lucide-react';

export function Register() {
  const navigate = useNavigate();
  const { signUp, signInWithGoogle } = useAuthStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Smooth scroll to top on mount
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters long');
      return;
    }

    setIsLoading(true);

    try {
      await signUp(email, password, username, firstName || '', lastName || '', phone || '', confirmPassword || '');
      setSuccess('Registration successful! Please check your email for verification.');
      setTimeout(() => {
        navigate('/login');
      }, 2000);
    } catch (error: any) {
      setError(error.message || 'Registration failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignUp = async () => {
    try {
      await signInWithGoogle();
    } catch (error: any) {
      setError(error.message || 'Google sign-up failed. Please try again.');
    }
  };

  return (
    <div 
      className="min-h-screen w-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-start justify-center px-500 py-500 sm:py-500 lg:py-500"
      style={{ overflow: 'auto' }}
    >
      {/* Back to Home Link - Mobile */}
      <div className="fixed top-4 left-4 z-50 lg:hidden">
        <Link 
          to="/" 
          className="inline-flex items-center gap-2 text-gray-700 hover:text-gray-900 bg-white/90 backdrop-blur-sm px-3 py-1.5 rounded-full shadow-lg hover:shadow-xl transition-all duration-300 font-medium text-sm"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back</span>
        </Link>
      </div>

      <div className="w-full max-w-4xl my-8">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="bg-white rounded-2xl shadow-2xl overflow-hidden"
        >
          <div className="grid lg:grid-cols-2 min-h-[600px]">
            {/* Left Column - Hero Image & Branding */}
            <div className="hidden lg:flex relative bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 overflow-hidden">
              {/* Background Pattern */}
              <div className="absolute inset-0 opacity-10">
                <div className="absolute inset-0" style={{
                  backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
                }}></div>
              </div>

              {/* Car Image Overlay */}
              <div className="absolute inset-0 bg-gradient-to-br from-red-900/20 via-red-800/20 to-red-900/20 mix-blend-overlay"></div>
              
              {/* Hero Image */}
              <div 
                className="absolute inset-0 bg-cover bg-center opacity-30"
                style={{
                  backgroundImage: `url('/images/feature-tracking.jpg')`,
                  filter: 'brightness(0.8) contrast(1.2)',
                }}
              ></div>

              {/* Content */}
              <div className="relative z-10 flex flex-col justify-between p-6 text-white w-full">
                <div>
                  {/* Back Link */}
                  <Link 
                    to="/" 
                    className="inline-flex items-center gap-1.5 text-white/90 hover:text-white transition-colors duration-300 mb-6 group text-xs"
                  >
                    <ArrowLeft className="h-3.5 w-3.5 group-hover:-translate-x-1 transition-transform duration-300" />
                    <span className="font-medium">Back to Home</span>
                  </Link>
                  
                  {/* Logo and Title */}
                  <div className="space-y-4">
                    <div className="flex items-center gap-2.5">
                      <div className="w-10 h-10 bg-white/10 backdrop-blur-md rounded-lg p-2 border border-white/20 shadow-xl">
                        <img 
                          src="/images/logo.jpg" 
                          alt="CARS-G Logo" 
                          className="w-full h-full object-contain"
                        />
                      </div>
                            <div>
                              <h1 className="text-2xl font-bold tracking-tight text-white">CARS-G</h1>
                              <p className="text-red-100 text-[10px] font-medium tracking-wide">Community Assistance and Reporting System - Gamified</p>
                            </div>
                    </div>

                    <div className="space-y-2">
                      <h2 className="text-xl font-bold leading-tight text-white">
                        Join the Movement for<br />Safer Communities
                      </h2>
                      <p className="text-white/90 text-xs leading-relaxed">
                        Empower yourself as an active citizen. Report traffic violations, track community issues, and make a real impact.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Bottom Stats/Features */}
                <div className="space-y-2.5 mt-4">
                          <div className="grid grid-cols-2 gap-2.5">
                            <div className="bg-white/5 backdrop-blur-sm rounded-lg p-2.5 border border-white/10">
                              <div className="flex items-center gap-2">
                                <div className="w-7 h-7 bg-red-500/20 rounded flex items-center justify-center">
                                  <MapPin className="h-3.5 w-3.5 text-red-300" />
                        </div>
                        <div>
                          <p className="text-lg font-bold text-white">1000+</p>
                          <p className="text-[9px] text-white/70">Reports Filed</p>
                        </div>
                      </div>
                    </div>
                            <div className="bg-white/5 backdrop-blur-sm rounded-lg p-2.5 border border-white/10">
                              <div className="flex items-center gap-2">
                                <div className="w-7 h-7 bg-red-500/20 rounded flex items-center justify-center">
                                  <Shield className="h-3.5 w-3.5 text-red-300" />
                        </div>
                        <div>
                          <p className="text-lg font-bold text-white">500+</p>
                          <p className="text-[9px] text-white/70">Active Users</p>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="border-t border-white/10 pt-3">
                    <p className="text-[10px] text-white/80">
                      Trusted by citizens and local authorities nationwide.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column - Registration Form */}
            <div className="p-5 sm:p-6 lg:p-8 overflow-auto flex flex-col justify-center">
              {/* Mobile Hero */}
              <div className="lg:hidden mb-6 text-center pt-6">
                <div className="inline-flex items-center gap-2 mb-3">
                  <img 
                    src="/images/logo.jpg" 
                    alt="CARS-G Logo" 
                    className="h-9 w-9 object-contain rounded-lg"
                  />
                  <h1 className="text-xl font-bold text-gray-900">CARS-G</h1>
                </div>
                <h2 className="text-lg font-bold text-gray-900 mb-1.5">Create Your Account</h2>
                <p className="text-gray-600 text-sm">Join our community of active citizens</p>
              </div>

              {/* Desktop Header */}
              <div className="hidden lg:block mb-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-1.5 tracking-tight">Create Your Account</h2>
                <p className="text-gray-600 text-sm">Get started with CARS-G in just a few steps</p>
              </div>
              <form onSubmit={handleSubmit} className="space-y-3">
                {/* Name Fields */}
                <div className="grid sm:grid-cols-2 gap-3">
                  <div className="group">
                    <label htmlFor="firstName" className="block text-xs font-semibold text-gray-700 mb-1">
                      First Name
                    </label>
                    <input
                      type="text"
                      id="firstName"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      className="w-full px-3 py-2 bg-gray-50 border-2 border-gray-200 rounded-lg text-gray-900 text-sm placeholder-gray-400 focus:bg-white focus:border-red-800 focus:ring-4 focus:ring-red-800/10 transition-all duration-300 outline-none font-medium"
                      placeholder="John"
                    />
                  </div>
                  <div className="group">
                    <label htmlFor="lastName" className="block text-xs font-semibold text-gray-700 mb-1">
                      Last Name
                    </label>
                    <input
                      type="text"
                      id="lastName"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      className="w-full px-3 py-2 bg-gray-50 border-2 border-gray-200 rounded-lg text-gray-900 text-sm placeholder-gray-400 focus:bg-white focus:border-red-800 focus:ring-4 focus:ring-red-800/10 transition-all duration-300 outline-none font-medium"
                      placeholder="Doe"
                    />
                  </div>
                </div>

                {/* Email */}
                <div className="group">
                  <label htmlFor="email" className="block text-xs font-semibold text-gray-700 mb-1">
                    Email Address
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 group-focus-within:text-red-800 transition-colors duration-300" />
                    <input
                      type="email"
                      id="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      className="w-full pl-9 pr-3 py-2 bg-gray-50 border-2 border-gray-200 rounded-lg text-gray-900 text-sm placeholder-gray-400 focus:bg-white focus:border-red-800 focus:ring-4 focus:ring-red-800/10 transition-all duration-300 outline-none font-medium"
                      placeholder="john@example.com"
                    />
                  </div>
                </div>

                {/* Username */}
                <div className="group">
                  <label htmlFor="username" className="block text-xs font-semibold text-gray-700 mb-1">
                    Username
                  </label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 group-focus-within:text-red-800 transition-colors duration-300" />
                    <input
                      type="text"
                      id="username"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      required
                      className="w-full pl-9 pr-3 py-2 bg-gray-50 border-2 border-gray-200 rounded-lg text-gray-900 text-sm placeholder-gray-400 focus:bg-white focus:border-red-800 focus:ring-4 focus:ring-red-800/10 transition-all duration-300 outline-none font-medium"
                      placeholder="johndoe"
                    />
                  </div>
                </div>

                {/* Phone */}
                <div className="group">
                  <label htmlFor="phone" className="block text-xs font-semibold text-gray-700 mb-1">
                    Phone Number <span className="text-gray-400 font-normal">(Optional)</span>
                  </label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 group-focus-within:text-red-800 transition-colors duration-300" />
                    <input
                      type="tel"
                      id="phone"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 bg-gray-50 border-2 border-gray-200 rounded-lg text-gray-900 text-sm placeholder-gray-400 focus:bg-white focus:border-red-800 focus:ring-4 focus:ring-red-800/10 transition-all duration-300 outline-none font-medium"
                      placeholder="+1 (555) 123-4567"
                    />
                  </div>
                </div>

                {/* Password */}
                <div className="group">
                  <label htmlFor="password" className="block text-xs font-semibold text-gray-700 mb-1">
                    Password
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 group-focus-within:text-red-800 transition-colors duration-300" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      id="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      className="w-full pl-9 pr-9 py-2 bg-gray-50 border-2 border-gray-200 rounded-lg text-gray-900 text-sm placeholder-gray-400 focus:bg-white focus:border-red-800 focus:ring-4 focus:ring-red-800/10 transition-all duration-300 outline-none font-medium"
                      placeholder="••••••••"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-2.5 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-700 transition-colors duration-200 p-1"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                {/* Confirm Password */}
                <div className="group">
                  <label htmlFor="confirmPassword" className="block text-xs font-semibold text-gray-700 mb-1">
                    Confirm Password
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 group-focus-within:text-red-800 transition-colors duration-300" />
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      id="confirmPassword"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                      className="w-full pl-9 pr-9 py-2 bg-gray-50 border-2 border-gray-200 rounded-lg text-gray-900 text-sm placeholder-gray-400 focus:bg-white focus:border-red-800 focus:ring-4 focus:ring-red-800/10 transition-all duration-300 outline-none font-medium"
                      placeholder="••••••••"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-2.5 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-700 transition-colors duration-200 p-1"
                    >
                      {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                {/* Error Message */}
                {error && (
                  <motion.div 
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-start gap-2 text-red-700 bg-red-50 border-2 border-red-200 p-2.5 rounded-lg"
                  >
                    <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
                    <span className="text-xs font-medium">{error}</span>
                  </motion.div>
                )}

                {/* Success Message */}
                {success && (
                  <motion.div 
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-start gap-2 text-green-700 bg-green-50 border-2 border-green-200 p-2.5 rounded-lg"
                  >
                    <CheckCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
                    <span className="text-xs font-medium">{success}</span>
                  </motion.div>
                )}

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full text-white py-2.5 px-4 rounded-lg font-bold text-sm shadow-lg hover:shadow-xl focus:ring-4 focus:ring-red-800/50 disabled:opacity-60 disabled:cursor-not-allowed disabled:shadow-none transition-all duration-300 transform hover:scale-[1.01] active:scale-[0.99] flex items-center justify-center gap-2 group"
                  style={{backgroundColor: '#800000'}}
                  onMouseEnter={(e) => !isLoading && ((e.currentTarget as HTMLElement).style.backgroundColor = '#660000')}
                  onMouseLeave={(e) => !isLoading && ((e.currentTarget as HTMLElement).style.backgroundColor = '#800000')}
                >
                  {isLoading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                      <span>Creating Account...</span>
                    </>
                  ) : (
                    <>
                      <UserPlus className="h-4 w-4 group-hover:scale-110 transition-transform duration-300" />
                      <span>Create Account</span>
                    </>
                  )}
                </button>

                {/* Divider */}
                <div className="relative py-3">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t-2 border-gray-200" />
                  </div>
                  <div className="relative flex justify-center">
                    <span className="px-2.5 bg-white text-xs font-semibold text-gray-500">Or continue with</span>
                  </div>
                </div>

                {/* Google Sign Up */}
                <button
                  type="button"
                  onClick={handleGoogleSignUp}
                  className="w-full flex items-center justify-center gap-2 bg-white border-2 border-gray-200 text-gray-700 py-2 px-4 rounded-lg text-sm font-semibold hover:bg-gray-50 hover:border-gray-300 focus:ring-4 focus:ring-gray-200 transition-all duration-300 shadow-sm hover:shadow-md group"
                >
                  <svg className="h-4 w-4 group-hover:scale-110 transition-transform duration-300" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                  <span>Continue with Google</span>
                </button>
              </form>

              {/* Login Link */}
              <div className="mt-5 text-center pt-4 border-t-2 border-gray-100">
                <p className="text-gray-600 text-xs">
                  Already have an account?{' '}
                  <Link 
                    to="/login" 
                    className="font-bold underline decoration-2 underline-offset-2 transition-all duration-300"
                    style={{color: '#800000'}}
                    onMouseEnter={(e) => (e.currentTarget as HTMLElement).style.color = '#660000'}
                    onMouseLeave={(e) => (e.currentTarget as HTMLElement).style.color = '#800000'}
                  >
                    Sign in
                  </Link>
                </p>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}