// Automatic AI verification service using Google Vision AI
// This endpoint processes pending verification requests with Google Vision AI analysis

import { createClient } from '@supabase/supabase-js';
import { ImageAnnotatorClient } from '@google-cloud/vision';

// Initialize Supabase client
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('Missing Supabase configuration');
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Initialize Google Vision AI client
let visionClient;
try {
  visionClient = new ImageAnnotatorClient({
    credentials: {
      client_email: process.env.GOOGLE_CLIENT_EMAIL,
      private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    },
    projectId: process.env.GOOGLE_PROJECT_ID,
  });
} catch (error) {
  console.error('Failed to initialize Google Vision client:', error);
}

// Helper function to download image from URL
async function downloadImage(imageUrl) {
  try {
    const response = await fetch(imageUrl);
    if (!response.ok) {
      throw new Error(`Failed to download image: ${response.statusText}`);
    }
    const buffer = await response.arrayBuffer();
    return Buffer.from(buffer);
  } catch (error) {
    console.error('Error downloading image:', error);
    throw new Error('Failed to download image for analysis');
  }
}

// Google Vision AI analysis function
async function performAIAnalysis(frontImageUrl, backImageUrl) {
  try {
    if (!visionClient) {
      throw new Error('Google Vision client not initialized');
    }

    // Download both images
    const [frontImageBuffer, backImageBuffer] = await Promise.all([
      downloadImage(frontImageUrl),
      downloadImage(backImageUrl)
    ]);

    // Analyze front image
    const [frontTextResult, frontLabelResult] = await Promise.all([
      visionClient.textDetection({ image: { content: frontImageBuffer } }),
      visionClient.labelDetection({ image: { content: frontImageBuffer } })
    ]);

    // Analyze back image
    const [backTextResult, backLabelResult] = await Promise.all([
      visionClient.textDetection({ image: { content: backImageBuffer } }),
      visionClient.labelDetection({ image: { content: backImageBuffer } })
    ]);

    // Extract text from both images
    const frontText = frontTextResult[0]?.textAnnotations?.[0]?.description || '';
    const backText = backTextResult[0]?.textAnnotations?.[0]?.description || '';

    // Extract labels for document type detection
    const frontLabels = frontLabelResult[0]?.labelAnnotations || [];
    const backLabels = backLabelResult[0]?.labelAnnotations || [];

    // Check for document-related labels
    const documentLabels = ['Document', 'Text', 'Paper', 'Card', 'ID', 'Passport', 'License', 'Driving License', 'Identity Card'];
    const hasDocumentLabels = [...frontLabels, ...backLabels].some(label => 
      documentLabels.some(docLabel => 
        label.description?.toLowerCase().includes(docLabel.toLowerCase())
      )
    );

    // Check for selfie/face photo indicators (should reject these)
    const selfieIndicators = ['Selfie', 'Face', 'Person', 'Portrait', 'Head', 'Human', 'Smile', 'Self-portrait'];
    const hasSelfieLabels = [...frontLabels, ...backLabels].some(label => 
      selfieIndicators.some(selfieLabel => 
        label.description?.toLowerCase().includes(selfieLabel.toLowerCase())
      )
    );

    // Check for ID-specific text patterns
    const idTextPatterns = [
      'license', 'passport', 'id number', 'identification', 'government', 'republic',
      'driver', 'driving', 'national', 'citizen', 'birth', 'address', 'expiry',
      'issued', 'valid', 'authority', 'department', 'ministry'
    ];
    const hasIdText = idTextPatterns.some(pattern => 
      (frontText + ' ' + backText).toLowerCase().includes(pattern)
    );

    // Extract structured data from text
    const extractedData = extractStructuredData(frontText, backText);

    // Calculate confidence based on various factors
    const confidence = calculateConfidence({
      frontText,
      backText,
      frontLabels,
      backLabels,
      hasDocumentLabels,
      extractedData,
      hasSelfieLabels,
      hasIdText
    });

    // Determine if document is authentic
    // Must have document labels, ID text, and NOT be a selfie
    const isAuthentic = confidence >= 70 && 
                       hasDocumentLabels && 
                       hasIdText && 
                       !hasSelfieLabels && 
                       extractedData.name;

    // Check for location verification
    const locationVerified = verifyLocation(frontText, backText);

    // Identify issues
    const issues = identifyIssues({
      frontText,
      backText,
      confidence,
      hasDocumentLabels,
      extractedData,
      hasSelfieLabels,
      hasIdText
    });

    const analysis = {
      confidence: Math.round(confidence),
      isAuthentic,
      documentType: 'government_id',
      extractedText: extractedData,
      locationVerified,
      issues,
      recommendations: generateRecommendations(issues),
      rawText: {
        front: frontText,
        back: backText
      },
      labels: {
        front: frontLabels.map(l => l.description),
        back: backLabels.map(l => l.description)
      },
      detection: {
        hasDocumentLabels,
        hasSelfieLabels,
        hasIdText,
        isSelfie: hasSelfieLabels,
        isDocument: hasDocumentLabels && hasIdText && !hasSelfieLabels
      }
    };

    return analysis;
  } catch (error) {
    console.error('Google Vision AI analysis error:', error);
    throw new Error('Failed to analyze ID images with AI');
  }
}

// Extract structured data from OCR text
function extractStructuredData(frontText, backText) {
  const combinedText = `${frontText} ${backText}`.toLowerCase();
  
  // Extract name (look for common name patterns)
  const nameMatch = combinedText.match(/(?:name|surname|given name)[:\s]*([a-z\s]+)/i);
  const name = nameMatch ? nameMatch[1].trim() : null;

  // Extract ID number (look for numeric patterns)
  const idMatch = combinedText.match(/(?:id|number|no)[:\s]*(\d{6,})/i);
  const idNumber = idMatch ? idMatch[1] : null;

  // Extract dates
  const datePattern = /(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})/g;
  const dates = combinedText.match(datePattern) || [];

  return {
    name,
    idNumber,
    dates,
    hasValidStructure: !!(name && idNumber)
  };
}

// Calculate confidence score
function calculateConfidence({ frontText, backText, frontLabels, backLabels, hasDocumentLabels, extractedData, hasSelfieLabels, hasIdText }) {
  let confidence = 0;

  // Base confidence for having text
  if (frontText.length > 50) confidence += 20;
  if (backText.length > 50) confidence += 20;

  // Document labels boost
  if (hasDocumentLabels) confidence += 15;

  // ID-specific text patterns boost
  if (hasIdText) confidence += 20;

  // Structured data extraction
  if (extractedData.name) confidence += 15;
  if (extractedData.idNumber) confidence += 15;
  if (extractedData.hasValidStructure) confidence += 15;

  // Text quality (length and content)
  const totalTextLength = frontText.length + backText.length;
  if (totalTextLength > 200) confidence += 10;
  if (totalTextLength > 500) confidence += 5;

  // Penalty for selfie indicators
  if (hasSelfieLabels) confidence -= 50;

  return Math.min(Math.max(confidence, 0), 100);
}

// Verify location based on text content
function verifyLocation(frontText, backText) {
  const combinedText = `${frontText} ${backText}`.toLowerCase();
  
  // Look for location-specific keywords
  const locationKeywords = [
    'philippines', 'phil', 'republic of the philippines',
    'manila', 'cebu', 'davao', 'quezon', 'caloocan',
    'ncr', 'national capital region'
  ];

  return locationKeywords.some(keyword => combinedText.includes(keyword));
}

// Identify potential issues
function identifyIssues({ frontText, backText, confidence, hasDocumentLabels, extractedData, hasSelfieLabels, hasIdText }) {
  const issues = [];

  if (confidence < 70) {
    issues.push('Low confidence score - image quality may be poor');
  }

  if (hasSelfieLabels) {
    issues.push('Images appear to be selfies/face photos instead of ID documents');
  }

  if (!hasDocumentLabels) {
    issues.push('Document type not clearly identified');
  }

  if (!hasIdText) {
    issues.push('No ID-specific text patterns detected (license, passport, etc.)');
  }

  if (!extractedData.name) {
    issues.push('Name not clearly extracted from document');
  }

  if (!extractedData.idNumber) {
    issues.push('ID number not clearly extracted from document');
  }

  if (frontText.length < 50) {
    issues.push('Front image text extraction insufficient');
  }

  if (backText.length < 50) {
    issues.push('Back image text extraction insufficient');
  }

  return issues;
}

// Generate recommendations based on issues
function generateRecommendations(issues) {
  const recommendations = [];

  if (issues.some(issue => issue.includes('image quality'))) {
    recommendations.push('Please retake photos with better lighting and focus');
  }

  if (issues.some(issue => issue.includes('text extraction'))) {
    recommendations.push('Ensure all text on the ID is clearly visible and readable');
  }

  if (issues.some(issue => issue.includes('Document type'))) {
    recommendations.push('Please use a government-issued ID (driver\'s license, passport, etc.)');
  }

  return recommendations;
}

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
    const { requestId } = req.body || {};

    if (!requestId) {
      return res.status(400).json({ 
        success: false, 
        error: 'Request ID is required' 
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

    if (request.status !== 'pending') {
      return res.status(400).json({
        success: false,
        error: 'Request is not in pending status'
      });
    }

    // Update status to AI processing
    await supabase
      .from('user_verification_requests')
      .update({ status: 'ai_processing' })
      .eq('id', requestId);

    try {
      // Perform AI analysis
      const aiAnalysis = await performAIAnalysis(
        request.id_front_image_url,
        request.id_back_image_url
      );

      // Update verification request with AI analysis (but don't auto-approve)
      await supabase
        .from('user_verification_requests')
        .update({
          ai_analysis: aiAnalysis,
          ai_confidence: aiAnalysis.confidence,
          updated_at: new Date().toISOString()
        })
        .eq('id', requestId);

      // Update user profile with AI analysis (but don't change verification status)
      await supabase
        .from('profiles')
        .update({
          ai_verification_confidence: aiAnalysis.confidence,
          ai_verification_details: aiAnalysis
        })
        .eq('id', request.user_id);

      return res.json({
        success: true,
        verified: aiAnalysis.isAuthentic,
        confidence: aiAnalysis.confidence,
        analysis: aiAnalysis,
        message: 'AI analysis completed - manual review required for final decision'
      });

    } catch (aiError) {
      console.error('AI analysis error:', aiError);
      
      // Reset status to pending if AI analysis fails
      await supabase
        .from('user_verification_requests')
        .update({ status: 'pending' })
        .eq('id', requestId);

      return res.status(500).json({
        success: false,
        error: 'AI analysis failed, request reset to pending for manual review'
      });
    }

  } catch (error) {
    console.error('Auto verification error:', error);
    return res.status(500).json({ 
      success: false, 
      error: 'Internal server error' 
    });
  }
}
