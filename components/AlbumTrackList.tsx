'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePlayer } from './PlayerProvider';
import { reorderAlbumSongsRequest } from '@/lib/api';
import type { Song } from '@/lib/db';

export default function AlbumTrackList({
  albumId,
  songs,
  isOwner,
  onReordered,
}: {
  albumId: string;
  songs: Song[];
  isOwner: boolean;
  onReordered: (songs: Song[]) => void;
}) {
  const player = usePlayer();
  const [saving, setSaving] = useState(false);
  const [draggingId, setDraggingId] = useState<string | null>(null);

  // Keep a ref mirror of the live order so pointermove/pointerup handlers
  // (which don't re-subscribe on every render) always read the latest list.
  const songsRef = useRef(songs);
  const originalOrderRef = useRef(songs);
  useEffect(() => {
    songsRef.current = songs;
  }, [songs]);

  async function persist(orderedSongs: Song[], fallbackOnFailure: Song[]) {
    setSaving(true);
    try {
      await reorderAlbumSongsRequest(albumId, orderedSongs.map((s) => s.id));
    } catch {
      onReordered(fallbackOnFailure);
    } finally {
      setSaving(false);
    }
  }

  async function move(index: number, direction: -1 | 1) {
    const newIndex = index + direction;
    if (newIndex < 0 || newIndex >= songs.length) return;
    const reordered = [...songs];
    const [item] = reordered.splice(index, 1);
    reordered.splice(newIndex, 0, item);
    onReordered(reordered);
    await persist(reordered, songs);
  }

  function handleGripPointerDown(e: React.PointerEvent<HTMLButtonElement>, songId: string) {
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    originalOrderRef.current = songsRef.current;
    setDraggingId(songId);
  }

  function handleGripPointerMove(e: React.PointerEvent<HTMLButtonElement>) {
    if (!draggingId) return;
    const el = document.elementFromPoint(e.clientX, e.clientY);
    const row = el?.closest('[data-row-id]') as HTMLElement | null;
    if (!row) return;
    const overId = row.dataset.rowId;
    if (!overId || overId === draggingId) return;

    const current = songsRef.current;
    const fromIndex = current.findIndex((s) => s.id === draggingId);
    const toIndex = current.findIndex((s) => s.id === overId);
    if (fromIndex === -1 || toIndex === -1 || fromIndex === toIndex) return;

    const reordered = [...current];
    const [item] = reordered.splice(fromIndex, 1);
    reordered.splice(toIndex, 0, item);
    onReordered(reordered);
  }

  async function handleGripPointerUp(e: React.PointerEvent<HTMLButtonElement>) {
    if (!draggingId) return;
    e.currentTarget.releasePointerCapture(e.pointerId);
    setDraggingId(null);
    const original = originalOrderRef.current;
    const current = songsRef.current;
    const changed = current.map((s) => s.id).join() !== original.map((s) => s.id).join();
    if (!changed) return;
    await persist(current, original);
  }

  if (songs.length === 0) {
    return (
      <div className="border border-dashed border-hairline p-10 text-center">
        <p className="font-display text-lg text-bone">No tracks yet</p>
        <p className="mt-1 font-mono text-xs text-boneDim">Add one to start this project.</p>
      </div>
    );
  }

  return (
    <ul className="flex flex-col divide-y divide-hairline border border-hairline bg-panel">
      {songs.map((song, i) => {
        const isCurrent = player.currentSong?.id === song.id;
        const isPlayingThis = isCurrent && player.isPlaying;
        const isBeingDragged = draggingId === song.id;
        return (
          <li
            key={song.id}
            data-row-id={song.id}
            className={`flex items-center gap-3 px-4 py-3 transition ${
              isBeingDragged ? 'bg-panelLight/80 opacity-70' : ''
            }`}
          >
            {isOwner && (
              <button
                type="button"
                onPointerDown={(e) => handleGripPointerDown(e, song.id)}
                onPointerMove={handleGripPointerMove}
                onPointerUp={handleGripPointerUp}
                onPointerCancel={handleGripPointerUp}
                aria-label="Drag to reorder"
                style={{ touchAction: 'none' }}
                className={`flex h-8 w-5 shrink-0 items-center justify-center text-boneDim transition hover:text-brassBright ${
                  isBeingDragged ? 'cursor-grabbing text-brassBright' : 'cursor-grab'
                }`}
              >
                <svg width="10" height="16" viewBox="0 0 10 16" fill="currentColor">
                  <circle cx="2.5" cy="2.5" r="1.4" />
                  <circle cx="7.5" cy="2.5" r="1.4" />
                  <circle cx="2.5" cy="8" r="1.4" />
                  <circle cx="7.5" cy="8" r="1.4" />
                  <circle cx="2.5" cy="13.5" r="1.4" />
                  <circle cx="7.5" cy="13.5" r="1.4" />
                </svg>
              </button>
            )}

            <button
              onClick={() =>
                isCurrent ? player.togglePlay() : player.playSong(song, songs, i)
              }
              className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition ${
                isCurrent ? 'bg-brass text-ink' : 'text-boneDim hover:text-brassBright'
              }`}
              aria-label={isPlayingThis ? 'Pause' : 'Play'}
            >
              {isPlayingThis ? (
                <svg width="11" height="11" viewBox="0 0 18 18" fill="currentColor">
                  <rect x="3" y="2" width="5" height="14" />
                  <rect x="10" y="2" width="5" height="14" />
                </svg>
              ) : (
                <svg width="11" height="11" viewBox="0 0 18 18" fill="currentColor">
                  <path d="M4 2.5v13l12-6.5z" />
                </svg>
              )}
            </button>

            <span className="w-6 shrink-0 font-mono text-[10px] text-boneDim">
              {String(i + 1).padStart(2, '0')}
            </span>

            <Link
              href={`/song/${song.id}`}
              className="min-w-0 flex-1 truncate font-display text-sm text-bone transition hover:text-brassBright"
            >
              {song.title}
            </Link>

            {song.visibility === 'private' && (
              <svg width="11" height="11" viewBox="0 0 16 16" fill="none" className="shrink-0 text-boneDim" aria-label="Download restricted">
                <rect x="3.5" y="7" width="9" height="6.5" rx="1" stroke="currentColor" strokeWidth="1.2" />
                <path d="M5.5 7V5a2.5 2.5 0 0 1 5 0v2" stroke="currentColor" strokeWidth="1.2" />
              </svg>
            )}

            {isOwner && (
              <div className="flex shrink-0 flex-col">
                <button
                  onClick={() => move(i, -1)}
                  disabled={i === 0 || saving}
                  aria-label="Move up"
                  className="text-boneDim transition hover:text-brassBright disabled:opacity-20"
                >
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                    <path d="M2 7l4-4 4 4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>
                <button
                  onClick={() => move(i, 1)}
                  disabled={i === songs.length - 1 || saving}
                  aria-label="Move down"
                  className="text-boneDim transition hover:text-brassBright disabled:opacity-20"
                >
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                    <path d="M2 5l4 4 4-4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}
