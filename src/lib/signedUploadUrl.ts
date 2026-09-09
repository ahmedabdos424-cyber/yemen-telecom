/**
 * Rehydrate Supabase storage signed URLs after expiry.
 *
 * Uploads now return 7-day signed URLs (`/object/sign/<bucket>/<filename>`).
 * When the stored URL has expired the image breaks; the server exposes
 * GET /api/upload/signed/:filename to mint a fresh one. This module refreshes
 * lazily: it decodes the signed token's `exp` claim and only calls the API
 * when the link has actually expired, so valid rows cost zero requests.
 */

import { api } from '../api/client';

const cache = new Map<string, string>();

/** Test hook: clear the resolved-URL cache between tests. */
export function __resetSignedUrlCache(): void {
  cache.clear();
}

/** Decode a base64url JWT segment (payload is JSON). */
export function decodeBase64UrlSegment(segment: string): string | null {
  if (!segment) return null;
  const normalized = segment.replace(/-/g, '+').replace(/_/g, '/');
  const padded = normalized + '='.repeat((4 - (normalized.length % 4)) % 4);
  try {
    return atob(padded);
  } catch {
    return null;
  }
}

/** Expiry (epoch ms) of a Supabase signed-URL token, or null when not signed. */
export function signedUrlExpiryMs(url: string): number | null {
  const match = url.match(/[?&]token=([^&]+)/);
  if (!match) return null;
  const parts = match[1].split('.');
  if (parts.length < 2) return null;
  const json = decodeBase64UrlSegment(parts[1]);
  if (!json) return null;
  try {
    const payload = JSON.parse(json) as { exp?: unknown };
    return typeof payload.exp === 'number' ? payload.exp * 1000 : null;
  } catch {
    return null;
  }
}

/** Flat storage filename (e.g. `1699999999999-abc12345.jpg`) from an object URL. */
export function extractFilename(url: string): string | null {
  const match = url.match(/\/object\/(?:sign|public)\/[^/]+\/([A-Za-z0-9._-]+)/);
  return match ? match[1] : null;
}

/**
 * Return a working URL for a stored image:
 * - permanent/local/non-signed links pass through unchanged (no request);
 * - signed links that are still valid pass through unchanged (no request);
 * - expired signed links are re-signed via the API (one request, cached).
 */
export async function resolveSignedUploadUrl(url: string, now: number = Date.now()): Promise<string> {
  const cached = cache.get(url);
  if (cached) return cached;

  const expiry = signedUrlExpiryMs(url);
  if (expiry === null || expiry > now) {
    return url;
  }

  const filename = extractFilename(url);
  if (!filename) {
    cache.set(url, url);
    return url;
  }

  try {
    const result = await api.getSignedUploadUrl(filename);
    const fresh = result?.url || url;
    cache.set(url, fresh);
    return fresh;
  } catch {
    cache.set(url, url);
    return url;
  }
}