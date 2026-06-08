import { useState, useRef, useCallback, useEffect } from 'react';
import { createWorker } from 'tesseract.js';

export interface OcrProgressState {
  visible: boolean;
  progress: number;
  stage: string;
}

const stages: Record<string, { label: string; range: [number, number] }> = {
  'loading tesseract core':        { label: 'تحميل محرك OCR',     range: [0, 15] },
  'loading language traineddata':   { label: 'تحميل اللغة العربية',   range: [15, 25] },
  'initializing api':              { label: 'تهيئة المحرك',       range: [25, 30] },
  'preprocessing':                 { label: 'معالجة الصورة',       range: [30, 40] },
  'recognizing text':              { label: 'استخراج النص',        range: [40, 85] },
  'analyzing name':                { label: 'تحليل الاسم',         range: [85, 100] },
  'complete':                      { label: 'اكتمل',               range: [100, 100] },
};

function stageProgress(status: string, rawProgress: number): number {
  const s = stages[status];
  if (!s) return 0;
  const [min, max] = s.range;
  return min + (max - min) * Math.min(rawProgress, 1);
}

function cleanOcrText(raw: string): string[] {
  return raw
    .split('\n')
    .map(l => l.trim())
    .filter(l => l.length > 0)
    .filter((l, i, a) => a.indexOf(l) === i)
    .map(l => l.replace(/[|\\{}[\]~`^_=+<>;:\/*"'.,!@#$%^&*()\-_—–•·°™®©✓✗✘♦♣♠♥●○◘♦♣♠♥0123456789]/g, ' '))
    .map(l => l.replace(/\s+/g, ' ').trim())
    .filter(l => l.length >= 3)
    .filter(l => /[\u0600-\u06FF]/.test(l))
    .sort((a, b) => b.length - a.length);
}

function extractValidName(lines: string[]): string | null {
  for (const line of lines) {
    const words = line.split(/\s+/).filter(w => /[\u0600-\u06FF]/.test(w));
    if (words.length >= 2) return line;
  }
  return lines.length > 0 ? lines[0] : null;
}

function detectBlur(dataUrl: string): Promise<number> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const c = document.createElement('canvas');
      c.width = img.width;
      c.height = img.height;
      const ctx = c.getContext('2d');
      if (!ctx) { resolve(0); return; }
      ctx.drawImage(img, 0, 0);
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
      c.width = img.width;
      c.height = img.height;
      const ctx = c.getContext('2d');
      if (!ctx) { resolve(128); return; }
      ctx.drawImage(img, 0, 0);
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

let singletonWorker: Awaited<ReturnType<typeof createWorker>> | null = null;
let singletonInitPromise: Promise<void> | null = null;

async function getWorker(logger?: (m: { status: string; progress: number }) => void): Promise<Awaited<ReturnType<typeof createWorker>>> {
  if (singletonWorker) return singletonWorker;
  if (singletonInitPromise) {
    await singletonInitPromise;
    return singletonWorker!;
  }
  singletonInitPromise = (async () => {
    singletonWorker = await createWorker('ara', 1, {
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

let totalOcrCalls = 0;
let totalOcrTime = 0;

export function useOcr() {
  const [progress, setProgress] = useState<OcrProgressState>({ visible: false, progress: 0, stage: '' });
  const loggerRef = useRef<(m: { status: string; progress: number }) => void>((m) => {
    setProgress(prev => ({
      ...prev,
      progress: stageProgress(m.status, m.progress),
      stage: stages[m.status]?.label || prev.stage,
    }));
  });

  const initWorker = useCallback(async () => {
    await getWorker(loggerRef.current);
  }, []);

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
      setProgress({ visible: false, progress: 0, stage: '' });
      totalOcrTime += performance.now() - startTime;
      return 'DARK';
    }

    const maxDim = 1000;
    const preprocessed = await new Promise<string>((resolve) => {
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
        for (let i = 0; i < pixels.length; i += 4) {
          const gray = 0.299 * pixels[i] + 0.587 * pixels[i + 1] + 0.114 * pixels[i + 2];
          const adj = Math.min(255, Math.max(0, Math.round((gray - 128) * 1.4 + 128)));
          pixels[i] = pixels[i + 1] = pixels[i + 2] = adj;
        }
        ctx.putImageData(d, 0, 0);
        resolve(c.toDataURL('image/jpeg', 0.7));
        c.width = 0;
        c.height = 0;
      };
      img.onerror = () => resolve(imageData);
      img.src = imageData;
    });

    setProgress(prev => ({ ...prev, progress: stageProgress('recognizing text', 0), stage: stages['recognizing text'].label }));
    await initWorker();

    const worker = await getWorker(loggerRef.current);
    const { data: { text } } = await worker.recognize(preprocessed);

    setProgress(prev => ({ ...prev, progress: stageProgress('analyzing name', 0.5), stage: stages['analyzing name'].label }));

    const lines = cleanOcrText(text);
    const name = extractValidName(lines);

    if (!name || name.length < 3 || /^\d+$/.test(name) || !/[\u0600-\u06FF]/.test(name)) {
      setProgress({ visible: false, progress: 0, stage: '' });
      totalOcrTime += performance.now() - startTime;
      return '';
    }

    setProgress({ visible: true, progress: 100, stage: stages.complete.label });
    setTimeout(() => setProgress(prev => ({ ...prev, visible: false })), 800);
    totalOcrTime += performance.now() - startTime;
    return name;
  }, [initWorker]);

  useEffect(() => {
    return () => {
      setProgress({ visible: false, progress: 0, stage: '' });
    };
  }, []);

  return { recognize, progress, setProgress };
}

export function getOcrStats() {
  return { totalOcrCalls, totalOcrTime, avgTime: totalOcrCalls > 0 ? totalOcrTime / totalOcrCalls : 0 };
}
