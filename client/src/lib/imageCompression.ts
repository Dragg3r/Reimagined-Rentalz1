/**
 * Client-side image compression utility
 * Compresses images to guaranteed size limits using iterative compression
 */

export interface CompressionOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
  maxSizeInMB?: number;
  minQuality?: number;
  minWidth?: number;
  minHeight?: number;
}

const defaultOptions: CompressionOptions = {
  maxWidth: 1200,
  maxHeight: 1200,
  quality: 0.85,
  maxSizeInMB: 0.8, // Target 800KB to leave headroom for server limits
  minQuality: 0.3,
  minWidth: 400,
  minHeight: 400,
};

export interface CompressionResult {
  file: File;
  originalSize: number;
  finalSize: number;
  compressionRatio: number;
  iterations: number;
  success: boolean;
}

export async function compressImage(
  file: File,
  options: CompressionOptions = {}
): Promise<File> {
  const result = await compressImageDetailed(file, options);
  return result.file;
}

export async function compressImageDetailed(
  file: File,
  options: CompressionOptions = {}
): Promise<CompressionResult> {
  const opts = { ...defaultOptions, ...options };
  const targetBytes = opts.maxSizeInMB! * 1024 * 1024;
  
  // Check for unsupported formats (HEIC/HEIF)
  const fileExt = file.name.toLowerCase().split('.').pop();
  if (fileExt === 'heic' || fileExt === 'heif') {
    throw new Error('HEIC/HEIF format not supported. Please use JPEG or PNG format.');
  }
  
  // If file is already small enough, return as-is
  if (file.size <= targetBytes) {
    console.log(`Image ${file.name} is already small enough (${(file.size / 1024 / 1024).toFixed(2)}MB)`);
    return {
      file,
      originalSize: file.size,
      finalSize: file.size,
      compressionRatio: 1,
      iterations: 0,
      success: true
    };
  }

  console.log(`Compressing image ${file.name} from ${(file.size / 1024 / 1024).toFixed(2)}MB to under ${opts.maxSizeInMB}MB`);

  return new Promise((resolve, reject) => {
    const img = new Image();
    let objectUrl: string | null = null;

    const cleanup = () => {
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
        objectUrl = null;
      }
    };

    img.onload = async () => {
      try {
        let currentWidth = img.width;
        let currentHeight = img.height;
        let currentQuality = opts.quality!;
        let iterations = 0;
        let finalBlob: Blob | null = null;

        // Initial resize if needed
        if (currentWidth > opts.maxWidth! || currentHeight > opts.maxHeight!) {
          const aspectRatio = currentWidth / currentHeight;
          
          if (currentWidth > currentHeight) {
            currentWidth = opts.maxWidth!;
            currentHeight = currentWidth / aspectRatio;
          } else {
            currentHeight = opts.maxHeight!;
            currentWidth = currentHeight * aspectRatio;
          }
        }

        // Iterative compression
        while (iterations < 10) { // Max 10 iterations to prevent infinite loop
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          
          if (!ctx) {
            throw new Error('Failed to get canvas context');
          }

          canvas.width = currentWidth;
          canvas.height = currentHeight;
          ctx.drawImage(img, 0, 0, currentWidth, currentHeight);

          // Try current settings
          const blob = await new Promise<Blob | null>((resolveBlob) => {
            canvas.toBlob(resolveBlob, 'image/jpeg', currentQuality);
          });

          if (!blob) {
            throw new Error('Failed to create blob');
          }

          iterations++;
          console.log(`Iteration ${iterations}: ${currentWidth}x${currentHeight}, quality ${currentQuality.toFixed(2)}, size ${(blob.size / 1024).toFixed(1)}KB`);

          if (blob.size <= targetBytes) {
            finalBlob = blob;
            break;
          }

          // Adjust settings for next iteration
          if (currentQuality > opts.minQuality!) {
            // First try reducing quality
            currentQuality = Math.max(opts.minQuality!, currentQuality - 0.1);
          } else if (currentWidth > opts.minWidth! && currentHeight > opts.minHeight!) {
            // Then try reducing dimensions
            currentQuality = opts.quality!; // Reset quality
            currentWidth = Math.max(opts.minWidth!, Math.round(currentWidth * 0.85));
            currentHeight = Math.max(opts.minHeight!, Math.round(currentHeight * 0.85));
          } else {
            // Can't reduce further, use what we have
            finalBlob = blob;
            break;
          }
        }

        cleanup();

        if (!finalBlob) {
          throw new Error('Failed to compress image to target size');
        }

        const compressedFile = new File(
          [finalBlob],
          file.name.replace(/\.[^/.]+$/, '.jpg'),
          {
            type: 'image/jpeg',
            lastModified: Date.now(),
          }
        );

        const result: CompressionResult = {
          file: compressedFile,
          originalSize: file.size,
          finalSize: finalBlob.size,
          compressionRatio: file.size / finalBlob.size,
          iterations,
          success: finalBlob.size <= targetBytes
        };

        console.log(`Compression complete: ${(file.size / 1024 / 1024).toFixed(2)}MB → ${(finalBlob.size / 1024 / 1024).toFixed(2)}MB (${result.compressionRatio.toFixed(1)}x smaller, ${iterations} iterations)`);
        
        resolve(result);
      } catch (error) {
        cleanup();
        reject(error);
      }
    };

    img.onerror = () => {
      cleanup();
      reject(new Error('Failed to load image for compression'));
    };

    // Create object URL and load image
    objectUrl = URL.createObjectURL(file);
    img.src = objectUrl;
  });
}

export async function compressMultipleImages(
  files: File[],
  options: CompressionOptions = {}
): Promise<File[]> {
  const compressionPromises = files.map(file => compressImage(file, options));
  return Promise.all(compressionPromises);
}