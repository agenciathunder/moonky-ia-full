/**
 * Subdomain-based store routing utilities.
 * 
 * Supports two modes:
 * 1. Subdomain: primolltec.moonky.com.br → slug = "primolltec"
 * 2. Path-based (legacy): moonky.com.br/loja/primolltec → slug from URL param
 * 
 * In subdomain mode, store paths are root-relative (/cart, /product/:id).
 * In path mode, they remain prefixed (/loja/:slug/cart).
 */

const BASE_DOMAIN = import.meta.env.VITE_BASE_DOMAIN || 'moonky.com.br';

// Reserved subdomains that should NOT be treated as store slugs
const RESERVED_SUBDOMAINS = new Set([
  'www', 'api', 'admin', 'app', 'mail', 'smtp', 'ftp',
  'cdn', 'static', 'assets', 'staging', 'dev', 'test',
  'id-preview--ebb2f571-87de-49e3-b77f-bc0e3a9d072a', // Lovable preview
]);

/**
 * Extract store slug from subdomain.
 * e.g. primolltec.moonky.com.br → "primolltec"
 * Returns null if on main domain, www, or a reserved subdomain.
 */
export function getSubdomainSlug(): string | null {
  const hostname = window.location.hostname;
  
  // Localhost / IP → no subdomain
  if (hostname === 'localhost' || /^\d+\.\d+\.\d+\.\d+$/.test(hostname)) {
    return null;
  }

  // Check if hostname ends with our base domain
  const baseParts = BASE_DOMAIN.split('.');
  const hostParts = hostname.split('.');

  // For subdomain to exist, host must have more parts than base domain
  if (hostParts.length <= baseParts.length) {
    return null;
  }

  // Verify the base domain matches
  const hostBase = hostParts.slice(-baseParts.length).join('.');
  if (hostBase !== BASE_DOMAIN) {
    // Not our domain (could be lovable preview etc.)
    return null;
  }

  // Extract the subdomain part (everything before base domain)
  const subdomainParts = hostParts.slice(0, -baseParts.length);
  const subdomain = subdomainParts.join('.');

  if (!subdomain || RESERVED_SUBDOMAINS.has(subdomain.toLowerCase())) {
    return null;
  }

  return subdomain.toLowerCase();
}

/**
 * Returns true if the current page is being served from a store subdomain.
 */
export function isSubdomainStore(): boolean {
  return getSubdomainSlug() !== null;
}

/**
 * Build a store path that works in both subdomain and path-based modes.
 * 
 * In subdomain mode: buildStorePath("primolltec", "/cart") → "/cart"
 * In path mode:      buildStorePath("primolltec", "/cart") → "/loja/primolltec/cart"
 * 
 * @param slug - The store slug (can be null for non-store contexts)
 * @param path - The path within the store (e.g. "/cart", "/product/123", "/auth")
 */
export function buildStorePath(slug: string | null | undefined, path: string = ''): string {
  if (!slug) return path || '/';
  
  // If we're on a subdomain for this store, use root-relative paths
  const subdomainSlug = getSubdomainSlug();
  if (subdomainSlug && subdomainSlug === slug) {
    return path || '/';
  }

  // Path-based fallback
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return `/loja/${slug}${cleanPath}`;
}

/**
 * Build the full URL for a store (useful for redirects to subdomain).
 * e.g. getStoreUrl("primolltec") → "https://primolltec.moonky.com.br"
 */
export function getStoreUrl(slug: string): string {
  const protocol = window.location.protocol;
  return `${protocol}//${slug}.${BASE_DOMAIN}`;
}
