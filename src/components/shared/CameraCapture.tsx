import React, { useRef, useCallback, useState, useEffect } from 'react';
import { Camera, RefreshCw, Settings } from 'lucide-react';
import CameraPreviewModal from './CameraPreviewModal';

interface CameraCaptureProps {
  onCapture: (imageData: string) => void;
  iconSize?: number;
}

const JPEG_QUALITY = 0.9;
const MAX_DIMENSION = 2048;

function openAppSettings() {
  const intentUrl = 'intent:#Intent;action=android.settings.APPLICATION_DETAILS_SETTINGS;S:package=com.yemen.telecom;end';
  const fallbackUrl = 'app-settings://';
  try { window.location.href = intentUrl; } catch {
    try { window.open(fallbackUrl, '_blank'); } catch {
      /* cannot open settings */
    }
  }
}

function disposeCanvas(c: HTMLCanvasElement | null) {
  if (!c) return;
  c.width = 0;
  c.height = 0;
  const ctx = c.getContext('2d');
  if (ctx) ctx.clearRect(0, 0, 0, 0);
}

function fixImageOrientation(file: File): Promise<File> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      let { width, height } = img;

      if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
        const ratio = Math.min(MAX_DIMENSION / width, MAX_DIMENSION / height);
        width = Math.round(width * ratio);
        height = Math.round(height * ratio);
      }

      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(img, 0, 0, width, height);
        canvas.toBlob(
          (blob) => {
            if (blob) {
              resolve(new File([blob], file.name, { type: 'image/jpeg' }));
            } else {
              resolve(file);
            }
            URL.revokeObjectURL(img.src);
          },
          'image/jpeg',
          JPEG_QUALITY
        );
      } else {
        URL.revokeObjectURL(img.src);
        resolve(file);
      }
    };
    img.onerror = () => {
      URL.revokeObjectURL(img.src);
      resolve(file);
    };
    img.src = URL.createObjectURL(file);
  });
}

function dataUrlToOptimizedBlob(dataUrl: string): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      let { width, height } = img;

      if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
        const ratio = Math.min(MAX_DIMENSION / width, MAX_DIMENSION / height);
        width = Math.round(width * ratio);
        height = Math.round(height * ratio);
      }

      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(img, 0, 0, width, height);
        canvas.toBlob(
          (blob) => {
            if (blob) resolve(blob);
            else reject(new Error('Failed to create blob'));
            URL.revokeObjectURL(img.src);
          },
          'image/jpeg',
          JPEG_QUALITY
        );
      } else {
        URL.revokeObjectURL(img.src);
        reject(new Error('Failed to get canvas context'));
      }
    };
    img.onerror = () => {
      URL.revokeObjectURL(img.src);
      reject(new Error('Failed to load image'));
    };
    img.src = dataUrl;
  });
}

export default function CameraCapture({ onCapture, iconSize = 16 }: CameraCaptureProps) {
  const [scanning, setScanning] = useState(false);
  const [showViewfinder, setShowViewfinder] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [permissionDenied, setPermissionDenied] = useState(false);
  const [permanentDenial, setPermanentDenial] = useState(false);
  const [processing, setProcessing] = useState(false);
  const streamStartTimeRef = useRef(0);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const denialCountRef = useRef(0);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
        streamRef.current = null;
      }
      disposeCanvas(canvasRef.current);
    };
  }, []);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => {
        try { t.stop(); } catch { /* already stopped */ }
      });
      streamRef.current = null;
    }
    disposeCanvas(canvasRef.current);
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setShowViewfinder(false);
    setScanning(false);
  }, []);

  const startCamera = useCallback(async () => {
    if (!mountedRef.current) return;
    setPermissionDenied(false);
    setPermanentDenial(false);
    setScanning(true);
    setShowViewfinder(true);
    setPreviewImage(null);
    streamStartTimeRef.current = Date.now();

    try {
      const resolution = Math.min(screen.width, screen.height, 1920);
      let s: MediaStream;
      try {
        s = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: 'environment',
            width: { ideal: resolution },
            height: { ideal: resolution },
          },
        });
      } catch {
        s = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      }

      if (!mountedRef.current) {
        s.getTracks().forEach(t => t.stop());
        return;
      }

      streamRef.current = s;
      denialCountRef.current = 0;

      if (videoRef.current) {
        videoRef.current.srcObject = s;
        try {
          await videoRef.current.play();
        } catch { /* autoplay blocked, UI still shows */ }
      }
    } catch (err) {
      if (!mountedRef.current) return;
      setShowViewfinder(false);
      setScanning(false);
      const isPermissionError = err instanceof DOMException && (
        err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError' || err.name === 'AbortError'
      );
      if (isPermissionError) {
        denialCountRef.current += 1;
        if (denialCountRef.current >= 2) {
          setPermanentDenial(true);
        } else {
          setPermissionDenied(true);
        }
      } else {
        fileInputRef.current?.click();
      }
    }
  }, []);

  const captureFrame = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const vw = video.videoWidth || 1280;
    const vh = video.videoHeight || 960;

    let w = vw;
    let h = vh;
    if (w > MAX_DIMENSION || h > MAX_DIMENSION) {
      const ratio = Math.min(MAX_DIMENSION / w, MAX_DIMENSION / h);
      w = Math.round(w * ratio);
      h = Math.round(h * ratio);
    }

    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(video, 0, 0, w, h);
      const dataUrl = canvas.toDataURL('image/jpeg', JPEG_QUALITY);
      disposeCanvas(canvas);
      setPreviewImage(dataUrl);
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => {
        try { t.stop(); } catch { /* already stopped */ }
      });
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }, []);

  const confirmCapture = useCallback(async () => {
    if (!previewImage || !mountedRef.current) return;
    setProcessing(true);
    try {
      const img = previewImage;
      setPreviewImage(null);
      setShowViewfinder(false);
      setScanning(false);
      onCapture(img);
    } finally {
      if (mountedRef.current) setProcessing(false);
    }
  }, [previewImage, onCapture]);

  const retakeCapture = useCallback(() => {
    setPreviewImage(null);
    startCamera();
  }, [startCamera]);

  const handleFileFallback = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        if (ev.target?.result) {
          setPreviewImage(ev.target.result as string);
        }
      };
      reader.readAsDataURL(file);
    } else {
      setShowViewfinder(false);
    }
    setScanning(false);
  }, []);

  return (
    <>
      <input ref={fileInputRef} type="file" accept="image/*" capture="environment" onChange={handleFileFallback} className="hidden" />
      <canvas ref={canvasRef} className="hidden" />

      <button
        type="button"
        onClick={startCamera}
        disabled={scanning}
        className="input-camera-btn bg-slate-800 hover:bg-red-600 text-slate-300 hover:text-slate-100 disabled:opacity-50"
        title="التقاط صورة"
      >
        {scanning ? <RefreshCw className="animate-spin" size={iconSize} /> : <Camera size={iconSize} />}
      </button>

      {/* Preview modal — viewfinder or captured image */}
      <CameraPreviewModal
        show={showViewfinder}
        previewImage={previewImage}
        videoRef={videoRef}
        onCapture={captureFrame}
        onConfirm={confirmCapture}
        onRetake={retakeCapture}
        onCancel={stopCamera}
        processing={processing}
      />

      {permissionDenied && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-sm md:max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl text-center">
            <Camera size={40} className="mx-auto text-red-400 mb-4" />
            <p className="text-sm text-slate-200 mb-6 leading-relaxed">
              يجب السماح بالوصول إلى الكاميرا لاستخدام قراءة الهوية
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                type="button"
                onClick={() => setPermissionDenied(false)}
                className="btn btn-sm flex-1 bg-slate-800 hover:bg-slate-700 text-slate-300 min-h-[44px]"
              >
                إغلاق
              </button>
              <button
                type="button"
                onClick={() => { setPermissionDenied(false); startCamera(); }}
                className="btn btn-sm flex-1 bg-red-600 hover:bg-red-500 text-white min-h-[44px]"
              >
                إعادة المحاولة
              </button>
            </div>
          </div>
        </div>
      )}

      {permanentDenial && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-sm md:max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl text-center">
            <Settings size={40} className="mx-auto text-amber-400 mb-4" />
            <p className="text-sm text-slate-200 mb-2 leading-relaxed">
              تم رفض الوصول إلى الكاميرا بشكل دائم
            </p>
            <p className="text-xs text-slate-400 mb-6 leading-relaxed">
              يرجى فتح إعدادات التطبيق والسماح بالوصول إلى الكاميرا
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                type="button"
                onClick={() => setPermanentDenial(false)}
                className="btn btn-sm flex-1 bg-slate-800 hover:bg-slate-700 text-slate-300 min-h-[44px]"
              >
                إغلاق
              </button>
              <button
                type="button"
                onClick={() => { setPermanentDenial(false); openAppSettings(); }}
                className="btn btn-sm flex-1 bg-amber-600 hover:bg-amber-500 text-white flex items-center justify-center gap-2 min-h-[44px]"
              >
                <Settings size={14} />
                فتح الإعدادات
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export function DocumentCapture({ onCapture, capturedImage, onRemove }: {
  onCapture: (imageData: string) => void;
  capturedImage: string | null;
  onRemove: () => void;
}) {
  const [showViewfinder, setShowViewfinder] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [permissionDenied, setPermissionDenied] = useState(false);
  const [permanentDenial, setPermanentDenial] = useState(false);
  const [processing, setProcessing] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const denialCountRef = useRef(0);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => {
          try { t.stop(); } catch { /* already stopped */ }
        });
        streamRef.current = null;
      }
      if (videoRef.current) videoRef.current.srcObject = null;
      disposeCanvas(canvasRef.current);
    };
  }, []);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => {
        try { t.stop(); } catch { /* already stopped */ }
      });
      streamRef.current = null;
    }
    if (videoRef.current) videoRef.current.srcObject = null;
    disposeCanvas(canvasRef.current);
    setShowViewfinder(false);
    setScanning(false);
  }, []);

  const startCamera = useCallback(async () => {
    if (!mountedRef.current) return;
    setPermissionDenied(false);
    setPermanentDenial(false);
    setScanning(true);
    setShowViewfinder(true);
    setPreviewImage(null);

    try {
      const resolution = Math.min(screen.width, screen.height, 1920);
      let s: MediaStream;
      try {
        s = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment', width: { ideal: resolution }, height: { ideal: resolution } },
        });
      } catch {
        s = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      }

      if (!mountedRef.current) {
        s.getTracks().forEach(t => t.stop());
        return;
      }

      streamRef.current = s;
      denialCountRef.current = 0;
      if (videoRef.current) {
        videoRef.current.srcObject = s;
        try { await videoRef.current.play(); } catch { /* autoplay blocked */ }
      }
    } catch (err) {
      if (!mountedRef.current) return;
      setShowViewfinder(false);
      setScanning(false);
      const isPermissionError = err instanceof DOMException && (
        err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError' || err.name === 'AbortError'
      );
      if (isPermissionError) {
        denialCountRef.current += 1;
        if (denialCountRef.current >= 2) {
          setPermanentDenial(true);
        } else {
          setPermissionDenied(true);
        }
      } else {
        fileInputRef.current?.click();
      }
    }
  }, []);

  const captureFrame = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const vw = video.videoWidth || 1280;
    const vh = video.videoHeight || 960;

    let w = vw;
    let h = vh;
    if (w > MAX_DIMENSION || h > MAX_DIMENSION) {
      const ratio = Math.min(MAX_DIMENSION / w, MAX_DIMENSION / h);
      w = Math.round(w * ratio);
      h = Math.round(h * ratio);
    }

    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(video, 0, 0, w, h);
      const dataUrl = canvas.toDataURL('image/jpeg', JPEG_QUALITY);
      disposeCanvas(canvas);
      setPreviewImage(dataUrl);
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => {
        try { t.stop(); } catch { /* already stopped */ }
      });
      streamRef.current = null;
    }
    if (videoRef.current) videoRef.current.srcObject = null;
  }, []);

  const confirmCapture = useCallback(async () => {
    if (!previewImage || !mountedRef.current) return;
    setProcessing(true);
    try {
      const img = previewImage;
      setPreviewImage(null);
      setShowViewfinder(false);
      setScanning(false);
      onCapture(img);
    } finally {
      if (mountedRef.current) setProcessing(false);
    }
  }, [previewImage, onCapture]);

  const retakeCapture = useCallback(() => {
    setPreviewImage(null);
    startCamera();
  }, [startCamera]);

  const handleFileFallback = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        if (ev.target?.result) setPreviewImage(ev.target.result as string);
      };
      reader.readAsDataURL(file);
    } else {
      setShowViewfinder(false);
    }
    setScanning(false);
  }, []);

  return (
    <>
      <input ref={fileInputRef} type="file" accept="image/*" capture="environment" onChange={handleFileFallback} className="hidden" />
      <canvas ref={canvasRef} className="hidden" />

      {!capturedImage ? (
        <button
          type="button"
          onClick={startCamera}
          disabled={scanning}
           className="btn w-full flex items-center justify-between border border-dashed border-slate-800 text-xs text-slate-400 font-medium hover:border-slate-700 hover:text-slate-200 disabled:opacity-50"
        >
          <span>التقط صورة العقد</span>
          {scanning ? (
            <RefreshCw className="animate-spin" size={16} />
          ) : (
            <Camera size={16} />
          )}
        </button>
      ) : (
        <div className="p-3 bg-slate-900 border border-slate-800 rounded-xl flex gap-4 items-center">
          <div className="relative w-20 h-16 bg-slate-950 border border-slate-800 rounded-lg overflow-hidden shrink-0 flex items-center justify-center shadow">
            <img src={capturedImage} alt="Document" className="w-full h-full object-cover" />
            <div className="absolute top-1 right-1 bg-emerald-500 text-white rounded-full p-0.5 shadow">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3} className="w-2 h-2"><path d="M20 6L9 17l-5-5" /></svg>
            </div>
          </div>
          <div className="flex-1 text-right">
            <p className="text-[11px] font-bold text-emerald-400 flex items-center gap-1">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-3.5 h-3.5"><path d="M20 6L9 17l-5-5" /></svg>
              تم التقاط صورة المستند
            </p>
            <button
              type="button"
              onClick={startCamera}
              className="text-[10px] text-slate-400 hover:text-slate-100 mt-1 underline"
            >
              إعادة التصوير
            </button>
          </div>
          <button type="button" onClick={onRemove} className="text-slate-500 hover:text-red-400 p-1">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-3.5 h-3.5"><path d="M18 6L6 18M6 6l12 12" /></svg>
          </button>
        </div>
      )}

      {/* Preview modal for DocumentCapture */}
      <CameraPreviewModal
        show={showViewfinder}
        previewImage={previewImage}
        videoRef={videoRef}
        onCapture={captureFrame}
        onConfirm={confirmCapture}
        onRetake={retakeCapture}
        onCancel={stopCamera}
        processing={processing}
      />

      {permissionDenied && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-sm md:max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl text-center">
            <Camera size={40} className="mx-auto text-red-400 mb-4" />
            <p className="text-sm text-slate-200 mb-6 leading-relaxed">
              يجب السماح بالوصول إلى الكاميرا لاستخدام قراءة الهوية
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                type="button"
                onClick={() => setPermissionDenied(false)}
                className="btn btn-sm flex-1 bg-slate-800 hover:bg-slate-700 text-slate-300 min-h-[44px]"
              >
                إغلاق
              </button>
              <button
                type="button"
                onClick={() => { setPermissionDenied(false); startCamera(); }}
                className="btn btn-sm flex-1 bg-red-600 hover:bg-red-500 text-white min-h-[44px]"
              >
                إعادة المحاولة
              </button>
            </div>
          </div>
        </div>
      )}

      {permanentDenial && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-sm md:max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl text-center">
            <Settings size={40} className="mx-auto text-amber-400 mb-4" />
            <p className="text-sm text-slate-200 mb-2 leading-relaxed">
              تم رفض الوصول إلى الكاميرا بشكل دائم
            </p>
            <p className="text-xs text-slate-400 mb-6 leading-relaxed">
              يرجى فتح إعدادات التطبيق والسماح بالوصول إلى الكاميرا
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                type="button"
                onClick={() => setPermanentDenial(false)}
                className="btn btn-sm flex-1 bg-slate-800 hover:bg-slate-700 text-slate-300 min-h-[44px]"
              >
                إغلاق
              </button>
              <button
                type="button"
                onClick={() => { setPermanentDenial(false); openAppSettings(); }}
                className="btn btn-sm flex-1 bg-amber-600 hover:bg-amber-500 text-white flex items-center justify-center gap-2 min-h-[44px]"
              >
                <Settings size={14} />
                فتح الإعدادات
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
