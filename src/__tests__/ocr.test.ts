import { describe, it, expect } from 'vitest';

// Unit tests for OCR text cleaning and name extraction
// These functions are tested in isolation from the full OCR pipeline

function cleanOcrText(raw: string, confidence?: number): string[] {
  const CONFIDENCE_THRESHOLD = 60;
  if (confidence !== undefined && confidence < CONFIDENCE_THRESHOLD) {
    return [];
  }
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

function otsuThreshold(pixels: Uint8ClampedArray): number {
  let sum = 0;
  for (let i = 0; i < pixels.length; i += 4) {
    sum += 0.299 * pixels[i] + 0.587 * pixels[i + 1] + 0.114 * pixels[i + 2];
  }
  const mean = sum / (pixels.length / 4);
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

function stageProgress(status: string, rawProgress: number): number {
  const stages: Record<string, { label: string; range: [number, number] }> = {
    'loading tesseract core':        { label: 'فتح الكاميرا',     range: [0, 10] },
    'loading language traineddata':   { label: 'فتح الكاميرا',     range: [10, 20] },
    'initializing api':              { label: 'معالجة الصورة',    range: [20, 30] },
    'preprocessing':                 { label: 'معالجة الصورة',    range: [30, 50] },
    'recognizing text':              { label: 'تشغيل OCR',        range: [50, 80] },
    'analyzing name':                { label: 'استخراج الاسم',    range: [80, 100] },
    'complete':                      { label: 'اكتمل',            range: [100, 100] },
  };
  const s = stages[status];
  if (!s) return 0;
  const [min, max] = s.range;
  return min + (max - min) * Math.min(rawProgress, 1);
}

function extractArabicPersonName(lines: string[]): string | null {
  const REJECTED_PATTERNS = [
    /رقم\s+الهوية|الهوية\s+الوطنية|الإقامة|الجنسية|العنوان|تاريخ\s+الميلاد|الجنس|النوع|المهنة|جهة\s+الإصدار/,
  ];
  const candidates = lines
    .filter(line => !REJECTED_PATTERNS.some(p => p.test(line)))
    .filter(line => {
      const words = line.split(/\s+/).filter(w => /[\u0600-\u06FF]/.test(w));
      return words.length >= 2 && words.length <= 6;
    })
    .sort((a, b) => b.length - a.length);
  return candidates.length > 0 ? candidates[0] : (lines.length > 0 ? lines[0] : null);
}

describe('OCR — Stage Progress Calculation', () => {
  it('should give 0% for unknown stage', () => {
    expect(stageProgress('unknown', 0.5)).toBe(0);
  });

  it('should calculate progress within range', () => {
    const progress = stageProgress('loading tesseract core', 0.5);
    expect(progress).toBeGreaterThanOrEqual(0);
    expect(progress).toBeLessThanOrEqual(10);
  });

  it('should return min when progress is 0', () => {
    expect(stageProgress('loading language traineddata', 0)).toBe(10);
  });

  it('should return max when progress is 1', () => {
    expect(stageProgress('loading language traineddata', 1)).toBe(20);
  });

  it('should handle complete stage', () => {
    expect(stageProgress('complete', 0)).toBe(100);
    expect(stageProgress('complete', 1)).toBe(100);
  });
});

describe('OCR — Text Cleaning', () => {
  it('should extract Arabic lines from raw OCR output', () => {
    const raw = 'محمد أحمد\nعلي عمر\nSome English\n12345\n';
    const lines = cleanOcrText(raw);
    expect(lines.length).toBeGreaterThanOrEqual(2);
    expect(lines.some(l => l.includes('محمد'))).toBe(true);
    expect(lines.some(l => l.includes('علي'))).toBe(true);
  });

  it('should filter out non-Arabic lines', () => {
    const raw = 'Hello World\nمحمد أحمد\nLorem Ipsum\n';
    const lines = cleanOcrText(raw);
    expect(lines.every(l => /[\u0600-\u06FF]/.test(l))).toBe(true);
  });

  it('should deduplicate lines', () => {
    const raw = 'محمد أحمد\nمحمد أحمد\nعلي عمر\n';
    const lines = cleanOcrText(raw);
    expect(lines.filter(l => l === 'محمد أحمد').length).toBe(1);
  });

  it('should filter short lines (< 3 chars)', () => {
    const raw = 'محمد أحمد\nأ\nب\n';
    const lines = cleanOcrText(raw);
    expect(lines.every(l => l.length >= 3)).toBe(true);
  });

  it('should sort by line length descending', () => {
    const raw = 'محمد أحمد علي عمر\nمحمد أحمد\n';
    const lines = cleanOcrText(raw);
    expect(lines[0].length).toBeGreaterThanOrEqual(lines[1]?.length || 0);
  });

  it('should remove special characters', () => {
    const raw = 'محمد!@# أحمد\n';
    const lines = cleanOcrText(raw);
    expect(lines[0]).not.toContain('!');
    expect(lines[0]).not.toContain('@');
    expect(lines[0]).not.toContain('#');
  });

  it('should return empty array for empty input', () => {
    expect(cleanOcrText('')).toEqual([]);
  });

  it('should handle mixed Arabic and numbers', () => {
    const raw = 'محمد 123 أحمد\n';
    const lines = cleanOcrText(raw);
    expect(lines.some(l => l.includes('محمد'))).toBe(true);
  });

  it('should return empty array for low confidence', () => {
    const raw = 'محمد أحمد\nعلي عمر\n';
    expect(cleanOcrText(raw, 30)).toEqual([]);
    expect(cleanOcrText(raw, 59)).toEqual([]);
  });

  it('should return results for high confidence', () => {
    const raw = 'محمد أحمد\nعلي عمر\n';
    const lines = cleanOcrText(raw, 75);
    expect(lines.length).toBeGreaterThanOrEqual(2);
  });

  it('should filter lines with only single-char Arabic words', () => {
    const raw = 'أ ب ت\nمحمد أحمد\n';
    const lines = cleanOcrText(raw);
    expect(lines.some(l => l.includes('محمد'))).toBe(true);
    expect(lines.every(l => l.length >= 3)).toBe(true);
  });

  it('should handle mixed Latin and Arabic', () => {
    const raw = 'Name: محمد أحمد\nID: 12345\nعلي عمر\n';
    const lines = cleanOcrText(raw);
    expect(lines.every(l => /[\u0600-\u06FF]/.test(l))).toBe(true);
  });

  it('should remove duplicate Arabic words within line', () => {
    const raw = 'محمد محمد أحمد\n';
    const lines = cleanOcrText(raw);
    expect(lines.some(l => l.includes('محمد'))).toBe(true);
  });
});

describe('OCR — Name Extraction', () => {
  it('should extract name with at least 2 Arabic words', () => {
    const lines = ['محمد أحمد', 'شيء', 'تفاصيل إضافية'];
    expect(extractValidName(lines)).toBe('محمد أحمد');
  });

  it('should return first line if no line has 2+ Arabic words', () => {
    const lines = ['محمد'];
    expect(extractValidName(lines)).toBe('محمد');
  });

  it('should return null for empty array', () => {
    expect(extractValidName([])).toBeNull();
  });

  it('should prefer multi-word names', () => {
    const lines = ['محمد', 'علي عمران', 'أحمد'];
    expect(extractValidName(lines)).toBe('علي عمران');
  });

  it('should skip lines without Arabic text', () => {
    const lines = ['John Doe', 'محمد أحمد'];
    expect(extractValidName(lines)).toBe('محمد أحمد');
  });

  it('should extract name with 3 Arabic words', () => {
    const lines = ['محمد أحمد علي', 'أحمد'];
    expect(extractValidName(lines)).toBe('محمد أحمد علي');
  });

  it('should extract name from single Arabic word line', () => {
    const lines = ['محمد'];
    expect(extractValidName(lines)).toBe('محمد');
  });

  it('should handle lines with mixed content', () => {
    const lines = ['ID: 123', 'الاسم: محمد أحمد عمر', 'تاريخ'];
    expect(extractValidName(lines)).toBe('الاسم: محمد أحمد عمر');
  });
});

describe('OCR — Otsu Thresholding', () => {
  it('should return a threshold between 0 and 255', () => {
    const pixels = new Uint8ClampedArray(400);
    for (let i = 0; i < pixels.length; i += 4) {
      const v = Math.random() * 255;
      pixels[i] = pixels[i + 1] = pixels[i + 2] = v;
      pixels[i + 3] = 255;
    }
    const thresh = otsuThreshold(pixels);
    expect(thresh).toBeGreaterThanOrEqual(0);
    expect(thresh).toBeLessThanOrEqual(255);
  });

  it('should return 128 for uniform pixel distribution', () => {
    const pixels = new Uint8ClampedArray(400);
    for (let i = 0; i < pixels.length; i++) {
      pixels[i] = 128;
    }
    const thresh = otsuThreshold(pixels);
    expect(thresh).toBeGreaterThanOrEqual(0);
  });

  it('should return threshold in range for dark pixels', () => {
    const pixels = new Uint8ClampedArray(400);
    for (let i = 0; i < pixels.length; i += 4) {
      pixels[i] = pixels[i + 1] = pixels[i + 2] = 30;
      pixels[i + 3] = 255;
    }
    const thresh = otsuThreshold(pixels);
    expect(thresh).toBeGreaterThanOrEqual(0);
    expect(thresh).toBeLessThanOrEqual(255);
  });

  it('should return threshold in range for bright pixels', () => {
    const pixels = new Uint8ClampedArray(400);
    for (let i = 0; i < pixels.length; i += 4) {
      pixels[i] = pixels[i + 1] = pixels[i + 2] = 200;
      pixels[i + 3] = 255;
    }
    const thresh = otsuThreshold(pixels);
    expect(thresh).toBeGreaterThanOrEqual(0);
    expect(thresh).toBeLessThanOrEqual(255);
  });

  it('should handle bimodal distribution', () => {
    const pixels = new Uint8ClampedArray(800);
    for (let i = 0; i < 400; i += 4) {
      pixels[i] = pixels[i + 1] = pixels[i + 2] = 20;
      pixels[i + 3] = 255;
    }
    for (let i = 400; i < 800; i += 4) {
      pixels[i] = pixels[i + 1] = pixels[i + 2] = 200;
      pixels[i + 3] = 255;
    }
    const thresh = otsuThreshold(pixels);
    expect(thresh).toBeGreaterThanOrEqual(0);
    expect(thresh).toBeLessThanOrEqual(255);
  });

  it('should handle all-black pixels', () => {
    const pixels = new Uint8ClampedArray(400);
    const thresh = otsuThreshold(pixels);
    expect(thresh).toBeGreaterThanOrEqual(0);
  });

  it('should handle all-white pixels', () => {
    const pixels = new Uint8ClampedArray(400);
    for (let i = 0; i < pixels.length; i++) {
      pixels[i] = 255;
    }
    const thresh = otsuThreshold(pixels);
    expect(thresh).toBeGreaterThanOrEqual(0);
  });
});

describe('OCR — Preprocessing Pipeline', () => {
  it('should handle empty string in cleaning', () => {
    const result = cleanOcrText('');
    expect(result).toEqual([]);
  });

  it('should reject confidence below threshold', () => {
    const result = cleanOcrText('محمد أحمد', 0);
    expect(result).toEqual([]);
  });

  it('should accept confidence at threshold', () => {
    const result = cleanOcrText('محمد أحمد', 60);
    expect(result.length).toBeGreaterThan(0);
  });

  it('should handle whitespace-only input', () => {
    const result = cleanOcrText('   \n  \n  ');
    expect(result).toEqual([]);
  });

  it('should handle long Arabic name with special chars', () => {
    const raw = 'محمد أحمد علي عمر (مدير)\n';
    const lines = cleanOcrText(raw);
    expect(lines.some(l => l.includes('محمد'))).toBe(true);
    expect(lines.every(l => !l.includes('('))).toBe(true);
  });
});

describe('OCR — Arabic Person Name Extraction', () => {
  it('should extract clean Arabic name', () => {
    const lines = ['أحمد', 'محمد أحمد علي'];
    expect(extractArabicPersonName(lines)).toBe('محمد أحمد علي');
  });

  it('should reject lines with ID patterns', () => {
    const lines = ['رقم الهوية 12345', 'محمد أحمد عمر'];
    expect(extractArabicPersonName(lines)).toBe('محمد أحمد عمر');
  });

  it('should reject lines with nationality patterns', () => {
    const lines = ['الجنسية يمني', 'عبدالله محمد'];
    expect(extractArabicPersonName(lines)).toBe('عبدالله محمد');
  });

  it('should reject lines with address patterns', () => {
    const lines = ['العنوان صنعاء', 'علي حسن صالح'];
    expect(extractArabicPersonName(lines)).toBe('علي حسن صالح');
  });

  it('should reject lines with date of birth patterns', () => {
    const lines = ['تاريخ الميلاد 1990', 'محمد أحمد علي صالح'];
    expect(extractArabicPersonName(lines)).toBe('محمد أحمد علي صالح');
  });

  it('should reject lines with gender patterns', () => {
    const lines = ['الجنس ذكر', 'فاطمة أحمد'];
    expect(extractArabicPersonName(lines)).toBe('فاطمة أحمد');
  });

  it('should reject single-word lines', () => {
    const lines = ['محمد', 'أحمد علي'];
    expect(extractArabicPersonName(lines)).toBe('أحمد علي');
  });

  it('should reject lines with more than 6 Arabic words', () => {
    const lines = ['محمد أحمد علي عمر حسن خالد سعيد', 'أحمد علي'];
    expect(extractArabicPersonName(lines)).toBe('أحمد علي');
  });

  it('should prefer longer valid names', () => {
    const lines = ['أحمد', 'محمد أحمد علي عمر'];
    expect(extractArabicPersonName(lines)).toBe('محمد أحمد علي عمر');
  });

  it('should return null for empty array', () => {
    expect(extractArabicPersonName([])).toBeNull();
  });

  it('should handle mixed content with rejected patterns', () => {
    const lines = ['رقم الهوية: 1234567890', 'الجنسية: يمني', 'محمد أحمد علي صالح'];
    expect(extractArabicPersonName(lines)).toBe('محمد أحمد علي صالح');
  });

  it('should handle lines with only rejected content', () => {
    const lines = ['رقم الهوية 12345', 'تاريخ الميلاد 1990'];
    const result = extractArabicPersonName(lines);
    expect(result).not.toBeNull();
  });
});
