import { Request, Response, NextFunction } from 'express';
import zlib from 'zlib';
import { logger } from './logger';

const BROTLI_QUALITY = 4;
const GZIP_LEVEL = 6;
const MIN_COMPRESS_BYTES = 1024;

function accepts(enc: string, req: Request): boolean {
  const accept = req.headers['accept-encoding'] as string || '';
  return accept.includes(enc);
}

function compressStream(
  raw: Buffer,
  encoding: string,
  res: Response,
  _next: NextFunction
) {
  res.setHeader('Content-Encoding', encoding);
  res.setHeader('Vary', 'Accept-Encoding');
  res.removeHeader('Content-Length');

  let compressor: zlib.BrotliCompress | zlib.Gzip;
  if (encoding === 'br') {
    compressor = zlib.createBrotliCompress({ params: { [zlib.constants.BROTLI_PARAM_QUALITY]: BROTLI_QUALITY } });
  } else {
    compressor = zlib.createGzip({ level: GZIP_LEVEL });
  }

  const bufs: Buffer[] = [];
  compressor.on('data', (chunk: Buffer) => bufs.push(chunk));
  compressor.on('end', () => {
    const compressed = Buffer.concat(bufs);
    if (compressed.length < raw.length) {
      res.end(compressed);
    } else {
      res.removeHeader('Content-Encoding');
      res.setHeader('Content-Length', raw.length);
      res.end(raw);
    }
  });
  compressor.on('error', (err) => {
    logger.warn('[COMPRESS] Compression error, sending uncompressed', err);
    res.removeHeader('Content-Encoding');
    res.setHeader('Content-Length', raw.length);
    res.end(raw);
  });
  compressor.end(raw);
}

export function compression() {
  return (req: Request, res: Response, next: NextFunction) => {
    if (req.method === 'HEAD') return next();

    const originalSend = res.send.bind(res);
    const originalJson = res.json.bind(res);

    const shouldCompress = (body: Buffer | string | object): boolean => {
      if (!body) return false;
      if (typeof body === 'object') body = JSON.stringify(body);
      const buf = Buffer.isBuffer(body) ? body : Buffer.from(String(body));
      return buf.length >= MIN_COMPRESS_BYTES;
    };

    res.send = function (body?: unknown): Response {
      if (!shouldCompress(body as any)) {
        return originalSend(body);
      }
      const buf = Buffer.isBuffer(body) ? body : Buffer.from(String(body));
      if (accepts('br', req)) {
        compressStream(buf, 'br', res, next);
        return res;
      }
      if (accepts('gzip', req)) {
        compressStream(buf, 'gzip', res, next);
        return res;
      }
      return originalSend(body);
    } as Response['send'];

    res.json = function (body?: unknown): Response {
      const str = JSON.stringify(body);
      if (!shouldCompress(str)) {
        return originalJson(body);
      }
      const buf = Buffer.from(str);
      if (accepts('br', req)) {
        res.setHeader('Content-Type', 'application/json');
        compressStream(buf, 'br', res, next);
        return res;
      }
      if (accepts('gzip', req)) {
        res.setHeader('Content-Type', 'application/json');
        compressStream(buf, 'gzip', res, next);
        return res;
      }
      return originalJson(body);
    } as Response['json'];

    next();
  };
}
