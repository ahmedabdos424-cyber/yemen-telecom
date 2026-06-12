import React, { useRef, useState, useCallback } from 'react';
import { Scan, X, Camera } from 'lucide-react';

interface BarcodeScannerProps {
  onScan: (value: string) => void;
}

export default function BarcodeScanner({ onScan }: BarcodeScannerProps) {
  const [showScanner, setShowScanner] = useState(false);
  const [scanning, setScanning] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    setShowScanner(false);
    setScanning(false);
  }, []);

  // Simple fallback: capture image and let user type manually
  // Full QR decoding uses html5-qrcode for production
  const startScanner = useCallback(async () => {
    setScanning(true);
    setShowScanner(true);
    try {
      const s = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      streamRef.current = s;
      if (videoRef.current) {
        videoRef.current.srcObject = s;
        await videoRef.current.play();
      }
      // Try to use Html5Qrcode if available
      const { Html5Qrcode } = await import('html5-qrcode');
      const html5Qr = new Html5Qrcode('barcode-reader');
      html5Qr.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 250, height: 150 } },
        (decodedText) => {
          html5Qr.stop().catch(() => {});
          stopCamera();
          onScan(decodedText);
        },
        () => {}
      ).catch(() => {
        // Fallback: manual capture mode
      });
    } catch {
      setScanning(false);
      // No camera available — user will type manually
    }
  }, [onScan, stopCamera]);

  const captureManual = useCallback(() => {
    if (videoRef.current) {
      stopCamera();
      onScan('');
    }
  }, [onScan, stopCamera]);

  return (
    <>
      <button
        type="button"
        onClick={startScanner}
        disabled={scanning}
        className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-lg bg-slate-800 hover:bg-red-600 text-slate-300 hover:text-white flex items-center justify-center transition-colors disabled:opacity-50 cursor-pointer"
        title="مسح الباركود"
      >
        <Scan size={15} />
      </button>

      {showScanner && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="relative w-full max-w-lg md:max-w-xl bg-slate-900 border border-slate-800 rounded-t-3xl sm:rounded-3xl overflow-hidden shadow-2xl">
            <div className="relative aspect-[4/3] bg-black flex items-center justify-center">
              <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
              <div id="barcode-reader" className="absolute inset-0" />
              <div className="absolute inset-0 border-[3px] border-dashed border-emerald-400/40 m-8 rounded-2xl pointer-events-none flex items-center justify-center">
                <span className="bg-black/60 text-white text-xs px-3 py-1 rounded-full">
                  وجّه الكاميرا نحو الباركود
                </span>
              </div>
            </div>
            <div className="flex gap-3 p-4 bg-slate-950">
              <button
                type="button"
                onClick={stopCamera}
                className="btn btn-sm flex-1 bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center gap-2"
              >
                <X size={16} />
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
