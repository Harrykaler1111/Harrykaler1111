const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || "";

const FALLBACK_IMAGE = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 400 500'%3E%3Crect fill='%23171717' width='400' height='500'/%3E%3Ctext fill='%23555' x='50%25' y='48%25' text-anchor='middle' dy='.3em' font-size='13' font-family='system-ui'%3ENo Image%3C/text%3E%3Cpath d='M185 220h30v-10a15 15 0 0 1 15-15h0a15 15 0 0 1 15 15v10h30a5 5 0 0 1 5 5v45a5 5 0 0 1-5 5h-90a5 5 0 0 1-5-5v-45a5 5 0 0 1 5-5z' fill='none' stroke='%23444' stroke-width='1.5'/%3E%3Ccircle cx='215' cy='248' r='16' fill='none' stroke='%23444' stroke-width='1.5'/%3E%3C/svg%3E";

/**
 * Normalize an image URL:
 * - Strips old preview domains from uploaded file paths  
 * - Converts relative /api/ paths to full backend URLs
 * - Keeps external URLs as-is
 */
export const normalizeImageUrl = (url) => {
  if (!url) return FALLBACK_IMAGE;

  // Filter out known placeholder/invalid URLs
  if (url.includes("example.com") || url.includes("placeholder")) return FALLBACK_IMAGE;

  // If it contains /api/uploads/files/, extract the path and prefix with current backend
  const uploadPathIdx = url.indexOf("/api/uploads/files/");
  if (uploadPathIdx !== -1) {
    const relativePath = url.substring(uploadPathIdx);
    return `${BACKEND_URL}${relativePath}`;
  }

  // Relative paths starting with /api/
  if (url.startsWith("/api/")) {
    return `${BACKEND_URL}${url}`;
  }

  // External URLs — return as-is
  return url;
};

/**
 * onError handler for <img> tags — sets fallback image
 */
export const handleImageError = (e) => {
  if (e.target.src !== FALLBACK_IMAGE) {
    e.target.src = FALLBACK_IMAGE;
  }
};

export { FALLBACK_IMAGE };
