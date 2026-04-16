/**
 * Parse JSON text; return the array or null if parse fails or root is not an array.
 */
export function parseJsonArrayFromString(text: string): unknown[] | null {
  try {
    const parsed: unknown = JSON.parse(text);
    return Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}
