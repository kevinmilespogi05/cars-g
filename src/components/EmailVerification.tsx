import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Mail, 
  CheckCircle, 
  AlertCircle, 
  Clock, 
  RefreshCw,
  ArrowLeft,
  Shield
} from 'lucide-react';
import { getApiUrl } from '../lib/config';

interface EmailVerificationProps {
  email: string;
  username: string;
  onVerified: () => void;
  onBack: () => void;
  onResend: () => void;
}

export function EmailVerification({ 
  email, 
  username, 
  onVerified, 
  onBack, 
  onResend 
}: EmailVerificationProps) {
  const [verificationCode, setVerificationCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [timeLeft, setTimeLeft] = useState(600); // 10 minutes in seconds
  const [isResending, setIsResending] = useState(false);

  // Countdown timer
  useEffect(() => {
    if (timeLeft > 0) {
      const timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [timeLeft]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const response = await fetch(getApiUrl('/api/auth/verify-email'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          code: verificationCode
        })
      });

      const data = await response.json();

      if (data.success) {
        setSuccess(true);
        setTimeout(() => {
          onVerified();
        }, 2000);
      } else {
        setError(data.error || 'Verification failed');
      }
    } catch (err) {
      setError('Network error. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResend = async () => {
    setIsResending(true);
    setError('');
    
    try {
      const response = await fetch(getApiUrl('/api/auth/send-verification'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          username
        })
      });

      const data = await response.json();

      if (data.success) {
        setTimeLeft(600); // Reset timer
        setVerificationCode(''); // Clear input
        setError('');
      } else {
        setError(data.error || 'Failed to resend verification code');
      }
    } catch (err) {
      setError('Network error. Please try again.');
    } finally {
      setIsResending(false);
    }
  };

  if (success) {
    return (
      <motion.div 
        className="text-center space-y-6"
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
      >
        <div className="flex justify-center">
          <div className="h-20 w-20 bg-green-100 rounded-full flex items-center justify-center">
            <CheckCircle className="h-10 w-10 text-green-600" />
          </div>
        </div>
        <div className="space-y-2">
          <h2 className="text-2xl font-bold text-gray-900">Email Verified!</h2>
          <p className="text-gray-600">
            Your email has been successfully verified. You can now complete your registration.
          </p>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div 
      className="space-y-6"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      {/* Header */}
      <div className="text-center space-y-4">
        <div className="flex justify-center">
          <div className="h-16 w-16 bg-blue-100 rounded-full flex items-center justify-center">
            <Mail className="h-8 w-8 text-blue-600" />
          </div>
        </div>
        <div className="space-y-2">
          <h2 className="text-2xl font-bold text-gray-900">Verify Your Email</h2>
          <p className="text-gray-600">
            We've sent a 6-digit verification code to{' '}
            <span className="font-semibold text-gray-900">{email}</span>
          </p>
        </div>
      </div>

      {/* Timer */}
      <div className="flex items-center justify-center space-x-2 text-sm text-gray-600">
        <Clock className="h-4 w-4" />
        <span>Code expires in {formatTime(timeLeft)}</span>
      </div>

      {/* Error Alert */}
      <AnimatePresence>
        {error && (
          <motion.div 
            className="bg-red-50 border-2 border-red-200 text-red-700 px-4 py-3 rounded-xl flex items-center text-sm"
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ duration: 0.3 }}
          >
            <AlertCircle className="h-4 w-4 mr-2 flex-shrink-0" />
            <span>{error}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Verification Form */}
      <form onSubmit={handleVerify} className="space-y-6">
        <div className="space-y-2">
          <label htmlFor="verificationCode" className="text-sm font-semibold text-gray-700">
            Verification Code
          </label>
          <input
            id="verificationCode"
            type="text"
            value={verificationCode}
            onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
            className="block w-full px-4 py-4 border-2 border-gray-200 rounded-xl placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-200 bg-gray-50/50 text-center text-2xl font-mono tracking-widest"
            placeholder="000000"
            maxLength={6}
            required
          />
        </div>

        {/* Action Buttons */}
        <div className="space-y-3">
          <motion.button
            type="submit"
            disabled={isLoading || verificationCode.length !== 6}
            className="w-full flex justify-center items-center py-4 px-6 border border-transparent rounded-xl text-lg font-semibold text-white focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105 disabled:transform-none"
            style={{backgroundColor: '#800000'}}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            {isLoading ? (
              <>
                <RefreshCw className="h-5 w-5 mr-2 animate-spin" />
                Verifying...
              </>
            ) : (
              <>
                <Shield className="h-5 w-5 mr-2" />
                Verify Email
              </>
            )}
          </motion.button>

          <div className="flex space-x-3">
            <button
              type="button"
              onClick={onBack}
              className="flex-1 flex justify-center items-center py-3 px-4 border-2 border-gray-300 text-gray-700 rounded-xl font-medium hover:bg-gray-50 transition-colors duration-200"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </button>
            
            <button
              type="button"
              onClick={handleResend}
              disabled={isResending || timeLeft > 540} // Can't resend in first minute
              className="flex-1 flex justify-center items-center py-3 px-4 border-2 border-blue-300 text-blue-700 rounded-xl font-medium hover:bg-blue-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
            >
              {isResending ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Resend Code
                </>
              )}
            </button>
          </div>
        </div>
      </form>

      {/* Help Text */}
      <div className="text-center text-sm text-gray-500">
        <p>Didn't receive the email? Check your spam folder or try resending.</p>
      </div>
    </motion.div>
  );
}
