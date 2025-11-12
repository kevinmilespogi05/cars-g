import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToastContext } from '../contexts/ToastContext';
import { getApiUrl } from '../lib/config';

export default function StartRegister() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { success: showToastSuccess, error: showToastError } = useToastContext();
  const navigate = useNavigate();

  const handleStart = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!email || !email.includes('@')) return setError('Please enter a valid email');

    setLoading(true);
    try {
      const resp = await fetch(getApiUrl('/api/auth/start-email-verification'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data.error || 'Failed to send verification');

      try { localStorage.setItem('registeredEmail', email); } catch (e) {}
      showToastSuccess('Verification code sent', 3500);
      navigate('/verify-email');
    } catch (err: any) {
      setError(err.message || 'Failed to start verification');
      try { showToastError(err.message || 'Failed to start verification', 5000); } catch (e) {}
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-lg p-6 text-center">
        <h2 className="text-xl font-semibold mb-2">Verify your email to continue</h2>
        <p className="text-sm text-gray-600 mb-4">Enter your email and we'll send a verification code.</p>

        {error && <div className="text-sm text-red-600 mb-3">{error}</div>}

        <form onSubmit={handleStart} className="space-y-4">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            className="w-full px-4 py-3 border rounded-lg"
          />
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-red-900 text-white py-3 rounded-lg font-semibold disabled:opacity-50"
          >
            {loading ? 'Sending...' : 'Send verification code'}
          </button>
        </form>
      </div>
    </div>
  );
}
