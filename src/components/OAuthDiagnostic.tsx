import React, { useState } from 'react';
import { supabase } from '../lib/supabase';

export function OAuthDiagnostic() {
  const [diagnosticInfo, setDiagnosticInfo] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);

  const runDiagnostic = async () => {
    setIsLoading(true);
    setDiagnosticInfo('Running diagnostic...\n');
    
    try {
      // Check environment variables
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
      
      setDiagnosticInfo(prev => prev + `✅ Supabase URL: ${supabaseUrl ? 'Set' : 'Missing'}\n`);
      setDiagnosticInfo(prev => prev + `✅ Supabase Key: ${supabaseKey ? 'Set' : 'Missing'}\n`);
      
      // Check Supabase connection
      try {
        const { data, error } = await supabase.auth.getSession();
        if (error) {
          setDiagnosticInfo(prev => prev + `❌ Supabase connection error: ${error.message}\n`);
        } else {
          setDiagnosticInfo(prev => prev + `✅ Supabase connection: OK\n`);
        }
      } catch (err) {
        setDiagnosticInfo(prev => prev + `❌ Supabase connection failed: ${err}\n`);
      }
      
      // Check current URL
      setDiagnosticInfo(prev => prev + `✅ Current origin: ${window.location.origin}\n`);
      setDiagnosticInfo(prev => prev + `✅ Callback URL: ${window.location.origin}/auth/callback\n`);
      
      // Test Google OAuth initiation
      try {
        const { data, error } = await supabase.auth.signInWithOAuth({
          provider: 'google',
          options: {
            redirectTo: `${window.location.origin}/auth/callback`,
          }
        });
        
        if (error) {
          setDiagnosticInfo(prev => prev + `❌ Google OAuth error: ${error.message}\n`);
          
          if (error.message?.includes('provider is not enabled')) {
            setDiagnosticInfo(prev => prev + `\n🔧 SOLUTION: Google OAuth is not enabled in your Supabase project.\n`);
            setDiagnosticInfo(prev => prev + `Please go to your Supabase dashboard → Authentication → Providers → Google and enable it.\n`);
          }
        } else {
          setDiagnosticInfo(prev => prev + `✅ Google OAuth initiated successfully\n`);
        }
      } catch (err) {
        setDiagnosticInfo(prev => prev + `❌ Google OAuth test failed: ${err}\n`);
      }
      
    } catch (err) {
      setDiagnosticInfo(prev => prev + `❌ Diagnostic failed: ${err}\n`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-6 bg-white rounded-lg shadow-lg">
      <h2 className="text-2xl font-bold mb-4">OAuth Diagnostic Tool</h2>
      
      <button
        onClick={runDiagnostic}
        disabled={isLoading}
        className="mb-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
      >
        {isLoading ? 'Running...' : 'Run Diagnostic'}
      </button>
      
      {diagnosticInfo && (
        <div className="bg-gray-100 p-4 rounded font-mono text-sm whitespace-pre-wrap">
          {diagnosticInfo}
        </div>
      )}
      
      <div className="mt-4 text-sm text-gray-600">
        <h3 className="font-semibold mb-2">Common Issues & Solutions:</h3>
        <ul className="list-disc list-inside space-y-1">
          <li><strong>Provider not enabled:</strong> Enable Google OAuth in Supabase dashboard</li>
          <li><strong>Redirect URI mismatch:</strong> Check callback URL configuration</li>
          <li><strong>Missing environment variables:</strong> Ensure .env file exists with correct values</li>
          <li><strong>Network issues:</strong> Check browser console for CORS or network errors</li>
        </ul>
      </div>
    </div>
  );
}
