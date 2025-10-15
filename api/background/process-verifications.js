// Background job to process pending verification requests
// This endpoint checks for pending requests and triggers AI verification

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
    // Find pending verification requests
    const { data: pendingRequests, error: fetchError } = await supabase
      .from('user_verification_requests')
      .select('*')
      .eq('status', 'pending')
      .order('created_at', { ascending: true })
      .limit(10); // Process up to 10 requests at a time

    if (fetchError) {
      console.error('Error fetching pending requests:', fetchError);
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch pending requests'
      });
    }

    if (!pendingRequests || pendingRequests.length === 0) {
      return res.json({
        success: true,
        message: 'No pending verification requests found',
        processed: 0
      });
    }

    const results = [];

    // Process each pending request
    for (const request of pendingRequests) {
      try {
        // Call AI verification endpoint
        const aiResponse = await fetch(`${process.env.VITE_API_URL || 'http://localhost:3000'}/api/ai/auto-verify`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            requestId: request.id
          }),
        });

        if (aiResponse.ok) {
          const aiResult = await aiResponse.json();
          results.push({
            requestId: request.id,
            success: true,
            verified: aiResult.verified,
            confidence: aiResult.confidence
          });
        } else {
          console.error(`AI verification failed for request ${request.id}`);
          results.push({
            requestId: request.id,
            success: false,
            error: 'AI verification failed'
          });
        }
      } catch (error) {
        console.error(`Error processing request ${request.id}:`, error);
        results.push({
          requestId: request.id,
          success: false,
          error: error.message
        });
      }
    }

    return res.json({
      success: true,
      message: `Processed ${pendingRequests.length} verification requests`,
      processed: results.length,
      results
    });

  } catch (error) {
    console.error('Background verification processing error:', error);
    return res.status(500).json({ 
      success: false, 
      error: 'Internal server error' 
    });
  }
}
