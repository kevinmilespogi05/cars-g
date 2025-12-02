/**
 * Verification Matcher - Fuzzy string matching for ID verification
 * Compares OCR-extracted data with registration data
 */

/**
 * Calculate Levenshtein distance between two strings
 * @param {string} str1 - First string
 * @param {string} str2 - Second string
 * @returns {number} Levenshtein distance
 */
function levenshteinDistance(str1, str2) {
  const len1 = str1.length;
  const len2 = str2.length;
  const matrix = [];

  // Initialize matrix
  for (let i = 0; i <= len1; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= len2; j++) {
    matrix[0][j] = j;
  }

  // Fill matrix
  for (let i = 1; i <= len1; i++) {
    for (let j = 1; j <= len2; j++) {
      if (str1[i - 1] === str2[j - 1]) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j] + 1,     // deletion
          matrix[i][j - 1] + 1,     // insertion
          matrix[i - 1][j - 1] + 1   // substitution
        );
      }
    }
  }

  return matrix[len1][len2];
}

/**
 * Calculate similarity percentage using Levenshtein distance
 * @param {string} str1 - First string
 * @param {string} str2 - Second string
 * @returns {number} Similarity percentage (0-100)
 */
function calculateSimilarity(str1, str2) {
  if (!str1 || !str2) return 0;
  if (str1 === str2) return 100;

  const maxLen = Math.max(str1.length, str2.length);
  if (maxLen === 0) return 100;

  const distance = levenshteinDistance(str1, str2);
  const similarity = ((maxLen - distance) / maxLen) * 100;
  return Math.max(0, Math.min(100, similarity));
}

/**
 * Normalize string for comparison (handles common OCR errors)
 * @param {string} text - Text to normalize
 * @returns {string} Normalized text
 */
function normalizeForComparison(text) {
  if (!text) return '';
  
  return text
    .toUpperCase()
    .trim()
    .replace(/[^\w\s]/g, '') // Remove special characters
    .replace(/\s+/g, ' ') // Normalize whitespace
    // Common OCR error corrections
    .replace(/0/g, 'O') // Zero to O (in names)
    .replace(/1/g, 'I') // One to I (in names)
    .replace(/5/g, 'S') // Five to S (less common)
    .trim();
}

/**
 * Calculate Jaro-Winkler similarity (better for names)
 * @param {string} str1 - First string
 * @param {string} str2 - Second string
 * @returns {number} Jaro-Winkler similarity (0-1)
 */
function jaroWinkler(str1, str2) {
  if (str1 === str2) return 1.0;
  if (!str1 || !str2) return 0.0;

  const jaro = jaroDistance(str1, str2);
  const prefixLen = commonPrefixLength(str1, str2, 4);
  const p = 0.1; // Scaling factor

  return jaro + (prefixLen * p * (1 - jaro));
}

/**
 * Calculate Jaro distance
 * @param {string} str1 - First string
 * @param {string} str2 - Second string
 * @returns {number} Jaro distance (0-1)
 */
function jaroDistance(str1, str2) {
  const len1 = str1.length;
  const len2 = str2.length;

  if (len1 === 0 && len2 === 0) return 1.0;
  if (len1 === 0 || len2 === 0) return 0.0;

  const matchWindow = Math.floor(Math.max(len1, len2) / 2) - 1;
  const str1Matches = new Array(len1).fill(false);
  const str2Matches = new Array(len2).fill(false);

  let matches = 0;
  let transpositions = 0;

  // Find matches
  for (let i = 0; i < len1; i++) {
    const start = Math.max(0, i - matchWindow);
    const end = Math.min(i + matchWindow + 1, len2);

    for (let j = start; j < end; j++) {
      if (str2Matches[j] || str1[i] !== str2[j]) continue;
      str1Matches[i] = true;
      str2Matches[j] = true;
      matches++;
      break;
    }
  }

  if (matches === 0) return 0.0;

  // Find transpositions
  let k = 0;
  for (let i = 0; i < len1; i++) {
    if (!str1Matches[i]) continue;
    while (!str2Matches[k]) k++;
    if (str1[i] !== str2[k]) transpositions++;
    k++;
  }

  return (
    (matches / len1 +
      matches / len2 +
      (matches - transpositions / 2) / matches) /
    3.0
  );
}

/**
 * Calculate common prefix length (for Jaro-Winkler)
 * @param {string} str1 - First string
 * @param {string} str2 - Second string
 * @param {number} maxLen - Maximum prefix length to check
 * @returns {number} Common prefix length
 */
function commonPrefixLength(str1, str2, maxLen) {
  const minLen = Math.min(str1.length, str2.length, maxLen);
  for (let i = 0; i < minLen; i++) {
    if (str1[i] !== str2[i]) return i;
  }
  return minLen;
}

/**
 * Match extracted name with registration name
 * Enhanced to handle Philippine ID format with middle names and multiple given names
 * @param {string|Object} extractedName - Name extracted from OCR (string or nameComponents object)
 * @param {string} registrationFirstName - First name from registration
 * @param {string} registrationLastName - Last name from registration
 * @param {number} threshold - Minimum similarity threshold (default: 75, lowered for better matching)
 * @returns {Object} Match result with confidence and isMatch
 */
export function matchName(extractedName, registrationFirstName, registrationLastName, threshold = 75) {
  // Handle nameComponents object from Philippine ID parser
  let nameComponents = null;
  let extractedNameStr = extractedName;
  
  if (extractedName && typeof extractedName === 'object' && extractedName.nameComponents) {
    nameComponents = extractedName.nameComponents;
    extractedNameStr = extractedName.name || (nameComponents ? nameComponents.firstAndLast : null);
  }

  // Helper: token-based similarity ignoring order (useful for multi-name IDs)
  const tokenMatchScore = (idValue = '', regFirst = '', regLast = '') => {
    const idTokens = new Set(
      normalizeForComparison(idValue)
        .split(' ')
        .filter(Boolean)
    );
    const regTokens = new Set(
      `${normalizeForComparison(regFirst)} ${normalizeForComparison(regLast)}`
        .trim()
        .split(' ')
        .filter(Boolean)
    );

    if (idTokens.size === 0 || regTokens.size === 0) return 0;

    let matches = 0;
    for (const token of regTokens) {
      if (idTokens.has(token)) {
        matches += 1;
      }
    }
    return (matches / regTokens.size) * 100;
  };

  if (!extractedNameStr) {
    return {
      isMatch: false,
      confidence: 0,
      reason: 'No name extracted from ID'
    };
  }

  if (!registrationFirstName && !registrationLastName) {
    return {
      isMatch: false,
      confidence: 0,
      reason: 'No registration name provided'
    };
  }

  // Normalize registration names
  const normalizedFirst = normalizeForComparison(registrationFirstName || '');
  const normalizedLast = normalizeForComparison(registrationLastName || '');
  const registrationFull = `${normalizedFirst} ${normalizedLast}`.trim();
  
  // Split first name in case user entered multiple names (e.g., "KEVIN MILES")
  const firstNames = normalizedFirst.split(/\s+/);
  const firstGivenName = firstNames[0]; // Just the first given name

  // Try multiple matching strategies
  const comparisons = [];

  // If we have name components from Philippine ID, use them for better matching
  if (nameComponents) {
    const { lastName, givenNames, middleName, fullName, firstAndLast, firstGivenName: idFirstGiven } = nameComponents;

    // Strategy 1: Match first and last name (ignoring middle name)
    if (lastName && givenNames) {
      const idFirstAndLast = `${givenNames} ${lastName}`;
      const similarity1 = calculateSimilarity(idFirstAndLast, registrationFull);
      const jaro1 = jaroWinkler(idFirstAndLast, registrationFull) * 100;
      comparisons.push({
        type: 'first_last_match',
        levenshtein: similarity1,
        jaro: jaro1,
        average: (similarity1 + jaro1) / 2
      });
    }

    // Strategy 2: Match just first given name + last name (handles "KEVIN" vs "KEVIN MILES")
    if (lastName && idFirstGiven) {
      const idFirstLast = `${idFirstGiven} ${lastName}`;
      const similarity2 = calculateSimilarity(idFirstLast, registrationFull);
      const jaro2 = jaroWinkler(idFirstLast, registrationFull) * 100;
      comparisons.push({
        type: 'first_given_last_match',
        levenshtein: similarity2,
        jaro: jaro2,
        average: (similarity2 + jaro2) / 2
      });
    }

    // Strategy 3: Match last name only (strong indicator)
    if (lastName && normalizedLast) {
      const similarity3 = calculateSimilarity(lastName, normalizedLast);
      const jaro3 = jaroWinkler(lastName, normalizedLast) * 100;
      comparisons.push({
        type: 'last_name_match',
        levenshtein: similarity3,
        jaro: jaro3,
        average: (similarity3 + jaro3) / 2,
        weight: 0.8 // Slightly lower weight for last name only
      });
    }

    // Strategy 4: Match first given name only
    if (idFirstGiven && firstGivenName) {
      const similarity4 = calculateSimilarity(idFirstGiven, firstGivenName);
      const jaro4 = jaroWinkler(idFirstGiven, firstGivenName) * 100;
      comparisons.push({
        type: 'first_name_match',
        levenshtein: similarity4,
        jaro: jaro4,
        average: (similarity4 + jaro4) / 2,
        weight: 0.7 // Lower weight for first name only
      });
    }

    // Strategy 5: Match full name including middle name (if registration has it)
    if (fullName) {
      const similarity5 = calculateSimilarity(fullName, registrationFull);
      const jaro5 = jaroWinkler(fullName, registrationFull) * 100;
      comparisons.push({
        type: 'full_name_match',
        levenshtein: similarity5,
        jaro: jaro5,
        average: (similarity5 + jaro5) / 2
      });

      // Token-based match ignoring order
      const tokenScore = tokenMatchScore(fullName, registrationFirstName, registrationLastName);
      comparisons.push({
        type: 'token_match_full',
        levenshtein: tokenScore,
        jaro: tokenScore,
        average: tokenScore,
        weight: 0.95
      });
    }
  }

  // Fallback: Use extracted name string for matching (for non-Philippine IDs)
  const normalizedExtracted = normalizeForComparison(extractedNameStr);
  const normalizedFull = registrationFull;
  const normalizedReverse = `${normalizedLast} ${normalizedFirst}`.trim();

  // Strategy 6: Full name match (First + Last)
  if (normalizedFull.length > 0) {
    const similarity6 = calculateSimilarity(normalizedExtracted, normalizedFull);
    const jaro6 = jaroWinkler(normalizedExtracted, normalizedFull) * 100;
    comparisons.push({
      type: 'full_name_string',
      levenshtein: similarity6,
      jaro: jaro6,
      average: (similarity6 + jaro6) / 2
    });

    const tokenScoreString = tokenMatchScore(normalizedExtracted, registrationFirstName, registrationLastName);
    comparisons.push({
      type: 'token_match_string',
      levenshtein: tokenScoreString,
      jaro: tokenScoreString,
      average: tokenScoreString,
      weight: 0.95
    });
  }

  // Strategy 7: Reverse name match (Last + First)
  if (normalizedReverse.length > 0) {
    const similarity7 = calculateSimilarity(normalizedExtracted, normalizedReverse);
    const jaro7 = jaroWinkler(normalizedExtracted, normalizedReverse) * 100;
    comparisons.push({
      type: 'reverse_name_string',
      levenshtein: similarity7,
      jaro: jaro7,
      average: (similarity7 + jaro7) / 2
    });
  }

  // Strategy 8: Last name only match
  if (normalizedLast.length > 0) {
    const similarity8 = calculateSimilarity(normalizedExtracted, normalizedLast);
    const jaro8 = jaroWinkler(normalizedExtracted, normalizedLast) * 100;
    comparisons.push({
      type: 'last_name_string',
      levenshtein: similarity8,
      jaro: jaro8,
      average: (similarity8 + jaro8) / 2,
      weight: 0.8
    });
  }

  // Strategy 9: First name only match
  if (firstGivenName.length > 0) {
    const similarity9 = calculateSimilarity(normalizedExtracted, firstGivenName);
    const jaro9 = jaroWinkler(normalizedExtracted, firstGivenName) * 100;
    comparisons.push({
      type: 'first_name_string',
      levenshtein: similarity9,
      jaro: jaro9,
      average: (similarity9 + jaro9) / 2,
      weight: 0.7
    });
  }

  // Find the best match (apply weight if available)
  if (comparisons.length === 0) {
    return {
      isMatch: false,
      confidence: 0,
      reason: 'No valid comparison could be made'
    };
  }

  // Apply weights and find best match
  const weightedComparisons = comparisons.map(comp => ({
    ...comp,
    weightedAverage: comp.weight ? comp.average * comp.weight : comp.average
  }));

  const bestMatch = weightedComparisons.reduce((best, current) => 
    current.weightedAverage > best.weightedAverage ? current : best
  );

  // Use weighted average for matching, but report actual average
  const matchThreshold = bestMatch.weight ? threshold * 0.9 : threshold; // Lower threshold for partial matches
  const isMatch = bestMatch.weightedAverage >= matchThreshold;

  return {
    isMatch,
    confidence: Math.round(bestMatch.average * 100) / 100,
    weightedConfidence: Math.round(bestMatch.weightedAverage * 100) / 100,
    method: bestMatch.type,
    levenshteinScore: Math.round(bestMatch.levenshtein * 100) / 100,
    jaroScore: Math.round(bestMatch.jaro * 100) / 100,
    reason: isMatch 
      ? `Name matches with ${bestMatch.average.toFixed(2)}% confidence (${bestMatch.type})`
      : `Name does not meet threshold (${bestMatch.average.toFixed(2)}% < ${threshold}%)`
  };
}

/**
 * Check if location contains San Pablo
 * @param {string} location - Location/address string from OCR
 * @returns {Object} Match result with isMatch and details
 */
export function matchSanPabloLocation(location) {
  if (!location) {
    return {
      isMatch: false,
      confidence: 0,
      reason: 'No location found in ID'
    };
  }

  const normalizedLocation = location.toUpperCase().trim();
  
  // Check for various San Pablo patterns
  const sanPabloPatterns = [
    /SAN\s*PABLO/i,                                    // Just "San Pablo"
    /SAN\s*PABLO[,\s]+(?:POB\.?|POBLACION)/i,         // "San Pablo, Pob." or "San Pablo Poblacion"
    /SAN\s*PABLO[,\s]+CASTILLEJOS/i,                  // "San Pablo, Castillejos"
    /SAN\s*PABLO[,\s]+CASTILLEJOS[,\s]+ZAMBALES/i,   // "San Pablo, Castillejos, Zambales"
    /PUROK[,\s]+.*SAN\s*PABLO/i,                     // "Purok X, San Pablo"
    /SAN\s*PABLO[,\s]+\(POB\.?\)/i                    // "San Pablo (Pob.)"
  ];

  for (const pattern of sanPabloPatterns) {
    if (pattern.test(normalizedLocation)) {
      return {
        isMatch: true,
        confidence: 100,
        reason: 'Location matches San Pablo requirement',
        matchedPattern: pattern.toString()
      };
    }
  }

  // Fuzzy match: check if "SAN PABLO" appears anywhere in the location
  if (normalizedLocation.includes('SAN PABLO')) {
    return {
      isMatch: true,
      confidence: 95,
      reason: 'Location contains San Pablo',
      matchedPattern: 'fuzzy_match'
    };
  }

  return {
    isMatch: false,
    confidence: 0,
    reason: 'Location does not contain San Pablo'
  };
}

/**
 * Verify ID data against registration data
 * @param {Object} extractedData - Data extracted from OCR (name, idNumber, location, nameComponents)
 * @param {Object} registrationData - Registration data (firstName, lastName)
 * @param {Object} options - Matching options
 * @returns {Object} Verification result
 */
export function verifyIdData(extractedData, registrationData, options = {}) {
  const {
    nameThreshold = 75, // Lowered from 85 to 75 for better matching with Philippine IDs
    requireIdNumber = false,
    requireLocation = false,
    requireSanPablo = false // New option to require San Pablo location
  } = options;

  const results = {
    verified: false,
    confidence: 0,
    nameMatch: null,
    locationMatch: null,
    idNumberFound: !!extractedData.idNumber,
    locationFound: !!extractedData.location,
    reasons: []
  };

  // Match name (required) - pass full extractedData to allow access to nameComponents
  const nameMatch = matchName(
    extractedData, // Pass full object to access nameComponents
    registrationData.firstName,
    registrationData.lastName,
    nameThreshold
  );

  results.nameMatch = nameMatch;

  // Check if name matches
  if (!nameMatch.isMatch) {
    results.reasons.push(`Name mismatch: ${nameMatch.reason}`);
    return results;
  }

  // Check location requirements
  if (requireLocation || requireSanPablo) {
    if (!extractedData.location) {
      results.reasons.push('Location not found in ID image');
      return results;
    }

    // If San Pablo is required, verify it
    if (requireSanPablo) {
      const locationMatch = matchSanPabloLocation(extractedData.location);
      results.locationMatch = locationMatch;

      if (!locationMatch.isMatch) {
        results.reasons.push(`Location requirement not met: ${locationMatch.reason}. Must be a resident of San Pablo, Castillejos, Zambales.`);
        return results;
      }
    }
  }

  // Check optional requirements
  if (requireIdNumber && !extractedData.idNumber) {
    results.reasons.push('ID number not found in image');
  }

  // Calculate overall confidence
  let confidence = nameMatch.confidence;
  if (results.locationMatch && results.locationMatch.isMatch) {
    // Average name and location confidence
    confidence = (nameMatch.confidence + results.locationMatch.confidence) / 2;
  }
  results.confidence = confidence;
  
  // If all required checks pass, verify
  const allChecksPass = nameMatch.isMatch && 
    (!requireIdNumber || extractedData.idNumber) &&
    (!requireLocation || extractedData.location) &&
    (!requireSanPablo || (results.locationMatch && results.locationMatch.isMatch));

  results.verified = allChecksPass;

  if (results.verified) {
    results.reasons.push('All verification checks passed');
  }

  return results;
}

