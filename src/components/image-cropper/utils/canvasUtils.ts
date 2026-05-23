import { PixelCrop } from '../types';

export const createImage = (url: string): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const image = new Image();
    image.addEventListener('load', () => resolve(image));
    image.addEventListener('error', (error) => reject(error));
    image.setAttribute('crossOrigin', 'anonymous'); // needed to avoid CORS issues on CodeSandbox/local
    image.src = url;
  });

/**
 * Returns a new image URL representing the cropped area
 * Handles scaling between the displayed image size and the natural image size.
 */
export async function getCroppedImg(
  image: HTMLImageElement,
  crop: PixelCrop,
  fileName: string = 'cropped.jpeg'
): Promise<Blob | null> {
  const canvas = document.createElement('canvas');
  const scaleX = image.naturalWidth / image.width;
  const scaleY = image.naturalHeight / image.height;
  
  // Create a canvas with the correct dimensions based on the crop size and image scale
  canvas.width = crop.width * scaleX;
  canvas.height = crop.height * scaleY;
  
  const ctx = canvas.getContext('2d');

  if (!ctx) {
    return null;
  }

  // Draw the cropped image using the scale to map displayed coordinates to natural coordinates
  ctx.drawImage(
    image,
    crop.x * scaleX,
    crop.y * scaleY,
    crop.width * scaleX,
    crop.height * scaleY,
    0,
    0,
    crop.width * scaleX,
    crop.height * scaleY
  );

  // As a blob
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error('Canvas is empty'));
          return;
        }
        resolve(blob);
      },
      'image/jpeg',
      0.95
    );
  });
}