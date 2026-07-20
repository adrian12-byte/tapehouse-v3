'use client';

import { useRef, useState } from 'react';
import { createSongRecord } from '@/lib/api';
import { uploadAudioFile, validateAudioFile } from '@/lib/upload';
import type { AlbumWithCount, Song } from '@/lib/db';

type UploadFormProps = {
  onCreated: (song: Song) => void;
  albums?: AlbumWithCount[];
  defaultAlbumId?: string | null;
};

export default function UploadForm({ onCreated, albums = [], defaultAlbumId = null }: UploadFormProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState('');
  const [albumId, setAlbumId] = useState<string>(defaultAlbumId ?? '');
  const [status, setStatus] = useState<'idle' | 'uploading' | 'saving'>('idle');
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const busy = status !== 'idle';

  function handleFileChange(f: File | null) {
    setError(null);
    if (!f) {
      setFile(null);
      return;
    }
    const problem = validateAudioFile(f);
    if (problem) {
      setError(problem);
      setFile(null);
      return;
    }
    setFile(f);
    if (!title) {
      setTitle(f.name.replace(/\.(wav|mp3|flac)$/i, ''));
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!file) {
      setError('Choose a .wav, .mp3, or .flac file first.');
      return;
    }
    if (!title.trim()) {
      setError('Give the track a name.');
      return;
    }
    setError(null);
    try {
      setStatus('uploading');
      setProgress(0);
      const uploaded = await uploadAudioFile(file, setProgress);
      setStatus('saving');
      const song = await createSongRecord({
        title: title.trim(),
        lyrics: '',
        albumId: albumId || null,
        ...uploaded,
      });
      onCreated(song);
      setFile(null);
      setTitle('');
      if (!defaultAlbumId) setAlbumId('');
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed.');
    } finally {
      setStatus('idle');
      setProgress(0);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="tape-grain rounded-none bg-panel p-6 shadow-console ring-1 ring-hairline"
    >
      <div className="mb-1 font-mono text-[10px] uppercase tracking-[0.25em] text-boneDim">
        Load a track
      </div>
      <h2 className="mb-5 font-display text-xl font-medium text-bone">Add to the deck</h2>

      <label
        htmlFor="audio-file"
        className={`mb-4 flex cursor-pointer items-center justify-between gap-3 border px-4 py-3 transition ${
          file ? 'border-signal/60 bg-signal/5' : 'border-hairline hover:border-boneDim'
        }`}
      >
        <span className="truncate font-mono text-sm text-bone">
          {file ? file.name : 'Choose audio file — .wav, .mp3, .flac'}
        </span>
        <span className="shrink-0 text-xs uppercase tracking-wide text-boneDim">Browse</span>
        <input
          id="audio-file"
          ref={fileInputRef}
          type="file"
          accept=".wav,.mp3,.flac,audio/wav,audio/mpeg,audio/flac"
          className="hidden"
          onChange={(e) => handleFileChange(e.target.files?.[0] ?? null)}
        />
      </label>

      <label htmlFor="song-title" className="mb-1.5 block text-xs uppercase tracking-wide text-boneDim">
        Song name
      </label>
      <input
        id="song-title"
        type="text"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Untitled take"
        className="mb-4 w-full border border-hairline bg-ink px-3 py-2 text-sm text-bone outline-none focus:border-signal"
      />

      {albums.length > 0 && (
        <>
          <label htmlFor="song-album" className="mb-1.5 block text-xs uppercase tracking-wide text-boneDim">
            Album (optional)
          </label>
          <select
            id="song-album"
            value={albumId}
            onChange={(e) => setAlbumId(e.target.value)}
            className="mb-4 w-full border border-hairline bg-ink px-3 py-2 text-sm text-bone outline-none focus:border-signal"
          >
            <option value="">No album</option>
            {albums.map((a) => (
              <option key={a.id} value={a.id}>
                {a.title}
              </option>
            ))}
          </select>
        </>
      )}

      {error && <p className="mb-3 font-mono text-xs text-rust">{error}</p>}

      {status === 'uploading' && (
        <div className="mb-3">
          <div className="h-1.5 w-full bg-panelLight">
            <div
              className="h-full bg-signal transition-[width]"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="mt-1 font-mono text-[11px] text-boneDim">Uploading… {progress}%</p>
        </div>
      )}
      {status === 'saving' && (
        <p className="mb-3 font-mono text-[11px] text-boneDim">Saving track…</p>
      )}

      <button
        type="submit"
        disabled={busy}
        className="w-full bg-brass py-2.5 text-sm font-medium text-ink transition hover:bg-brassBright disabled:opacity-50"
      >
        {busy ? 'Working…' : 'Add track'}
      </button>
    </form>
  );
}
