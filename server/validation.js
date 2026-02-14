/**
 * Input validation and safety: length limits, profanity blocklist.
 * All user-supplied text (names, clues, guesses) must pass before storage/use.
 * Customize BLOCKED_WORDS in this file to add/remove words.
 */

export const LIMITS = {
  CLUE_MAX_LENGTH: 50,
  NAME_MAX_LENGTH: 20,
  INVITE_CODE_MAX_LENGTH: 8,
  BLANK_GUESS_MAX_LENGTH: 30,
};

// Blocklist: lowercase. Add more entries as needed; keep one per line for readability.
const BLOCKED_WORDS = new Set([
  'damn', 'crap', 'hell', 'ass', 'bastard', 'bitch', 'dick', 'shit', 'fuck', 'fucking', 'fucker',
  'piss', 'pussy', 'cock', 'whore', 'slut', 'nigger', 'nigga', 'fag', 'faggot', 'retard', 'retarded',
  'cunt', 'motherfucker', 'wtf', 'stfu', 'bs', 'bullshit', 'dumbass', 'dipshit', 'shitty',
  'asshole', 'dickhead', 'bollocks', 'bloody', 'bugger', 'sod', 'wanker', 'twat', 'bellend',
  'prick', 'jackass', 'dumb', 'idiot', 'moron', 'stupid',
]);

/**
 * Normalize for blocklist check: lowercase, collapse non-letters to space, trim.
 */
function normalizeForCheck(text) {
  if (typeof text !== 'string') return '';
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Returns true if the text contains any blocked word (whole-word match).
 */
export function containsBlockedWord(text) {
  const normalized = normalizeForCheck(text);
  if (!normalized) return false;
  const words = normalized.split(/\s+/);
  for (const word of words) {
    if (BLOCKED_WORDS.has(word)) return true;
    if (word.length > 2 && BLOCKED_WORDS.has(word.slice(0, -1))) return true; // plural/suffix
  }
  return false;
}

/**
 * Sanitize string: trim, limit length, remove control chars.
 */
export function sanitizeString(str, maxLength) {
  if (str == null) return '';
  return String(str)
    .replace(/[\x00-\x1F\x7F]/g, '')
    .trim()
    .slice(0, maxLength);
}

/**
 * Validate display name. Returns { valid: boolean, error?: string, value?: string }.
 */
export function validateName(input) {
  const value = sanitizeString(input, LIMITS.NAME_MAX_LENGTH);
  if (!value) return { valid: false, error: 'Name is required' };
  if (value.length < 2) return { valid: false, error: 'Name must be at least 2 characters' };
  if (containsBlockedWord(value)) return { valid: false, error: 'Please choose a different name' };
  return { valid: true, value };
}

/**
 * Validate clue (description). Returns { valid: boolean, error?: string, value?: string }.
 */
export function validateClue(input) {
  const value = sanitizeString(input, LIMITS.CLUE_MAX_LENGTH);
  if (!value) return { valid: false, error: 'Clue cannot be empty' };
  if (containsBlockedWord(value)) return { valid: false, error: 'Clue contains inappropriate language' };
  return { valid: true, value };
}

/**
 * Validate blank's word guess. Returns { valid: boolean, error?: string, value?: string }.
 */
export function validateBlankGuess(input) {
  const value = sanitizeString(input, LIMITS.BLANK_GUESS_MAX_LENGTH);
  if (!value) return { valid: false, error: 'Guess cannot be empty' };
  if (containsBlockedWord(value)) return { valid: false, error: 'Please try a different word' };
  return { valid: true, value };
}
