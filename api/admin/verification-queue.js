// API endpoint to fetch pending verification requests for admin queue
// Enhanced endpoint with filtering and detailed user information

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
    const { status = 'pending', limit = 50, offset = 0 } = req.query;

    // Build the query with enhanced filtering
    let query = supabase
      .from('user_verification_requests')
      .select(`
        id,
        user_id,
        id_front_image_url,
        id_back_image_url,
        status,
        admin_notes,
        ai_analysis,
        ai_confidence,
        processed_by,
        processed_at,
        created_at,
        updated_at,
        user_profile:profiles!user_verification_requests_user_id_fkey(
          id,
          username,
          email,
          first_name,
          last_name,
          phone,
          role,
          points,
          created_at,
          email_verified,
          verification_status
        )
      `)
      .order('created_at', { ascending: false });

    // Filter by status if provided
    if (status && status !== 'all') {
      query = query.eq('status', status);
    }

    // Apply pagination
    query = query.range(offset, offset + limit - 1);

    const { data: requests, error } = await query;

    if (error) {
      console.error('Error fetching verification requests:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch verification requests',
        details: error.message
      });
    }

    // Get additional statistics
    const { data: stats, error: statsError } = await supabase
      .from('user_verification_requests')
      .select('status')
      .then(({ data }) => {
        if (!data) return { data: null, error: null };
        
        const stats = data.reduce((acc, req) => {
          acc[req.status] = (acc[req.status] || 0) + 1;
          return acc;
        }, {});
        
        return { data: stats, error: null };
      });

    // Get pending users count (users with pending_admin_approval status)
    const { data: pendingUsers, error: pendingUsersError } = await supabase
      .from('profiles')
      .select('id')
      .eq('verification_status', 'pending_admin_approval');

    return res.json({
      success: true,
      data: {
        requests: requests || [],
        pagination: {
          limit: parseInt(limit),
          offset: parseInt(offset),
          total: requests?.length || 0
        },
        statistics: {
          byStatus: stats || {},
          pendingUsers: pendingUsers?.length || 0
        }
      }
    });

  } catch (error) {
    console.error('Verification queue error:', error);
    return res.status(500).json({ 
      success: false, 
      error: 'Internal server error',
      details: error.message
    });
  }
}
