'use client';

import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import * as Tone from 'tone';
import type { Song } from '@/lib/db';

type PlayerContextValue = {
  currentSong: Song | null;
  queue: Song[];
  queueIndex: number;
  isPlaying: boolean;
  ready: boolean;
  error: string | null;
  duration: number;
  elapsed: number;
  speed: number;
  pitch: number;
  volume: number;
  hasNext: boolean;
  hasPrevious: boolean;
  playSong: (song: Song, queue?: Song[], index?: number) => Promise<void>;
  togglePlay: () => Promise<void>;
  seek: (fraction: number) => void;
  setSpeed: (value: number) => void;
  setPitch: (value: number) => void;
  setVolume: (value: number) => void;
  next: () => void;
  previous: () => void;
};

const PlayerContext = createContext<PlayerContextValue | null>(null);

export function PlayerProvider({ children }: { children: React.ReactNode }) {
  const playerRef = useRef<Tone.GrainPlayer | null>(null);
  const rafRef = useRef<number | null>(null);
  const timing = useRef({ offset: 0, startedAt: 0, rate: 1 });

  // Mirrors of state, readable synchronously inside imperative callbacks
  // (audio engine code) without falling prey to stale-closure bugs.
  const currentSongRef = useRef<Song | null>(null);
  const queueRef = useRef<Song[]>([]);
  const queueIndexRef = useRef(0);
  const isPlayingRef = useRef(false);
  const readyRef = useRef(false);
  const durationRef = useRef(0);
  const elapsedRef = useRef(0);
  const speedRef = useRef(1);
  const pitchRef = useRef(0);
  const volumeRef = useRef(0.85);

  const [currentSong, setCurrentSong] = useState<Song | null>(null);
  const [queue, setQueue] = useState<Song[]>([]);
  const [queueIndex, setQueueIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [duration, setDuration] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [speed, setSpeed] = useState(1);
  const [pitch, setPitch] = useState(0);
  const [volume, setVolume] = useState(0.85);

  const setCurrentSongBoth = (s: Song | null) => {
    currentSongRef.current = s;
    setCurrentSong(s);
  };
  const setQueueBoth = (q: Song[]) => {
    queueRef.current = q;
    setQueue(q);
  };
  const setQueueIndexBoth = (i: number) => {
    queueIndexRef.current = i;
    setQueueIndex(i);
  };
  const setPlayingBoth = (v: boolean) => {
    isPlayingRef.current = v;
    setIsPlaying(v);
  };
  const setReadyBoth = (v: boolean) => {
    readyRef.current = v;
    setReady(v);
  };
  const setDurationBoth = (d: number) => {
    durationRef.current = d;
    setDuration(d);
  };
  const setElapsedBoth = (e: number) => {
    elapsedRef.current = e;
    setElapsed(e);
  };

  const cancelAnim = useCallback(() => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
  }, []);

  const currentElapsedNow = useCallback(() => {
    const t = timing.current;
    const now = Tone.now();
    return t.offset + (now - t.startedAt) * t.rate;
  }, []);

  // The single authoritative animation loop. This is the ONLY place that
  // schedules requestAnimationFrame — a previous version also kicked off a
  // frame directly inside the "play" handler, which created a second,
  // uncancellable loop and was the cause of the progress bar continuing
  // to creep forward after pausing. Now there's exactly one loop, gated by
  // `isPlaying`, so pausing always stops it for good.
  const tick = useCallback(() => {
    const t = timing.current;
    const now = Tone.now();
    const currentElapsed = t.offset + (now - t.startedAt) * t.rate;

    if (currentElapsed >= durationRef.current) {
      setElapsedBoth(durationRef.current);
      setPlayingBoth(false);
      const q = queueRef.current;
      const idx = queueIndexRef.current;
      if (idx + 1 < q.length) {
        const nextSong = q[idx + 1];
        setQueueIndexBoth(idx + 1);
        setCurrentSongBoth(nextSong);
        loadSong(nextSong, true);
      }
      return;
    }

    setElapsedBoth(currentElapsed);
    rafRef.current = requestAnimationFrame(tick);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!isPlaying) {
      cancelAnim();
      return;
    }
    rafRef.current = requestAnimationFrame(tick);
    return cancelAnim;
  }, [isPlaying, tick, cancelAnim]);

  const loadSong = useCallback((song: Song, autoplay: boolean) => {
    cancelAnim();
    if (playerRef.current) {
      try {
        playerRef.current.stop();
      } catch {
        // already stopped
      }
      playerRef.current.dispose();
      playerRef.current = null;
    }

    setError(null);
    setReadyBoth(false);
    setPlayingBoth(false);
    setElapsedBoth(0);
    setDurationBoth(0);
    speedRef.current = 1;
    setSpeed(1);
    pitchRef.current = 0;
    setPitch(0);
    timing.current = { offset: 0, startedAt: 0, rate: 1 };

    const player = new Tone.GrainPlayer({
      url: song.audio_url,
      grainSize: 0.2,
      overlap: 0.1,
      onload: () => {
        setDurationBoth(player.buffer.duration);
        setReadyBoth(true);
        if (autoplay) {
          player.playbackRate = speedRef.current;
          player.detune = pitchRef.current * 100;
          player.start(undefined, 0);
          timing.current = { offset: 0, startedAt: Tone.now(), rate: speedRef.current };
          setPlayingBoth(true);
        }
      },
      onerror: () => setError('Could not load this audio file.'),
    }).toDestination();
    player.volume.value = Tone.gainToDb(volumeRef.current);
    playerRef.current = player;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cancelAnim]);

  const playSong = useCallback(
    async (song: Song, newQueue?: Song[], index?: number) => {
      const q = newQueue && newQueue.length ? newQueue : [song];
      const idx = index !== undefined ? index : Math.max(0, q.findIndex((s) => s.id === song.id));
      setQueueBoth(q);
      setQueueIndexBoth(idx);

      await Tone.start();

      if (currentSongRef.current?.id === song.id && playerRef.current && readyRef.current) {
        if (!isPlayingRef.current) {
          const player = playerRef.current;
          const startOffset =
            elapsedRef.current >= durationRef.current - 0.05 ? 0 : elapsedRef.current;
          player.playbackRate = speedRef.current;
          player.start(undefined, startOffset);
          timing.current = { offset: startOffset, startedAt: Tone.now(), rate: speedRef.current };
          setPlayingBoth(true);
        }
        return;
      }

      setCurrentSongBoth(song);
      loadSong(song, true);
    },
    [loadSong]
  );

  const togglePlay = useCallback(async () => {
    const player = playerRef.current;
    if (!player || !readyRef.current) return;
    await Tone.start();

    if (isPlayingRef.current) {
      const current = currentElapsedNow();
      player.stop();
      setElapsedBoth(Math.min(current, durationRef.current));
      setPlayingBoth(false);
    } else {
      const startOffset =
        elapsedRef.current >= durationRef.current - 0.05 ? 0 : elapsedRef.current;
      player.playbackRate = speedRef.current;
      player.start(undefined, startOffset);
      timing.current = { offset: startOffset, startedAt: Tone.now(), rate: speedRef.current };
      setPlayingBoth(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentElapsedNow]);

  const seek = useCallback((fraction: number) => {
    const player = playerRef.current;
    if (!player || !readyRef.current) return;
    const newOffset = Math.max(0, Math.min(durationRef.current, fraction * durationRef.current));
    if (isPlayingRef.current) {
      player.stop();
      player.start(undefined, newOffset);
      timing.current = { offset: newOffset, startedAt: Tone.now(), rate: speedRef.current };
    } else {
      timing.current.offset = newOffset;
    }
    setElapsedBoth(newOffset);
  }, []);

  const setSpeedFn = useCallback(
    (value: number) => {
      speedRef.current = value;
      setSpeed(value);
      const player = playerRef.current;
      if (!player) return;
      if (isPlayingRef.current) {
        const current = currentElapsedNow();
        timing.current = { offset: current, startedAt: Tone.now(), rate: value };
      }
      player.playbackRate = value;
    },
    [currentElapsedNow]
  );

  const setPitchFn = useCallback((value: number) => {
    pitchRef.current = value;
    setPitch(value);
    const player = playerRef.current;
    if (player) player.detune = value * 100;
  }, []);

  const setVolumeFn = useCallback((value: number) => {
    volumeRef.current = value;
    setVolume(value);
    const player = playerRef.current;
    if (player) player.volume.value = Tone.gainToDb(Math.max(0.0001, value));
  }, []);

  const next = useCallback(() => {
    const q = queueRef.current;
    const idx = queueIndexRef.current;
    const newIdx = idx + 1;
    if (newIdx >= q.length) return;
    const song = q[newIdx];
    setQueueIndexBoth(newIdx);
    setCurrentSongBoth(song);
    loadSong(song, true);
  }, [loadSong]);

  const previous = useCallback(() => {
    const q = queueRef.current;
    const idx = queueIndexRef.current;
    const newIdx = idx - 1;
    if (newIdx < 0) return;
    const song = q[newIdx];
    setQueueIndexBoth(newIdx);
    setCurrentSongBoth(song);
    loadSong(song, true);
  }, [loadSong]);

  useEffect(() => {
    return () => {
      cancelAnim();
      if (playerRef.current) {
        try {
          playerRef.current.stop();
        } catch {
          // already stopped
        }
        playerRef.current.dispose();
      }
    };
  }, [cancelAnim]);

  const value: PlayerContextValue = {
    currentSong,
    queue,
    queueIndex,
    isPlaying,
    ready,
    error,
    duration,
    elapsed,
    speed,
    pitch,
    volume,
    hasNext: queueIndex < queue.length - 1,
    hasPrevious: queueIndex > 0,
    playSong,
    togglePlay,
    seek,
    setSpeed: setSpeedFn,
    setPitch: setPitchFn,
    setVolume: setVolumeFn,
    next,
    previous,
  };

  return <PlayerContext.Provider value={value}>{children}</PlayerContext.Provider>;
}

export function usePlayer(): PlayerContextValue {
  const ctx = useContext(PlayerContext);
  if (!ctx) throw new Error('usePlayer must be used within PlayerProvider');
  return ctx;
}
