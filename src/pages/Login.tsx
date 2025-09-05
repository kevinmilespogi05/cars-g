import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { motion } from 'framer-motion';
import { LogIn, Mail, Lock, AlertCircle, CheckCircle, ShieldAlert, User, Shield, MapPin } from 'lucide-react';

export function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const { signIn, signInWithGoogle, user, isAuthenticated } = useAuthStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSocialLoading, setIsSocialLoading] = useState<'google' | null>(null);
  const [selectedRole, setSelectedRole] = useState<'user' | 'patrol' | 'admin'>('user');

  // Get the redirect path from location state or default to reports
  const from = (location.state as any)?.from?.pathname || '/reports';
  const message = (location.state as any)?.message as string | undefined;

  // Redirect users if they're already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      if (user?.role === 'admin') {
        navigate('/admin/map', { replace: true });
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
      await signIn(email, password);
      // Use fresh state to determine role
      const freshUser = useAuthStore.getState().user;
      
      // Check if user role matches selected role
      if (freshUser?.role !== selectedRole) {
        await useAuthStore.getState().signOut();
        setError(`This account is for ${freshUser?.role} users. Please use the correct login.`);
        return;
      }
      
      navigate(from, { replace: true });
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

  const roleOptions = [
    {
      id: 'user' as const,
      title: 'Community Member',
      description: 'Report issues and track community safety',
      icon: User,
      color: 'bg-blue-500',
      path: '/reports'
    },
    {
      id: 'patrol' as const,
      title: 'Patrol Officer',
      description: 'Respond to reports and coordinate patrols',
      icon: MapPin,
      color: 'bg-green-500',
      path: '/patrol'
    },
    {
      id: 'admin' as const,
      title: 'Administrator',
      description: 'Manage the platform and oversee operations',
      icon: Shield,
      color: 'bg-red-500',
      path: '/admin/map'
    }
  ];

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 py-6 px-4 sm:py-12 sm:px-6 lg:px-8">
      <motion.div 
        className="w-full max-w-md space-y-8 bg-white p-8 sm:p-10 rounded-2xl shadow-xl border border-gray-100/50 backdrop-blur-sm"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        {/* Header Section */}
        <div className="text-center space-y-4">
          <div className="flex justify-center">
            <div className="h-16 w-16 bg-gradient-to-br from-primary-color to-primary-dark rounded-2xl flex items-center justify-center shadow-lg">
              <LogIn className="h-8 w-8 text-white" />
            </div>
          </div>
          <div className="space-y-2">
            <h2 className="text-3xl font-bold text-gray-900">
              Welcome back
            </h2>
            <p className="text-gray-600">
              Choose your role and sign in to continue
            </p>
          </div>
        </div>

        {/* Role Selection */}
        <div className="space-y-3">
          <label className="text-sm font-medium text-gray-700">Select your role:</label>
          <div className="grid grid-cols-3 gap-3">
            {roleOptions.map((role) => (
              <button
                key={role.id}
                onClick={() => setSelectedRole(role.id)}
                className={`p-3 rounded-lg border-2 transition-all ${
                  selectedRole === role.id
                    ? 'border-primary-color bg-primary-color/5'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="flex flex-col items-center text-center">
                  <div className={`h-8 w-8 ${role.color} rounded-lg flex items-center justify-center mb-2`}>
                    <role.icon className="h-4 w-4 text-white" />
                  </div>
                  <div className="text-xs font-medium text-gray-900 mb-1">
                    {role.title}
                  </div>
                  <div className="text-xs text-gray-500 leading-tight">
                    {role.description}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
        
        {/* Form Section */}
        <form className="space-y-6" onSubmit={handleSubmit}>
          {/* Message Alerts */}
          {message && (
            <motion.div 
              className={`px-4 py-3 rounded-xl flex items-start text-sm border-2 ${message.toLowerCase().includes('banned') ? 'bg-amber-50 border-amber-200 text-amber-800' : 'bg-emerald-50 border-emerald-200 text-emerald-700'}`}
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              <CheckCircle className="h-5 w-5 mr-2 mt-0.5 flex-shrink-0" />
              <span>{message}</span>
            </motion.div>
          )}

          {/* Error Alert */}
          {error && (
            <motion.div 
              className="px-4 py-3 rounded-xl flex items-start text-sm bg-red-50 border-2 border-red-200 text-red-700"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              <AlertCircle className="h-5 w-5 mr-2 mt-0.5 flex-shrink-0" />
              <span>{error}</span>
            </motion.div>
          )}

          {/* Email Field */}
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
              Email address
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Mail className="h-5 w-5 text-gray-400" />
              </div>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-color focus:border-transparent transition-colors"
                placeholder="Enter your email"
              />
            </div>
          </div>

          {/* Password Field */}
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
              Password
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Lock className="h-5 w-5 text-gray-400" />
              </div>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-color focus:border-transparent transition-colors"
                placeholder="Enter your password"
              />
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-primary-color hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-color disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isLoading ? (
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
            ) : (
              `Sign in as ${roleOptions.find(r => r.id === selectedRole)?.title}`
            )}
          </button>

          {/* Google Sign In */}
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white text-gray-500">Or continue with</span>
            </div>
          </div>

          <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={isSocialLoading === 'google'}
            className="w-full flex justify-center items-center py-3 px-4 border border-gray-300 rounded-lg shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-color disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isSocialLoading === 'google' ? (
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-gray-700"></div>
            ) : (
              <>
                <svg className="h-5 w-5 mr-2" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                Sign in with Google
              </>
            )}
          </button>
        </form>

        {/* Footer */}
        <div className="text-center">
          <p className="text-sm text-gray-600">
            Don't have an account?{' '}
            <Link to="/register" className="font-semibold text-primary-color hover:text-primary-dark transition-colors underline decoration-2 underline-offset-2">
              Sign up for free
            </Link>
          </p>
        </div>
      </motion.div>
    </div>
  );
} 