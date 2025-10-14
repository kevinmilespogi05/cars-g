import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  LogIn, 
  Mail, 
  Lock, 
  AlertCircle, 
  Shield, 
  UserCheck,
  Eye,
  EyeOff,
  ArrowLeft,
  CheckCircle,
  MapPin
} from 'lucide-react';

export function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const { signInWithEmailOrUsername, signInWithGoogle, user, isAuthenticated } = useAuthStore();
  const [emailOrUsername, setEmailOrUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSocialLoading, setIsSocialLoading] = useState<'google' | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  // Get the redirect path from location state or default to reports
  const from = (location.state as any)?.from?.pathname || '/reports';
  const message = (location.state as any)?.message as string | undefined;

  // Prevent scrolling on this page
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = 'auto';
    };
  }, []);

  // Redirect users if they're already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      if (user?.role === 'admin') {
        navigate('/admin', { replace: true });
      } else if (user?.role === 'patrol') {
        navigate('/patrol', { replace: true });
      } else {
        navigate('/reports', { replace: true });
      }
    }
  }, [isAuthenticated, user?.role, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      // Use the unified login method that handles both email and username
      await signInWithEmailOrUsername(emailOrUsername, password);
      
      // The useEffect will handle the redirect based on user role automatically
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to sign in');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError('');
    setIsSocialLoading('google');
    try {
      await signInWithGoogle();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to sign in with Google');
      setIsSocialLoading(null);
    }
  };


  return (
    <div 
      className="h-screen w-screen flex items-center justify-center p-4"
      style={{ 
        overflow: 'hidden',
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0
      }}
    >
      {/* Back to Home Link - Mobile */}
      <div className="fixed top-4 left-4 z-50 lg:hidden">
        <Link 
          to="/" 
          className="inline-flex items-center gap-2 text-gray-700 hover:text-gray-900 bg-white/90 backdrop-blur-sm px-3 py-2 rounded-full shadow-lg hover:shadow-xl transition-all duration-300 font-medium text-sm"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back</span>
        </Link>
      </div>

      <div className="w-full max-w-5xl max-h-[580px]">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="bg-white rounded-2xl shadow-2xl overflow-hidden"
        >
          <div className="grid lg:grid-cols-2">
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
              <div className="relative z-10 flex flex-col justify-between p-6 text-white w-full h-full">
                <div>
                  {/* Back Link */}
                  <Link 
                    to="/" 
                    className="inline-flex items-center gap-2 text-white/90 hover:text-white transition-colors duration-300 mb-6 group text-sm"
                  >
                    <ArrowLeft className="h-4 w-4 group-hover:-translate-x-1 transition-transform duration-300" />
                    <span className="font-medium">Back to Home</span>
                  </Link>
                  
                  {/* Logo and Title */}
                  <div className="space-y-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-white/10 backdrop-blur-md rounded-xl p-2 border border-white/20 shadow-xl">
                        <img 
                          src="/images/logo.jpg" 
                          alt="CARS-G Logo" 
                          className="w-full h-full object-contain"
                        />
                      </div>
                      <div>
                        <h1 className="text-2xl font-bold tracking-tight text-white">CARS-G</h1>
                        <p className="text-red-100 text-xs font-medium tracking-wide">Community Assistance and Reporting System - Gamified</p>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <h2 className="text-xl font-bold leading-tight text-white">
                        Welcome Back to<br />CARS-G
                      </h2>
                      <p className="text-white/90 text-sm leading-relaxed">
                        Sign in to continue protecting your community and making a real impact.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Bottom Stats/Features */}
                <div className="space-y-3 mt-6">
                  <div className="grid grid-cols-2 gap-2">
                    <div className="bg-white/5 backdrop-blur-sm rounded-lg p-2 border border-white/10">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 bg-red-500/20 rounded-lg flex items-center justify-center">
                          <MapPin className="h-3 w-3 text-red-300" />
                        </div>
                        <div>
                          <p className="text-lg font-bold text-white">1000+</p>
                          <p className="text-[9px] text-white/70">Reports Filed</p>
                        </div>
                      </div>
                    </div>
                    <div className="bg-white/5 backdrop-blur-sm rounded-lg p-2 border border-white/10">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 bg-red-500/20 rounded-lg flex items-center justify-center">
                          <Shield className="h-3 w-3 text-red-300" />
                        </div>
                        <div>
                          <p className="text-lg font-bold text-white">500+</p>
                          <p className="text-[9px] text-white/70">Active Users</p>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="border-t border-white/10 pt-3">
                    <p className="text-xs text-white/80">
                      Trusted by citizens and local authorities nationwide.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column - Login Form */}
            <div className="flex items-center justify-center overflow-hidden p-8">
              <div className="w-full max-w-sm">
                {/* Compact Header - Mobile & Desktop */}
                <div className="mb-4 text-center">
                  <h2 className="text-xl font-bold text-gray-900 mb-1">Welcome Back</h2>
                  <p className="text-gray-500 text-xs">Sign in to your account</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-3">
                  {/* Message Alerts */}
                  <AnimatePresence>
                    {message && (
                      <motion.div 
                        className={`flex items-center gap-2 p-2 rounded-lg border text-xs ${message.toLowerCase().includes('banned') ? 'bg-amber-50 border-amber-200 text-amber-800' : 'bg-emerald-50 border-emerald-200 text-emerald-700'}`}
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ duration: 0.3 }}
                      >
                        <CheckCircle className="h-4 w-4 flex-shrink-0" />
                        <span className="font-medium">{message}</span>
                      </motion.div>
                    )}

                    {error && (
                      <motion.div 
                        className="flex items-center gap-2 text-red-700 bg-red-50 border border-red-200 p-2 rounded-lg"
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ duration: 0.3 }}
                      >
                        <AlertCircle className="h-4 w-4 flex-shrink-0" />
                        <span className="text-xs font-medium">{error}</span>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Username or Email Field */}
                  <div className="group">
                    <label htmlFor="emailOrUsername" className="block text-xs font-semibold text-gray-700 mb-1">
                      Username or Email
                    </label>
                    <div className="relative">
                      <UserCheck className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 group-focus-within:text-red-800 transition-colors duration-300" />
                      <input
                        id="emailOrUsername"
                        name="emailOrUsername"
                        type="text"
                        autoComplete="username"
                        required
                        value={emailOrUsername}
                        onChange={(e) => setEmailOrUsername(e.target.value)}
                        className="w-full pl-9 pr-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-gray-900 text-sm placeholder-gray-400 focus:bg-white focus:border-red-800 focus:ring-2 focus:ring-red-800/10 transition-all duration-300 outline-none"
                        placeholder="Enter your username or email"
                      />
                    </div>
                  </div>

                  {/* Password Field */}
                  <div className="group">
                    <label htmlFor="password" className="block text-xs font-semibold text-gray-700 mb-1">
                      Password
                    </label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 group-focus-within:text-red-800 transition-colors duration-300" />
                      <input
                        id="password"
                        name="password"
                        type={showPassword ? 'text' : 'password'}
                        autoComplete="current-password"
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full pl-9 pr-10 py-2 bg-gray-50 border border-gray-300 rounded-lg text-gray-900 text-sm placeholder-gray-400 focus:bg-white focus:border-red-800 focus:ring-2 focus:ring-red-800/10 transition-all duration-300 outline-none"
                        placeholder="Enter your password"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-700 transition-colors duration-200"
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>

                  {/* Submit Button */}
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full text-white py-2.5 px-4 rounded-lg font-semibold text-sm shadow-lg hover:shadow-xl focus:ring-2 focus:ring-red-800/50 disabled:opacity-60 disabled:cursor-not-allowed transition-all duration-300 flex items-center justify-center gap-2 group"
                    style={{backgroundColor: '#800000'}}
                    onMouseEnter={(e) => !isLoading && ((e.currentTarget as HTMLElement).style.backgroundColor = '#660000')}
                    onMouseLeave={(e) => !isLoading && ((e.currentTarget as HTMLElement).style.backgroundColor = '#800000')}
                  >
                    {isLoading ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                        <span>Signing in...</span>
                      </>
                    ) : (
                      <>
                        <LogIn className="h-4 w-4" />
                        <span>Sign In</span>
                      </>
                    )}
                  </button>

                  {/* Divider */}
                  <div className="relative py-2">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-gray-200" />
                    </div>
                    <div className="relative flex justify-center">
                      <span className="px-2 bg-white text-[10px] font-semibold text-gray-500 uppercase tracking-wide">Or</span>
                    </div>
                  </div>

                  {/* Google Sign In */}
                  <button
                    type="button"
                    onClick={handleGoogleSignIn}
                    disabled={isSocialLoading === 'google'}
                    className="w-full flex items-center justify-center gap-2 bg-white border border-gray-300 text-gray-700 py-2.5 px-4 rounded-lg text-sm font-semibold hover:bg-gray-50 hover:border-gray-400 focus:ring-2 focus:ring-gray-200 transition-all duration-300 shadow-sm hover:shadow group disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {isSocialLoading === 'google' ? (
                      <>
                        <div className="w-4 h-4 border-2 border-gray-700/30 border-t-gray-700 rounded-full animate-spin"></div>
                        <span>Signing in...</span>
                      </>
                    ) : (
                      <>
                        <svg className="h-4 w-4" viewBox="0 0 24 24">
                          <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                          <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                          <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                          <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                        </svg>
                        <span>Sign in with Google</span>
                      </>
                    )}
                  </button>
                </form>

                {/* Footer */}
                <div className="mt-4 text-center pt-3 border-t border-gray-100">
                  <p className="text-gray-600 text-xs">
                    Don't have an account?{' '}
                    <Link 
                      to="/register" 
                      className="font-bold underline underline-offset-2 transition-all duration-300"
                      style={{color: '#800000'}}
                      onMouseEnter={(e) => (e.currentTarget as HTMLElement).style.color = '#660000'}
                      onMouseLeave={(e) => (e.currentTarget as HTMLElement).style.color = '#800000'}
                    >
                      Sign up for free
                    </Link>
                  </p>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
} 