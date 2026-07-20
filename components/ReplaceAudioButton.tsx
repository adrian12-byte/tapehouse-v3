'use client';

import { useRef, useState } from 'react';
import { replaceSongAudio } from '@/lib/api';
import { uploadAudioFile, validateAudioFile } from '@/lib/upload';
import type { Song } from '@/lib/db';

type ReplaceAudioButtonProps = {
  songId: string;
  onReplaced: (song: Song) => void;
};

export default function ReplaceAudioButton({ songId, onReplaced }: ReplaceAudioButtonProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState<'idle' | 'uploading' | 'saving'>('idle');
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const busy = status !== 'idle';

  async function handleFile(file: File | null) {
    if (!file) return;
    setError(null);
    const problem = validateAudioFile(file);
    if (problem) {
      setError(problem);
      return;
    }
    try {
      setStatus('uploading');
      setProgress(0);
      const uploaded = await uploadAudioFile(file, setProgress);
      setStatus('saving');
      const song = await replaceSongAudio(songId, uploaded);
      onReplaced(song);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Replace failed.');
    } finally {
      setStatus('idle');
      setProgress(0);
      if (inputRef.current) inputRef.current.value = '';
    }
  }

  return (
    <div>
      <input
        ref={inputRef}
        type="file"
        accept=".wav,.mp3,.flac,audio/wav,audio/mpeg,audio/flac"
        className="hidden"
        onChange={(e) => handleFile(e.target.files?.[0] ?? null)}
      />
      <button
        type="button"
        disabled={busy}
        onClick={() => inputRef.current?.click()}
        className="border border-hairline px-3 py-1.5 text-xs uppercase tracking-wide text-boneDim transition hover:border-brass hover:text-brassBright disabled:opacity-50"
      >
        {status === 'uploading' ? `Uploading ${progress}%` : status === 'saving' ? 'Saving…' : 'Replace audio'}
      </button>
      {error && <p className="mt-2 font-mono text-xs text-rust">{error}</p>}
    </div>
  );
}
