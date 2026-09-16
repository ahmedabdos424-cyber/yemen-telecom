import { Request, Response, NextFunction } from 'express';

// J-01: translate client/upload body errors to 4xx before the generic 500
// handler. Without this, an oversized image (multer 5MB cap) or a malformed
// JSON body surfaces as "Internal server error", misleading clients and
// polluting 5xx monitoring.
export function clientErrorMapper(err: any, _req: Request, res: Response, next: NextFunction) {
  if (err && err.name === 'MulterError') {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(413).json({ error: 'File too large — max 5MB per image' });
    }
    return res.status(400).json({ error: err.message || 'Invalid upload' });
  }
  if (err && (err.type === 'entity.parse.failed' || (err instanceof SyntaxError && 'body' in err))) {
    return res.status(400).json({ error: 'Invalid JSON body' });
  }
  return next(err);
}
