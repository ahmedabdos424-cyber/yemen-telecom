# Dependency Audit

**Date:** 2026-06-10  
**Project:** Yemen Telecom — v1.0.0

---

## Classification Guide

| Label | Meaning |
|-------|---------|
| ✅ Used | Actively imported in source code |
| 🟡 Reserved | Not used but planned for future features |
| 🔴 Safe to Remove | No usage, no plans |

---

## Dependencies

### Production Dependencies (`dependencies`)

| Package | Classification | Evidence |
|---------|---------------|----------|
| `@capacitor-firebase/authentication` | 🔴 Safe to Remove | Not imported in any src/ file. Firebase auth is handled by custom JWT + PostgreSQL. |
| `@capacitor-firebase/storage` | 🔴 Safe to Remove | Not imported in any src/ file. |
| `@capacitor/android` | 🟡 Reserved | Platform package, used via `npx cap` CLI (build scripts). Do not remove. |
| `@capacitor/cli` | 🟡 Reserved | CLI tool for Capacitor operations. Used in `build:android` script. |
| `@capacitor/core` | 🟡 Reserved | Core Capacitor runtime. Not directly imported but required for platform builds. |
| `@google/genai` | 🔴 Safe to Remove | Not imported anywhere. Google Generative AI not integrated yet. |
| `@tailwindcss/vite` | ✅ Used | `vite.config.ts` — Tailwind v4 Vite plugin. |
| `@vitejs/plugin-react` | ✅ Used | `vite.config.ts` — React Fast Refresh. |
| `d3` | ✅ Used | `GeographicRiskView.tsx` — D3 visualization. |
| `firebase` | 🟡 Reserved | `src/firebase.ts` — Initialized but not consumed by active components. Keep for future Firebase integration. |
| `html5-qrcode` | ✅ Used | `BarcodeScanner.tsx` — QR/barcode scanning (dynamic import). |
| `lucide-react` | ✅ Used | 21+ files — Icon library. |
| `motion` | ✅ Used | 19+ files — Animation library (Framer Motion successor). |
| `react` | ✅ Used | Core dependency. |
| `react-dom` | ✅ Used | `main.tsx` — React DOM rendering. |
| `sharp` | 🔴 Safe to Remove | Not imported anywhere. Image processing not integrated. |
| `tesseract.js` | ✅ Used | `useOcr.ts` — OCR engine. |
| `uuid` | 🔴 Safe to Remove | Not imported anywhere. No UUID generation in codebase. |
| `vite` | ✅ Used | Build tool, `vite.config.ts`, npm scripts. |

### Dev Dependencies (`devDependencies`)

| Package | Classification | Evidence |
|---------|---------------|----------|
| `@types/bcrypt` | 🔴 Safe to Remove | Server uses `bcryptjs` (with `@types/bcryptjs`), not `bcrypt`. |
| `@types/cors` | ✅ Used | Server TypeScript types. |
| `@types/d3` | ✅ Used | D3 TypeScript types. |
| `@types/express` | ✅ Used | Express TypeScript types. |
| `@types/multer` | ✅ Used | Multer TypeScript types. |
| `@types/node` | ✅ Used | Node.js TypeScript types. |
| `@types/pg` | ✅ Used | PostgreSQL TypeScript types. |
| `@types/react` | ✅ Used | React TypeScript types. |
| `autoprefixer` | 🔴 Safe to Remove | Tailwind v4 handles prefixing automatically. |
| `esbuild` | 🟡 Reserved | Not directly used but Vite depends on it internally. |
| `ngrok` | ✅ Used | `scripts/tunnel.js` — HTTP tunneling for testing. |
| `tailwindcss` | ✅ Used | Tailwind v4 CSS framework. |
| `tsx` | ✅ Used | npm scripts (`dev`, `server`, `db:seed`). |
| `typescript` | ✅ Used | Build tool for type checking. |

---

## Summary

| Action | Count | Packages |
|--------|-------|----------|
| ✅ Keep | 17 | React, motion, lucide, d3, tesseract.js, vite, tailwindcss, etc. |
| 🟡 Reserved | 4 | `firebase`, `@capacitor/core`, `@capacitor/cli`, `@capacitor/android`, `esbuild` |
| 🔴 Safe to Remove | 6 | `@capacitor-firebase/authentication`, `@capacitor-firebase/storage`, `@google/genai`, `sharp`, `uuid`, `autoprefixer`, `@types/bcrypt` |

### Recommended Removal Commands

```bash
npm uninstall @capacitor-firebase/authentication @capacitor-firebase/storage @google/genai sharp uuid autoprefixer @types/bcrypt
```

> **NOTE:** These removals are optional. Packages are kept to avoid breaking anything.
