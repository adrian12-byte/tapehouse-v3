'use client';

import Slider from './Slider';
import Reel from './Reel';
import { usePlayer } from './PlayerProvider';
import { formatTime } from '@/lib/format';
import type { Song } from '@/lib/db';

type AudioPlayerProps = {
  song: Song;
  /** Ordered list of tracks (e.g. an album) this song belongs to, for skip next/previous. */
  queue?: Song[];
};

export default function AudioPlayer({ song, queue }: AudioPlayerProps) {
  const player = usePlayer();
  const isCurrent = player.currentSong?.id === song.id;

  const isPlaying = isCurrent && player.isPlaying;
  const loading = isCurrent && !player.ready && !player.error;
  const duration = isCurrent ? player.duration : 0;
  const elapsed = isCurrent ? player.elapsed : 0;
  const speed = isCurrent ? player.speed : 1;
  const pitch = isCurrent ? player.pitch : 0;
  const error = isCurrent ? player.error : null;

  function handlePlayPause() {
    if (isCurrent) {
      player.togglePlay();
    } else {
      player.playSong(song, queue && queue.length ? queue : [song]);
    }
  }

  function handleSeek(fraction: number) {
    if (!isCurrent) return;
    player.seek(fraction);
  }

  function handleSpeedChange(value: number) {
    if (isCurrent) player.setSpeed(value);
  }

  function handlePitchChange(value: number) {
    if (isCurrent) player.setPitch(value);
  }

  const progressPercent = duration > 0 ? Math.min(100, (elapsed / duration) * 100) : 0;

  return (
    <div className="tape-grain rounded-none bg-panel p-6 shadow-console ring-1 ring-hairline">
      {error ? (
        <p className="font-mono text-sm text-rust">{error}</p>
      ) : (
        <>
          <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
            <div className="flex items-center gap-3">
              <Reel spinning={isPlaying} speed={speed} />

              <button
                onClick={() => isCurrent && player.previous()}
                disabled={!isCurrent || !player.hasPrevious}
                className="flex h-9 w-9 items-center justify-center text-boneDim transition hover:text-bone disabled:opacity-25"
                aria-label="Previous track"
              >
                <svg width="15" height="15" viewBox="0 0 18 18" fill="currentColor">
                  <rect x="3" y="2" width="2.4" height="14" />
                  <path d="M15 2.5v13L5 9z" />
                </svg>
              </button>

              <button
                onClick={handlePlayPause}
                disabled={loading}
                className="flex h-14 w-14 items-center justify-center rounded-full bg-brass text-ink transition hover:bg-brassBright disabled:opacity-40"
                aria-label={isPlaying ? 'Pause' : 'Play'}
              >
                {isPlaying ? (
                  <svg width="18" height="18" viewBox="0 0 18 18" fill="currentColor">
                    <rect x="3" y="2" width="5" height="14" />
                    <rect x="10" y="2" width="5" height="14" />
                  </svg>
                ) : (
                  <svg width="18" height="18" viewBox="0 0 18 18" fill="currentColor">
                    <path d="M4 2.5v13l12-6.5z" />
                  </svg>
                )}
              </button>

              <button
                onClick={() => isCurrent && player.next()}
                disabled={!isCurrent || !player.hasNext}
                className="flex h-9 w-9 items-center justify-center text-boneDim transition hover:text-bone disabled:opacity-25"
                aria-label="Next track"
              >
                <svg width="15" height="15" viewBox="0 0 18 18" fill="currentColor">
                  <path d="M3 2.5v13l10-6.5z" />
                  <rect x="12.6" y="2" width="2.4" height="14" />
                </svg>
              </button>
            </div>

            <div className="flex-1">
              <div
                className="group relative h-2 w-full cursor-pointer rounded-none bg-panelLight"
                onClick={(e) => {
                  const rect = e.currentTarget.getBoundingClientRect();
                  handleSeek((e.clientX - rect.left) / rect.width);
                }}
              >
                <div
                  className="absolute inset-y-0 left-0 bg-signal"
                  style={{ width: `${progressPercent}%` }}
                />
                <div
                  className="absolute top-1/2 h-3 w-3 -translate-y-1/2 -translate-x-1/2 rounded-full bg-bone opacity-0 transition-opacity group-hover:opacity-100"
                  style={{ left: `${progressPercent}%` }}
                />
              </div>
              <div className="mt-1.5 flex justify-between font-mono text-xs text-boneDim tabular-nums">
                <span>{formatTime(elapsed)}</span>
                <span>{isCurrent && player.ready ? formatTime(duration) : '—:—'}</span>
              </div>
            </div>
          </div>

          <div className="mt-7 flex flex-col gap-5 border-t border-hairline pt-6">
            <Slider
              label="Speed"
              value={speed}
              min={0.5}
              max={2}
              step={0.01}
              defaultValue={1}
              formatValue={(v) => `${v.toFixed(2)}×`}
              onChange={handleSpeedChange}
              accent="signal"
            />
            <Slider
              label="Pitch"
              value={pitch}
              min={-12}
              max={12}
              step={1}
              defaultValue={0}
              formatValue={(v) => (v > 0 ? `+${v} st` : `${v} st`)}
              onChange={handlePitchChange}
              accent="brass"
            />
          </div>
          {!isCurrent && (
            <p className="mt-4 text-center font-mono text-[11px] text-boneDim">
              Press play to load this track — speed &amp; pitch apply once it's playing here.
            </p>
          )}
        </>
      )}
    </div>
  );
}
