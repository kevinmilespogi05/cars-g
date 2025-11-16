import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  LogIn, 
  Lock, 
  AlertCircle, 
  UserCheck,
  Eye,
  EyeOff,
  ArrowLeft,
  CheckCircle,
  Loader2
} from 'lucide-react';
import { useToastContext } from '../contexts/ToastContext';
import { getApiUrl } from '../lib/config';
import { supabase } from '../lib/supabase';

export function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const { signInWithEmailOrUsername, signInWithGoogle, user, isAuthenticated, isAdminLike } = useAuthStore();
  const { error: showToastError, success: showToastSuccess } = useToastContext();
  const [emailOrUsername, setEmailOrUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [showVerifyActions, setShowVerifyActions] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSocialLoading, setIsSocialLoading] = useState<'google' | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  // Get the redirect path from location state or default to reports
  const from = (location.state as any)?.from?.pathname || '/reports';
  const message = (location.state as any)?.message as string | undefined;

  // Smooth scroll to top on mount
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  // Redirect users if they're already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      if (isAdminLike()) {
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
      await signInWithEmailOrUsername(emailOrUsername, password);
      // Success handled by navigation
      showToastSuccess('Successfully signed in!', 2000);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to sign in';
      // If the server returned an email-not-verified error code, show quick actions
      if ((err as any)?.code === 'EMAIL_NOT_VERIFIED' || errorMessage.toLowerCase().includes('not verified')) {
        setShowVerifyActions(true);
        // Store the email so the verify page can use it. If the user entered
        // a username, try to look up the email from the public profiles table.
        try {
          if (emailOrUsername.includes('@')) {
            localStorage.setItem('registeredEmail', emailOrUsername);
          } else {
            // Try to look up email by username (frontend anon key must allow this)
            try {
              const { data: profile, error: profileError } = await supabase
                .from('profiles')
                .select('email')
                .eq('username', emailOrUsername)
                .maybeSingle();

              if (!profileError && profile?.email) {
                localStorage.setItem('registeredEmail', profile.email);
              } else {
                localStorage.setItem('registeredEmail', '');
              }
            } catch (lookupErr) {
              localStorage.setItem('registeredEmail', '');
            }
          }
        } catch (e) {}
      }
      setError(errorMessage);
      showToastError(errorMessage, 5000);
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
    <div className="min-h-screen w-full flex items-center justify-center px-4 py-12">
      {/* Back to Home Link - Mobile */}
      <div className="fixed top-4 left-4 z-50 lg:hidden">
        <Link 
          to="/" 
          className="inline-flex items-center gap-2 text-gray-700 hover:text-gray-900 bg-white/90 backdrop-blur-sm px-3 py-2 rounded-lg shadow-lg hover:shadow-xl transition-all duration-300 font-medium text-sm"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back</span>
        </Link>
      </div>

      {/* Desktop Back Link */}
      <div className="hidden lg:block fixed top-6 left-6 z-50">
        <Link 
          to="/" 
          className="inline-flex items-center gap-2 text-gray-700 hover:text-gray-900 bg-white/90 backdrop-blur-sm px-4 py-2.5 rounded-lg shadow-lg hover:shadow-xl transition-all duration-300 font-medium text-sm"
        >
          <ArrowLeft className="h-5 w-5" />
          <span>Back to Home</span>
        </Link>
      </div>

      <div className="w-full max-w-md mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="bg-white rounded-2xl shadow-2xl overflow-hidden"
        >
          {/* Header */}
          <div className="bg-gradient-to-r from-red-900 to-red-800 px-6 py-8 text-white">
            <div className="flex items-center gap-3 mb-2">
              <img 
                src="/images/logo.jpg" 
                alt="CARS-G Logo" 
                className="h-12 w-12 object-contain rounded-lg bg-white/10 p-1"
              />
              <div>
                <h1 className="text-2xl font-bold">Welcome Back</h1>
                <p className="text-red-100 text-sm">Sign in to your account</p>
              </div>
            </div>
          </div>

          {/* Form Content */}
          <div className="p-6 sm:p-8">
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Message Alerts */}
              <AnimatePresence>
                {message && (
                  <motion.div 
                    className={`flex items-center gap-2 p-3 rounded-lg border text-sm ${
                      message.toLowerCase().includes('banned') 
                        ? 'bg-amber-50 border-amber-200 text-amber-800' 
                        : 'bg-emerald-50 border-emerald-200 text-emerald-700'
                    }`}
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.3 }}
                  >
                    <CheckCircle className="h-5 w-5 flex-shrink-0" />
                    <span className="font-medium">{message}</span>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Username or Email Field */}
              <div>
                <label htmlFor="emailOrUsername" className="block text-sm font-semibold text-gray-700 mb-2">
                  Username or Email <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <UserCheck className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    id="emailOrUsername"
                    name="emailOrUsername"
                    type="text"
                    autoComplete="username"
                    required
                    value={emailOrUsername}
                    onChange={(e) => setEmailOrUsername(e.target.value)}
                    className="w-full pl-11 pr-4 py-3 bg-white border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:border-red-800 focus:ring-2 focus:ring-red-800/20 transition-all duration-200 outline-none"
                    placeholder="Enter your username or email"
                  />
                </div>
              </div>

              {/* Password Field */}
              <div>
                <label htmlFor="password" className="block text-sm font-semibold text-gray-700 mb-2">
                  Password <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-11 pr-11 py-3 bg-white border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:border-red-800 focus:ring-2 focus:ring-red-800/20 transition-all duration-200 outline-none"
                    placeholder="Enter your password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors p-1 rounded focus:outline-none focus:ring-2 focus:ring-red-500"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
              </div>

              {/* Error Message */}
              {error && (
                <motion.div 
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-start gap-2 text-red-700 bg-red-50 border border-red-200 p-3 rounded-lg"
                >
                  <AlertCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
                  <span className="text-sm">{error}</span>
                </motion.div>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-red-900 hover:bg-red-800 text-white py-3.5 px-6 rounded-lg font-semibold text-base shadow-lg hover:shadow-xl focus:ring-4 focus:ring-red-800/50 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    <span>Signing in...</span>
                  </>
                ) : (
                  <>
                    <LogIn className="h-5 w-5" />
                    <span>Sign In</span>
                  </>
                )}
              </button>

                {/* Quick verify actions if email is not verified */}
                {showVerifyActions && (
                  <div className="mt-3 flex flex-col gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        // Navigate to email verification (registeredEmail was set earlier on error)
                        navigate('/verify-email');
                      }}
                      className="w-full bg-white text-red-900 border border-red-900 py-2 rounded-lg font-medium"
                    >
                      Verify email
                    </button>
                    <button
                      type="button"
                      onClick={async () => {
                        try {
                          setIsLoading(true);
                          const emailToSend = emailOrUsername.includes('@')
                            ? emailOrUsername
                            : (localStorage.getItem('registeredEmail') || '');
                          if (!emailToSend) {
                            showToastError('Please provide your email to resend verification code', 4000);
                            return;
                          }
                          const response = await fetch(getApiUrl('/api/auth/start-email-verification'), {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ email: emailToSend })
                          });
                          const result = await response.json();
                          if (!response.ok) throw new Error(result.error || 'Failed to resend code');
                          showToastSuccess('Verification code resent to your email.', 4000);
                          setShowVerifyActions(false);
                        } catch (e: any) {
                          showToastError(e.message || 'Failed to resend verification code', 4000);
                        } finally {
                          setIsLoading(false);
                        }
                      }}
                      className="w-full bg-gray-100 text-gray-700 py-2 rounded-lg font-medium"
                    >
                      Resend verification code
                    </button>
                  </div>
                )}

              {/* Divider */}
              <div className="relative py-4">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-200" />
                </div>
                <div className="relative flex justify-center">
                  <span className="px-3 bg-white text-sm text-gray-500">Or continue with</span>
                </div>
              </div>

              {/* Google Sign In */}
              <button
                type="button"
                onClick={handleGoogleSignIn}
                disabled={isSocialLoading === 'google'}
                className="w-full flex items-center justify-center gap-3 bg-white border-2 border-gray-300 text-gray-700 py-3 px-6 rounded-lg font-semibold hover:bg-gray-50 hover:border-gray-400 focus:ring-4 focus:ring-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 shadow-sm hover:shadow"
              >
                {isSocialLoading === 'google' ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    <span>Signing in...</span>
                  </>
                ) : (
                  <>
                    <svg className="h-5 w-5" viewBox="0 0 24 24">
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
          </div>

          {/* Footer */}
          <div className="bg-gray-50 border-t border-gray-200 px-6 sm:px-8 py-4 text-center">
            <p className="text-sm text-gray-600">
              Don't have an account?{' '}
              <Link 
                to="/register" 
                className="font-semibold text-red-800 hover:text-red-900 underline underline-offset-2 transition-colors"
              >
                Sign up for free
              </Link>
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
