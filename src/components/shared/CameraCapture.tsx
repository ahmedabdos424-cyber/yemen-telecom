import React, { useRef, useCallback, useState } from 'react';
import { Camera, RefreshCw, X, Check } from 'lucide-react';

interface CameraCaptureProps {
  onCapture: (imageData: string) => void;
  iconSize?: number;
}

export default function CameraCapture({ onCapture, iconSize = 16 }: CameraCaptureProps) {
  const [scanning, setScanning] = useState(false);
  const [showViewfinder, setShowViewfinder] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    setShowViewfinder(false);
    setScanning(false);
  }, []);

  const startCamera = useCallback(async () => {
    setScanning(true);
    setShowViewfinder(true);
    try {
      const s = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      streamRef.current = s;
      if (videoRef.current) {
        videoRef.current.srcObject = s;
        videoRef.current.play();
      }
    } catch {
      fileInputRef.current?.click();
      setShowViewfinder(false);
      setScanning(false);
    }
  }, []);

  const captureFrame = useCallback(() => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      canvas.getContext('2d')?.drawImage(video, 0, 0);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
      onCapture(dataUrl);
    }
    stopCamera();
  }, [onCapture, stopCamera]);

  const handleFileFallback = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        if (ev.target?.result) {
          onCapture(ev.target.result as string);
        }
      };
      reader.readAsDataURL(file);
    }
    setScanning(false);
  }, [onCapture]);

  return (
    <>
      <input ref={fileInputRef} type="file" accept="image/*" capture="environment" onChange={handleFileFallback} className="hidden" />
      <canvas ref={canvasRef} className="hidden" />

      {/* Camera trigger button */}
      <button
        type="button"
        onClick={startCamera}
        disabled={scanning}
        className="input-camera-btn bg-slate-800 hover:bg-red-600 text-slate-300 hover:text-slate-100 disabled:opacity-50"
        title="التقاط صورة"
      >
        {scanning ? <RefreshCw className="animate-spin" size={iconSize} /> : <Camera size={iconSize} />}
      </button>

      {/* Camera viewfinder overlay */}
      {showViewfinder && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
           <div className="relative w-full max-w-lg bg-slate-900 border border-slate-800 rounded-t-3xl sm:rounded-3xl overflow-hidden shadow-2xl">
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
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    setShowViewfinder(false);
    setScanning(false);
  }, []);

  const startCamera = useCallback(async () => {
    setScanning(true);
    setShowViewfinder(true);
    try {
      const s = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      streamRef.current = s;
      if (videoRef.current) {
        videoRef.current.srcObject = s;
        videoRef.current.play();
      }
    } catch {
      fileInputRef.current?.click();
      setShowViewfinder(false);
      setScanning(false);
    }
  }, []);

  const captureFrame = useCallback(() => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      canvas.getContext('2d')?.drawImage(video, 0, 0);
      onCapture(canvas.toDataURL('image/jpeg', 0.8));
    }
    stopCamera();
  }, [onCapture, stopCamera]);

  const handleFileFallback = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        if (ev.target?.result) onCapture(ev.target.result as string);
      };
      reader.readAsDataURL(file);
    }
    setScanning(false);
  }, [onCapture]);

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

      {/* Viewfinder overlay */}
      {showViewfinder && (
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
    </>
  );
}
