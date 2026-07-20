'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import * as Tone from 'tone';
import Slider from './Slider';
import Reel from './Reel';

type AudioPlayerProps = {
  audioUrl: string;
};

function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) seconds = 0;
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export default function AudioPlayer({ audioUrl }: AudioPlayerProps) {
  const playerRef = useRef<Tone.GrainPlayer | null>(null);
  const rafRef = useRef<number | null>(null);
  const timing = useRef({ offset: 0, startedAt: 0, rate: 1 });

  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [speed, setSpeed] = useState(1);
  const [pitch, setPitch] = useState(0);
  const [volume, setVolume] = useState(0.85);

  const cancelAnim = useCallback(() => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
  }, []);

  useEffect(() => {
    setReady(false);
    setError(null);
    setIsPlaying(false);
    setElapsed(0);
    setDuration(0);
    setSpeed(1);
    setPitch(0);
    timing.current = { offset: 0, startedAt: 0, rate: 1 };

    const player = new Tone.GrainPlayer({
      url: audioUrl,
      grainSize: 0.2,
      overlap: 0.1,
      onload: () => {
        setDuration(player.buffer.duration);
        setReady(true);
      },
      onerror: () => setError('Could not load this audio file.'),
    }).toDestination();
    player.volume.value = Tone.gainToDb(volume);

    playerRef.current = player;

    return () => {
      cancelAnim();
      try {
        player.stop();
      } catch {
        // already stopped
      }
      player.dispose();
      playerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [audioUrl]);

  const tick = useCallback(() => {
    const t = timing.current;
    const now = Tone.now();
    const currentElapsed = t.offset + (now - t.startedAt) * t.rate;
    if (currentElapsed >= duration) {
      setElapsed(duration);
      setIsPlaying(false);
      cancelAnim();
      return;
    }
    setElapsed(currentElapsed);
    rafRef.current = requestAnimationFrame(tick);
  }, [cancelAnim, duration]);

  const currentElapsedNow = useCallback(() => {
    const t = timing.current;
    const now = Tone.now();
    return t.offset + (now - t.startedAt) * t.rate;
  }, []);

  const handlePlay = useCallback(async () => {
    const player = playerRef.current;
    if (!player || !ready) return;
    await Tone.start();
    const startOffset = elapsed >= duration - 0.05 ? 0 : elapsed;
    player.playbackRate = speed;
    player.detune = pitch * 100;
    player.start(undefined, startOffset);
    timing.current = { offset: startOffset, startedAt: Tone.now(), rate: speed };
    setIsPlaying(true);
    cancelAnim();
    rafRef.current = requestAnimationFrame(tick);
  }, [cancelAnim, duration, elapsed, pitch, ready, speed, tick]);

  const handlePause = useCallback(() => {
    const player = playerRef.current;
    if (!player) return;
    const currentElapsed = currentElapsedNow();
    player.stop();
    cancelAnim();
    setElapsed(Math.min(currentElapsed, duration));
    setIsPlaying(false);
  }, [cancelAnim, currentElapsedNow, duration]);

  const handleSeek = useCallback(
    (fraction: number) => {
      const player = playerRef.current;
      if (!player || !ready) return;
      const newOffset = Math.max(0, Math.min(duration, fraction * duration));
      if (isPlaying) {
        player.stop();
        player.start(undefined, newOffset);
        timing.current = { offset: newOffset, startedAt: Tone.now(), rate: speed };
      } else {
        timing.current.offset = newOffset;
      }
      setElapsed(newOffset);
    },
    [duration, isPlaying, ready, speed]
  );

  const handleSpeedChange = useCallback(
    (value: number) => {
      setSpeed(value);
      const player = playerRef.current;
      if (!player) return;
      if (isPlaying) {
        const currentElapsed = currentElapsedNow();
        timing.current = { offset: currentElapsed, startedAt: Tone.now(), rate: value };
      }
      player.playbackRate = value;
    },
    [currentElapsedNow, isPlaying]
  );

  const handlePitchChange = useCallback((value: number) => {
    setPitch(value);
    const player = playerRef.current;
    if (player) player.detune = value * 100;
  }, []);

  const handleVolumeChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = Number(e.target.value);
    setVolume(value);
    const player = playerRef.current;
    if (player) player.volume.value = Tone.gainToDb(Math.max(0.0001, value));
  }, []);

  // Keep the progress bar moving smoothly even while paused-at-position.
  useEffect(() => {
    if (!isPlaying) return;
    rafRef.current = requestAnimationFrame(tick);
    return cancelAnim;
  }, [isPlaying, tick, cancelAnim]);

  const progressPercent = duration > 0 ? Math.min(100, (elapsed / duration) * 100) : 0;

  return (
    <div className="tape-grain rounded-none bg-panel p-6 shadow-console ring-1 ring-hairline">
      {error ? (
        <p className="font-mono text-sm text-rust">{error}</p>
      ) : (
        <>
          <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
            <div className="flex items-center gap-4">
              <Reel spinning={isPlaying} speed={speed} />
              <button
                onClick={isPlaying ? handlePause : handlePlay}
                disabled={!ready}
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
                <span>{ready ? formatTime(duration) : '—:—'}</span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="text-boneDim">
                <path d="M2 6h2.5L8 3v10L4.5 10H2z" fill="currentColor" />
                <path
                  d="M10.5 5.5c1 .8 1 4.2 0 5"
                  stroke="currentColor"
                  strokeWidth="1.2"
                  strokeLinecap="round"
                />
              </svg>
              <input
                type="range"
                min={0}
                max={1}
                step={0.01}
                value={volume}
                onChange={handleVolumeChange}
                className="h-1 w-20 accent-brass"
                aria-label="Volume"
              />
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
        </>
      )}
    </div>
  );
}
