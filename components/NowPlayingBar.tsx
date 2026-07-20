'use client';

import Link from 'next/link';
import Reel from './Reel';
import { usePlayer } from './PlayerProvider';
import { formatTime } from '@/lib/format';

const BAR_HEIGHT = 72;

export default function NowPlayingBar() {
  const player = usePlayer();

  if (!player.currentSong) return null;

  const progressPercent = player.duration > 0 ? Math.min(100, (player.elapsed / player.duration) * 100) : 0;

  return (
    <>
      {/* Reserves scroll space so the fixed bar never covers page content. */}
      <div style={{ height: BAR_HEIGHT }} aria-hidden="true" />
      <div
        className="tape-grain fixed inset-x-0 bottom-0 z-40 border-t border-hairline bg-panel/95 backdrop-blur"
        style={{ height: BAR_HEIGHT }}
      >
        <div className="mx-auto flex h-full max-w-5xl items-center gap-3 px-4 sm:gap-4 sm:px-6">
          <Reel spinning={player.isPlaying} speed={player.speed} size={40} />

          <button
            onClick={player.previous}
            disabled={!player.hasPrevious}
            className="flex h-8 w-8 shrink-0 items-center justify-center text-boneDim transition hover:text-bone disabled:opacity-25"
            aria-label="Previous track"
          >
            <svg width="13" height="13" viewBox="0 0 18 18" fill="currentColor">
              <rect x="3" y="2" width="2.4" height="14" />
              <path d="M15 2.5v13L5 9z" />
            </svg>
          </button>

          <button
            onClick={player.togglePlay}
            disabled={!player.ready}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brass text-ink transition hover:bg-brassBright disabled:opacity-40"
            aria-label={player.isPlaying ? 'Pause' : 'Play'}
          >
            {player.isPlaying ? (
              <svg width="14" height="14" viewBox="0 0 18 18" fill="currentColor">
                <rect x="3" y="2" width="5" height="14" />
                <rect x="10" y="2" width="5" height="14" />
              </svg>
            ) : (
              <svg width="14" height="14" viewBox="0 0 18 18" fill="currentColor">
                <path d="M4 2.5v13l12-6.5z" />
              </svg>
            )}
          </button>

          <button
            onClick={player.next}
            disabled={!player.hasNext}
            className="flex h-8 w-8 shrink-0 items-center justify-center text-boneDim transition hover:text-bone disabled:opacity-25"
            aria-label="Next track"
          >
            <svg width="13" height="13" viewBox="0 0 18 18" fill="currentColor">
              <path d="M3 2.5v13l10-6.5z" />
              <rect x="12.6" y="2" width="2.4" height="14" />
            </svg>
          </button>

          <div className="min-w-0 flex-1">
            <Link
              href={`/song/${player.currentSong.id}`}
              className="block truncate font-display text-sm text-bone transition hover:text-brassBright"
            >
              {player.currentSong.title}
            </Link>
            <div
              className="group relative mt-1.5 h-1.5 w-full cursor-pointer bg-panelLight"
              onClick={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                player.seek((e.clientX - rect.left) / rect.width);
              }}
            >
              <div className="absolute inset-y-0 left-0 bg-signal" style={{ width: `${progressPercent}%` }} />
            </div>
          </div>

          <div className="hidden shrink-0 font-mono text-[10px] text-boneDim tabular-nums sm:block">
            {formatTime(player.elapsed)} / {player.ready ? formatTime(player.duration) : '—:—'}
          </div>
        </div>
      </div>
    </>
  );
}
