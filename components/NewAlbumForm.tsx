'use client';

import { useRef, useState } from 'react';
import { createAlbumRecord } from '@/lib/api';
import { uploadThumbnailFile, validateImageFile } from '@/lib/upload';
import type { Album } from '@/lib/db';

export default function NewAlbumForm({
  onCreated,
  onClose,
}: {
  onCreated: (album: Album) => void;
  onClose: () => void;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [title, setTitle] = useState('');
  const [thumbFile, setThumbFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleThumb(f: File | null) {
    setError(null);
    if (!f) {
      setThumbFile(null);
      setPreview(null);
      return;
    }
    const problem = validateImageFile(f);
    if (problem) {
      setError(problem);
      return;
    }
    setThumbFile(f);
    setPreview(URL.createObjectURL(f));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) {
      setError('Give the album a title.');
      return;
    }
    setError(null);
    setBusy(true);
    try {
      let thumbnailUrl: string | undefined;
      let thumbnailPathname: string | undefined;
      if (thumbFile) {
        const uploaded = await uploadThumbnailFile(thumbFile);
        thumbnailUrl = uploaded.url;
        thumbnailPathname = uploaded.pathname;
      }
      const album = await createAlbumRecord({ title: title.trim(), thumbnailUrl, thumbnailPathname });
      onCreated(album);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create album.');
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <form
        onSubmit={handleSubmit}
        className="tape-grain w-full max-w-sm bg-panel p-6 shadow-console ring-1 ring-hairline"
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-lg font-medium text-bone">New album project</h2>
          <button
            type="button"
            onClick={onClose}
            className="text-boneDim transition hover:text-bone"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <label
          htmlFor="album-thumb"
          className="mb-4 flex aspect-square w-full cursor-pointer items-center justify-center overflow-hidden border border-dashed border-hairline bg-ink"
        >
          {preview ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={preview} alt="" className="h-full w-full object-cover" />
          ) : (
            <span className="text-center font-mono text-[11px] text-boneDim">
              Add cover art
              <br />
              (optional)
            </span>
          )}
          <input
            id="album-thumb"
            ref={fileInputRef}
            type="file"
            accept=".jpg,.jpeg,.png,.webp,.gif,image/*"
            className="hidden"
            onChange={(e) => handleThumb(e.target.files?.[0] ?? null)}
          />
        </label>

        <label htmlFor="album-title" className="mb-1.5 block text-xs uppercase tracking-wide text-boneDim">
          Album title
        </label>
        <input
          id="album-title"
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Untitled project"
          autoFocus
          className="mb-4 w-full border border-hairline bg-ink px-3 py-2 text-sm text-bone outline-none focus:border-signal"
        />

        {error && <p className="mb-3 font-mono text-xs text-rust">{error}</p>}

        <button
          type="submit"
          disabled={busy}
          className="w-full bg-brass py-2.5 text-sm font-medium text-ink transition hover:bg-brassBright disabled:opacity-50"
        >
          {busy ? 'Creating…' : 'Create album'}
        </button>
      </form>
    </div>
  );
}
