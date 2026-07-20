export const ACCEPTED_MIME_TYPES = [
  'audio/wav',
  'audio/x-wav',
  'audio/wave',
  'audio/mpeg',
  'audio/mp3',
  'audio/flac',
  'audio/x-flac',
];

export const ACCEPTED_EXTENSIONS = ['.wav', '.mp3', '.flac'];

// 200MB — generous headroom for uncompressed WAV/FLAC masters.
export const MAX_FILE_SIZE_BYTES = 200 * 1024 * 1024;

export function hasAcceptedExtension(filename: string): boolean {
  const lower = filename.toLowerCase();
  return ACCEPTED_EXTENSIONS.some((ext) => lower.endsWith(ext));
}

export const IMAGE_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

export const IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp', '.gif'];

// 10MB is generous for a thumbnail.
export const MAX_IMAGE_SIZE_BYTES = 10 * 1024 * 1024;

export function hasAcceptedImageExtension(filename: string): boolean {
  const lower = filename.toLowerCase();
  return IMAGE_EXTENSIONS.some((ext) => lower.endsWith(ext));
}
