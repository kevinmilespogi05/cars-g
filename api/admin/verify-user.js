// API endpoint for admin to approve or reject user verification
// This endpoint handles manual verification decisions by admins

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
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    const { requestId, decision, notes } = req.body || {};

    // Input validation
    if (!requestId || !decision) {
      return res.status(400).json({ 
        success: false, 
        error: 'Request ID and decision are required' 
      });
    }

    if (!['approved', 'rejected'].includes(decision)) {
      return res.status(400).json({ 
        success: false, 
        error: 'Decision must be either "approved" or "rejected"' 
      });
    }

    // Get the verification request
    const { data: request, error: requestError } = await supabase
      .from('user_verification_requests')
      .select('*')
      .eq('id', requestId)
      .single();

    if (requestError || !request) {
      return res.status(404).json({
        success: false,
        error: 'Verification request not found'
      });
    }

    // Update verification request
    const { error: updateRequestError } = await supabase
      .from('user_verification_requests')
      .update({
        status: decision,
        admin_notes: notes || null,
        processed_at: new Date().toISOString()
      })
      .eq('id', requestId);

    if (updateRequestError) {
      console.error('Error updating verification request:', updateRequestError);
      return res.status(500).json({
        success: false,
        error: 'Failed to update verification request'
      });
    }

    // Update user profile verification status
    const verificationStatus = decision === 'approved' ? 'verified' : 'rejected';
    const verificationNotes = decision === 'approved' 
      ? 'Manually verified by admin' 
      : `Rejected by admin: ${notes || 'No reason provided'}`;

    const { error: updateProfileError } = await supabase
      .from('profiles')
      .update({
        verification_status: verificationStatus,
        verification_notes: verificationNotes,
        verified_at: decision === 'approved' ? new Date().toISOString() : null
      })
      .eq('id', request.user_id);

    if (updateProfileError) {
      console.error('Error updating user profile:', updateProfileError);
      return res.status(500).json({
        success: false,
        error: 'Failed to update user verification status'
      });
    }

    return res.json({
      success: true,
      message: `User verification ${decision} successfully`,
      verificationStatus
    });

  } catch (error) {
    console.error('Admin verification error:', error);
    return res.status(500).json({ 
      success: false, 
      error: 'Internal server error' 
    });
  }
}
