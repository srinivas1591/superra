// Role keys (must match server) and display names
export const ROLE_KEYS = {
  CREW: 'crew',
  BLUR: 'blur',
  BLANK: 'blank',
};

export const ROLE_LABELS = {
  [ROLE_KEYS.CREW]: 'Manchodu',
  [ROLE_KEYS.BLUR]: 'Massgod',
  [ROLE_KEYS.BLANK]: 'Black Sheep',
};

// Input limits (must match server/validation.js)
export const LIMITS = {
  CLUE_MAX_LENGTH: 50,
  NAME_MAX_LENGTH: 20,
  BLANK_GUESS_MAX_LENGTH: 30,
};
