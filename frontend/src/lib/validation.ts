/**
 * Unified validation constants and helper functions for frontend text inputs.
 */
export const TEXT_REGEX = /^[^\p{C}<>;\\]*$/u;
export const TEXT_REGEX_MESSAGE = 'Text contains invalid characters (< > ; \\ or control characters).';

export const isValidName = (str: string): boolean => {
  if (!str) return false;
  return TEXT_REGEX.test(str);
};
