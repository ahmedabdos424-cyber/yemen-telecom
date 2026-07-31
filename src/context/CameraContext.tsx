import React, { createContext, useContext, useState, useCallback } from 'react';

interface CameraContextValue {
  isCameraOpen: boolean;
  cameraCount: number;
  openCamera: () => void;
  closeCamera: () => void;
}

const CameraContext = createContext<CameraContextValue>({
  isCameraOpen: false,
  cameraCount: 0,
  openCamera: () => {},
  closeCamera: () => {},
});

export function CameraProvider({ children }: { children: React.ReactNode }) {
  const [cameraCount, setCameraCount] = useState(0);
  const isCameraOpen = cameraCount > 0;
  const openCamera = useCallback(() => setCameraCount(c => c + 1), []);
  const closeCamera = useCallback(() => setCameraCount(c => Math.max(0, c - 1)), []);

  return (
    <CameraContext.Provider value={{ isCameraOpen, cameraCount, openCamera, closeCamera }}>
      {children}
    </CameraContext.Provider>
  );
}

export function useCamera() {
  return useContext(CameraContext);
}
