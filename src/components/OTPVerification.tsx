import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Mail, 
  ArrowLeft, 
  RefreshCw, 
  CheckCircle, 
  AlertCircle, 
  Clock,
  Shield
} from 'lucide-react';
import { getApiUrl } from '../lib/config';

interface OTPVerificationProps {
  email: string;
  onVerificationSuccess: () => void;
  onBack: () => void;
  onResend: () => void;
}

export function OTPVerification({ email, onVerificationSuccess, onBack, onResend }: OTPVerificationProps) {
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [isLoading, setIsLoading] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [timeLeft, setTimeLeft] = useState(600); // 10 minutes in seconds
  const [canResend, setCanResend] = useState(false);
  
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Countdown timer
  useEffect(() => {
    if (timeLeft > 0) {
      const timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
      return () => clearTimeout(timer);
    } else {
      setCanResend(true);
    }
  }, [timeLeft]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleOtpChange = (index: number, value: string) => {
    if (value.length > 1) return; // Prevent multiple characters
    
    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);
    setError('');

    // Auto-focus next input
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }

    // Auto-submit when all fields are filled
    if (newOtp.every(digit => digit !== '') && newOtp.join('').length === 6) {
      handleVerify(newOtp.join(''));
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleVerify = async (otpCode?: string) => {
    const code = otpCode || otp.join('');
    
    if (code.length !== 6) {
      setError('Please enter the complete 6-digit code');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const response = await fetch(getApiUrl('/api/auth/verify-registration'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, otp: code }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Verification failed');
      }

      if (!result.success) {
        throw new Error(result.error || 'Verification failed');
      }

      setSuccess('Email verified successfully! Your account has been created.');
      
      // Wait a moment to show success message, then proceed
      setTimeout(() => {
        onVerificationSuccess();
      }, 1500);

    } catch (err) {
      const message = err instanceof Error ? err.message : 'Verification failed';
      setError(message);
      
      // Clear OTP on error
      setOtp(['', '', '', '', '', '']);
      inputRefs.current[0]?.focus();
    } finally {
      setIsLoading(false);
    }
  };

  const handleResend = async () => {
    setIsResending(true);
    setError('');

    try {
      const response = await fetch(getApiUrl('/api/auth/resend-verification'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to resend verification code');
      }

      if (!result.success) {
        throw new Error(result.error || 'Failed to resend verification code');
      }

      setSuccess('New verification code sent successfully!');
      setTimeLeft(600); // Reset timer
      setCanResend(false);
      setOtp(['', '', '', '', '', '']);
      inputRefs.current[0]?.focus();
      
      // Call parent resend handler
      onResend();

    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to resend verification code';
      setError(message);
    } finally {
      setIsResending(false);
    }
  };

  return (
    <motion.div 
      className="w-full max-w-md space-y-8 bg-white/80 backdrop-blur-sm p-8 sm:p-10 rounded-3xl shadow-2xl border border-white/20"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.6 }}
    >
      {/* Header */}
      <motion.div 
        className="text-center space-y-6"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.1 }}
      >
        <div className="flex justify-center">
          <div className="relative">
            <div className="h-20 w-20 rounded-2xl flex items-center justify-center shadow-xl bg-green-100">
              <Mail className="h-10 w-10 text-green-600" />
            </div>
            <div className="absolute -top-1 -right-1 h-6 w-6 bg-green-500 rounded-full border-2 border-white animate-pulse"></div>
          </div>
        </div>
        
        <div className="space-y-3">
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900">
            Verify Your Email
          </h1>
          <p className="text-gray-600 text-lg">
            We've sent a 6-digit code to
          </p>
          <p className="text-gray-900 font-semibold text-lg">
            {email}
          </p>
        </div>
      </motion.div>

      {/* OTP Input */}
      <motion.div 
        className="space-y-6"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.2 }}
      >
        {/* Error/Success Messages */}
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

        <AnimatePresence>
          {success && (
            <motion.div 
              className="bg-green-50 border-2 border-green-200 text-green-700 px-4 py-4 rounded-2xl flex items-center text-sm"
              initial={{ opacity: 0, y: -10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
              transition={{ duration: 0.3 }}
            >
              <CheckCircle className="h-5 w-5 mr-3 flex-shrink-0" />
              <span className="font-medium">{success}</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* OTP Input Fields */}
        <div className="flex justify-center space-x-3">
          {otp.map((digit, index) => (
            <input
              key={index}
              ref={(el) => (inputRefs.current[index] = el)}
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={1}
              value={digit}
              onChange={(e) => handleOtpChange(index, e.target.value)}
              onKeyDown={(e) => handleKeyDown(index, e)}
              className="w-12 h-12 text-center text-2xl font-bold border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500 transition-all duration-200 bg-gray-50/50 hover:bg-white"
              disabled={isLoading}
            />
          ))}
        </div>

        {/* Timer */}
        <div className="text-center">
          <div className="flex items-center justify-center space-x-2 text-gray-600">
            <Clock className="h-4 w-4" />
            <span className="text-sm">
              Code expires in {formatTime(timeLeft)}
            </span>
          </div>
        </div>

        {/* Verify Button */}
        <button
          type="button"
          onClick={() => handleVerify()}
          disabled={isLoading || otp.some(digit => digit === '')}
          className="w-full flex justify-center items-center py-4 px-6 border border-transparent rounded-2xl text-lg font-semibold text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg hover:shadow-xl"
        >
          {isLoading ? (
            <>
              <RefreshCw className="animate-spin h-5 w-5 mr-2" />
              Verifying...
            </>
          ) : (
            <>
              <Shield className="h-5 w-5 mr-2" />
              Verify Email
            </>
          )}
        </button>

        {/* Resend Code */}
        <div className="text-center">
          <p className="text-gray-600 text-sm mb-3">
            Didn't receive the code?
          </p>
          <button
            type="button"
            onClick={handleResend}
            disabled={!canResend || isResending}
            className="text-green-600 hover:text-green-700 font-semibold text-sm disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
          >
            {isResending ? (
              <>
                <RefreshCw className="animate-spin h-4 w-4 inline mr-1" />
                Sending...
              </>
            ) : (
              'Resend Code'
            )}
          </button>
        </div>

        {/* Back Button */}
        <div className="text-center">
          <button
            type="button"
            onClick={onBack}
            className="inline-flex items-center space-x-2 text-gray-600 hover:text-gray-900 transition-colors group"
          >
            <ArrowLeft className="h-4 w-4 group-hover:-translate-x-1 transition-transform duration-200" />
            <span className="font-medium">Back to Registration</span>
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
