# تقرير التبعيات - Dependencies Report

## Frontend (npm)
- React 19.2.7, Vite 6.4.3, Tailwind CSS 4.3.1
- Capacitor 8.4.1, Capacitor Firebase plugins 8.3.0
- Tesseract.js 7.0.0, D3, Lucide React, Motion 12.42.0
- Firebase: تمت إزالة التبعية المباشرة (غير مستخدمة)
- إجمالي الحزم: 588 (بعد الإزالة)
- npm audit: 9 ثغرات (8 moderate, 1 high) — قيد الانتظار لـ audit fix

## Backend (npm)
- Express 4.21, pg 8.13, jsonwebtoken, bcryptjs
- Helmet, CORS, compression, express-rate-limit, multer
- Firebase Admin, @google/genai, sharp
- Tesseract.js node, ngrok (dev only)
- إجمالي الحزم: يعتمد على server/package.json

## إجراءات متخذة
- `npm audit fix` (الإصدارات السابقة: 14 → 9 vulns)
- @capacitor 8.4.1, firebase 12.15.0, react 19.2.7, vite 6.4.3
- إزالة firebase كـ dependency مباشر (يُستخدم فقط عبر capacitor-firebase)

## توصيات
- مراجعة ثغرات npm audit يدويًا
- ترقية @capacitor-firebase/authentication و @capacitor-firebase/storage
