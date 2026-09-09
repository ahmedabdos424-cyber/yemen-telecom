/**
 * S3 tests: signed upload URLs are refreshed only after expiry — valid and
 * permanent links must pass through with zero API calls, expired links get
 * re-signed exactly once (cached) via GET /api/upload/signed/:filename.
 */

import { describe, it, expect, afterEach, vi } from 'vitest';
import { api } from '../api/client';
import {
  __resetSignedUrlCache,
  decodeBase64UrlSegment,
  extractFilename,
  signedUrlExpiryMs,
  resolveSignedUploadUrl,
} from '../lib/signedUploadUrl';

const b64url = (obj: unknown): string =>
  btoa(String.fromCharCode(...new TextEncoder().encode(JSON.stringify(obj))))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');

const EXPIRED = b64url({ sub: '1', iss: 'supabase', iat: 1000, exp: 1000 });
const FUTURE = b64url({ sub: '1', iss: 'supabase', iat: 1000, exp: 9999999999 });
const HEADER = b64url({ alg: 'HS256', typ: 'JWT' });
const tokenExpired = `${HEADER}.${EXPIRED}`;
const tokenFuture = `${HEADER}.${FUTURE}`;

const signedUrl = (token: string) =>
  `https://xyz.supabase.co/storage/v1/object/sign/uploads/1729670400000-a1b2c3d4.jpg?token=${token}`;
const publicUrl = 'https://xyz.supabase.co/storage/v1/object/public/uploads/1729670400000-a1b2c3d4.jpg';

describe('signedUploadUrl — helpers', () => {
  describe('decodeBase64UrlSegment', () => {
    it('decodes base64url padding-free payloads', () => {
      expect(decodeBase64UrlSegment(b64url({ hello: 'world' }))).toBe('{"hello":"world"}');
    });

    it('returns null for invalid input', () => {
      expect(decodeBase64UrlSegment('')).toBeNull();
      expect(decodeBase64UrlSegment('%not-valid%')).toBeNull();
    });
  });

  describe('signedUrlExpiryMs', () => {
    it('reads exp from a signed-URL token', () => {
      expect(signedUrlExpiryMs(signedUrl(tokenExpired))).toBe(1_000_000);
      expect(signedUrlExpiryMs(signedUrl(tokenFuture))).toBe(9_999_999_999_000);
    });

    it('returns null for links without a token', () => {
      expect(signedUrlExpiryMs(publicUrl)).toBeNull();
      expect(signedUrlExpiryMs('data:image/jpeg;base64,AAAA')).toBeNull();
    });
  });

  describe('extractFilename', () => {
    it('extracts a flat filename from signed and public object URLs', () => {
      expect(extractFilename(signedUrl(tokenExpired))).toBe('1729670400000-a1b2c3d4.jpg');
      expect(extractFilename(publicUrl)).toBe('1729670400000-a1b2c3d4.jpg');
    });

    it('returns null for non-object URLs', () => {
      expect(extractFilename('https://example.com/contract.jpg')).toBeNull();
      expect(extractFilename('data:image/jpeg;base64,AAAA')).toBeNull();
    });
  });
});

describe('signedUploadUrl — resolveSignedUploadUrl', () => {
  afterEach(() => {
    __resetSignedUrlCache();
    vi.restoreAllMocks();
  });

  it('re-signs an expired signed URL via the API and caches it', async () => {
    const spy = vi.spyOn(api, 'getSignedUploadUrl').mockResolvedValue({
      url: 'https://xyz.supabase.co/storage/v1/object/sign/uploads/1729670400000-a1b2c3d4.jpg?token=' + b64url({ exp: 9999999999 }),
      filename: '1729670400000-a1b2c3d4.jpg',
    });

    const url = signedUrl(tokenExpired);
    const fresh = await resolveSignedUploadUrl(url, 2_000_000_000);
    expect(fresh).not.toBe(url);
    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy).toHaveBeenCalledWith('1729670400000-a1b2c3d4.jpg');

    const second = await resolveSignedUploadUrl(url, 5_000_000_000);
    expect(second).toBe(fresh);
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it('does not call the API for still-valid signed URLs', async () => {
    const spy = vi.spyOn(api, 'getSignedUploadUrl').mockResolvedValue({ url: '', filename: '' });

    const url = signedUrl(tokenFuture);
    expect(await resolveSignedUploadUrl(url, 1_000_000)).toBe(url);
    expect(spy).not.toHaveBeenCalled();
  });

  it('does not call the API for permanent/public or data URLs', async () => {
    const spy = vi.spyOn(api, 'getSignedUploadUrl').mockResolvedValue({ url: '', filename: '' });

    expect(await resolveSignedUploadUrl(publicUrl)).toBe(publicUrl);
    expect(await resolveSignedUploadUrl('data:image/jpeg;base64,AAAA')).toBe('data:image/jpeg;base64,AAAA');
    expect(spy).not.toHaveBeenCalled();
  });

  it('keeps the original URL when re-signing fails', async () => {
    const spy = vi.spyOn(api, 'getSignedUploadUrl').mockRejectedValue(new Error('network'));

    const url = signedUrl(tokenExpired);
    expect(await resolveSignedUploadUrl(url, 2_000_000_000)).toBe(url);
    expect(spy).toHaveBeenCalledTimes(1);
  });
});