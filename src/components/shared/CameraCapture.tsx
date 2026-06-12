import React, { useRef, useCallback, useState, useEffect } from 'react';
import { Camera, RefreshCw, X, Check, Settings } from 'lucide-react';

interface CameraCaptureProps {
  onCapture: (imageData: string) => void;
  iconSize?: number;
}

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

export default function CameraCapture({ onCapture, iconSize = 16 }: CameraCaptureProps) {
  const [scanning, setScanning] = useState(false);
  const [showViewfinder, setShowViewfinder] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [permissionDenied, setPermissionDenied] = useState(false);
  const [permanentDenial, setPermanentDenial] = useState(false);
  const streamStartTimeRef = useRef(0);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const denialCountRef = useRef(0);

  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
        streamRef.current = null;
      }
      disposeCanvas(canvasRef.current);
    };
  }, []);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    disposeCanvas(canvasRef.current);
    setShowViewfinder(false);
    setScanning(false);
  }, []);

  const startCamera = useCallback(async () => {
    setPermissionDenied(false);
    setPermanentDenial(false);
    setScanning(true);
    setShowViewfinder(true);
    setPreviewImage(null);
    try {
      const s = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      streamRef.current = s;
      denialCountRef.current = 0;
      if (videoRef.current) {
        videoRef.current.srcObject = s;
        videoRef.current.play();
      }
    } catch (err) {
      setShowViewfinder(false);
      setScanning(false);
      const isPermissionError = err instanceof DOMException && (
        err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError'
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
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = Math.min(video.videoWidth, 1920);
      canvas.height = Math.min(video.videoHeight, 1920);
      canvas.getContext('2d')?.drawImage(video, 0, 0);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.7);
      disposeCanvas(canvas);
      setPreviewImage(dataUrl);
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
  }, []);

  const confirmCapture = useCallback(() => {
    if (previewImage) {
      setPreviewImage(null);
      onCapture(previewImage);
    }
    setShowViewfinder(false);
    setScanning(false);
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

      {showViewfinder && !previewImage && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
           <div className="relative w-full max-w-lg md:max-w-xl bg-slate-900 border border-slate-800 rounded-t-3xl sm:rounded-3xl overflow-hidden shadow-2xl">
              <div className="relative aspect-[4/3] bg-black flex items-center justify-center">
                <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
                <div className="absolute inset-0 border-[3px] border-dashed border-red-400/40 m-8 rounded-2xl pointer-events-none" />
              </div>
              <div className="flex gap-3 p-4 bg-slate-950">
               <button
                  type="button"
                  onClick={captureFrame}
                  className="btn btn-sm flex-1 bg-red-600 hover:bg-red-500 text-white flex items-center justify-center gap-2"
                >
                  <Camera size={16} />
                  التقاط الصورة
                </button>
                <button
                  type="button"
                  onClick={stopCamera}
                  className="btn btn-sm flex-1 bg-slate-800 hover:bg-slate-700 text-slate-300"
                >
                  إلغاء
                </button>
             </div>
           </div>
         </div>
      )}

      {showViewfinder && previewImage && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="relative w-full max-w-lg md:max-w-xl bg-slate-900 border border-slate-800 rounded-t-3xl sm:rounded-3xl overflow-hidden shadow-2xl">
            <div className="relative aspect-[4/3] bg-black flex items-center justify-center">
              <img src={previewImage} alt="المعاينة" className="w-full h-full object-contain" />
              <div className="absolute top-3 right-3 bg-emerald-500/20 border border-emerald-400/30 text-emerald-400 text-[10px] px-2.5 py-1 rounded-full font-bold">
                معاينة
              </div>
            </div>
            <div className="flex gap-3 p-4 bg-slate-950">
              <button
                type="button"
                onClick={confirmCapture}
                className="btn btn-sm flex-1 bg-emerald-600 hover:bg-emerald-500 text-white flex items-center justify-center gap-2"
              >
                <Check size={16} />
                موافق
              </button>
              <button
                type="button"
                onClick={retakeCapture}
                className="btn btn-sm flex-1 bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center gap-2"
              >
                <RefreshCw size={16} />
                إعادة
              </button>
            </div>
          </div>
        </div>
      )}

      {permissionDenied && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-sm md:max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl text-center">
            <Camera size={40} className="mx-auto text-red-400 mb-4" />
            <p className="text-sm text-slate-200 mb-6 leading-relaxed">
              يجب السماح بالوصول إلى الكاميرا لاستخدام قراءة الهوية
            </p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setPermissionDenied(false)}
                className="btn btn-sm flex-1 bg-slate-800 hover:bg-slate-700 text-slate-300"
              >
                إغلاق
              </button>
              <button
                type="button"
                onClick={() => { setPermissionDenied(false); startCamera(); }}
                className="btn btn-sm flex-1 bg-red-600 hover:bg-red-500 text-white"
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
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setPermanentDenial(false)}
                className="btn btn-sm flex-1 bg-slate-800 hover:bg-slate-700 text-slate-300"
              >
                إغلاق
              </button>
              <button
                type="button"
                onClick={() => { setPermanentDenial(false); openAppSettings(); }}
                className="btn btn-sm flex-1 bg-amber-600 hover:bg-amber-500 text-white flex items-center justify-center gap-2"
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
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const denialCountRef = useRef(0);

  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
        streamRef.current = null;
      }
      disposeCanvas(canvasRef.current);
    };
  }, []);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    disposeCanvas(canvasRef.current);
    setShowViewfinder(false);
    setScanning(false);
  }, []);

  const startCamera = useCallback(async () => {
    setPermissionDenied(false);
    setPermanentDenial(false);
    setScanning(true);
    setShowViewfinder(true);
    setPreviewImage(null);
    try {
      const resolution = Math.min(screen.width, screen.height, 1280);
      const s = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: resolution }, height: { ideal: resolution } },
      });
      streamRef.current = s;
      denialCountRef.current = 0;
      if (videoRef.current) {
        videoRef.current.srcObject = s;
        videoRef.current.play();
      }
    } catch {
      try {
        const s = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
        streamRef.current = s;
        denialCountRef.current = 0;
        if (videoRef.current) {
          videoRef.current.srcObject = s;
          videoRef.current.play();
        }
      } catch (err) {
        setShowViewfinder(false);
        setScanning(false);
        const isPermissionError = err instanceof DOMException && (
          err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError'
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
    }
  }, []);

  const captureFrame = useCallback(() => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = Math.min(video.videoWidth, 1920);
      canvas.height = Math.min(video.videoHeight, 1920);
      canvas.getContext('2d')?.drawImage(video, 0, 0);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.7);
      disposeCanvas(canvas);
      setPreviewImage(dataUrl);
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
  }, []);

  const confirmCapture = useCallback(() => {
    if (previewImage) {
      setPreviewImage(null);
      onCapture(previewImage);
    }
    setShowViewfinder(false);
    setScanning(false);
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
              <Check size={8} />
            </div>
          </div>
          <div className="flex-1 text-right">
            <p className="text-[11px] font-bold text-emerald-400 flex items-center gap-1">
              <Check size={14} />
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
            <X size={14} />
          </button>
        </div>
      )}

      {showViewfinder && !previewImage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="relative w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl">
            <div className="relative aspect-[4/3] bg-black flex items-center justify-center">
              <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
              <div className="absolute inset-0 border-[3px] border-dashed border-red-400/40 m-8 rounded-2xl pointer-events-none" />
            </div>
            <div className="flex gap-3 p-4 bg-slate-950">
              <button onClick={captureFrame} className="btn btn-sm flex-1 bg-red-600 hover:bg-red-500 text-white flex items-center justify-center gap-2">
                 <Camera size={16} />
                 التقاط الصورة
               </button>
               <button onClick={stopCamera} className="btn btn-sm flex-1 bg-slate-800 hover:bg-slate-700 text-slate-300">
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}

      {showViewfinder && previewImage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="relative w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl">
            <div className="relative aspect-[4/3] bg-black flex items-center justify-center">
              <img src={previewImage} alt="المعاينة" className="w-full h-full object-contain" />
              <div className="absolute top-3 right-3 bg-emerald-500/20 border border-emerald-400/30 text-emerald-400 text-[10px] px-2.5 py-1 rounded-full font-bold">
                معاينة
              </div>
            </div>
            <div className="flex gap-3 p-4 bg-slate-950">
              <button onClick={confirmCapture} className="btn btn-sm flex-1 bg-emerald-600 hover:bg-emerald-500 text-white flex items-center justify-center gap-2">
                <Check size={16} />
                موافق
              </button>
              <button onClick={retakeCapture} className="btn btn-sm flex-1 bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center gap-2">
                <RefreshCw size={16} />
                إعادة
              </button>
            </div>
          </div>
        </div>
      )}

      {permissionDenied && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-sm md:max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl text-center">
            <Camera size={40} className="mx-auto text-red-400 mb-4" />
            <p className="text-sm text-slate-200 mb-6 leading-relaxed">
              يجب السماح بالوصول إلى الكاميرا لاستخدام قراءة الهوية
            </p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setPermissionDenied(false)}
                className="btn btn-sm flex-1 bg-slate-800 hover:bg-slate-700 text-slate-300"
              >
                إغلاق
              </button>
              <button
                type="button"
                onClick={() => { setPermissionDenied(false); startCamera(); }}
                className="btn btn-sm flex-1 bg-red-600 hover:bg-red-500 text-white"
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
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setPermanentDenial(false)}
                className="btn btn-sm flex-1 bg-slate-800 hover:bg-slate-700 text-slate-300"
              >
                إغلاق
              </button>
              <button
                type="button"
                onClick={() => { setPermanentDenial(false); openAppSettings(); }}
                className="btn btn-sm flex-1 bg-amber-600 hover:bg-amber-500 text-white flex items-center justify-center gap-2"
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
