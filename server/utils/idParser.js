/**
 * ID Parser - Extracts structured data from OCR text
 * Handles various Philippine ID card formats and OCR variations
 * 
 * Supported Philippine ID Types:
 * - Philippine National ID (Pambansang Pagkakakilanlan)
 * - Driver's License (LTO)
 * - Postal ID (PHLPost)
 * - SSS ID (Social Security System)
 * - TIN ID (Tax Identification Number)
 * - PhilHealth ID (Philippine Health Insurance Corporation)
 * - Voter's ID (COMELEC)
 * - Senior Citizen ID
 * - PWD ID (Persons with Disabilities)
 * - School ID
 * - Company ID
 * - And other government-issued identification cards
 */

/**
 * Normalize text for comparison (remove special chars, uppercase, trim)
 * @param {string} text - Text to normalize
 * @returns {string} Normalized text
 */
function normalizeText(text) {
  if (!text) return '';
  return text
    .toUpperCase()
    .trim()
    .replace(/[^\w\s]/g, '') // Remove special characters
    .replace(/\s+/g, ' ') // Normalize whitespace
    .trim();
}

/**
 * Extract full name from OCR text
 * Handles multiple Philippine ID formats:
 * - Philippine National ID (APELYIDO, MGA PANGALAN, GITNANG APELYIDO)
 * - Driver's License (LAST NAME, FIRST NAME, MIDDLE NAME)
 * - Postal ID (SURNAME, GIVEN NAME)
 * - SSS ID, TIN ID, PhilHealth ID (NAME, MEMBER NAME)
 * - Voter's ID (LAST NAME, FIRST NAME)
 * - And other government-issued IDs
 * @param {string} ocrText - Full OCR extracted text
 * @returns {Object|null} Extracted name components or null if not found
 */
export function extractNameComponents(ocrText) {
  if (!ocrText) return null;

  // Pattern 1: Philippine National ID format
  // APELYIDO/LAST NAME
  const phNatLastNamePattern = /(?:APELYIDO|LAST\s*NAME|SURNAME)[\s:/]*([A-Z\s]{2,})/i;
  const phNatLastNameMatch = ocrText.match(phNatLastNamePattern);
  
  // MGA PANGALAN/GIVEN NAMES (can be multiple names like "KEVIN MILES")
  const phNatGivenNamesPattern = /(?:MGA\s*PANGALAN|GIVEN\s*NAMES)[\s:/]*([A-Z\s]{2,})/i;
  const phNatGivenNamesMatch = ocrText.match(phNatGivenNamesPattern);
  
  // GITNANG APELYIDO/MIDDLE NAME
  const phNatMiddleNamePattern = /(?:GITNANG\s*APELYIDO|MIDDLE\s*NAME)[\s:/]*([A-Z\s]{2,})/i;
  const phNatMiddleNameMatch = ocrText.match(phNatMiddleNamePattern);

  // Pattern 2: Driver's License format
  const dlLastNamePattern = /(?:LAST\s*NAME|SURNAME)[\s:]*([A-Z\s]{2,})/i;
  const dlFirstNamePattern = /(?:FIRST\s*NAME|GIVEN\s*NAME)[\s:]*([A-Z\s]{2,})/i;
  const dlMiddleNamePattern = /(?:MIDDLE\s*NAME|MIDDLE\s*INITIAL)[\s:]*([A-Z\s]{1,})/i;
  const dlLastNameMatch = ocrText.match(dlLastNamePattern);
  const dlFirstNameMatch = ocrText.match(dlFirstNamePattern);
  const dlMiddleNameMatch = ocrText.match(dlMiddleNamePattern);

  // Pattern 3: Postal ID format
  const postalSurnamePattern = /(?:SURNAME)[\s:]*([A-Z\s]{2,})/i;
  const postalGivenNamePattern = /(?:GIVEN\s*NAME)[\s:]*([A-Z\s]{2,})/i;
  const postalSurnameMatch = ocrText.match(postalSurnamePattern);
  const postalGivenNameMatch = ocrText.match(postalGivenNamePattern);

  // Pattern 4: Generic NAME field (for SSS, TIN, PhilHealth, etc.)
  const genericNamePattern = /(?:NAME|MEMBER\s*NAME|FULL\s*NAME)[\s:]*([A-Z\s]{3,})/i;
  const genericNameMatch = ocrText.match(genericNamePattern);

  // Pattern 5: Voter's ID format
  const voterLastNamePattern = /(?:LAST\s*NAME)[\s:]*([A-Z\s]{2,})/i;
  const voterFirstNamePattern = /(?:FIRST\s*NAME)[\s:]*([A-Z\s]{2,})/i;
  const voterLastNameMatch = ocrText.match(voterLastNamePattern);
  const voterFirstNameMatch = ocrText.match(voterFirstNamePattern);

  // Extract values with priority: Philippine National ID > Driver's License > Postal > Generic > Voter's
  let lastName = null;
  let givenNames = null;
  let middleName = null;
  let fullName = null;

  // Try Philippine National ID format first
  if (phNatLastNameMatch || phNatGivenNamesMatch) {
    lastName = phNatLastNameMatch ? normalizeText(phNatLastNameMatch[1]) : null;
    givenNames = phNatGivenNamesMatch ? normalizeText(phNatGivenNamesMatch[1]) : null;
    middleName = phNatMiddleNameMatch ? normalizeText(phNatMiddleNameMatch[1]) : null;
  }
  // Try Driver's License format
  else if (dlLastNameMatch || dlFirstNameMatch) {
    lastName = dlLastNameMatch ? normalizeText(dlLastNameMatch[1]) : null;
    givenNames = dlFirstNameMatch ? normalizeText(dlFirstNameMatch[1]) : null;
    middleName = dlMiddleNameMatch ? normalizeText(dlMiddleNameMatch[1]) : null;
  }
  // Try Postal ID format
  else if (postalSurnameMatch || postalGivenNameMatch) {
    lastName = postalSurnameMatch ? normalizeText(postalSurnameMatch[1]) : null;
    givenNames = postalGivenNameMatch ? normalizeText(postalGivenNameMatch[1]) : null;
  }
  // Try Voter's ID format
  else if (voterLastNameMatch || voterFirstNameMatch) {
    lastName = voterLastNameMatch ? normalizeText(voterLastNameMatch[1]) : null;
    givenNames = voterFirstNameMatch ? normalizeText(voterFirstNameMatch[1]) : null;
  }
  // Try generic NAME field (for SSS, TIN, PhilHealth, etc.)
  else if (genericNameMatch) {
    fullName = normalizeText(genericNameMatch[1]);
    // Try to split full name into parts (last word is usually last name)
    const nameParts = fullName.split(/\s+/);
    if (nameParts.length >= 2) {
      lastName = nameParts[nameParts.length - 1];
      givenNames = nameParts.slice(0, -1).join(' ');
    } else {
      givenNames = fullName;
    }
  }

  // If we have at least last name or given names, return components
  if (lastName || givenNames || fullName) {
    return {
      lastName,
      givenNames,
      middleName,
      fullName: fullName || [givenNames, middleName, lastName].filter(Boolean).join(' '),
      // Build full name variations for matching
      firstAndLast: [givenNames, lastName].filter(Boolean).join(' ') || fullName,
      // Just first given name (in case user only entered first name)
      firstGivenName: givenNames ? givenNames.split(/\s+/)[0] : (fullName ? fullName.split(/\s+/)[0] : null)
    };
  }

  return null;
}

/**
 * Extract full name from OCR text (legacy function for backward compatibility)
 * Works with all Philippine ID formats by using extractNameComponents
 * @param {string} ocrText - Full OCR extracted text
 * @returns {string|null} Extracted name or null if not found
 */
export function extractName(ocrText) {
  if (!ocrText) return null;

  // Use the enhanced extractNameComponents which handles all ID formats
  const components = extractNameComponents(ocrText);
  if (components) {
    // Return first and last name combination (most common for matching)
    return components.firstAndLast || components.fullName;
  }

  // Fallback: Try generic patterns
  const normalizedText = normalizeText(ocrText);
  const lines = normalizedText.split('\n').map(line => line.trim()).filter(line => line.length > 0);

  // Pattern 1: Look for "LAST NAME" or "SURNAME" followed by name
  const lastNamePattern = /(?:LAST\s*NAME|SURNAME|APELYIDO)[\s:]*([A-Z\s]{3,})/i;
  const lastNameMatch = ocrText.match(lastNamePattern);
  
  // Pattern 2: Look for "FIRST NAME" or "GIVEN NAME" followed by name
  const firstNamePattern = /(?:FIRST\s*NAME|GIVEN\s*NAME|PANGALAN)[\s:]*([A-Z\s]{3,})/i;
  const firstNameMatch = ocrText.match(firstNamePattern);

  // Pattern 3: Look for "FULL NAME" or "NAME" followed by name
  const fullNamePattern = /(?:FULL\s*NAME|NAME|MEMBER\s*NAME)[\s:]*([A-Z\s]{3,})/i;
  const fullNameMatch = ocrText.match(fullNamePattern);

  // Pattern 4: Look for lines that look like names (2-4 words, all caps, no numbers)
  const nameLinePattern = /^[A-Z][A-Z\s]{2,30}$/;
  const potentialNames = lines.filter(line => {
    const words = line.split(/\s+/);
    return words.length >= 2 && 
           words.length <= 4 && 
           nameLinePattern.test(line) &&
           !/\d/.test(line) && // No digits
           !/(?:REPUBLIC|PHILIPPINES|ID|CARD|NO|NUMBER|DATE|BIRTH|ADDRESS|LICENSE|SSS|TIN|PHILHEALTH)/i.test(line); // Exclude common ID keywords
  });

  // Try to combine first and last name
  if (lastNameMatch && firstNameMatch) {
    const lastName = normalizeText(lastNameMatch[1]);
    const firstName = normalizeText(firstNameMatch[1]);
    return `${firstName} ${lastName}`.trim();
  }

  // Use full name if found
  if (fullNameMatch) {
    return normalizeText(fullNameMatch[1]);
  }

  // Use last name if found
  if (lastNameMatch) {
    return normalizeText(lastNameMatch[1]);
  }

  // Use first name if found
  if (firstNameMatch) {
    return normalizeText(firstNameMatch[1]);
  }

  // Use first potential name line (usually the most prominent)
  if (potentialNames.length > 0) {
    return normalizeText(potentialNames[0]);
  }

  return null;
}

/**
 * Extract ID number from OCR text
 * Handles multiple Philippine ID formats:
 * - Philippine National ID (ID NO, DIGITAL ID NUMBER)
 * - Driver's License (LICENSE NO, DL NO)
 * - Postal ID (POSTAL ID NO)
 * - SSS ID (SSS NO)
 * - TIN ID (TIN)
 * - PhilHealth ID (PIN, PHIC NO)
 * - Voter's ID (VOTER'S ID NO)
 * - And other government-issued IDs
 * @param {string} ocrText - Full OCR extracted text
 * @returns {string|null} Extracted ID number or null if not found
 */
export function extractIdNumber(ocrText) {
  if (!ocrText) return null;

  // Pattern 1: Philippine National ID - "ID NO", "DIGITAL ID NUMBER"
  const phNatIdPattern = /(?:ID\s*NO|ID\s*NUMBER|DIGITAL\s*ID\s*NUMBER|ID\s*NO\.)[\s:]*([A-Z0-9\-]{5,})/i;
  const phNatIdMatch = ocrText.match(phNatIdPattern);

  // Pattern 2: Driver's License - "LICENSE NO", "DL NO", "DRIVER'S LICENSE NO"
  const dlPattern = /(?:LICENSE\s*NO|DL\s*NO|DRIVER['S]?\s*LICENSE\s*NO|LICENSE\s*NUMBER)[\s:]*([A-Z0-9\-]{5,})/i;
  const dlMatch = ocrText.match(dlPattern);

  // Pattern 3: Postal ID - "POSTAL ID NO"
  const postalIdPattern = /(?:POSTAL\s*ID\s*NO|POSTAL\s*ID\s*NUMBER)[\s:]*([A-Z0-9\-]{5,})/i;
  const postalIdMatch = ocrText.match(postalIdPattern);

  // Pattern 4: SSS ID - "SSS NO"
  const sssPattern = /(?:SSS\s*NO|SSS\s*NUMBER|SSS\s*ID)[\s:]*([0-9\-]{8,})/i;
  const sssMatch = ocrText.match(sssPattern);

  // Pattern 5: TIN ID - "TIN"
  const tinPattern = /(?:TIN|TAX\s*IDENTIFICATION\s*NUMBER)[\s:]*([0-9\-]{9,})/i;
  const tinMatch = ocrText.match(tinPattern);

  // Pattern 6: PhilHealth ID - "PIN", "PHIC NO"
  const philhealthPattern = /(?:PIN|PHIC\s*NO|PHILHEALTH\s*ID\s*NO)[\s:]*([0-9\-]{10,})/i;
  const philhealthMatch = ocrText.match(philhealthPattern);

  // Pattern 7: Voter's ID - "VOTER'S ID NO"
  const voterIdPattern = /(?:VOTER['S]?\s*ID\s*NO|VOTER['S]?\s*ID\s*NUMBER)[\s:]*([A-Z0-9\-]{5,})/i;
  const voterIdMatch = ocrText.match(voterIdPattern);

  // Pattern 8: Generic - "CONTROL NO", "SERIAL NO"
  const controlNoPattern = /(?:CONTROL\s*NO|CONTROL\s*NUMBER|CONTROL\s*NO\.)[\s:]*([A-Z0-9\-]{5,})/i;
  const controlNoMatch = ocrText.match(controlNoPattern);

  const serialNoPattern = /(?:SERIAL\s*NO|SERIAL\s*NUMBER|SERIAL\s*NO\.)[\s:]*([A-Z0-9\-]{5,})/i;
  const serialNoMatch = ocrText.match(serialNoPattern);

  // Pattern 9: Generic "ID NO" or "NUMBER"
  const genericIdPattern = /(?:ID\s*NO|ID\s*NUMBER|NUMBER)[\s:]*([A-Z0-9\-]{5,})/i;
  const genericIdMatch = ocrText.match(genericIdPattern);

  // Priority: Specific ID types > Generic patterns
  if (phNatIdMatch) {
    return phNatIdMatch[1].trim().toUpperCase();
  }
  if (dlMatch) {
    return dlMatch[1].trim().toUpperCase();
  }
  if (postalIdMatch) {
    return postalIdMatch[1].trim().toUpperCase();
  }
  if (sssMatch) {
    return sssMatch[1].trim();
  }
  if (tinMatch) {
    return tinMatch[1].trim();
  }
  if (philhealthMatch) {
    return philhealthMatch[1].trim();
  }
  if (voterIdMatch) {
    return voterIdMatch[1].trim().toUpperCase();
  }
  if (controlNoMatch) {
    return controlNoMatch[1].trim().toUpperCase();
  }
  if (serialNoMatch) {
    return serialNoMatch[1].trim().toUpperCase();
  }
  if (genericIdMatch) {
    return genericIdMatch[1].trim().toUpperCase();
  }

  // Fallback: Look for long alphanumeric strings (8+ characters) that might be ID numbers
  const longAlphanumericPattern = /\b([A-Z0-9\-]{8,})\b/g;
  const longMatches = ocrText.match(longAlphanumericPattern);

  if (longMatches && longMatches.length > 0) {
    // Filter out common false positives (dates, etc.)
    const filtered = longMatches.filter(match => {
      // Exclude if it looks like a date (YYYY-MM-DD or similar)
      if (/^\d{4}[-/]\d{2}[-/]\d{2}/.test(match)) return false;
      // Exclude if it's all digits and too short
      if (/^\d+$/.test(match) && match.length < 10) return false;
      // Exclude if it's clearly not an ID (e.g., phone numbers with dashes)
      if (/^\d{3}-\d{3}-\d{4}$/.test(match)) return false;
      return true;
    });
    if (filtered.length > 0) {
      return filtered[0].trim().toUpperCase();
    }
  }

  return null;
}

/**
 * Extract location/address from OCR text
 * Handles multiple Philippine ID formats:
 * - Philippine National ID (TIRAHAN/ADDRESS)
 * - Driver's License (ADDRESS)
 * - Postal ID (ADDRESS)
 * - SSS ID, TIN ID, PhilHealth ID (ADDRESS, RESIDENCE)
 * - Voter's ID (ADDRESS)
 * - And other government-issued IDs
 * @param {string} ocrText - Full OCR extracted text
 * @returns {string|null} Extracted location or null if not found
 */
export function extractLocation(ocrText) {
  if (!ocrText) return null;

  // Pattern 1: Philippine National ID format - "TIRAHAN/ADDRESS"
  const phNatAddressPattern = /(?:TIRAHAN|ADDRESS|ADRESA)[\s:/]*([A-Z0-9\s,\.\-\(\)]{10,})/i;
  const phNatAddressMatch = ocrText.match(phNatAddressPattern);

  // Pattern 2: Driver's License format - "ADDRESS" or "RESIDENCE"
  const dlAddressPattern = /(?:ADDRESS|RESIDENCE|RES\.)[\s:]*([A-Z0-9\s,\.\-\(\)]{10,})/i;
  const dlAddressMatch = ocrText.match(dlAddressPattern);

  // Pattern 3: Postal ID format - "ADDRESS"
  const postalAddressPattern = /(?:ADDRESS)[\s:]*([A-Z0-9\s,\.\-\(\)]{10,})/i;
  const postalAddressMatch = ocrText.match(postalAddressPattern);

  // Pattern 4: Generic address patterns (SSS, TIN, PhilHealth, Voter's ID, etc.)
  const genericAddressPattern = /(?:ADDRESS|RESIDENCE|RES\.|HOME\s*ADDRESS)[\s:]*([A-Z0-9\s,\.\-\(\)]{10,})/i;
  const genericAddressMatch = ocrText.match(genericAddressPattern);

  // Pattern 5: Look for "CITY" or "MUNICIPALITY" followed by city name
  const cityPattern = /(?:CITY|MUNICIPALITY|LUNGSOD|BAYAN)[\s:]*([A-Z\s]{3,})/i;
  const cityMatch = ocrText.match(cityPattern);

  // Pattern 6: Look for "PROVINCE" followed by province name
  const provincePattern = /(?:PROVINCE|PROBINSYA|LALAWIGAN)[\s:]*([A-Z\s]{3,})/i;
  const provinceMatch = ocrText.match(provincePattern);

  // Pattern 7: Look for "SAN PABLO" specifically (case-insensitive)
  const sanPabloPattern = /(SAN\s*PABLO[,\s]*(?:POB\.?|POBLACION)?[,\s]*(?:CASTILLEJOS)?[,\s]*(?:ZAMBALES)?)/i;
  const sanPabloMatch = ocrText.match(sanPabloPattern);

  // Priority: ADDRESS patterns > SAN PABLO pattern > CITY > PROVINCE
  let address = null;

  // Try Philippine National ID format first
  if (phNatAddressMatch) {
    address = phNatAddressMatch[1];
  }
  // Try Driver's License format
  else if (dlAddressMatch) {
    address = dlAddressMatch[1];
  }
  // Try Postal ID format
  else if (postalAddressMatch) {
    address = postalAddressMatch[1];
  }
  // Try generic address pattern
  else if (genericAddressMatch) {
    address = genericAddressMatch[1];
  }

  if (address) {
    const normalizedAddress = normalizeText(address);
    // Take first 150 characters to capture full address including San Pablo
    return normalizedAddress.substring(0, 150).trim();
  }

  // If San Pablo pattern found, return it
  if (sanPabloMatch) {
    return normalizeText(sanPabloMatch[1]);
  }

  if (cityMatch) {
    return normalizeText(cityMatch[1]);
  }

  if (provinceMatch) {
    return normalizeText(provinceMatch[1]);
  }

  // Fallback: Look for "SAN PABLO" anywhere in the text
  const normalizedText = normalizeText(ocrText);
  if (normalizedText.includes('SAN PABLO')) {
    // Try to extract context around San Pablo (up to 50 chars before and after)
    const sanPabloContext = /([A-Z0-9\s,\.\-]{0,50}SAN\s*PABLO[,\s]*(?:POB\.?|POBLACION)?[,\s]*(?:CASTILLEJOS)?[,\s]*(?:ZAMBALES)?[A-Z0-9\s,\.\-]{0,50})/i;
    const contextMatch = ocrText.match(sanPabloContext);
    if (contextMatch) {
      return normalizeText(contextMatch[1]);
    }
    return 'SAN PABLO';
  }

  return null;
}

/**
 * Parse OCR text and extract all relevant fields
 * @param {string} ocrText - Full OCR extracted text
 * @returns {Object} Parsed ID data with name, idNumber, and location
 */
export function parseIdData(ocrText) {
  if (!ocrText) {
    return {
      name: null,
      nameComponents: null,
      idNumber: null,
      location: null,
      rawText: ''
    };
  }

  const nameComponents = extractNameComponents(ocrText);
  const name = nameComponents ? nameComponents.firstAndLast : extractName(ocrText);

  return {
    name: name,
    nameComponents: nameComponents, // Include components for better matching
    idNumber: extractIdNumber(ocrText),
    location: extractLocation(ocrText),
    rawText: ocrText
  };
}

