import React, { useRef, useCallback, useState, useEffect } from 'react';
import { Camera, RefreshCw, Settings } from 'lucide-react';
import CameraPreviewModal from './CameraPreviewModal';
import { useCamera } from '../../context/CameraContext';
import { useToast, ToastContainer } from '../../hooks/useToast';

interface CameraCaptureProps {
  onCapture: (imageData: string) => void;
  iconSize?: number;
}

const JPEG_QUALITY = 0.85;
const MAX_DIMENSION = 1600;
const COMPRESS_THRESHOLD = 1024 * 1024;
const HIGH_RES_THRESHOLD = 8000;

let permissionGranted = false;

function isNative(): boolean {
  try {
    return !!(window as unknown as { Capacitor?: { isNative?: boolean } }).Capacitor?.isNative;
  } catch {
    return false;
  }
}

function openAppSettings() {
  const intentUrl = 'intent:#Intent;action=android.settings.APPLICATION_DETAILS_SETTINGS;S:package=com.yemen.telecom;end';
  try { window.location.href = intentUrl; } catch {}
}

function disposeCanvas(c: HTMLCanvasElement | null) {
  if (!c) return;
  c.width = 0;
  c.height = 0;
  const ctx = c.getContext('2d');
  if (ctx) ctx.clearRect(0, 0, 0, 0);
}

async function getImageDimensions(blob: Blob): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(blob);
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve({ width: img.width, height: img.height });
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Failed to load image')); };
    img.src = url;
  });
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

async function compressImage(blob: Blob, maxDim: number, quality = JPEG_QUALITY): Promise<Blob> {
  const dims = await getImageDimensions(blob);
  let { width, height } = dims;
  if (width > maxDim || height > maxDim) {
    const ratio = Math.min(maxDim / width, maxDim / height);
    width = Math.round(width * ratio);
    height = Math.round(height * ratio);
  }
  return new Promise((resolve) => {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) { resolve(blob); return; }
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.onload = () => {
      ctx.drawImage(img, 0, 0, width, height);
      URL.revokeObjectURL(url);
      canvas.toBlob(
        (b) => { resolve(b || blob); disposeCanvas(canvas); },
        'image/jpeg',
        quality
      );
    };
    img.onerror = () => { URL.revokeObjectURL(url); resolve(blob); };
    img.src = url;
  });
}

async function requestNativeCameraPermission(): Promise<'granted' | 'denied'> {
  try {
    const { Camera } = await import('@capacitor/camera');
    if (typeof Camera.checkPermissions !== 'function') return 'denied';
    const status = await Camera.checkPermissions();
    if (status.camera === 'granted') return 'granted';
    if (status.camera === 'denied' || status.camera === 'limited') return 'denied';
    const requested = await Camera.requestPermissions({ permissions: ['camera'] });
    return requested.camera === 'granted' ? 'granted' : 'denied';
  } catch {
    return 'denied';
  }
}

async function captureWithCapacitorCamera(): Promise<string> {
  const perm = await requestNativeCameraPermission();
  if (perm === 'denied') {
    throw new Error('permission denied permanently');
  }

  const { Camera, CameraResultType, CameraDirection, CameraSource } = await import('@capacitor/camera');
  const { Filesystem, Directory } = await import('@capacitor/filesystem');

  const photo = await Promise.race([
    Camera.getPhoto({
      quality: 95,
      allowEditing: false,
      resultType: CameraResultType.Uri,
      direction: CameraDirection.Rear,
      source: CameraSource.Camera,
    }),
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('الكاميرا لم تستجب خلال 15 ثانية. يرجى المحاولة مرة أخرى.')), 15000)
    ),
  ]) as Awaited<ReturnType<typeof Camera.getPhoto>>;

  if (!photo.webPath) throw new Error('فشل التقاط الصورة');

  const response = await fetch(photo.webPath);
  let blob = await response.blob();
  URL.revokeObjectURL(photo.webPath);

  if (blob.size > COMPRESS_THRESHOLD) {
    blob = await compressImage(blob, MAX_DIMENSION, JPEG_QUALITY);
  } else {
    const dims = await getImageDimensions(blob);
    if (dims.width > HIGH_RES_THRESHOLD || dims.height > HIGH_RES_THRESHOLD) {
      blob = await compressImage(blob, MAX_DIMENSION, JPEG_QUALITY);
    }
  }

  const dataUrl = await blobToDataUrl(blob);

  try {
    if (photo.path) {
      await Filesystem.deleteFile({ path: photo.path, directory: Directory.Cache });
    }
  } catch {}

  return dataUrl;
}

async function captureWithWebRTC(_resolution: number, video: HTMLVideoElement, canvas: HTMLCanvasElement): Promise<string> {
  const vw = video.videoWidth || 1280;
  const vh = video.videoHeight || 960;
  let w = vw, h = vh;
  if (w > MAX_DIMENSION || h > MAX_DIMENSION) {
    const ratio = Math.min(MAX_DIMENSION / w, MAX_DIMENSION / h);
    w = Math.round(w * ratio);
    h = Math.round(h * ratio);
  }
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Failed to get canvas context');
  ctx.drawImage(video, 0, 0, w, h);
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', JPEG_QUALITY));
  disposeCanvas(canvas);
  if (!blob) throw new Error('Failed to capture frame');
  const dataUrl = await blobToDataUrl(blob);
  return dataUrl;
}

export default function CameraCapture({ onCapture, iconSize = 16 }: CameraCaptureProps) {
  const [scanning, setScanning] = useState(false);
  const [showViewfinder, setShowViewfinder] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [permissionDenied, setPermissionDenied] = useState(false);
  const [permanentDenial, setPermanentDenial] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [captureLocked, setCaptureLocked] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const denialCountRef = useRef(0);
  const mountedRef = useRef(true);
  const capturedDataRef = useRef<string | null>(null);
  const { openCamera, closeCamera } = useCamera();
  const prevShowRef = useRef(showViewfinder);
  const { toasts, dismissToast, toastSuccess, toastInfo, toastError } = useToast();

  useEffect(() => {
    if (showViewfinder && !prevShowRef.current) openCamera();
    else if (!showViewfinder && prevShowRef.current) closeCamera();
    prevShowRef.current = showViewfinder;
  }, [showViewfinder]);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => { try { t.stop(); } catch {} });
        streamRef.current = null;
      }
      if (videoRef.current) videoRef.current.srcObject = null;
      disposeCanvas(canvasRef.current);
    };
  }, []);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => { try { t.stop(); } catch {} });
      streamRef.current = null;
    }
    if (videoRef.current) videoRef.current.srcObject = null;
    disposeCanvas(canvasRef.current);
    setShowViewfinder(false);
    setScanning(false);
  }, []);

  const handleCaptureResult = useCallback(async (dataUrl: string) => {
    if (!mountedRef.current) return;
    capturedDataRef.current = dataUrl;
    setPreviewImage(dataUrl);
    setProcessing(false);
    setCaptureLocked(false);
    toastSuccess('تم التقاط الصورة', 'يمكنك الآن مراجعتها وتأكيدها');
  }, [toastSuccess]);

  const doCaptureWebRTC = useCallback(async () => {
    if (!videoRef.current || !canvasRef.current || captureLocked) return;
    setCaptureLocked(true);
    setProcessing(true);
    try {
      const resolution = Math.min(screen.width, screen.height, 1920);
      const dataUrl = await captureWithWebRTC(resolution, videoRef.current, canvasRef.current);
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => { try { t.stop(); } catch {} });
        streamRef.current = null;
      }
      if (videoRef.current) videoRef.current.srcObject = null;
      disposeCanvas(canvasRef.current);
      handleCaptureResult(dataUrl);
    } catch {
      setCaptureLocked(false);
      setProcessing(false);
    }
  }, [captureLocked, handleCaptureResult]);

  const doCaptureNative = useCallback(async () => {
    if (captureLocked) return;
    setCaptureLocked(true);
    setProcessing(true);
    try {
      const dataUrl = await captureWithCapacitorCamera();
      await handleCaptureResult(dataUrl);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes('cancelled') || msg.includes('User cancelled')) {
        setShowViewfinder(false);
        setScanning(false);
      }
      setCaptureLocked(false);
      setProcessing(false);
    }
  }, [captureLocked, handleCaptureResult]);

  const startCamera = useCallback(async () => {
    if (!mountedRef.current) return;
    setPermissionDenied(false);
    setPermanentDenial(false);
    setScanning(true);
    setPreviewImage(null);
    capturedDataRef.current = null;
    toastInfo('جاري فتح الكاميرا...', 'يرجى الانتظار لحظة');

    if (isNative()) {
      setShowViewfinder(true);
      setProcessing(true);
      try {
        const dataUrl = await captureWithCapacitorCamera();
        await handleCaptureResult(dataUrl);
      } catch (err: unknown) {
        if (!mountedRef.current) return;
        const msg = err instanceof Error ? err.message : String(err);
        if (msg.includes('cancelled') || msg.includes('User cancelled')) {
          setShowViewfinder(false);
          setScanning(false);
          return;
        }
        setProcessing(false);
        setCaptureLocked(false);
        const isPermission = msg.includes('permission') || msg.includes('denied');
        if (isPermission) {
          denialCountRef.current += 1;
          if (denialCountRef.current >= 2) {
            setPermanentDenial(true);
          } else {
            setPermissionDenied(true);
          }
          toastError('تعذر الوصول إلى الكاميرا', 'يرجى السماح بالوصول إلى الكاميرا من إعدادات التطبيق');
        } else {
          setShowViewfinder(false);
          setScanning(false);
          fileInputRef.current?.click();
        }
      }
      return;
    }

    setShowViewfinder(true);
    try {
      if (!permissionGranted) {
        const perm = await navigator.permissions.query({ name: 'camera' as PermissionName });
        if (perm.state === 'denied') {
          setPermanentDenial(true);
          setScanning(false);
          toastError('تم رفض الوصول إلى الكاميرا', 'يرجى فتح الإعدادات والسماح بالوصول إلى الكاميرا');
          return;
        }
        if (perm.state === 'granted') permissionGranted = true;
      }
      const resolution = Math.min(screen.width, screen.height, 1920);
      let s: MediaStream;
      try {
        s = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment', width: { ideal: resolution }, height: { ideal: resolution } },
        });
      } catch {
        s = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      }
      if (!mountedRef.current) { s.getTracks().forEach(t => t.stop()); return; }
      streamRef.current = s;
      denialCountRef.current = 0;
      if (videoRef.current) {
        videoRef.current.srcObject = s;
        try { await videoRef.current.play(); } catch {}
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
        toastError('تعذر الوصول إلى الكاميرا', 'يرجى السماح بالوصول إلى الكاميرا من إعدادات المتصفح');
      } else {
        fileInputRef.current?.click();
      }
    }
  }, [handleCaptureResult, toastInfo, toastError]);

  const captureFrame = useCallback(() => {
    if (isNative()) {
      doCaptureNative();
    } else {
      doCaptureWebRTC();
    }
  }, [doCaptureNative, doCaptureWebRTC]);

  const confirmCapture = useCallback(async () => {
    if (!capturedDataRef.current || !mountedRef.current) return;
    setProcessing(true);
    try {
      const img = capturedDataRef.current;
      capturedDataRef.current = null;
      setPreviewImage(null);
      setShowViewfinder(false);
      setScanning(false);
      onCapture(img);
    } finally {
      if (mountedRef.current) setProcessing(false);
    }
  }, [onCapture]);

  const retakeCapture = useCallback(() => {
    setPreviewImage(null);
    capturedDataRef.current = null;
    startCamera();
  }, [startCamera]);

  const handleFileFallback = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) { setShowViewfinder(false); setScanning(false); return; }
    let blob: Blob = file;
    if (blob.size > COMPRESS_THRESHOLD) {
      blob = await compressImage(blob, MAX_DIMENSION, JPEG_QUALITY);
    }
    const dataUrl = await blobToDataUrl(blob);
    capturedDataRef.current = dataUrl;
    setPreviewImage(dataUrl);
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
        className="input-camera-btn text-slate-500 hover:text-slate-700 disabled:opacity-50"
        title="التقاط صورة"
      >
        {scanning ? <RefreshCw className="animate-spin" size={iconSize} /> : <Camera size={iconSize} />}
      </button>

      <CameraPreviewModal
        show={showViewfinder}
        previewImage={previewImage}
        videoRef={videoRef}
        isViewfinder={!previewImage && !isNative()}
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
              يجب السماح بالوصول إلى الكاميرا لاستخدام التصوير
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

      <ToastContainer toasts={toasts} onDismiss={dismissToast} position="bottom" />
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
  const [captureLocked, setCaptureLocked] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const denialCountRef = useRef(0);
  const mountedRef = useRef(true);
  const capturedDataRef = useRef<string | null>(null);
  const { openCamera, closeCamera } = useCamera();
  const prevShowRef = useRef(showViewfinder);
  const { toasts, dismissToast, toastSuccess, toastInfo, toastError } = useToast();

  useEffect(() => {
    if (showViewfinder && !prevShowRef.current) openCamera();
    else if (!showViewfinder && prevShowRef.current) closeCamera();
    prevShowRef.current = showViewfinder;
  }, [showViewfinder]);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => { try { t.stop(); } catch {} });
        streamRef.current = null;
      }
      if (videoRef.current) videoRef.current.srcObject = null;
      disposeCanvas(canvasRef.current);
    };
  }, []);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => { try { t.stop(); } catch {} });
      streamRef.current = null;
    }
    if (videoRef.current) videoRef.current.srcObject = null;
    disposeCanvas(canvasRef.current);
    setShowViewfinder(false);
    setScanning(false);
  }, []);

  const handleCaptureResult = useCallback(async (dataUrl: string) => {
    if (!mountedRef.current) return;
    capturedDataRef.current = dataUrl;
    setPreviewImage(dataUrl);
    setProcessing(false);
    setCaptureLocked(false);
    toastSuccess('تم التقاط صورة العقد', 'يمكنك الآن مراجعتها وتأكيدها');
  }, [toastSuccess]);

  const startCamera = useCallback(async () => {
    if (!mountedRef.current) return;
    setPermissionDenied(false);
    setPermanentDenial(false);
    setScanning(true);
    setPreviewImage(null);
    capturedDataRef.current = null;
    toastInfo('جاري فتح الكاميرا...', 'يرجى الانتظار لحظة');

    if (isNative()) {
      setShowViewfinder(true);
      setProcessing(true);
      try {
        const dataUrl = await captureWithCapacitorCamera();
        await handleCaptureResult(dataUrl);
      } catch (err: unknown) {
        if (!mountedRef.current) return;
        const msg = err instanceof Error ? err.message : String(err);
        if (msg.includes('cancelled') || msg.includes('User cancelled')) {
          setShowViewfinder(false);
          setScanning(false);
          return;
        }
        setProcessing(false);
        setCaptureLocked(false);
        const isPermission = msg.includes('permission') || msg.includes('denied');
        if (isPermission) {
          denialCountRef.current += 1;
          if (denialCountRef.current >= 2) {
            setPermanentDenial(true);
          } else {
            setPermissionDenied(true);
          }
          toastError('تعذر الوصول إلى الكاميرا', 'يرجى السماح بالوصول إلى الكاميرا من إعدادات التطبيق');
        } else {
          setShowViewfinder(false);
          setScanning(false);
          fileInputRef.current?.click();
        }
      }
      return;
    }

    setShowViewfinder(true);
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
      if (!mountedRef.current) { s.getTracks().forEach(t => t.stop()); return; }
      streamRef.current = s;
      denialCountRef.current = 0;
      if (videoRef.current) {
        videoRef.current.srcObject = s;
        try { await videoRef.current.play(); } catch {}
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
        if (denialCountRef.current >= 2) { setPermanentDenial(true); }
        else { setPermissionDenied(true); }
        toastError('تعذر الوصول إلى الكاميرا', 'يرجى السماح بالوصول إلى الكاميرا من إعدادات المتصفح');
      } else { fileInputRef.current?.click(); }
    }
  }, [handleCaptureResult, toastInfo, toastError]);

  const captureFrame = useCallback(() => {
    if (!videoRef.current || !canvasRef.current || captureLocked) return;
    setCaptureLocked(true);
    setProcessing(true);
    try {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const vw = video.videoWidth || 1280;
      const vh = video.videoHeight || 960;
      let w = vw, h = vh;
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
        canvas.toBlob(async (blob) => {
          if (!blob) { setCaptureLocked(false); setProcessing(false); return; }
          const dataUrl = await blobToDataUrl(blob);
          disposeCanvas(canvas);
          if (streamRef.current) {
            streamRef.current.getTracks().forEach(t => { try { t.stop(); } catch {} });
            streamRef.current = null;
          }
          if (videoRef.current) videoRef.current.srcObject = null;
          await handleCaptureResult(dataUrl);
        }, 'image/jpeg', JPEG_QUALITY);
      }
    } catch { setCaptureLocked(false); setProcessing(false); }
  }, [captureLocked, handleCaptureResult]);

  const confirmCapture = useCallback(async () => {
    if (!capturedDataRef.current || !mountedRef.current) return;
    setProcessing(true);
    try {
      const img = capturedDataRef.current;
      capturedDataRef.current = null;
      setPreviewImage(null);
      setShowViewfinder(false);
      setScanning(false);
      onCapture(img);
    } finally {
      if (mountedRef.current) setProcessing(false);
    }
  }, [onCapture]);

  const retakeCapture = useCallback(() => {
    setPreviewImage(null);
    capturedDataRef.current = null;
    startCamera();
  }, [startCamera]);

  const handleFileFallback = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) { setShowViewfinder(false); setScanning(false); return; }
    let blob: Blob = file;
    if (blob.size > COMPRESS_THRESHOLD) {
      blob = await compressImage(blob, MAX_DIMENSION, JPEG_QUALITY);
    }
    const dataUrl = await blobToDataUrl(blob);
    capturedDataRef.current = dataUrl;
    setPreviewImage(dataUrl);
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
          className="btn w-full flex items-center justify-between border border-dashed border-slate-700 text-xs text-slate-500 font-medium hover:border-slate-500 hover:text-slate-300 disabled:opacity-50"
        >
          <span>التقط صورة العقد</span>
          {scanning ? <RefreshCw className="animate-spin" size={16} /> : <Camera size={16} />}
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

      <CameraPreviewModal
        show={showViewfinder}
        previewImage={previewImage}
        videoRef={videoRef}
        isViewfinder={!previewImage && !isNative()}
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
              يجب السماح بالوصول إلى الكاميرا لاستخدام التصوير
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

      <ToastContainer toasts={toasts} onDismiss={dismissToast} position="bottom" />
    </>
  );
}
