'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import AudioPlayer from '@/components/AudioPlayer';
import LyricsEditor from '@/components/LyricsEditor';
import ReplaceAudioButton from '@/components/ReplaceAudioButton';
import { useAuth } from '@/components/AuthProvider';
import type { AlbumWithCount, Song } from '@/lib/db';
import { deleteSongRequest, fetchAlbum, fetchAlbums, fetchSong, updateSongMetaRequest } from '@/lib/api';

export default function SongPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const [song, setSong] = useState<Song | null>(null);
  const [albums, setAlbums] = useState<AlbumWithCount[]>([]);
  const [albumQueue, setAlbumQueue] = useState<Song[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [titleDraft, setTitleDraft] = useState('');
  const [editingTitle, setEditingTitle] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [movingAlbum, setMovingAlbum] = useState(false);
  const [togglingVisibility, setTogglingVisibility] = useState(false);

  const isOwner = !!user && !!song && user.id === song.owner_id;

  useEffect(() => {
    fetchSong(params.id)
      .then((s) => {
        setSong(s);
        setTitleDraft(s.title);
        if (s.album_id) {
          fetchAlbum(s.album_id)
            .then(({ songs }) => setAlbumQueue(songs))
            .catch(() => setAlbumQueue([]));
        } else {
          setAlbumQueue([]);
        }
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load song'));
    fetchAlbums()
      .then(setAlbums)
      .catch(() => {
        // Non-fatal — the album picker just won't have options.
      });
  }, [params.id]);

  async function handleTitleSave() {
    if (!song) return;
    const next = titleDraft.trim();
    setEditingTitle(false);
    if (!next || next === song.title) {
      setTitleDraft(song.title);
      return;
    }
    const updated = await updateSongMetaRequest(song.id, { title: next });
    setSong(updated);
  }

  async function handleLyricsSave(lyrics: string) {
    if (!song) return;
    const updated = await updateSongMetaRequest(song.id, { lyrics });
    setSong(updated);
  }

  async function handleAlbumChange(albumId: string) {
    if (!song) return;
    setMovingAlbum(true);
    try {
      const updated = await updateSongMetaRequest(song.id, { albumId: albumId || null });
      setSong(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to move track');
    } finally {
      setMovingAlbum(false);
    }
  }

  async function handleVisibilityToggle() {
    if (!song) return;
    setTogglingVisibility(true);
    try {
      const next = song.visibility === 'public' ? 'private' : 'public';
      const updated = await updateSongMetaRequest(song.id, { visibility: next });
      setSong(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update visibility');
    } finally {
      setTogglingVisibility(false);
    }
  }

  async function handleDelete() {
    if (!song) return;
    if (!confirm(`Delete "${song.title}"? This removes the audio file too.`)) return;
    setDeleting(true);
    try {
      await deleteSongRequest(song.id);
      router.push('/');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete');
      setDeleting(false);
    }
  }

  if (error) {
    return (
      <main className="mx-auto max-w-3xl px-6 py-12">
        <p className="font-mono text-sm text-rust">{error}</p>
        <Link href="/" className="mt-4 inline-block font-mono text-sm text-signal underline">
          ← Back to the deck
        </Link>
      </main>
    );
  }

  if (!song) {
    return (
      <main className="mx-auto max-w-3xl px-6 py-12">
        <p className="font-mono text-sm text-boneDim">Loading…</p>
      </main>
    );
  }

  const myAlbums = user ? albums.filter((a) => a.owner_id === user.id) : [];
  const canDownload = song.visibility === 'public' || isOwner;

  return (
    <main className="mx-auto min-h-screen max-w-5xl px-6 py-12">
      <div className="mb-8 flex items-center justify-between">
        <Link
          href="/"
          className="font-mono text-xs uppercase tracking-wide text-boneDim transition hover:text-brassBright"
        >
          ← The deck
        </Link>
        {isOwner && (
          <button
            type="button"
            onClick={handleDelete}
            disabled={deleting}
            className="font-mono text-xs uppercase tracking-wide text-rust/80 transition hover:text-rust disabled:opacity-50"
          >
            {deleting ? 'Deleting…' : 'Delete track'}
          </button>
        )}
      </div>

      <div className="mb-8">
        {isOwner && editingTitle ? (
          <input
            autoFocus
            value={titleDraft}
            onChange={(e) => setTitleDraft(e.target.value)}
            onBlur={handleTitleSave}
            onKeyDown={(e) => {
              if (e.key === 'Enter') e.currentTarget.blur();
              if (e.key === 'Escape') {
                setTitleDraft(song.title);
                setEditingTitle(false);
              }
            }}
            className="w-full border-b border-signal bg-transparent font-display text-3xl font-medium text-bone outline-none"
          />
        ) : (
          <h1
            onClick={() => isOwner && setEditingTitle(true)}
            className={`font-display text-3xl font-medium text-bone ${isOwner ? 'cursor-text' : ''}`}
            title={isOwner ? 'Click to rename' : undefined}
          >
            {song.title}
          </h1>
        )}
        <p className="mt-1 font-mono text-[11px] text-boneDim">
          {song.original_filename}
          {song.owner_username ? ` · uploaded by ${song.owner_username}` : ''}
          {isOwner ? ' · click title to rename' : ''}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_1.1fr]">
        <div className="flex flex-col gap-4">
          <AudioPlayer song={song} queue={albumQueue.length ? albumQueue : undefined} />

          {isOwner && (
            <div className="flex items-center justify-between border border-hairline bg-panel px-4 py-3">
              <span className="font-mono text-[11px] text-boneDim">Swap the source file</span>
              <ReplaceAudioButton songId={song.id} onReplaced={setSong} />
            </div>
          )}

          <div className="flex items-center justify-between border border-hairline bg-panel px-4 py-3">
            <span className="font-mono text-[11px] text-boneDim">Original audio file</span>
            {canDownload ? (
              <a
                href={`/api/songs/${song.id}/download`}
                className="border border-hairline px-3 py-1.5 text-xs uppercase tracking-wide text-boneDim transition hover:border-signal hover:text-signal"
              >
                Download
              </a>
            ) : (
              <span className="font-mono text-[11px] text-boneDim/60">Unavailable — owner only</span>
            )}
          </div>

          {isOwner && (
            <div className="flex items-center justify-between border border-hairline bg-panel px-4 py-3">
              <div>
                <span className="block font-mono text-[11px] text-boneDim">Download visibility</span>
                <span className="block font-mono text-[10px] text-boneDim/60">
                  {song.visibility === 'public'
                    ? 'Anyone can download this file.'
                    : 'Only you can download this file.'}
                </span>
              </div>
              <button
                type="button"
                onClick={handleVisibilityToggle}
                disabled={togglingVisibility}
                className={`border px-3 py-1.5 text-xs uppercase tracking-wide transition disabled:opacity-50 ${
                  song.visibility === 'public'
                    ? 'border-signal text-signal hover:bg-signal/10'
                    : 'border-rust text-rust hover:bg-rust/10'
                }`}
              >
                {song.visibility === 'public' ? 'Public' : 'Private'}
              </button>
            </div>
          )}

          {isOwner && (
            <div className="flex items-center justify-between gap-3 border border-hairline bg-panel px-4 py-3">
              <span className="shrink-0 font-mono text-[11px] text-boneDim">Album project</span>
              <select
                value={song.album_id ?? ''}
                disabled={movingAlbum}
                onChange={(e) => handleAlbumChange(e.target.value)}
                className="w-40 border border-hairline bg-ink px-2 py-1.5 text-xs text-bone outline-none focus:border-signal disabled:opacity-50"
              >
                <option value="">No album</option>
                {myAlbums.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.title}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
        <LyricsEditor initialLyrics={song.lyrics} onSave={handleLyricsSave} readOnly={!isOwner} />
      </div>
    </main>
  );
}
