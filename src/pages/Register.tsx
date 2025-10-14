import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { useAvailabilityCheck } from '../hooks/useAvailabilityCheck';
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
  Phone,
  Loader2,
  XCircle,
  X,
  ChevronRight,
  ChevronLeft
 } from 'lucide-react';

export function Register() {
  const navigate = useNavigate();
  const { signUp, signInWithGoogle } = useAuthStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('+63');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isGmailValid, setIsGmailValid] = useState(true);
  const [gmailError, setGmailError] = useState('');
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);
  const [showTermsModal, setShowTermsModal] = useState(false);
  
  // Scroll tracking states
  const [privacyScrollProgress, setPrivacyScrollProgress] = useState(0);
  const [termsScrollProgress, setTermsScrollProgress] = useState(0);
  const [privacyCompleted, setPrivacyCompleted] = useState(false);
  const [termsCompleted, setTermsCompleted] = useState(false);
  const privacyScrollRef = useRef<HTMLDivElement>(null);
  const termsScrollRef = useRef<HTMLDivElement>(null);

  // Real-time availability checks
  const usernameCheck = useAvailabilityCheck(username, 'username');
  const emailCheck = useAvailabilityCheck(email, 'email');

  // Smooth scroll to top on mount
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  // Auto-check checkbox when both documents are completed
  useEffect(() => {
    if (privacyCompleted && termsCompleted && !agreedToTerms) {
      setAgreedToTerms(true);
    }
  }, [privacyCompleted, termsCompleted, agreedToTerms]);

  // Handle scroll tracking for Privacy Policy
  const handlePrivacyScroll = () => {
    if (!privacyScrollRef.current) return;
    
    const element = privacyScrollRef.current;
    const scrollTop = element.scrollTop;
    const scrollHeight = element.scrollHeight;
    const clientHeight = element.clientHeight;
    
    const scrolled = (scrollTop / (scrollHeight - clientHeight)) * 100;
    setPrivacyScrollProgress(Math.min(scrolled, 100));
    
    // Mark as completed when scrolled to bottom (with 5px threshold)
    if (scrollHeight - scrollTop - clientHeight < 5) {
      setPrivacyCompleted(true);
    }
  };

  // Handle scroll tracking for Terms of Service
  const handleTermsScroll = () => {
    if (!termsScrollRef.current) return;
    
    const element = termsScrollRef.current;
    const scrollTop = element.scrollTop;
    const scrollHeight = element.scrollHeight;
    const clientHeight = element.clientHeight;
    
    const scrolled = (scrollTop / (scrollHeight - clientHeight)) * 100;
    setTermsScrollProgress(Math.min(scrolled, 100));
    
    // Mark as completed when scrolled to bottom (with 5px threshold)
    if (scrollHeight - scrollTop - clientHeight < 5) {
      setTermsCompleted(true);
    }
  };

  // Navigate from Privacy to Terms
  const goToTerms = () => {
    setShowPrivacyModal(false);
    setShowTermsModal(true);
  };

  // Navigate from Terms to Privacy
  const goToPrivacy = () => {
    setShowTermsModal(false);
    setShowPrivacyModal(true);
  };

  // Handle checkbox click - open Privacy Policy if not completed
  const handleCheckboxClick = (e: React.MouseEvent<HTMLInputElement>) => {
    if (!privacyCompleted || !termsCompleted) {
      e.preventDefault();
      if (!privacyCompleted) {
        setShowPrivacyModal(true);
      } else if (!termsCompleted) {
        setShowTermsModal(true);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    // Check if email is Gmail
    if (!email.toLowerCase().endsWith('@gmail.com')) {
      setError('Only Gmail addresses (@gmail.com) are accepted for registration.');
      setIsGmailValid(false);
      setGmailError('Only Gmail addresses (@gmail.com) are accepted');
      return;
    }

    // Check availability before submitting
    if (usernameCheck.isAvailable === false) {
      setError('Username is already taken. Please choose another one.');
      return;
    }

    if (emailCheck.isAvailable === false) {
      setError('Email is already registered. Please use a different email or sign in.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters long');
      return;
    }

    if (!agreedToTerms) {
      setError('You must agree to the Privacy Policy and Terms of Service to register.');
      return;
    }

    setIsLoading(true);

    try {
      await signUp(email, password, username, firstName || '', lastName || '', phone || '', confirmPassword || '');
      setSuccess('Registration successful! You can now sign in with your account.');
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
      className="min-h-screen w-screen flex items-start justify-center px-500 py-500 sm:py-500 lg:py-500"
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
                    Email Address <span className="text-xs text-gray-500">(Gmail only)</span>
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 group-focus-within:text-red-800 transition-colors duration-300" />
                    <input
                      type="email"
                      id="email"
                      value={email}
                      onChange={(e) => {
                        const value = e.target.value;
                        setEmail(value);
                        
                        // Check if email ends with @gmail.com
                        if (value.length > 0) {
                          const isValid = value.toLowerCase().endsWith('@gmail.com');
                          setIsGmailValid(isValid);
                          if (!isValid && value.includes('@')) {
                            setGmailError('Only Gmail addresses (@gmail.com) are accepted');
                          } else {
                            setGmailError('');
                          }
                        } else {
                          setIsGmailValid(true);
                          setGmailError('');
                        }
                      }}
                      required
                      className={`w-full pl-9 pr-10 py-2 bg-gray-50 border-2 rounded-lg text-gray-900 text-sm placeholder-gray-400 focus:bg-white focus:ring-4 transition-all duration-300 outline-none font-medium ${
                        !isGmailValid
                          ? 'border-red-300 focus:border-red-500 focus:ring-red-500/10'
                          : emailCheck.isChecking
                          ? 'border-gray-200 focus:border-gray-300 focus:ring-gray-200/10'
                          : emailCheck.isAvailable === true
                          ? 'border-green-300 focus:border-green-500 focus:ring-green-500/10'
                          : emailCheck.isAvailable === false
                          ? 'border-red-300 focus:border-red-500 focus:ring-red-500/10'
                          : 'border-gray-200 focus:border-red-800 focus:ring-red-800/10'
                      }`}
                      placeholder="your.name@gmail.com"
                    />
                    {/* Status Icon */}
                    <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                      {emailCheck.isChecking && (
                        <Loader2 className="h-4 w-4 text-gray-400 animate-spin" />
                      )}
                      {!emailCheck.isChecking && isGmailValid && emailCheck.isAvailable === true && (
                        <CheckCircle className="h-4 w-4 text-green-500" />
                      )}
                      {(!isGmailValid || (!emailCheck.isChecking && emailCheck.isAvailable === false)) && (
                        <XCircle className="h-4 w-4 text-red-500" />
                      )}
                    </div>
                  </div>
                  {/* Gmail Validation Message */}
                  {gmailError && (
                    <motion.p
                      initial={{ opacity: 0, y: -5 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="mt-1 text-xs font-medium text-red-600 flex items-center gap-1"
                    >
                      <AlertCircle className="h-3 w-3" />
                      {gmailError}
                    </motion.p>
                  )}
                  {/* Availability Message */}
                  {!emailCheck.isChecking && emailCheck.message && email.length >= 3 && isGmailValid && (
                    <motion.p
                      initial={{ opacity: 0, y: -5 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`mt-1 text-xs font-medium ${
                        emailCheck.isAvailable ? 'text-green-600' : 'text-red-600'
                      }`}
                    >
                      {emailCheck.message}
                    </motion.p>
                  )}
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
                      className={`w-full pl-9 pr-10 py-2 bg-gray-50 border-2 rounded-lg text-gray-900 text-sm placeholder-gray-400 focus:bg-white focus:ring-4 transition-all duration-300 outline-none font-medium ${
                        usernameCheck.isChecking
                          ? 'border-gray-200 focus:border-gray-300 focus:ring-gray-200/10'
                          : usernameCheck.isAvailable === true
                          ? 'border-green-300 focus:border-green-500 focus:ring-green-500/10'
                          : usernameCheck.isAvailable === false
                          ? 'border-red-300 focus:border-red-500 focus:ring-red-500/10'
                          : 'border-gray-200 focus:border-red-800 focus:ring-red-800/10'
                      }`}
                      placeholder="johndoe"
                    />
                    {/* Status Icon */}
                    <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                      {usernameCheck.isChecking && (
                        <Loader2 className="h-4 w-4 text-gray-400 animate-spin" />
                      )}
                      {!usernameCheck.isChecking && usernameCheck.isAvailable === true && (
                        <CheckCircle className="h-4 w-4 text-green-500" />
                      )}
                      {!usernameCheck.isChecking && usernameCheck.isAvailable === false && (
                        <XCircle className="h-4 w-4 text-red-500" />
                      )}
                    </div>
                  </div>
                  {/* Validation Message */}
                  {!usernameCheck.isChecking && usernameCheck.message && username.length >= 3 && (
                    <motion.p
                      initial={{ opacity: 0, y: -5 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`mt-1 text-xs font-medium ${
                        usernameCheck.isAvailable ? 'text-green-600' : 'text-red-600'
                      }`}
                    >
                      {usernameCheck.message}
                    </motion.p>
                  )}
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
                      onChange={(e) => {
                        const value = e.target.value;
                        
                        // Always keep +63 prefix
                        if (!value.startsWith('+63')) {
                          setPhone('+63');
                          return;
                        }
                        
                        // Extract only the digits after +63
                        const digits = value.slice(3).replace(/\D/g, '');
                        
                        // Limit to 10 digits (Philippine mobile numbers are 10 digits after +63)
                        if (digits.length <= 10) {
                          setPhone('+63' + digits);
                        }
                      }}
                      onFocus={() => {
                        // Ensure +63 is there when focused
                        if (phone === '' || phone === '+') {
                          setPhone('+63');
                        }
                      }}
                      onKeyDown={(e) => {
                        // Prevent deleting the +63 prefix
                        const cursorPosition = e.currentTarget.selectionStart || 0;
                        if ((e.key === 'Backspace' || e.key === 'Delete') && cursorPosition <= 3) {
                          e.preventDefault();
                        }
                      }}
                      className="w-full pl-9 pr-3 py-2 bg-gray-50 border-2 border-gray-200 rounded-lg text-gray-900 text-sm placeholder-gray-400 focus:bg-white focus:border-red-800 focus:ring-4 focus:ring-red-800/10 transition-all duration-300 outline-none font-medium"
                      placeholder="+63 9XX XXX XXXX"
                      maxLength={13}
                    />
                    {phone.length > 3 && phone.length === 13 && (
                      <CheckCircle className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-green-500" />
                    )}
                    {phone.length > 3 && phone.length < 13 && (
                      <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                        <span className="text-xs text-gray-500">{13 - phone.length} more</span>
                      </div>
                    )}
                  </div>
                  <p className="mt-1 text-xs text-gray-500">
                    Philippine mobile format: +63 followed by 10 digits
                  </p>
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

                {/* Terms and Privacy Agreement */}
                <div className="group">
                  <div className="flex items-start gap-3 p-4 bg-gray-50 rounded-lg border-2 border-gray-200 hover:border-red-200 transition-colors duration-300">
                    <input
                      type="checkbox"
                      id="agreedToTerms"
                      checked={agreedToTerms}
                      onChange={(e) => setAgreedToTerms(e.target.checked)}
                      onClick={handleCheckboxClick}
                      className="mt-0.5 w-4 h-4 text-red-800 bg-white border-gray-300 rounded focus:ring-red-800 focus:ring-2 cursor-pointer"
                      required
                    />
                    <label htmlFor="agreedToTerms" className="text-xs text-gray-700 leading-relaxed cursor-pointer">
                      I agree to the{' '}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          setShowPrivacyModal(true);
                        }}
                        className="text-red-800 font-semibold hover:text-red-900 hover:underline transition-colors"
                      >
                        Privacy Policy
                      </button>
                      {' '}and{' '}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          setShowTermsModal(true);
                        }}
                        className="text-red-800 font-semibold hover:text-red-900 hover:underline transition-colors"
                      >
                        Terms of Service
                      </button>
                    </label>
                  </div>
                  {!agreedToTerms && error.includes('agree') && (
                    <motion.p
                      initial={{ opacity: 0, y: -5 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="mt-2 text-xs font-medium text-red-600 flex items-center gap-1"
                    >
                      <AlertCircle className="h-3 w-3" />
                      You must agree to continue
                    </motion.p>
                  )}
                  {/* Progress indicators */}
                  {(privacyCompleted || termsCompleted) && (
                    <div className="mt-3 space-y-2">
                      <div className="flex items-center gap-2 text-xs">
                        {privacyCompleted ? (
                          <CheckCircle className="h-4 w-4 text-green-500" />
                        ) : (
                          <div className="h-4 w-4 rounded-full border-2 border-gray-300" />
                        )}
                        <span className={privacyCompleted ? 'text-green-600 font-medium' : 'text-gray-500'}>
                          Privacy Policy read
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-xs">
                        {termsCompleted ? (
                          <CheckCircle className="h-4 w-4 text-green-500" />
                        ) : (
                          <div className="h-4 w-4 rounded-full border-2 border-gray-300" />
                        )}
                        <span className={termsCompleted ? 'text-green-600 font-medium' : 'text-gray-500'}>
                          Terms of Service read
                        </span>
                      </div>
                    </div>
                  )}
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

      {/* Privacy Policy Modal */}
      {showPrivacyModal && (
        <div className="fixed inset-0 bg-gray-900 bg-opacity-50 backdrop-blur-sm flex items-center justify-center p-4 z-[9999]" onClick={() => setShowPrivacyModal(false)}>
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-xl shadow-2xl w-full max-w-4xl my-8 flex flex-col max-h-[85vh]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header with Progress Bar */}
            <div className="flex-shrink-0 bg-white border-b border-gray-200 rounded-t-xl">
              <div className="px-6 py-4 flex items-center justify-between">
                <div className="flex-1">
                  <h2 className="text-2xl font-bold text-gray-900">Privacy Policy</h2>
                  <div className="flex items-center gap-2 mt-2">
                    <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                      <motion.div 
                        className="h-full bg-red-800"
                        initial={{ width: 0 }}
                        animate={{ width: `${privacyScrollProgress}%` }}
                        transition={{ duration: 0.1 }}
                      />
                    </div>
                    <span className="text-xs font-semibold text-gray-600 min-w-[45px]">
                      {Math.round(privacyScrollProgress)}%
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => setShowPrivacyModal(false)}
                  className="ml-4 text-gray-400 hover:text-gray-600 transition-colors p-1 rounded-lg hover:bg-gray-100"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>
              {!privacyCompleted && (
                <div className="px-6 pb-3">
                  <p className="text-xs text-amber-600 font-medium flex items-center gap-2">
                    <AlertCircle className="h-4 w-4" />
                    Please scroll to the bottom to read the entire Privacy Policy
                  </p>
                </div>
              )}
            </div>

            {/* Scrollable Content */}
            <div 
              ref={privacyScrollRef}
              onScroll={handlePrivacyScroll}
              className="flex-1 p-6 overflow-y-auto"
            >
              <div className="space-y-6 text-gray-600">
                <section>
                  <h3 className="text-xl font-semibold text-gray-900 mb-4">1. Introduction</h3>
                  <p>
                    Welcome to CARS-G. We respect your privacy and are committed to protecting your personal data. 
                    This privacy policy will inform you about how we look after your personal data when you visit our website 
                    and tell you about your privacy rights and how the law protects you.
                  </p>
                </section>

                <section>
                  <h3 className="text-xl font-semibold text-gray-900 mb-4">2. Data We Collect</h3>
                  <p>We collect and process the following data:</p>
                  <ul className="list-disc pl-6 mt-2 space-y-2">
                    <li>Account information (email, username, profile picture)</li>
                    <li>Location data when submitting reports</li>
                    <li>Report content and images</li>
                    <li>Usage data and analytics</li>
                    <li>Device information and IP address</li>
                  </ul>
                </section>

                <section>
                  <h3 className="text-xl font-semibold text-gray-900 mb-4">3. How We Use Your Data</h3>
                  <p>We use your data for:</p>
                  <ul className="list-disc pl-6 mt-2 space-y-2">
                    <li>Providing and maintaining our service</li>
                    <li>Processing and managing reports</li>
                    <li>Improving our services</li>
                    <li>Communicating with you about your account</li>
                    <li>Ensuring platform security</li>
                  </ul>
                </section>

                <section>
                  <h3 className="text-xl font-semibold text-gray-900 mb-4">4. Data Storage and Security</h3>
                  <p>
                    We implement appropriate security measures to protect your personal information. Your data is stored securely 
                    using industry-standard encryption and security protocols.
                  </p>
                </section>

                <section>
                  <h3 className="text-xl font-semibold text-gray-900 mb-4">5. Your Rights</h3>
                  <p>You have the right to:</p>
                  <ul className="list-disc pl-6 mt-2 space-y-2">
                    <li>Access your personal data</li>
                    <li>Correct inaccurate data</li>
                    <li>Request deletion of your data</li>
                    <li>Object to processing of your data</li>
                    <li>Data portability</li>
                  </ul>
                </section>

                <section>
                  <h3 className="text-xl font-semibold text-gray-900 mb-4">6. Contact Us</h3>
                  <p>
                    If you have any questions about this Privacy Policy, please contact us at support@cars-g.com
                  </p>
                </section>

                <section className="pt-4 border-t border-gray-200">
                  <p className="text-sm text-gray-500">
                    <strong>Last Updated:</strong> October 14, 2025
                  </p>
                </section>
              </div>
            </div>

            {/* Footer with Action Buttons */}
            <div className="flex-shrink-0 bg-gray-50 border-t border-gray-200 px-6 py-4 rounded-b-xl">
              <div className="flex gap-3">
                {privacyCompleted ? (
                  <>
                    {!termsCompleted ? (
                      <button
                        onClick={goToTerms}
                        className="flex-1 bg-red-800 hover:bg-red-900 text-white py-2.5 px-4 rounded-lg font-semibold transition-colors flex items-center justify-center gap-2"
                      >
                        <span>Next: Terms of Service</span>
                        <ChevronRight className="h-5 w-5" />
                      </button>
                    ) : (
                      <>
                        <button
                          onClick={goToTerms}
                          className="flex-1 bg-white hover:bg-gray-100 text-gray-700 border-2 border-gray-300 py-2.5 px-4 rounded-lg font-semibold transition-colors flex items-center justify-center gap-2"
                        >
                          <span>View Terms of Service</span>
                          <ChevronRight className="h-5 w-5" />
                        </button>
                        <button
                          onClick={() => setShowPrivacyModal(false)}
                          className="flex-1 bg-red-800 hover:bg-red-900 text-white py-2.5 px-4 rounded-lg font-semibold transition-colors"
                        >
                          Close
                        </button>
                      </>
                    )}
                  </>
                ) : (
                  <div className="flex-1 bg-gray-300 text-gray-500 py-2.5 px-4 rounded-lg font-semibold flex items-center justify-center gap-2 cursor-not-allowed">
                    <span>Scroll to continue</span>
                    <ChevronRight className="h-5 w-5" />
                  </div>
                )}
              </div>
              {privacyCompleted && (
                <div className="mt-3 flex items-center justify-center gap-2 text-green-600">
                  <CheckCircle className="h-4 w-4" />
                  <span className="text-xs font-medium">Privacy Policy completed</span>
                </div>
              )}
            </div>
          </motion.div>
        </div>
      )}

      {/* Terms of Service Modal */}
      {showTermsModal && (
        <div className="fixed inset-0 bg-gray-900 bg-opacity-50 backdrop-blur-sm flex items-center justify-center p-4 z-[9999]" onClick={() => setShowTermsModal(false)}>
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-xl shadow-2xl w-full max-w-4xl my-8 flex flex-col max-h-[85vh]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header with Progress Bar */}
            <div className="flex-shrink-0 bg-white border-b border-gray-200 rounded-t-xl">
              <div className="px-6 py-4 flex items-center justify-between">
                <div className="flex-1">
                  <h2 className="text-2xl font-bold text-gray-900">Terms of Service</h2>
                  <div className="flex items-center gap-2 mt-2">
                    <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                      <motion.div 
                        className="h-full bg-red-800"
                        initial={{ width: 0 }}
                        animate={{ width: `${termsScrollProgress}%` }}
                        transition={{ duration: 0.1 }}
                      />
                    </div>
                    <span className="text-xs font-semibold text-gray-600 min-w-[45px]">
                      {Math.round(termsScrollProgress)}%
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => setShowTermsModal(false)}
                  className="ml-4 text-gray-400 hover:text-gray-600 transition-colors p-1 rounded-lg hover:bg-gray-100"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>
              {!termsCompleted && (
                <div className="px-6 pb-3">
                  <p className="text-xs text-amber-600 font-medium flex items-center gap-2">
                    <AlertCircle className="h-4 w-4" />
                    Please scroll to the bottom to read the entire Terms of Service
                  </p>
                </div>
              )}
            </div>

            {/* Scrollable Content */}
            <div 
              ref={termsScrollRef}
              onScroll={handleTermsScroll}
              className="flex-1 p-6 overflow-y-auto"
            >
              <div className="space-y-6 text-gray-600">
                <section>
                  <h3 className="text-xl font-semibold text-gray-900 mb-4">1. Acceptance of Terms</h3>
                  <p>
                    By accessing and using CARS-G (Community Action and Response System), you accept and agree to be bound by the terms 
                    and provision of this agreement.
                  </p>
                </section>

                <section>
                  <h3 className="text-xl font-semibold text-gray-900 mb-4">2. User Accounts</h3>
                  <p>To use certain features of our platform, you must register for an account. You agree to:</p>
                  <ul className="list-disc pl-6 mt-2 space-y-2">
                    <li>Provide accurate, current, and complete information</li>
                    <li>Maintain and update your account information</li>
                    <li>Maintain the security of your password</li>
                    <li>Notify us of any unauthorized use</li>
                    <li>Accept responsibility for all activities under your account</li>
                  </ul>
                </section>

                <section>
                  <h3 className="text-xl font-semibold text-gray-900 mb-4">3. User Conduct</h3>
                  <p>You agree not to:</p>
                  <ul className="list-disc pl-6 mt-2 space-y-2">
                    <li>Submit false or misleading reports</li>
                    <li>Use the platform for illegal purposes</li>
                    <li>Harass or harm other users</li>
                    <li>Upload malicious code or viruses</li>
                    <li>Attempt unauthorized access to systems</li>
                    <li>Interfere with or disrupt the service</li>
                  </ul>
                </section>

                <section>
                  <h3 className="text-xl font-semibold text-gray-900 mb-4">4. Report Submission</h3>
                  <p>When submitting reports:</p>
                  <ul className="list-disc pl-6 mt-2 space-y-2">
                    <li>You grant us a license to use and display your content</li>
                    <li>You confirm you have the right to submit the content</li>
                    <li>Reports may be shared with local authorities</li>
                    <li>Reports should be factual and accurate</li>
                    <li>Anonymous reporting is available but may be restricted if abused</li>
                  </ul>
                </section>

                <section>
                  <h3 className="text-xl font-semibold text-gray-900 mb-4">5. Points and Rewards</h3>
                  <ul className="list-disc pl-6 mt-2 space-y-2">
                    <li>Points have no monetary value</li>
                    <li>Used for gamification purposes only</li>
                    <li>We may modify the points system anytime</li>
                    <li>Points may be revoked for violations</li>
                    <li>Anonymous reports do not earn points</li>
                  </ul>
                </section>

                <section>
                  <h3 className="text-xl font-semibold text-gray-900 mb-4">6. Privacy</h3>
                  <p>
                    Please review our Privacy Policy to understand how we collect and protect your information.
                  </p>
                </section>

                <section>
                  <h3 className="text-xl font-semibold text-gray-900 mb-4">7. Termination</h3>
                  <p>
                    We reserve the right to suspend or terminate your account at any time for violation of these terms.
                  </p>
                </section>

                <section>
                  <h3 className="text-xl font-semibold text-gray-900 mb-4">8. Limitation of Liability</h3>
                  <p>
                    CARS-G is provided "as is" without warranties. We are not liable for indirect, incidental, or consequential damages.
                  </p>
                </section>

                <section>
                  <h3 className="text-xl font-semibold text-gray-900 mb-4">9. Governing Law</h3>
                  <p>
                    These Terms shall be governed by the laws of the Philippines.
                  </p>
                </section>

                <section className="pt-4 border-t border-gray-200">
                  <p className="text-sm text-gray-500">
                    <strong>Last Updated:</strong> October 14, 2025
                  </p>
                </section>
              </div>
            </div>

            {/* Footer with Action Buttons */}
            <div className="flex-shrink-0 bg-gray-50 border-t border-gray-200 px-6 py-4 rounded-b-xl">
              <div className="flex gap-3">
                {termsCompleted ? (
                  <>
                    {!privacyCompleted ? (
                      <button
                        onClick={goToPrivacy}
                        className="flex-1 bg-red-800 hover:bg-red-900 text-white py-2.5 px-4 rounded-lg font-semibold transition-colors flex items-center justify-center gap-2"
                      >
                        <ChevronLeft className="h-5 w-5" />
                        <span>Back: Privacy Policy</span>
                      </button>
                    ) : (
                      <>
                        <button
                          onClick={goToPrivacy}
                          className="flex-1 bg-white hover:bg-gray-100 text-gray-700 border-2 border-gray-300 py-2.5 px-4 rounded-lg font-semibold transition-colors flex items-center justify-center gap-2"
                        >
                          <ChevronLeft className="h-5 w-5" />
                          <span>View Privacy Policy</span>
                        </button>
                        <button
                          onClick={() => setShowTermsModal(false)}
                          className="flex-1 bg-red-800 hover:bg-red-900 text-white py-2.5 px-4 rounded-lg font-semibold transition-colors"
                        >
                          Close
                        </button>
                      </>
                    )}
                  </>
                ) : (
                  <div className="flex-1 bg-gray-300 text-gray-500 py-2.5 px-4 rounded-lg font-semibold flex items-center justify-center gap-2 cursor-not-allowed">
                    <span>Scroll to continue</span>
                    <ChevronRight className="h-5 w-5" />
                  </div>
                )}
              </div>
              {termsCompleted && (
                <div className="mt-3 flex items-center justify-center gap-2 text-green-600">
                  <CheckCircle className="h-4 w-4" />
                  <span className="text-xs font-medium">Terms of Service completed</span>
                </div>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}