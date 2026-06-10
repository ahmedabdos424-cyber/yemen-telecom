# Testing Setup

**Date:** 2026-06-10

---

## Framework

- **Test runner:** Vitest
- **Environment:** jsdom (for React components)
- **Matchers:** `@testing-library/jest-dom` for DOM assertions
- **Coverage:** v8 provider

## Configuration

See `vitest.config.ts` in project root.

Key settings:
- `globals: true` — test functions available without imports
- `environment: 'jsdom'` — browser-like environment
- Test files match `src/**/*.test.{ts,tsx}` and `server/src/**/*.test.{ts,tsx}`
- Coverage reports in text and lcov formats

## Running Tests

```bash
# Run all tests once
npm test

# Watch mode
npm run test:watch

# With coverage
npm run test:coverage
```

## Sample Tests

| File | Tests | Description |
|------|-------|-------------|
| `src/__tests__/auth.test.ts` | 5 | Auth token CRUD, edge cases |
| `src/__tests__/csrf.test.ts` | 4 | CSRF token generation and HMAC validation |
| `src/__tests__/seller.test.ts` | 7 | Seller data model validation |
| `src/__tests__/simActivation.test.ts` | 5 | SIM data validation |

Total: **21 tests** covering core data models and security logic.

## Adding Tests

1. Create a `.test.ts` or `.test.tsx` file next to the source
2. Import from `vitest`:
```ts
import { describe, it, expect } from 'vitest';
```
3. Write tests
4. Run `npm test` to verify

## Future Test Areas

- [ ] React component rendering tests
- [ ] API route integration tests
- [ ] OCR hook tests (mock Tesseract.js)
- [ ] Login flow tests
- [ ] SIM activation form validation
- [ ] Seller list filtering
- [ ] State management hooks
