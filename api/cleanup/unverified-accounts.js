// Scheduled cleanup job for unverified accounts
// Scenario B: Delete accounts that were never verified after 24 hours

import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('Missing Supabase configuration');
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Cleanup unverified accounts
async function cleanupUnverifiedAccounts() {
  try {
    console.log('🧹 Starting cleanup of unverified accounts...');
    
    // Find accounts that are pending email verification and token has expired
    const cutoffTime = new Date(Date.now() - 24 * 60 * 60 * 1000); // 24 hours ago
    
    const { data: unverifiedUsers, error: fetchError } = await supabase
      .from('profiles')
      .select('id, email, username, first_name, created_at, email_verification_token_expiry')
      .eq('verification_status', 'pending_email_verification')
      .lt('email_verification_token_expiry', cutoffTime.toISOString());

    if (fetchError) {
      console.error('Error fetching unverified accounts:', fetchError);
      return { success: false, error: fetchError.message };
    }

    if (!unverifiedUsers || unverifiedUsers.length === 0) {
      console.log('✅ No unverified accounts to cleanup');
      return { success: true, deletedCount: 0 };
    }

    console.log(`📋 Found ${unverifiedUsers.length} unverified accounts to cleanup`);

    // Delete from Supabase Auth first
    const authDeletePromises = unverifiedUsers.map(user => 
      supabase.auth.admin.deleteUser(user.id)
    );

    const authResults = await Promise.allSettled(authDeletePromises);
    
    // Count successful auth deletions
    const successfulAuthDeletions = authResults.filter(result => 
      result.status === 'fulfilled'
    ).length;

    console.log(`🔐 Deleted ${successfulAuthDeletions}/${unverifiedUsers.length} auth users`);

    // Delete from profiles table
    const userIds = unverifiedUsers.map(user => user.id);
    
    const { error: profileDeleteError } = await supabase
      .from('profiles')
      .delete()
      .in('id', userIds);

    if (profileDeleteError) {
      console.error('Error deleting profiles:', profileDeleteError);
      return { success: false, error: profileDeleteError.message };
    }

    console.log(`🗑️ Deleted ${unverifiedUsers.length} profile records`);

    // Log cleanup details
    const cleanupDetails = unverifiedUsers.map(user => ({
      id: user.id,
      email: user.email,
      username: user.username,
      created_at: user.created_at,
      expired_at: user.email_verification_token_expiry
    }));

    console.log('📊 Cleanup details:', cleanupDetails);

    return {
      success: true,
      deletedCount: unverifiedUsers.length,
      details: cleanupDetails
    };

  } catch (error) {
    console.error('Cleanup error:', error);
    return { success: false, error: error.message };
  }
}

export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Allow both GET (for manual trigger) and POST (for cron jobs)
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    // Check for admin authorization (optional - for manual triggers)
    const authHeader = req.headers.authorization;
    if (authHeader && !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ 
        success: false, 
        error: 'Invalid authorization header' 
      });
    }

    // Run cleanup
    const result = await cleanupUnverifiedAccounts();

    if (result.success) {
      return res.json({
        success: true,
        message: `Cleanup completed successfully. Deleted ${result.deletedCount} unverified accounts.`,
        deletedCount: result.deletedCount,
        details: result.details || []
      });
    } else {
      return res.status(500).json({
        success: false,
        error: 'Cleanup failed',
        details: result.error
      });
    }

  } catch (error) {
    console.error('Cleanup handler error:', error);
    return res.status(500).json({ 
      success: false, 
      error: 'Internal server error',
      details: error.message
    });
  }
}
