import { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { userId, achievementId, points } = req.body;

    if (!userId || !achievementId || !points) {
      return res.status(400).json({ error: 'Missing required fields: userId, achievementId, points' });
    }

    // Check if achievement already exists for this user
    const { data: existingAchievement, error: checkError } = await supabase
      .from('user_achievements')
      .select('id')
      .eq('user_id', userId)
      .eq('achievement_id', achievementId)
      .maybeSingle();

    if (checkError) {
      console.error('Error checking existing achievement:', checkError);
      return res.status(500).json({ error: 'Failed to check achievement status' });
    }

    // If achievement already exists, return success (idempotent)
    if (existingAchievement) {
      return res.status(200).json({ 
        message: 'Achievement already awarded',
        alreadyExists: true
      });
    }

    // Award the achievement using service role (bypasses RLS)
    const { data: awardedAchievement, error: awardError } = await supabase
      .from('user_achievements')
      .insert({
        user_id: userId,
        achievement_id: achievementId,
        earned_at: new Date().toISOString()
      })
      .select();

    if (awardError) {
      console.error('Error awarding achievement:', awardError);
      return res.status(500).json({ error: 'Failed to award achievement' });
    }

    // Award points to the user
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('points')
      .eq('id', userId)
      .maybeSingle();

    if (profileError) {
      console.error('Error fetching user profile:', profileError);
      return res.status(500).json({ error: 'Failed to fetch user profile' });
    }

    const currentPoints = profile?.points || 0;
    const newPoints = currentPoints + points;

    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        points: newPoints,
        updated_at: new Date().toISOString()
      })
      .eq('id', userId);

    if (updateError) {
      console.error('Error updating user points:', updateError);
      return res.status(500).json({ error: 'Failed to update user points' });
    }

    // Also create a points history entry
    await supabase
      .from('user_points_history')
      .insert({
        user_id: userId,
        points_awarded: points,
        reason: `ACHIEVEMENT_${achievementId.toUpperCase()}`,
        created_at: new Date().toISOString()
      })
      .select();

    return res.status(200).json({
      message: 'Achievement awarded successfully',
      achievement: awardedAchievement?.[0],
      newPoints
    });
  } catch (error) {
    console.error('Error in award achievement endpoint:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
