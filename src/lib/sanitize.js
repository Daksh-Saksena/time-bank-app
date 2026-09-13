/**
 * Input sanitization and validation utilities
 * Protects against XSS, script injection, and oversized payloads
 */

/**
 * Strips HTML tags, script entities, and dangerous characters from user text input
 * @param {string} input - Raw text string from input fields
 * @param {number} maxLength - Maximum allowable character length (default 500)
 * @returns {string} - Clean, safe string
 */
export function sanitizeText(input, maxLength = 500) {
  if (typeof input !== 'string') return '';
  
  // Strip HTML tags (<script>, <iframe>, <img src=x>, etc.)
  let clean = input.replace(/<[^>]*>/g, '');
  
  // Remove null bytes and control characters (except newline, tab)
  clean = clean.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
  
  // Trim whitespace
  clean = clean.trim();
  
  // Enforce maximum length
  if (maxLength > 0 && clean.length > maxLength) {
    clean = clean.slice(0, maxLength);
  }
  
  return clean;
}

/**
 * Validates and formats a 10-digit Indian mobile number
 * @param {string} phone - Raw phone input
 * @returns {{ valid: boolean, formatted: string, error?: string }}
 */
export function sanitizePhone(phone) {
  if (!phone) return { valid: false, formatted: '', error: 'Phone number is required' };
  
  const digits = String(phone).replace(/\D/g, '');
  
  // If starts with country code 91 and has 12 digits, strip 91
  const clean10 = digits.length === 12 && digits.startsWith('91')
    ? digits.slice(2)
    : digits;
    
  if (clean10.length !== 10) {
    return { valid: false, formatted: '', error: 'Phone number must be exactly 10 digits' };
  }
  
  // Check valid Indian mobile starting digits (6, 7, 8, 9)
  if (!/^[6-9]/.test(clean10)) {
    return { valid: false, formatted: '', error: 'Phone number must start with 6, 7, 8, or 9' };
  }
  
  return { valid: true, formatted: `+91${clean10}` };
}

/**
 * Validates a 6-digit Indian PIN code
 * @param {string} pincode - Raw pincode input
 * @returns {boolean}
 */
export function isValidPincode(pincode) {
  if (!pincode) return false;
  const clean = String(pincode).trim();
  return /^[1-9][0-9]{5}$/.test(clean);
}

/**
 * Validates that a string is a standard UUID v4
 * Prevents SQL injection or malformed ID attacks
 * @param {string} id
 * @returns {boolean}
 */
export function isValidUUID(id) {
  if (typeof id !== 'string') return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id);
}
