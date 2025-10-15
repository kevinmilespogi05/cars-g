// Test script to analyze the actual Philippine National ID images using Google Vision API
import { ImageAnnotatorClient } from '@google-cloud/vision';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get current directory for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize Google Vision AI client with your credentials
const visionClient = new ImageAnnotatorClient({
  credentials: {
    client_email: process.env.GOOGLE_CLIENT_EMAIL,
    private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  },
  projectId: process.env.GOOGLE_PROJECT_ID,
});

// Helper function to read image file
function readImageFile(imagePath) {
  try {
    return fs.readFileSync(imagePath);
  } catch (error) {
    console.error(`Error reading image file ${imagePath}:`, error);
    throw new Error(`Failed to read image file: ${imagePath}`);
  }
}

// Real AI analysis function using Google Vision API
async function performRealAIAnalysis(frontImagePath, backImagePath) {
  try {
    console.log('🔍 Starting real AI analysis with Google Vision API...');
    
    // Read both images
    const frontImageBuffer = readImageFile(frontImagePath);
    const backImageBuffer = readImageFile(backImagePath);
    
    console.log('📸 Images loaded successfully');
    
    // Analyze front image
    console.log('🔍 Analyzing front image...');
    const [frontTextResult, frontLabelResult] = await Promise.all([
      visionClient.textDetection({ image: { content: frontImageBuffer } }),
      visionClient.labelDetection({ image: { content: frontImageBuffer } })
    ]);
    
    // Analyze back image
    console.log('🔍 Analyzing back image...');
    const [backTextResult, backLabelResult] = await Promise.all([
      visionClient.textDetection({ image: { content: backImageBuffer } }),
      visionClient.labelDetection({ image: { content: backImageBuffer } })
    ]);
    
    // Extract text from both images
    const frontText = frontTextResult[0]?.textAnnotations?.[0]?.description || '';
    const backText = backTextResult[0]?.textAnnotations?.[0]?.description || '';
    
    console.log('📝 Text extracted from images');
    console.log('Front text length:', frontText.length);
    console.log('Back text length:', backText.length);
    
    // Extract labels for document type detection
    const frontLabels = frontLabelResult[0]?.labelAnnotations || [];
    const backLabels = backLabelResult[0]?.labelAnnotations || [];
    
    console.log('🏷️ Labels detected');
    console.log('Front labels:', frontLabels.map(l => l.description));
    console.log('Back labels:', backLabels.map(l => l.description));
    
    // Check for document-related labels
    const documentLabels = ['Document', 'Text', 'Paper', 'Card', 'ID', 'Passport', 'License', 'Driving License', 'Identity Card'];
    const hasDocumentLabels = [...frontLabels, ...backLabels].some(label => 
      documentLabels.some(docLabel => 
        label.description?.toLowerCase().includes(docLabel.toLowerCase())
      )
    );
    
    // Check for selfie/face photo indicators
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
      'issued', 'valid', 'authority', 'department', 'ministry', 'philippine'
    ];
    const hasIdText = idTextPatterns.some(pattern => 
      (frontText + ' ' + backText).toLowerCase().includes(pattern)
    );
    
    // Check for San Pablo, Castillejos, Zambales location
    const locationKeywords = [
      'san pablo', 'castillejos', 'zambales', 'purok 5-a'
    ];
    const hasCorrectLocation = locationKeywords.some(keyword => 
      (frontText + ' ' + backText).toLowerCase().includes(keyword)
    );
    
    // Check for Philippine National ID specific text
    const philippineIdText = [
      'republika ng pilipinas', 'pambansang pagkakakilanlan', 
      'philippine identification card', 'psa.gov.ph'
    ];
    const isPhilippineNationalId = philippineIdText.some(text => 
      (frontText + ' ' + backText).toLowerCase().includes(text)
    );
    
    // Calculate confidence
    let confidence = 0;
    if (hasDocumentLabels) confidence += 20;
    if (hasIdText) confidence += 20;
    if (hasCorrectLocation) confidence += 25;
    if (isPhilippineNationalId) confidence += 25;
    if (frontText.length > 100) confidence += 10;
    if (backText.length > 50) confidence += 10;
    if (hasSelfieLabels) confidence -= 50; // Penalty for selfie indicators
    
    confidence = Math.min(Math.max(confidence, 0), 100);
    
    // Determine authenticity
    const isAuthentic = confidence >= 70 && 
                       hasDocumentLabels && 
                       hasIdText && 
                       !hasSelfieLabels && 
                       hasCorrectLocation;
    
    // Identify issues
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
    if (!hasCorrectLocation) {
      issues.push('ID location not from San Pablo, Castillejos, Zambales');
    }
    
    return {
      confidence: Math.round(confidence),
      isAuthentic,
      documentType: isPhilippineNationalId ? 'philippine_national_id' : 'government_id',
      extractedText: {
        name: extractName(frontText),
        idNumber: extractIdNumber(frontText, backText),
        birthDate: extractBirthDate(frontText),
        location: hasCorrectLocation ? 'San Pablo, Castillejos, Zambales' : 'Other Location',
        documentType: isPhilippineNationalId ? 'Philippine National ID' : 'Government ID'
      },
      locationVerified: hasCorrectLocation,
      issues,
      recommendations: isAuthentic ? 
        ['Document appears authentic and location verified'] : 
        (!hasCorrectLocation ? 
          ['Only residents of San Pablo, Castillejos, Zambales are accepted'] :
          ['Please upload clear photos of your government-issued ID']
        ),
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
        isDocument: hasDocumentLabels && hasIdText && !hasSelfieLabels,
        hasCorrectLocation,
        isPhilippineNationalId
      }
    };
    
  } catch (error) {
    console.error('Google Vision AI analysis error:', error);
    throw new Error('Failed to analyze ID images with AI');
  }
}

// Helper functions to extract specific information
function extractName(text) {
  // Look for name patterns in the text
  const nameMatch = text.match(/(?:name|surname|given name|apelyido|mga pangalan)[:\s]*([a-z\s]+)/i);
  return nameMatch ? nameMatch[1].trim() : 'Not found';
}

function extractIdNumber(text) {
  // Look for ID number patterns
  const idMatch = text.match(/(\d{4}-\d{4}-\d{4}-\d{4})/);
  return idMatch ? idMatch[1] : 'Not found';
}

function extractBirthDate(text) {
  // Look for birth date patterns
  const dateMatch = text.match(/(?:birth|kapanganakan)[:\s]*([a-z0-9\s,]+)/i);
  return dateMatch ? dateMatch[1].trim() : 'Not found';
}

// Run the analysis
async function testRealAI() {
  try {
    console.log('🚀 Testing Real AI Analysis with Google Vision API');
    console.log('================================================');
    
    // Detect environment
    const isDevelopment = process.env.NODE_ENV !== 'production';
    const isProduction = process.env.NODE_ENV === 'production';
    
    console.log(`Environment: ${isDevelopment ? 'Development' : 'Production'}`);
    console.log(`Working Directory: ${process.cwd()}`);
    console.log(`Script Directory: ${__dirname}`);
    
    // Check if environment variables are set
    if (!process.env.GOOGLE_CLIENT_EMAIL || !process.env.GOOGLE_PRIVATE_KEY || !process.env.GOOGLE_PROJECT_ID) {
      console.error('❌ Google Vision API credentials not found in environment variables');
      console.log('Please make sure your .env file contains:');
      console.log('- GOOGLE_CLIENT_EMAIL');
      console.log('- GOOGLE_PRIVATE_KEY');
      console.log('- GOOGLE_PROJECT_ID');
      
      if (isDevelopment) {
        console.log('\n💡 For development, make sure you have a .env file in the project root');
      } else {
        console.log('\n💡 For production, make sure environment variables are set in your deployment platform');
      }
      return;
    }
    
    console.log('✅ Google Vision API credentials found');
    
    // Test with the provided images - handle different environments
    const possiblePaths = [
      './public/images/front id.jpg',
      './public/images/back id.jpg',
      path.join(__dirname, 'public/images/front id.jpg'),
      path.join(__dirname, 'public/images/back id.jpg'),
      path.join(process.cwd(), 'public/images/front id.jpg'),
      path.join(process.cwd(), 'public/images/back id.jpg')
    ];
    
    // Find the correct paths for the images
    let frontImagePath = null;
    let backImagePath = null;
    
    // Try different possible paths
    for (const testPath of possiblePaths) {
      if (fs.existsSync(testPath)) {
        if (testPath.includes('front')) {
          frontImagePath = testPath;
        } else if (testPath.includes('back')) {
          backImagePath = testPath;
        }
      }
    }
    
    // Check if images exist
    if (!frontImagePath) {
      console.error('❌ Front image not found. Tried paths:');
      possiblePaths.filter(p => p.includes('front')).forEach(p => console.error(`  - ${p}`));
      console.log('\n💡 Make sure your images are in the correct location:');
      console.log('  - public/images/front id.jpg');
      console.log('  - public/images/back id.jpg');
      return;
    }
    
    if (!backImagePath) {
      console.error('❌ Back image not found. Tried paths:');
      possiblePaths.filter(p => p.includes('back')).forEach(p => console.error(`  - ${p}`));
      console.log('\n💡 Make sure your images are in the correct location:');
      console.log('  - public/images/front id.jpg');
      console.log('  - public/images/back id.jpg');
      return;
    }
    
    console.log('✅ Images found');
    console.log(`Front image: ${frontImagePath}`);
    console.log(`Back image: ${backImagePath}`);
    
    // Perform the analysis
    const result = await performRealAIAnalysis(frontImagePath, backImagePath);
    
    // Display results
    console.log('\n🎯 AI Analysis Results:');
    console.log('======================');
    console.log(`Confidence: ${result.confidence}%`);
    console.log(`Authentic: ${result.isAuthentic ? 'Yes ✅' : 'No ❌'}`);
    console.log(`Document Type: ${result.extractedText.documentType}`);
    console.log(`Location Verified: ${result.locationVerified ? 'Yes ✅ - San Pablo, Castillejos, Zambales' : 'No ❌'}`);
    console.log(`Philippine National ID: ${result.detection.isPhilippineNationalId ? 'Yes ✅' : 'No ❌'}`);
    console.log(`Selfie Detection: ${result.detection.isSelfie ? 'Selfie Detected ❌' : 'No Selfie ✅'}`);
    
    if (result.issues.length > 0) {
      console.log(`\n⚠️ Issues:`);
      result.issues.forEach(issue => console.log(`- ${issue}`));
    } else {
      console.log('\n✅ No issues detected');
    }
    
    console.log(`\n📄 Extracted Information:`);
    console.log(`Name: ${result.extractedText.name}`);
    console.log(`ID Number: ${result.extractedText.idNumber}`);
    console.log(`Birth Date: ${result.extractedText.birthDate}`);
    console.log(`Location: ${result.extractedText.location}`);
    
    console.log(`\n🏷️ Detected Labels:`);
    console.log(`Front: ${result.labels.front.join(', ')}`);
    console.log(`Back: ${result.labels.back.join(', ')}`);
    
    console.log(`\n💡 Recommendations:`);
    result.recommendations.forEach(rec => console.log(`- ${rec}`));
    
    // Expected result for a legitimate Philippine National ID
    console.log('\n✅ Expected Result for Philippine National ID:');
    console.log('- High confidence (90-100%)');
    console.log('- Authentic: Yes');
    console.log('- Document Type: Philippine National ID');
    console.log('- Location Verified: Yes');
    console.log('- No issues');
    console.log('- Proper extraction of name, ID number, and location');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Run the test
testRealAI();
