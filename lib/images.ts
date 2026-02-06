/**
 * Image utilities for handling vehicle images from various sources
 * - Korea (Encar): ci.encar.com
 * - China (Dongchedi): byteimg.com, tosv.byted.org (signed URLs with x-expires)
 * - China (CHE168): autoimg.cn
 * - Dubai (Dubicars): dubicars.com
 * - Admin uploads: Supabase storage
 */

// Placeholder image for failed/expired images
export const PLACEHOLDER_IMAGE = 'https://images.unsplash.com/photo-1494976388531-d1058494cdd8?w=400&h=300&fit=crop';

// Domains with signed URLs that expire
const SIGNED_URL_DOMAINS = [
  'byteimg.com',
  'tosv.byted.org',
];

/**
 * Parse images field that might be stored as PostgreSQL array string
 * Handles multiple formats:
 * - PostgreSQL array: '{"url1","url2"}' or '{url1,url2}'
 * - JSON array: '["url1","url2"]'
 * - Single URL string: 'https://...'
 * - Already parsed array: ['url1', 'url2']
 */
export function parseImagesField(images: string[] | string | null | undefined): string[] {
  if (!images) return [];

  // Already an array
  if (Array.isArray(images)) {
    return images.filter(Boolean).filter(url => typeof url === 'string' && url.trim());
  }

  // String format handling
  if (typeof images === 'string') {
    const trimmed = images.trim();

    // Empty array formats
    if (trimmed === '{}' || trimmed === '[]' || trimmed === '') return [];

    // Try JSON parse first (handles ["url1","url2"])
    if (trimmed.startsWith('[')) {
      try {
        const parsed = JSON.parse(trimmed);
        if (Array.isArray(parsed)) {
          return parsed.filter(Boolean).filter(url => typeof url === 'string' && url.trim());
        }
      } catch {
        // Fall through to manual parsing
      }
    }

    // PostgreSQL array format: {url1,url2} or {"url1","url2"}
    if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
      const content = trimmed.slice(1, -1);
      if (!content) return [];

      // Handle quoted strings: {"url1","url2"}
      if (content.startsWith('"')) {
        const urls: string[] = [];
        let current = '';
        let inQuotes = false;
        let escaped = false;

        for (let i = 0; i < content.length; i++) {
          const char = content[i];

          if (escaped) {
            current += char;
            escaped = false;
            continue;
          }

          if (char === '\\') {
            escaped = true;
            continue;
          }

          if (char === '"') {
            inQuotes = !inQuotes;
          } else if (char === ',' && !inQuotes) {
            if (current) urls.push(current);
            current = '';
          } else {
            current += char;
          }
        }
        if (current) urls.push(current);
        return urls.filter(url => url && url.startsWith('http'));
      }

      // Simple comma-separated (rare, but handle it)
      return content.split(',').map(s => s.trim()).filter(url => url && url.startsWith('http'));
    }

    // Single URL
    if (trimmed.startsWith('http')) {
      return [trimmed];
    }
  }

  return [];
}

/**
 * Check if an image URL has a signed expiration that has passed
 * Chinese CDN (Dongchedi) images have x-expires parameter with Unix timestamp
 */
export function isImageExpired(url: string): boolean {
  if (!url) return true;

  // Check if URL is from a domain that uses signed URLs
  const isSignedDomain = SIGNED_URL_DOMAINS.some(domain => url.includes(domain));
  if (!isSignedDomain) return false;

  // Check for x-expires parameter
  const expiresMatch = url.match(/x-expires=(\d+)/);
  if (expiresMatch) {
    const expiresTimestamp = parseInt(expiresMatch[1]) * 1000; // Convert to milliseconds
    return Date.now() > expiresTimestamp;
  }

  // Signed URL without x-expires is considered potentially expired
  if (url.includes('x-signature')) {
    return true;
  }

  return false;
}

/**
 * Check if an image URL is valid and not expired
 */
export function isValidImageUrl(url: string): boolean {
  if (!url || typeof url !== 'string') return false;
  if (!url.startsWith('http')) return false;
  if (isImageExpired(url)) return false;
  return true;
}

/**
 * Get the first valid image URL from an images array/string
 * Returns placeholder if no valid image found
 */
export function getFirstValidImage(images: string[] | string | null | undefined): string {
  const parsed = parseImagesField(images);

  // Find first valid (non-expired) image
  for (const url of parsed) {
    if (isValidImageUrl(url)) {
      return url;
    }
  }

  // Return first image even if expired (let the component handle the error)
  // This allows the image component to show loading/error states
  if (parsed.length > 0) {
    return parsed[0];
  }

  return PLACEHOLDER_IMAGE;
}

/**
 * Get all valid images, filtering out expired ones
 * Includes placeholder if no valid images found
 */
export function getValidImages(images: string[] | string | null | undefined): string[] {
  const parsed = parseImagesField(images);
  const valid = parsed.filter(isValidImageUrl);

  if (valid.length === 0) {
    // Return all images even if some are expired (UI will handle errors)
    return parsed.length > 0 ? parsed : [PLACEHOLDER_IMAGE];
  }

  return valid;
}

/**
 * Check if images might be temporary (from Chinese CDN)
 * These images may expire and need refresh from sync
 */
export function hasTemporaryImages(images: string[] | string | null | undefined): boolean {
  const parsed = parseImagesField(images);
  return parsed.some(url =>
    SIGNED_URL_DOMAINS.some(domain => url.includes(domain)) ||
    url.includes('x-expires')
  );
}

/**
 * Get image count from images field
 */
export function getImageCount(images: string[] | string | null | undefined): number {
  return parseImagesField(images).length;
}
