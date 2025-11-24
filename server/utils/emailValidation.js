/**
 * Server-side email validation utilities
 * Provides robust email validation for backend endpoints
 */

/**
 * Validates a general email address format
 * Uses a more robust regex that follows RFC 5322 standards more closely
 * 
 * @param {string} email - The email address to validate
 * @returns {boolean} true if the email format is valid, false otherwise
 */
function isValidEmail(email) {
  if (!email || typeof email !== 'string') {
    return false;
  }

  // Trim whitespace
  const trimmedEmail = email.trim();
  
  // Basic length checks
  if (trimmedEmail.length === 0 || trimmedEmail.length > 254) {
    return false;
  }

  // More robust email regex that:
  // - Prevents leading/trailing dots
  // - Prevents consecutive dots
  // - Validates proper domain structure
  // - Ensures TLD is at least 2 characters
  // - Prevents invalid characters
  const emailRegex = /^(?!\.)(?!.*\.\.)(?!.*\.$)([a-zA-Z0-9!#$%&'*+\-/=?^_`{|}~]+(\.[a-zA-Z0-9!#$%&'*+\-/=?^_`{|}~]+)*)@([a-zA-Z0-9]([a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}$/;
  
  if (!emailRegex.test(trimmedEmail)) {
    return false;
  }

  // Additional checks
  const [localPart, domain] = trimmedEmail.split('@');
  
  // Local part validation
  if (!localPart || localPart.length > 64) {
    return false;
  }
  
  // Domain validation
  if (!domain || domain.length > 253) {
    return false;
  }
  
  // Ensure domain has at least one dot (has TLD)
  if (!domain.includes('.')) {
    return false;
  }
  
  // Ensure domain doesn't start or end with dot or hyphen
  if (domain.startsWith('.') || domain.endsWith('.') || 
      domain.startsWith('-') || domain.endsWith('-')) {
    return false;
  }
  
  return true;
}

/**
 * Validates if an email is a Gmail address
 * 
 * @param {string} email - The email address to validate
 * @returns {boolean} true if the email is a valid Gmail address, false otherwise
 */
function isValidGmail(email) {
  if (!isValidEmail(email)) {
    return false;
  }

  const trimmedEmail = email.trim().toLowerCase();
  
  // Check if it ends with @gmail.com
  if (!trimmedEmail.endsWith('@gmail.com')) {
    return false;
  }
  
  // Extract local part
  const localPart = trimmedEmail.split('@')[0];
  
  // Gmail local part rules:
  // - Must be between 1 and 64 characters
  // - Can contain letters, numbers, dots, and plus signs
  // - Cannot start or end with a dot
  // - Cannot have consecutive dots
  if (!localPart || localPart.length === 0 || localPart.length > 64) {
    return false;
  }
  
  // Check for invalid patterns
  if (localPart.startsWith('.') || localPart.endsWith('.')) {
    return false;
  }
  
  if (localPart.includes('..')) {
    return false;
  }
  
  // Gmail allows: letters, numbers, dots, plus signs
  // Note: Gmail ignores dots and treats everything before + as the base address
  const gmailLocalPartRegex = /^[a-z0-9.+]+$/;
  if (!gmailLocalPartRegex.test(localPart)) {
    return false;
  }
  
  return true;
}

/**
 * Validates email and returns a detailed error message if invalid
 * 
 * @param {string} email - The email address to validate
 * @param {boolean} requireGmail - Whether to require Gmail addresses only
 * @returns {Object} Object with isValid boolean and error message string
 */
function validateEmail(email, requireGmail = false) {
  if (!email || typeof email !== 'string') {
    return { isValid: false, error: 'Email is required' };
  }

  const trimmedEmail = email.trim();
  
  if (trimmedEmail.length === 0) {
    return { isValid: false, error: 'Email cannot be empty' };
  }

  if (trimmedEmail.length > 254) {
    return { isValid: false, error: 'Email address is too long (maximum 254 characters)' };
  }

  if (!isValidEmail(trimmedEmail)) {
    return { isValid: false, error: 'Invalid email format' };
  }

  if (requireGmail && !isValidGmail(trimmedEmail)) {
    return { isValid: false, error: 'Only Gmail addresses (@gmail.com) are accepted' };
  }

  return { isValid: true, error: '' };
}

export {
  isValidEmail,
  isValidGmail,
  validateEmail
};

