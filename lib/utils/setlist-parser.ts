/**
 * Setlist Parser Utility
 * 
 * Parses text-based setlists into structured song data.
 * Handles common formats used by gigging musicians.
 */

import { toSmartTitleCase, formatMusicalKey } from "./text-formatting";

export interface ParsedSong {
  title: string;
  key: string | null;
  bpm: number | null;
  position: number;
}

/**
 * Parses a setlist text into an array of songs.
 * 
 * Supported formats:
 * - "Song Title - Key" or "Song Title – Key" (with em-dash)
 * - "Song Title + Another Song - Key" (medleys)
 * - "Song Title" (without key)
 * - "1. Song Title - Key" (with leading numbers)
 * 
 * Features:
 * - Automatically capitalizes song titles (smart title case)
 * - Automatically formats musical keys (# to ♯, b to ♭)
 * - Handles both uppercase and lowercase keys
 * 
 * Examples:
 * - "Intro – bm" → { title: "Intro", key: "Bm" }
 * - "crazy in love + crazy – dm" → { title: "Crazy in Love + Crazy", key: "Dm" }
 * - "YMCA - gb" → { title: "YMCA", key: "G♭" }
 * - "it's my life – cm/eb" → { title: "It's My Life", key: "Cm/E♭" }
 * - "superstition - ebm" → { title: "Superstition", key: "E♭m" }
 * 
 * @param text - Raw setlist text with one song per line
 * @returns Array of parsed songs with position numbers
 */
export function parseSetlistText(text: string): ParsedSong[] {
  const lines = text.split('\n').filter(line => line.trim().length > 0);
  const songs: ParsedSong[] = [];
  
  lines.forEach((line, index) => {
    let title = line.trim();
    let key: string | null = null;
    
    // Remove leading numbers (e.g., "1. ", "12. ")
    title = title.replace(/^\d+\.\s*/, '');
    
    // Check if line contains a dash separator for key
    // Look for " - " (with spaces) or " – " (em-dash with spaces)
    // Use lastIndexOf to handle songs with dashes in their names
    const dashPatterns = [' – ', ' - '];
    let dashIndex = -1;
    
    for (const pattern of dashPatterns) {
      const index = line.lastIndexOf(pattern);
      if (index !== -1) {
        dashIndex = index;
        title = line.substring(0, dashIndex).trim();
        key = line.substring(dashIndex + pattern.length).trim();
        break;
      }
    }
    
    // Clean up title again after extracting key
    title = title.replace(/^\d+\.\s*/, '');
    
    // Only add if title is not empty
    if (title.length > 0) {
      songs.push({
        title: toSmartTitleCase(title),
        key: key ? formatMusicalKey(key) : null,
        bpm: null,
        position: index + 1,
      });
    }
  });
  
  return songs;
}

/**
 * FUTURE ENHANCEMENT: AI-Powered Parsing
 * 
 * For complex or unstructured setlist formats, consider using AI (OpenAI/Anthropic)
 * to parse the text more intelligently.
 * 
 * Implementation ideas:
 * - Add "Smart Parse" button option
 * - Use AI prompt: "Extract songs, keys, and BPMs from this setlist text"
 * - Parse AI response into structured JSON data
 * - Fallback to regex parsing if AI fails or API key not available
 * 
 * Benefits:
 * - Handles varied formats (tables, bullets, numbered lists)
 * - Extracts BPM, notes, and other metadata automatically
 * - Can parse PDF text content after extraction
 * - Understands context (e.g., "verse in Dm" vs "song in Dm")
 * 
 * Challenges:
 * - Requires API key and costs per parse
 * - Slower than regex parsing
 * - May need validation/correction UI
 * 
 * Example AI prompt:
 * ```
 * Extract a list of songs from this setlist. For each song, identify:
 * - Song title (required)
 * - Musical key (if mentioned)
 * - BPM/tempo (if mentioned)
 * 
 * Return as JSON array: [{ title: string, key: string | null, bpm: number | null }]
 * 
 * Setlist:
 * ${text}
 * ```
 * 
 * See: docs/future-enhancements/setlist-enhancements.md
 */
export async function parseSetlistWithAI(_text: string): Promise<ParsedSong[]> {
  // TODO: Implement when AI API key is available
  throw new Error("AI parsing not yet implemented. Use parseSetlistText() for now.");
}

