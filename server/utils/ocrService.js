import FormData from 'form-data';
import fetch from 'node-fetch';

/**
 * OCR Service for OCR.space API integration
 * Handles ID card image processing and text extraction
 */

const OCR_API_URL = 'https://api.ocr.space/parse/image';
const OCR_TIMEOUT = 30000; // 30 seconds

/**
 * Process an image using OCR.space API
 * @param {string} imageUrl - URL of the image to process
 * @param {string} apiKey - OCR.space API key
 * @param {string} language - Language code ('eng' or 'fil' for Filipino)
 * @returns {Promise<Object>} OCR response with parsed text and confidence scores
 */
export async function processImageWithOCR(imageUrl, apiKey, language = 'eng') {
  if (!apiKey) {
    throw new Error('OCR_SPACE_API_KEY is not configured');
  }

  if (!imageUrl) {
    throw new Error('Image URL is required');
  }

  try {
    // Create FormData for OCR.space API
    const formData = new FormData();
    formData.append('url', imageUrl);
    formData.append('apikey', apiKey);
    formData.append('language', language);
    formData.append('isOverlayRequired', 'false'); // We only need text, not overlay
    formData.append('OCREngine', '2'); // Use engine 2 for better accuracy
    formData.append('detectOrientation', 'true'); // Auto-detect image orientation
    formData.append('scale', 'true'); // Enable scaling for better recognition

    // Make API request with timeout
    // Use Promise.race for timeout (more compatible than AbortController)
    const fetchPromise = fetch(OCR_API_URL, {
      method: 'POST',
      body: formData
    });

    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Request timeout')), OCR_TIMEOUT);
    });

    const response = await Promise.race([fetchPromise, timeoutPromise]);

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`OCR API error: ${response.status} - ${errorText}`);
    }

    const result = await response.json();

    // Check for API errors in response
    if (result.OCRExitCode !== 1) {
      const errorMessage = result.ErrorMessage?.[0] || 'Unknown OCR error';
      throw new Error(`OCR processing failed: ${errorMessage}`);
    }

    // Extract parsed text from all pages
    let fullText = '';
    let confidenceScores = [];

    if (result.ParsedResults && result.ParsedResults.length > 0) {
      for (const parsedResult of result.ParsedResults) {
        if (parsedResult.ParsedText) {
          fullText += parsedResult.ParsedText + '\n';
        }
        // Extract confidence if available
        if (parsedResult.TextOverlay?.HasOverlay) {
          const words = parsedResult.TextOverlay?.Words || [];
          if (words.length > 0) {
            const avgConfidence = words.reduce((sum, word) => sum + (word.WordConfidence || 0), 0) / words.length;
            confidenceScores.push(avgConfidence);
          }
        }
      }
    }

    // Calculate overall confidence (average of all confidence scores, or default to 70 if not available)
    const overallConfidence = confidenceScores.length > 0
      ? confidenceScores.reduce((sum, score) => sum + score, 0) / confidenceScores.length
      : 70;

    return {
      success: true,
      text: fullText.trim(),
      confidence: overallConfidence,
      rawResponse: result,
      processedAt: new Date().toISOString()
    };

  } catch (error) {
    // Handle specific error types
    if (error.message === 'Request timeout' || error.message.includes('timeout')) {
      throw new Error('OCR request timed out. The image may be too large or the service is slow.');
    }

    if (error.message.includes('OCR_SPACE_API_KEY')) {
      throw new Error('OCR service is not properly configured. Please contact support.');
    }

    // Re-throw with more context
    throw new Error(`OCR processing failed: ${error.message}`);
  }
}

/**
 * Process image from base64 string (alternative to URL)
 * @param {string} base64Image - Base64 encoded image string
 * @param {string} apiKey - OCR.space API key
 * @param {string} language - Language code
 * @returns {Promise<Object>} OCR response
 */
export async function processBase64Image(base64Image, apiKey, language = 'eng') {
  if (!apiKey) {
    throw new Error('OCR_SPACE_API_KEY is not configured');
  }

  if (!base64Image) {
    throw new Error('Base64 image is required');
  }

  try {
    const formData = new FormData();
    formData.append('base64Image', base64Image);
    formData.append('apikey', apiKey);
    formData.append('language', language);
    formData.append('isOverlayRequired', 'false');
    formData.append('OCREngine', '2');
    formData.append('detectOrientation', 'true');
    formData.append('scale', 'true');

    // Use Promise.race for timeout (more compatible than AbortController)
    const fetchPromise = fetch(OCR_API_URL, {
      method: 'POST',
      body: formData
    });

    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Request timeout')), OCR_TIMEOUT);
    });

    const response = await Promise.race([fetchPromise, timeoutPromise]);

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`OCR API error: ${response.status} - ${errorText}`);
    }

    const result = await response.json();

    if (result.OCRExitCode !== 1) {
      const errorMessage = result.ErrorMessage?.[0] || 'Unknown OCR error';
      throw new Error(`OCR processing failed: ${errorMessage}`);
    }

    let fullText = '';
    let confidenceScores = [];

    if (result.ParsedResults && result.ParsedResults.length > 0) {
      for (const parsedResult of result.ParsedResults) {
        if (parsedResult.ParsedText) {
          fullText += parsedResult.ParsedText + '\n';
        }
        if (parsedResult.TextOverlay?.HasOverlay) {
          const words = parsedResult.TextOverlay?.Words || [];
          if (words.length > 0) {
            const avgConfidence = words.reduce((sum, word) => sum + (word.WordConfidence || 0), 0) / words.length;
            confidenceScores.push(avgConfidence);
          }
        }
      }
    }

    const overallConfidence = confidenceScores.length > 0
      ? confidenceScores.reduce((sum, score) => sum + score, 0) / confidenceScores.length
      : 70;

    return {
      success: true,
      text: fullText.trim(),
      confidence: overallConfidence,
      rawResponse: result,
      processedAt: new Date().toISOString()
    };

  } catch (error) {
    if (error.message === 'Request timeout' || error.message.includes('timeout')) {
      throw new Error('OCR request timed out');
    }
    throw new Error(`OCR processing failed: ${error.message}`);
  }
}

