/**
 * Compress an image file before upload
 * @param file - The original image file
 * @param maxWidth - Maximum width in pixels (default 800)
 * @param maxHeight - Maximum height in pixels (default 800)
 * @param quality - JPEG quality 0-1 (default 0.8)
 * @returns Compressed blob
 */
export const compressImage = (
  file: File,
  maxWidth = 800,
  maxHeight = 800,
  quality = 0.8
): Promise<Blob> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    if (!ctx) {
      reject(new Error('Could not get canvas context'));
      return;
    }

    img.onload = () => {
      let { width, height } = img;

      // Calculate new dimensions while maintaining aspect ratio
      if (width > maxWidth || height > maxHeight) {
        const ratio = Math.min(maxWidth / width, maxHeight / height);
        width = Math.round(width * ratio);
        height = Math.round(height * ratio);
      }

      canvas.width = width;
      canvas.height = height;

      // Draw image with white background (for transparency)
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, width, height);
      ctx.drawImage(img, 0, 0, width, height);

      // Convert to blob
      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error('Failed to compress image'));
          }
        },
        'image/jpeg',
        quality
      );
    };

    img.onerror = () => {
      reject(new Error('Failed to load image'));
    };

    // Create object URL for the file
    img.src = URL.createObjectURL(file);
  });
};

/**
 * Compress image with size limit (keeps reducing quality until under limit)
 * @param file - The original image file
 * @param maxSizeKB - Maximum size in KB (default 500KB)
 * @param maxWidth - Maximum width in pixels
 * @param maxHeight - Maximum height in pixels
 * @returns Compressed blob
 */
export const compressImageWithSizeLimit = async (
  file: File,
  maxSizeKB = 500,
  maxWidth = 800,
  maxHeight = 800
): Promise<Blob> => {
  let quality = 0.9;
  let blob = await compressImage(file, maxWidth, maxHeight, quality);

  // Reduce quality until file is under the size limit
  while (blob.size > maxSizeKB * 1024 && quality > 0.1) {
    quality -= 0.1;
    blob = await compressImage(file, maxWidth, maxHeight, quality);
  }

  return blob;
};
