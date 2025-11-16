import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToastContext } from '../contexts/ToastContext';
import { getApiUrl } from '../lib/config';

export default function VerifyEmail() {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [email, setEmail] = useState('');
  const navigate = useNavigate();
  const { success: showToastSuccess, error: showToastError } = useToastContext();

  useEffect(() => {
    // Get email from localStorage or redirect if not available
    const registeredEmail = localStorage.getItem('registeredEmail');
    if (registeredEmail) {
      setEmail(registeredEmail);
    } else {
      navigate('/start-register');
    }
  }, [navigate]);

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!code || code.length < 6) {
      setError('Please enter a valid verification code');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(getApiUrl('/api/auth/verify-email-otp'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          otp: code
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Verification failed');
      }

      // Clear the registered email
      try {
        localStorage.removeItem('registeredEmail');
      } catch (e) {}

      showToastSuccess('Email verified successfully!', 3500);
      
      // Redirect to appropriate page
      // After verification, redirect to login or let user proceed
      setTimeout(() => {
        navigate('/login', { replace: true });
      }, 1500);
    } catch (err: any) {
      const errorMessage = err.message || 'Verification failed';
      setError(errorMessage);
      try {
        showToastError(errorMessage, 5000);
      } catch (e) {}
    } finally {
      setLoading(false);
    }
  };

  const handleResendCode = async () => {
    setLoading(true);
    try {
      const response = await fetch(getApiUrl('/api/auth/start-email-verification'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to resend code');
      }

      showToastSuccess('Verification code resent!', 3500);
      setError('');
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to resend code';
      setError(errorMessage);
      try {
        showToastError(errorMessage, 5000);
      } catch (e) {}
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gray-50">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-lg p-8">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Verify your email</h1>
          <p className="text-gray-600">
            We've sent a verification code to <span className="font-semibold">{email}</span>
          </p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleVerify} className="space-y-6">
          <div>
            <label htmlFor="code" className="block text-sm font-medium text-gray-700 mb-2">
              Verification code
            </label>
            <input
              id="code"
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="000000"
              maxLength={6}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-center text-2xl tracking-widest font-mono"
              disabled={loading}
            />
            <p className="text-xs text-gray-500 mt-2">Enter the 6-digit code from your email</p>
          </div>

          <button
            type="submit"
            disabled={loading || code.length < 6}
            className="w-full bg-red-900 hover:bg-red-800 disabled:bg-gray-300 text-white py-3 rounded-lg font-semibold transition-colors duration-200"
          >
            {loading ? 'Verifying...' : 'Verify email'}
          </button>
        </form>

        <div className="mt-6 pt-6 border-t border-gray-200">
          <p className="text-sm text-gray-600 text-center mb-4">
            Didn't receive the code?
          </p>
          <button
            type="button"
            onClick={handleResendCode}
            disabled={loading}
            className="w-full bg-gray-100 hover:bg-gray-200 disabled:bg-gray-100 text-gray-700 py-2 rounded-lg font-medium text-sm transition-colors duration-200"
          >
            Resend verification code
          </button>
        </div>

        <div className="mt-6 text-center">
          <button
            type="button"
            onClick={() => navigate('/start-register')}
            className="text-sm text-gray-600 hover:text-gray-900"
          >
            Use a different email
          </button>
        </div>
      </div>
    </div>
  );
}
