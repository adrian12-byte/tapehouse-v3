'use client';

import { useRef, useState } from 'react';
import { updateAlbumRequest } from '@/lib/api';
import { uploadThumbnailFile, validateImageFile } from '@/lib/upload';
import type { Album } from '@/lib/db';

export default function ReplaceThumbnailButton({
  albumId,
  onReplaced,
  label = 'Change cover',
}: {
  albumId: string;
  onReplaced: (album: Album) => void;
  label?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFile(file: File | null) {
    if (!file) return;
    setError(null);
    const problem = validateImageFile(file);
    if (problem) {
      setError(problem);
      return;
    }
    setBusy(true);
    try {
      const uploaded = await uploadThumbnailFile(file);
      const album = await updateAlbumRequest(albumId, {
        thumbnailUrl: uploaded.url,
        thumbnailPathname: uploaded.pathname,
      });
      onReplaced(album);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed.');
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  }

  return (
    <div>
      <input
        ref={inputRef}
        type="file"
        accept=".jpg,.jpeg,.png,.webp,.gif,image/*"
        className="hidden"
        onChange={(e) => handleFile(e.target.files?.[0] ?? null)}
      />
      <button
        type="button"
        disabled={busy}
        onClick={() => inputRef.current?.click()}
        className="border border-hairline px-3 py-1.5 text-xs uppercase tracking-wide text-boneDim transition hover:border-brass hover:text-brassBright disabled:opacity-50"
      >
        {busy ? 'Uploading…' : label}
      </button>
      {error && <p className="mt-2 font-mono text-xs text-rust">{error}</p>}
    </div>
  );
}
