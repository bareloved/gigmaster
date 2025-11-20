/**
 * Smart title case formatting for song titles
 * Capitalizes first and last words, major words, but keeps articles and prepositions lowercase
 */

// Words that should remain lowercase (unless first or last word)
const LOWERCASE_WORDS = new Set([
  // Articles
  'a', 'an', 'the',
  // Short prepositions
  'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'from', 'into', 'onto', 'as',
  // Coordinating conjunctions
  'and', 'but', 'or', 'nor', 'yet', 'so',
]);

export function toSmartTitleCase(text: string): string {
  if (!text || typeof text !== 'string') return text;
  
  // Trim whitespace
  text = text.trim();
  
  // Split by spaces, but preserve multiple spaces
  const words = text.split(/\s+/);
  
  const formattedWords = words.map((word, index) => {
    // Empty word, return as is
    if (!word) return word;
    
    // Check if word is first or last
    const isFirstOrLast = index === 0 || index === words.length - 1;
    
    // Convert to lowercase to check against our set
    const lowerWord = word.toLowerCase();
    
    // If it's a lowercase word and not first/last, keep it lowercase
    if (!isFirstOrLast && LOWERCASE_WORDS.has(lowerWord)) {
      return lowerWord;
    }
    
    // Otherwise, capitalize first letter and lowercase the rest
    return lowerWord.charAt(0).toUpperCase() + lowerWord.slice(1);
  });
  
  return formattedWords.join(' ');
}

/**
 * Format a musical key with proper notation symbols
 * Converts # to ♯ (sharp) and b to ♭ (flat)
 * Handles both uppercase and lowercase input
 * 
 * Examples:
 * - "C#" or "c#" → "C♯"
 * - "Bb" or "bb" → "B♭"
 * - "F#m" or "f#m" → "F♯m"
 * - "Cm/Eb" or "cm/eb" → "Cm/E♭"
 * - "ebm" → "E♭m"
 */
export function formatMusicalKey(key: string): string {
  if (!key || typeof key !== 'string') return key;
  
  let formatted = key.trim();
  
  // Replace # with ♯ (sharp symbol)
  formatted = formatted.replace(/#/g, '♯');
  
  // Replace b with ♭ (flat symbol) when it comes after a note letter (A-G, case insensitive)
  // This handles: Bb, bb, Ebm, ebm, etc.
  formatted = formatted.replace(/([A-Ga-g])b/g, (match, noteLetter) => {
    return noteLetter.toUpperCase() + '♭';
  });
  
  // Capitalize any remaining note letters at the start or after a slash
  // This handles cases like "c" → "C", "cm" → "Cm", "c/e" → "C/E"
  formatted = formatted.replace(/(^|\/|\s)([a-g])/g, (match, separator, noteLetter) => {
    return separator + noteLetter.toUpperCase();
  });
  
  return formatted;
}

