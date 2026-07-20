'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import AlbumTrackList from '@/components/AlbumTrackList';
import UploadForm from '@/components/UploadForm';
import ReplaceThumbnailButton from '@/components/ReplaceThumbnailButton';
import { useAuth } from '@/components/AuthProvider';
import type { Album, Song } from '@/lib/db';
import { deleteAlbumRequest, fetchAlbum, updateAlbumRequest } from '@/lib/api';

export default function AlbumPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const [album, setAlbum] = useState<Album | null>(null);
  const [songs, setSongs] = useState<Song[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [titleDraft, setTitleDraft] = useState('');
  const [editingTitle, setEditingTitle] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const isOwner = !!user && !!album && user.id === album.owner_id;

  useEffect(() => {
    fetchAlbum(params.id)
      .then(({ album, songs }) => {
        setAlbum(album);
        setSongs(songs);
        setTitleDraft(album.title);
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load album'));
  }, [params.id]);

  async function handleTitleSave() {
    if (!album) return;
    const next = titleDraft.trim();
    setEditingTitle(false);
    if (!next || next === album.title) {
      setTitleDraft(album.title);
      return;
    }
    const updated = await updateAlbumRequest(album.id, { title: next });
    setAlbum(updated);
  }

  async function handleDelete() {
    if (!album) return;
    if (
      !confirm(
        `Delete the album "${album.title}"? Its tracks will stay on the deck, just unsorted.`
      )
    )
      return;
    setDeleting(true);
    try {
      await deleteAlbumRequest(album.id);
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

  if (!album) {
    return (
      <main className="mx-auto max-w-3xl px-6 py-12">
        <p className="font-mono text-sm text-boneDim">Loading…</p>
      </main>
    );
  }

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
            {deleting ? 'Deleting…' : 'Delete album'}
          </button>
        )}
      </div>

      <div className="mb-10 flex flex-col gap-5 sm:flex-row sm:items-start">
        <div className="h-32 w-32 shrink-0 overflow-hidden border border-hairline bg-panelLight">
          {album.thumbnail_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={album.thumbnail_url} alt="" className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" className="text-hairline">
                <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.4" />
                <circle cx="12" cy="12" r="2.5" fill="currentColor" />
              </svg>
            </div>
          )}
        </div>

        <div className="flex-1">
          <p className="mb-1 font-mono text-[10px] uppercase tracking-[0.25em] text-boneDim">
            Album project
          </p>
          {isOwner && editingTitle ? (
            <input
              autoFocus
              value={titleDraft}
              onChange={(e) => setTitleDraft(e.target.value)}
              onBlur={handleTitleSave}
              onKeyDown={(e) => {
                if (e.key === 'Enter') e.currentTarget.blur();
                if (e.key === 'Escape') {
                  setTitleDraft(album.title);
                  setEditingTitle(false);
                }
              }}
              className="w-full border-b border-signal bg-transparent font-display text-2xl font-medium text-bone outline-none"
            />
          ) : (
            <h1
              onClick={() => isOwner && setEditingTitle(true)}
              className={`font-display text-2xl font-medium text-bone ${isOwner ? 'cursor-text' : ''}`}
              title={isOwner ? 'Click to rename' : undefined}
            >
              {album.title}
            </h1>
          )}
          <p className="mt-1 mb-3 font-mono text-[11px] text-boneDim">
            {songs.length} {songs.length === 1 ? 'track' : 'tracks'}
            {album.owner_username ? ` · by ${album.owner_username}` : ''}
            {isOwner ? ' · click title to rename' : ''}
          </p>
          {isOwner && (
            <ReplaceThumbnailButton
              albumId={album.id}
              onReplaced={setAlbum}
              label={album.thumbnail_url ? 'Change cover' : 'Add cover art'}
            />
          )}
        </div>
      </div>

      <div className={isOwner ? 'grid grid-cols-1 gap-8 lg:grid-cols-[320px_1fr]' : ''}>
        {isOwner && (
          <div className="lg:sticky lg:top-12 lg:self-start">
            <UploadForm
              defaultAlbumId={album.id}
              onCreated={(song) => setSongs((prev) => [...prev, song])}
            />
          </div>
        )}
        <div>
          <AlbumTrackList
            albumId={album.id}
            songs={songs}
            isOwner={isOwner}
            onReordered={setSongs}
          />
        </div>
      </div>
    </main>
  );
}
