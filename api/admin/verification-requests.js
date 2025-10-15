// API endpoint to fetch verification requests for admin dashboard
// This endpoint retrieves all user verification requests with user profile information

import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('Missing Supabase configuration');
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    // Fetch verification requests with user profile information
    const { data: requests, error } = await supabase
      .from('user_verification_requests')
      .select(`
        *,
        user_profile:profiles!user_verification_requests_user_id_fkey(
          username,
          email,
          first_name,
          last_name,
          phone
        )
      `)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching verification requests:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch verification requests'
      });
    }

    return res.json({
      success: true,
      requests: requests || []
    });

  } catch (error) {
    console.error('Verification requests error:', error);
    return res.status(500).json({ 
      success: false, 
      error: 'Internal server error' 
    });
  }
}
