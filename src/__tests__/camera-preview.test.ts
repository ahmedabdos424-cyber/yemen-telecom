/**
 * @vitest-environment node
 *
 * P0-08 Regression tests: camera preview videoRef wiring.
 * Verifies that videoRef is passed from CameraCapture/DocumentCapture
 * to CameraPreviewModal and wired to the <video> element.
 */
import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const capturePath = path.resolve(__dirname, '../components/shared/CameraCapture.tsx');
const modalPath = path.resolve(__dirname, '../components/shared/CameraPreviewModal.tsx');

describe('P0-08 Camera Preview videoRef Wiring', () => {
  describe('CameraPreviewModal.tsx', () => {
    const source = fs.readFileSync(modalPath, 'utf-8');

    it('should have videoRef in the interface props', () => {
      expect(source).toContain('videoRef?: React.RefObject<HTMLVideoElement | null>');
    });

    it('should destructure videoRef from props', () => {
      expect(source).toContain('videoRef,');
    });

    it('should attach videoRef to the video element', () => {
      // The viewfinder video should have ref={videoRef}
      const viewfinderSection = source.match(/<video[^>]*ref=\{videoRef\}[^>]*\/>/);
      expect(viewfinderSection).not.toBeNull();
    });
  });

  describe('CameraCapture.tsx', () => {
    const source = fs.readFileSync(capturePath, 'utf-8');

    it('should create videoRef with useRef', () => {
      expect(source).toContain('const videoRef = useRef<HTMLVideoElement>(null)');
    });

    it('should pass videoRef to CameraPreviewModal in CameraCapture', () => {
      // Find the CameraPreviewModal usage and verify videoRef is passed
      const firstModal = source.indexOf('<CameraPreviewModal');
      const secondModal = source.indexOf('<CameraPreviewModal', firstModal + 20);
      const firstUsage = source.slice(firstModal, source.indexOf('/>', firstModal));
      const secondUsage = source.slice(secondModal, source.indexOf('/>', secondModal));
      expect(firstUsage).toContain('videoRef={videoRef}');
      expect(secondUsage).toContain('videoRef={videoRef}');
    });

    it('should set srcObject on videoRef.current in startCamera', () => {
      const line = source.match(/videoRef\.current\.srcObject\s*=\s*s/);
      expect(line).not.toBeNull();
    });

    it('should not have orphan video element without ref in CameraCapture JSX', () => {
      // CameraCapture should not render its own <video> — the modal handles it
      const videoTagCount = (source.match(/<video/g) || []).length;
      // The only <video> refs should be in comments/strings
      expect(videoTagCount).toBeLessThan(3);
    });

    it('should draw from videoRef in captureFrame', () => {
      expect(source).toContain('drawImage(video');
      expect(source).toContain('const video = videoRef.current');
    });

    it('should stop camera stream in stopCamera', () => {
      expect(source).toContain('t => t.stop()');
    });

    it('should clean up stream on unmount', () => {
      expect(source).toContain('streamRef.current.getTracks().forEach(t => t.stop())');
    });
  });
});
