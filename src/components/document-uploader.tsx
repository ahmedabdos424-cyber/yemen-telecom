import React, { useState } from 'react';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { Camera as CameraIcon, Check, RefreshCw } from 'lucide-react';

export const DocumentUploader: React.FC = () => {
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const handleCapture = async () => {
    try {
      const photo = await Camera.getPhoto({
        quality: 90,
        allowEditing: false,
        resultType: CameraResultType.Uri,
        source: CameraSource.Camera, // فتح الكاميرا مباشرة
      });
      if (photo.webPath) {
        setPhotoUri(photo.webPath);
        setShowPreview(true);
      }
    } catch (e) {
      console.log('User cancelled capture');
    }
  };

  const handleRetake = () => {
    setPhotoUri(null);
    setShowPreview(false);
  };

  const handleConfirm = async () => {
    if (!photoUri) return;
    setIsUploading(true);
    try {
      // Convert URI to blob for upload
      const response = await fetch(photoUri);
      const blob = await response.blob();

      // Create FormData for multipart upload
      const formData = new FormData();
      formData.append('document', blob, 'document.jpg');

      // Call the upload API endpoint
      const uploadResponse = await fetch('/api/upload/image', {
        method: 'POST',
        body: formData,
      });

      if (!uploadResponse.ok) {
        const errorData = await uploadResponse.json();
        throw new Error(errorData.error || 'Upload failed');
      }

      const result = await uploadResponse.json();
      // Image uploaded successfully - show success and reset
      console.log('Image uploaded successfully:', result);

      // TODO: Can navigate to next step or show success notification
      // Example: toastSuccess('تم رفع المستند بنجاح', 'يمكنك الآن المتابعة');

      setPhotoUri(null);
      setShowPreview(false);
    } catch (error: any) {
      console.error('Upload failed:', error);
      // TODO: Show error notification
      // toastError('فشل رفع المستند', error.message || 'حدث خطأ غير متوقع');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto p-4 space-y-4 text-right dir-rtl">
      {showPreview && photoUri ? (
        <div className="border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-2xl p-6 text-center bg-gray-50 dark:bg-gray-900 transition-all">
          <img
            src={photoUri}
            alt="Document Preview"
            className="w-full h-48 object-cover rounded-xl shadow-md mb-4"
          />
          <div className="flex gap-3 justify-center">
            <button
              onClick={handleRetake}
              className="flex items-center gap-2 px-4 py-2 bg-gray-200 dark:bg-gray-800 text-gray-800 dark:text-gray-200 rounded-xl font-medium"
            >
              <RefreshCw className="w-4 h-4"/> حاول ثانية
            </button>
            <button
              onClick={handleConfirm}
              className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-xl font-medium shadow-lg hover:bg-blue-700"
              disabled={isUploading}
            >
              <Check className="w-4 h-4"/> موافق
              {isUploading && <span className="text-xs ml-2"> جارٍ الرفع...</span>}
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/40 text-blue-600 rounded-full flex items-center justify-center mx-auto">
            <CameraIcon className="w-8 h-8"/>
          </div>
          <h3 className="text-lg font-semibold">التقاط صورة الهوية / المستند</h3>
          <p className="text-sm text-gray-500">انقر للفتح المباشر لكاميرا الجهاز لالتقاط الصورة</p>
          <button
            onClick={handleCapture}
            className="mt-2 w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl shadow-md flex items-center justify-center gap-2 transition"
          >
            <CameraIcon className="w-5 h-5"/> فتح الكاميرا
          </button>
        </div>
      )}
    </div>
  );
};