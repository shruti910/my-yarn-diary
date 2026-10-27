export const MAX_IMAGE_EDGE = 800;

export const JPEG_QUALITY = 0.7;

/** Returns a downscaled JPEG data URL, or null if a 2D context is unavailable. */
export function toCompressedJpeg(
  source: CanvasImageSource,
  srcWidth: number,
  srcHeight: number,
  maxEdge: number = MAX_IMAGE_EDGE,
  quality: number = JPEG_QUALITY,
): string | null {
  let width = srcWidth;
  let height = srcHeight;

  if (width >= height) {
    if (width > maxEdge) {
      height = Math.round((height * maxEdge) / width);
      width = maxEdge;
    }
  } else if (height > maxEdge) {
    width = Math.round((width * maxEdge) / height);
    height = maxEdge;
  }

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  ctx.drawImage(source, 0, 0, width, height);
  return canvas.toDataURL('image/jpeg', quality);
}
