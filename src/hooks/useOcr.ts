import { useState, useRef, useCallback, useEffect } from 'react';
import { useMountedRef } from './useMountedRef';

export interface OcrProgressState {
  visible: boolean;
  progress: number;
  stage: string;
}

export interface OcrResult {
  text: string;
  error?: string;
}

const OCR_TIMEOUT_MS = 30_000;
const INIT_TIMEOUT_MS = 45_000;
const IMAGE_PROCESS_TIMEOUT_MS = 10_000;
const MAX_RETRIES = 2;

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('TIMEOUT')), ms)
    ),
  ]);
}

const stages: Record<string, { label: string; range: [number, number] }> = {
  'loading tesseract core':        { label: 'فتح الكاميرا',     range: [0, 10] },
  'loading language traineddata':   { label: 'فتح الكاميرا',     range: [10, 20] },
  'initializing api':              { label: 'معالجة الصورة',    range: [20, 30] },
  'preprocessing':                 { label: 'معالجة الصورة',    range: [30, 50] },
  'recognizing text':              { label: 'تشغيل OCR',        range: [50, 80] },
  'analyzing name':                { label: 'استخراج الاسم',    range: [80, 100] },
  'complete':                      { label: 'اكتمل',            range: [100, 100] },
};

function stageProgress(status: string, rawProgress: number): number {
  const s = stages[status];
  if (!s) return 0;
  const [min, max] = s.range;
  return min + (max - min) * Math.min(rawProgress, 1);
}

function otsuThreshold(pixels: Uint8ClampedArray): number {
  let sum = 0;
  for (let i = 0; i < pixels.length; i += 4) {
    sum += 0.299 * pixels[i] + 0.587 * pixels[i + 1] + 0.114 * pixels[i + 2];
  }
  let bestThresh = 128, bestVar = 0;
  for (let t = 1; t < 255; t++) {
    let w1 = 0, w2 = 0, s1 = 0, s2 = 0;
    for (let i = 0; i < pixels.length; i += 4) {
      const g = 0.299 * pixels[i] + 0.587 * pixels[i + 1] + 0.114 * pixels[i + 2];
      if (g <= t) { w1++; s1 += g; }
      else { w2++; s2 += g; }
    }
    if (w1 === 0 || w2 === 0) continue;
    const m1 = s1 / w1, m2 = s2 / w2;
    const betweenVar = w1 * w2 * (m1 - m2) * (m1 - m2);
    if (betweenVar > bestVar) { bestVar = betweenVar; bestThresh = t; }
  }
  return bestThresh;
}

function cleanOcrText(raw: string, confidence?: number): string[] {
  const CONFIDENCE_THRESHOLD = 60;
  if (confidence !== undefined && confidence < CONFIDENCE_THRESHOLD) {
    return [];
  }
  if (!raw) return [];
  return raw
    .split('\n')
    .map(l => l.trim())
    .filter(l => l.length > 0)
    .filter((l, i, a) => a.indexOf(l) === i)
    .map(l => l.replace(/[|\\{}[\]~`^_=+<>;:\/*"'.,!@#$%^&*()\-_—–•·°™®©✓✗✘♦♣♠♥●○◘♦♣♠♥0123456789]/g, ' '))
    .map(l => l.replace(/\s+/g, ' ').trim())
    .filter(l => l.length >= 3)
    .filter(l => /[\u0600-\u06FF]/.test(l))
    .filter(l => {
      const arabicWords = l.split(/\s+/).filter(w => /[\u0600-\u06FF]/.test(w));
      return arabicWords.length >= 1 && arabicWords.some(w => w.length >= 2);
    })
    .sort((a, b) => b.length - a.length);
}

function extractValidName(lines: string[]): string | null {
  for (const line of lines) {
    const words = line.split(/\s+/).filter(w => /[\u0600-\u06FF]/.test(w));
    if (words.length >= 2) return line;
  }
  return lines.length > 0 ? lines[0] : null;
}

const REJECTED_PATTERNS = [
  /رقم\s+الهوية|الهوية\s+الوطنية|الإقامة|الجنسية|العنوان|تاريخ\s+الميلاد|الجنس|النوع|المهنة|جهة\s+الإصدار/,
];

function extractArabicPersonName(lines: string[]): string | null {
  const candidates = lines
    .filter(line => !REJECTED_PATTERNS.some(p => p.test(line)))
    .filter(line => {
      const words = line.split(/\s+/).filter(w => /[\u0600-\u06FF]/.test(w));
      return words.length >= 2 && words.length <= 6;
    })
    .sort((a, b) => b.length - a.length);

  return candidates.length > 0 ? candidates[0] : extractValidName(lines);
}

export { cleanOcrText, extractValidName, extractArabicPersonName, otsuThreshold, stageProgress };

function detectBlur(dataUrl: string): Promise<number> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const c = document.createElement('canvas');
      c.width = Math.min(img.width, 800);
      c.height = Math.min(img.height, 800);
      const ctx = c.getContext('2d');
      if (!ctx) { resolve(0); return; }
      ctx.drawImage(img, 0, 0, c.width, c.height);
      const d = ctx.getImageData(0, 0, c.width, c.height);
      const pixels = d.data;
      let sum = 0, count = 0;
      for (let y = 1; y < c.height - 1; y++) {
        for (let x = 1; x < c.width - 1; x++) {
          const i = (y * c.width + x) * 4;
          const g = 0.299 * pixels[i] + 0.587 * pixels[i + 1] + 0.114 * pixels[i + 2];
          const gx = Math.abs(g - (0.299 * pixels[i - 4] + 0.587 * pixels[i - 3] + 0.114 * pixels[i - 2]));
          const gy = Math.abs(g - (0.299 * pixels[i - c.width * 4] + 0.587 * pixels[i - c.width * 4 + 1] + 0.114 * pixels[i - c.width * 4 + 2]));
          sum += gx + gy;
          count++;
        }
      }
      resolve(count > 0 ? sum / count : 0);
    };
    img.onerror = () => resolve(0);
    img.src = dataUrl;
  });
}

function detectLowLight(dataUrl: string): Promise<number> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const c = document.createElement('canvas');
      c.width = Math.min(img.width, 800);
      c.height = Math.min(img.height, 800);
      const ctx = c.getContext('2d');
      if (!ctx) { resolve(128); return; }
      ctx.drawImage(img, 0, 0, c.width, c.height);
      const d = ctx.getImageData(0, 0, c.width, c.height);
      const pixels = d.data;
      let sum = 0, count = 0;
      for (let i = 0; i < pixels.length; i += 4) {
        sum += 0.299 * pixels[i] + 0.587 * pixels[i + 1] + 0.114 * pixels[i + 2];
        count++;
      }
      resolve(count > 0 ? sum / count : 128);
    };
    img.onerror = () => resolve(128);
    img.src = dataUrl;
  });
}

let singletonWorker: OcrWorker | null = null;
let singletonInitPromise: Promise<void> | null = null;

async function getWorker(logger?: (m: { status: string; progress: number }) => void) {
  if (singletonWorker) return singletonWorker;
  if (singletonInitPromise) {
    await singletonInitPromise;
    return singletonWorker!;
  }
  singletonInitPromise = (async () => {
    const { createWorker: loadWorker } = await import('tesseract.js');
    singletonWorker = await loadWorker('ara', 1, {
      workerPath: '/tesseract/js/worker.min.js',
      corePath: '/tesseract/js/',
      langPath: '/tesseract/lang',
      logger,
    });
  })();
  try {
    await singletonInitPromise;
  } catch (e) {
    singletonWorker = null;
    singletonInitPromise = null;
    throw e;
  }
  return singletonWorker!;
}

function terminateWorker() {
  if (singletonWorker) {
    try {
      singletonWorker.terminate();
    } catch { }
    singletonWorker = null;
    singletonInitPromise = null;
  }
}

interface OcrWorker { recognize(image: string): Promise<{ data: { text: string; confidence: number } }>; terminate(): void; }
async function recognizeWithTimeout(worker: OcrWorker, image: string, timeoutMs: number) {
  return Promise.race([
    worker.recognize(image),
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('OCR_TIMEOUT')), timeoutMs)
    ),
  ]);
}

let totalOcrCalls = 0;
let totalOcrTime = 0;

export function useOcr() {
  const mountedRef = useMountedRef();
  const progressHideRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [progress, setProgress] = useState<OcrProgressState>({ visible: false, progress: 0, stage: '' });
  const loggerRef = useRef<(m: { status: string; progress: number }) => void>((m) => {
    if (mountedRef.current) setProgress(prev => ({
      ...prev,
      progress: stageProgress(m.status, m.progress),
      stage: stages[m.status]?.label || prev.stage,
    }));
  });

  const initWorker = useCallback(async () => {
    await getWorker(loggerRef.current);
  }, []);

  const recognizeRaw = useCallback(async (imageData: string): Promise<string> => {
    totalOcrCalls++;
    const startTime = performance.now();
    if (mountedRef.current) setProgress({ visible: true, progress: 10, stage: 'معالجة الصورة' });
    const maxDim = 1200;
    const processed = await withTimeout(new Promise<string>((resolve) => {
      const img = new Image();
      img.onload = () => {
        let { width, height } = img;
        if (width > maxDim || height > maxDim) {
          const s = maxDim / Math.max(width, height);
          width = Math.round(width * s);
          height = Math.round(height * s);
        }
        const c = document.createElement('canvas');
        c.width = width; c.height = height;
        const ctx = c.getContext('2d');
        if (!ctx) { resolve(imageData); return; }
        ctx.drawImage(img, 0, 0, width, height);
        resolve(c.toDataURL('image/jpeg', 0.8));
        c.width = 0; c.height = 0;
      };
      img.onerror = () => resolve(imageData);
      img.src = imageData;
    }), IMAGE_PROCESS_TIMEOUT_MS).catch(() => imageData);
    if (mountedRef.current) setProgress(prev => ({ ...prev, progress: 50, stage: 'تشغيل OCR' }));
    try {
      await withTimeout(initWorker(), INIT_TIMEOUT_MS);
      const worker = await getWorker(loggerRef.current);
      const { data } = await recognizeWithTimeout(worker, processed, OCR_TIMEOUT_MS);
      const cleaned = (data?.text ?? '')
        .split('\n')
        .map(l => l.trim().replace(/[|\\{}[\]~`^_=+<>;:/*"'.,!@#$%^&*()\-_—–•·°™®©✓✗✘♦♣♠♥●○◘]/g, ' '))
        .map(l => l.replace(/\s+/g, ' ').trim())
        .filter(l => l.length > 0);
      if (mountedRef.current) setProgress({ visible: false, progress: 0, stage: '' });
      totalOcrTime += performance.now() - startTime;
      return cleaned.filter((l, i, a) => a.indexOf(l) === i).join(' ');
    } catch {
      if (mountedRef.current) setProgress({ visible: false, progress: 0, stage: '' });
      totalOcrTime += performance.now() - startTime;
      return '';
    }
  }, [initWorker, mountedRef]);

  const recognize = useCallback(async (imageData: string): Promise<string> => {
    totalOcrCalls++;
    const startTime = performance.now();

    setProgress({ visible: true, progress: stageProgress('preprocessing', 0), stage: stages.preprocessing.label });

    const blurScore = await detectBlur(imageData);
    if (blurScore < 3) {
      setProgress({ visible: false, progress: 0, stage: '' });
      totalOcrTime += performance.now() - startTime;
      return 'BLURRY';
    }

    const brightness = await detectLowLight(imageData);
    if (brightness < 40) {
      if (mountedRef.current) setProgress({ visible: false, progress: 0, stage: '' });
      totalOcrTime += performance.now() - startTime;
      return 'DARK';
    }

    const maxDim = 1200;
    const preprocessed = await withTimeout(new Promise<string>((resolve) => {
      const img = new Image();
      img.onload = () => {
        let { width, height } = img;
        if (width > maxDim || height > maxDim) {
          const s = maxDim / Math.max(width, height);
          width = Math.round(width * s);
          height = Math.round(height * s);
        }
        const c = document.createElement('canvas');
        c.width = width;
        c.height = height;
        const ctx = c.getContext('2d');
        if (!ctx) { resolve(imageData); return; }

        ctx.drawImage(img, 0, 0, width, height);
        const d = ctx.getImageData(0, 0, width, height);
        const pixels = d.data;
        const thresh = otsuThreshold(pixels);
        for (let i = 0; i < pixels.length; i += 4) {
          const gray = 0.299 * pixels[i] + 0.587 * pixels[i + 1] + 0.114 * pixels[i + 2];
          const binary = gray >= thresh ? 255 : 0;
          pixels[i] = pixels[i + 1] = pixels[i + 2] = binary;
        }
        ctx.putImageData(d, 0, 0);
        resolve(c.toDataURL('image/jpeg', 0.8));
        c.width = 0;
        c.height = 0;
      };
      img.onerror = () => resolve(imageData);
      img.src = imageData;
    }), IMAGE_PROCESS_TIMEOUT_MS).catch(() => imageData);

    if (mountedRef.current) setProgress(prev => ({ ...prev, progress: stageProgress('recognizing text', 0), stage: stages['recognizing text'].label }));
    try {
      await withTimeout(initWorker(), INIT_TIMEOUT_MS);
    } catch {
      if (mountedRef.current) setProgress({ visible: false, progress: 0, stage: '' });
      totalOcrTime += performance.now() - startTime;
      return '';
    }

    const worker = await getWorker(loggerRef.current);

    let text = '';
    let lastError: Error | null = null;
    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      try {
        const { data } = await recognizeWithTimeout(worker, preprocessed, OCR_TIMEOUT_MS);
        text = data?.text ?? '';
        const ocrConfidence = data?.confidence;
        if (text.trim() === '' || (ocrConfidence !== undefined && ocrConfidence < 40 && attempt < MAX_RETRIES)) {
          lastError = new Error('LOW_CONFIDENCE');
          continue;
        }
        lastError = null;
        break;
      } catch (err) {
        lastError = err instanceof Error ? err : new Error(String(err));
        if (lastError.message === 'OCR_TIMEOUT' && attempt < MAX_RETRIES) {
          if (mountedRef.current) setProgress(prev => ({ ...prev, progress: stageProgress('recognizing text', 0), stage: `محاولة ${attempt + 2}/${MAX_RETRIES + 1}` }));
          continue;
        }
        if (attempt >= MAX_RETRIES) {
          if (mountedRef.current) setProgress({ visible: false, progress: 0, stage: '' });
          totalOcrTime += performance.now() - startTime;
          return '';
        }
      }
    }

    if (mountedRef.current) setProgress(prev => ({ ...prev, progress: stageProgress('analyzing name', 0.5), stage: stages['analyzing name'].label }));

    const lines = cleanOcrText(text);
    const name = extractArabicPersonName(lines);

    if (!name || name.length < 3 || /^\d+$/.test(name) || !/[\u0600-\u06FF]/.test(name)) {
      if (mountedRef.current) setProgress({ visible: false, progress: 0, stage: '' });
      totalOcrTime += performance.now() - startTime;
      return '';
    }

    if (mountedRef.current) setProgress({ visible: true, progress: 100, stage: stages.complete.label });
    if (progressHideRef.current) clearTimeout(progressHideRef.current);
    progressHideRef.current = setTimeout(() => { if (mountedRef.current) setProgress(prev => ({ ...prev, visible: false })); }, 800);
    totalOcrTime += performance.now() - startTime;
    return name;
  }, [initWorker, mountedRef]);

  useEffect(() => {
    return () => {
      setProgress({ visible: false, progress: 0, stage: '' });
      if (progressHideRef.current) clearTimeout(progressHideRef.current);
    };
  }, []);

  return { recognize, recognizeRaw, progress, setProgress };
}

export function getOcrStats() {
  return { totalOcrCalls, totalOcrTime, avgTime: totalOcrCalls > 0 ? totalOcrTime / totalOcrCalls : 0 };
}

export { terminateWorker };
