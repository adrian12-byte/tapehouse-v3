'use client';

import { upload } from '@vercel/blob/client';
import {
  ACCEPTED_EXTENSIONS,
  hasAcceptedExtension,
  MAX_FILE_SIZE_BYTES,
  IMAGE_EXTENSIONS,
  hasAcceptedImageExtension,
  MAX_IMAGE_SIZE_BYTES,
} from '@/lib/constants';

export function validateAudioFile(file: File): string | null {
  if (!hasAcceptedExtension(file.name)) {
    return `Unsupported file type. Please choose ${ACCEPTED_EXTENSIONS.join(', ')}.`;
  }
  if (file.size > MAX_FILE_SIZE_BYTES) {
    return `File is too large (max ${Math.round(MAX_FILE_SIZE_BYTES / (1024 * 1024))}MB).`;
  }
  return null;
}

export function validateImageFile(file: File): string | null {
  if (!hasAcceptedImageExtension(file.name)) {
    return `Unsupported image type. Please choose ${IMAGE_EXTENSIONS.join(', ')}.`;
  }
  if (file.size > MAX_IMAGE_SIZE_BYTES) {
    return `Image is too large (max ${Math.round(MAX_IMAGE_SIZE_BYTES / (1024 * 1024))}MB).`;
  }
  return null;
}

export async function uploadAudioFile(file: File, onProgress?: (percent: number) => void) {
  const blob = await upload(file.name, file, {
    access: 'public',
    handleUploadUrl: '/api/blob/upload',
    clientPayload: JSON.stringify({ kind: 'audio' }),
    onUploadProgress: (event) => {
      onProgress?.(Math.round(event.percentage));
    },
  });

  return {
    url: blob.url,
    pathname: blob.pathname,
    filename: file.name,
    mimeType: file.type || 'application/octet-stream',
    size: file.size,
  };
}

export async function uploadThumbnailFile(file: File, onProgress?: (percent: number) => void) {
  const blob = await upload(file.name, file, {
    access: 'public',
    handleUploadUrl: '/api/blob/upload',
    clientPayload: JSON.stringify({ kind: 'thumbnail' }),
    onUploadProgress: (event) => {
      onProgress?.(Math.round(event.percentage));
    },
  });

  return {
    url: blob.url,
    pathname: blob.pathname,
  };
}
