'use client';

import type { Album, AlbumWithCount, Song } from '@/lib/db';

async function handle<T>(res: Response): Promise<T> {
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || `Request failed (${res.status})`);
  }
  return data as T;
}

/* ---------------------------- Auth ---------------------------- */

export type AuthUser = { id: string; username: string };

export async function fetchCurrentUser(): Promise<AuthUser | null> {
  const res = await fetch('/api/auth/me', { cache: 'no-store' });
  const data = await handle<{ user: AuthUser | null }>(res);
  return data.user;
}

export async function registerRequest(username: string, password: string): Promise<AuthUser> {
  const res = await fetch('/api/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });
  const data = await handle<{ user: AuthUser }>(res);
  return data.user;
}

export async function loginRequest(username: string, password: string): Promise<AuthUser> {
  const res = await fetch('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });
  const data = await handle<{ user: AuthUser }>(res);
  return data.user;
}

export async function logoutRequest(): Promise<void> {
  const res = await fetch('/api/auth/logout', { method: 'POST' });
  await handle(res);
}

/* ---------------------------- Songs ---------------------------- */

export async function fetchSongs(): Promise<Song[]> {
  const res = await fetch('/api/songs', { cache: 'no-store' });
  const data = await handle<{ songs: Song[] }>(res);
  return data.songs;
}

export async function fetchSong(id: string): Promise<Song> {
  const res = await fetch(`/api/songs/${id}`, { cache: 'no-store' });
  const data = await handle<{ song: Song }>(res);
  return data.song;
}

export async function createSongRecord(input: {
  title: string;
  lyrics: string;
  url: string;
  pathname: string;
  filename: string;
  mimeType: string;
  size: number;
  albumId?: string | null;
}): Promise<Song> {
  const res = await fetch('/api/songs', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  const data = await handle<{ song: Song }>(res);
  return data.song;
}

export async function updateSongMetaRequest(
  id: string,
  input: { title?: string; lyrics?: string; albumId?: string | null; visibility?: 'public' | 'private' }
): Promise<Song> {
  const res = await fetch(`/api/songs/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  const data = await handle<{ song: Song }>(res);
  return data.song;
}

export async function replaceSongAudio(
  id: string,
  input: { url: string; pathname: string; filename: string; mimeType: string; size: number }
): Promise<Song> {
  const res = await fetch(`/api/songs/${id}/audio`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  const data = await handle<{ song: Song }>(res);
  return data.song;
}

export async function deleteSongRequest(id: string): Promise<void> {
  const res = await fetch(`/api/songs/${id}`, { method: 'DELETE' });
  await handle(res);
}

/* ---------------------------- Albums ---------------------------- */

export async function fetchAlbums(): Promise<AlbumWithCount[]> {
  const res = await fetch('/api/albums', { cache: 'no-store' });
  const data = await handle<{ albums: AlbumWithCount[] }>(res);
  return data.albums;
}

export async function fetchAlbum(id: string): Promise<{ album: Album; songs: Song[] }> {
  const res = await fetch(`/api/albums/${id}`, { cache: 'no-store' });
  return handle<{ album: Album; songs: Song[] }>(res);
}

export async function createAlbumRecord(input: {
  title: string;
  thumbnailUrl?: string | null;
  thumbnailPathname?: string | null;
}): Promise<Album> {
  const res = await fetch('/api/albums', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  const data = await handle<{ album: Album }>(res);
  return data.album;
}

export async function updateAlbumRequest(
  id: string,
  input: { title?: string; thumbnailUrl?: string | null; thumbnailPathname?: string | null }
): Promise<Album> {
  const res = await fetch(`/api/albums/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  const data = await handle<{ album: Album }>(res);
  return data.album;
}

export async function deleteAlbumRequest(id: string): Promise<void> {
  const res = await fetch(`/api/albums/${id}`, { method: 'DELETE' });
  await handle(res);
}

export async function reorderAlbumSongsRequest(albumId: string, songIds: string[]): Promise<Song[]> {
  const res = await fetch(`/api/albums/${albumId}/reorder`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ songIds }),
  });
  const data = await handle<{ songs: Song[] }>(res);
  return data.songs;
}
