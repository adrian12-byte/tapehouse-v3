'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import UploadForm from '@/components/UploadForm';
import SongList from '@/components/SongList';
import AlbumList from '@/components/AlbumList';
import NewAlbumForm from '@/components/NewAlbumForm';
import AuthBar from '@/components/AuthBar';
import { useAuth } from '@/components/AuthProvider';
import type { AlbumWithCount, Song } from '@/lib/db';
import { fetchAlbums, fetchSongs } from '@/lib/api';

export default function HomePage() {
  const router = useRouter();
  const { user } = useAuth();
  const [songs, setSongs] = useState<Song[]>([]);
  const [albums, setAlbums] = useState<AlbumWithCount[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showNewAlbum, setShowNewAlbum] = useState(false);

  useEffect(() => {
    Promise.all([fetchSongs(), fetchAlbums()])
      .then(([s, a]) => {
        setSongs(s);
        setAlbums(a);
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load'))
      .finally(() => setLoading(false));
  }, []);

  const unsorted = songs.filter((s) => !s.album_id);
  const myAlbums = user ? albums.filter((a) => a.owner_id === user.id) : [];

  return (
    <main className="mx-auto min-h-screen max-w-5xl px-6 py-12">
      <header className="mb-10 flex items-baseline justify-between border-b border-hairline pb-6">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-boneDim">Side A</p>
          <h1 className="font-display text-3xl font-medium text-bone">Tapehouse</h1>
        </div>
        <div className="flex flex-col items-end gap-3">
          <AuthBar />
          <p className="max-w-xs text-right font-mono text-[11px] text-boneDim">
            Upload tracks, write lyrics beside them, and warp speed &amp; pitch independently.
          </p>
        </div>
      </header>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-[320px_1fr]">
        <div className="lg:sticky lg:top-12 lg:self-start">
          {user ? (
            <UploadForm
              albums={myAlbums}
              onCreated={(song) => setSongs((prev) => [song, ...prev])}
            />
          ) : (
            <div className="tape-grain flex flex-col items-start gap-3 bg-panel p-6 shadow-console ring-1 ring-hairline">
              <p className="font-mono text-[11px] text-boneDim">
                Sign in to upload tracks — every track needs an owner so delete and download
                permissions can be enforced.
              </p>
              <Link
                href="/login"
                className="border border-hairline px-3 py-1.5 text-xs uppercase tracking-wide text-boneDim transition hover:border-brass hover:text-brassBright"
              >
                Sign in / create account
              </Link>
            </div>
          )}
        </div>

        <div>
          {error && <p className="mb-4 font-mono text-sm text-rust">{error}</p>}

          {loading ? (
            <p className="font-mono text-sm text-boneDim">Loading deck…</p>
          ) : (
            <>
              <section className="mb-10">
                <h2 className="mb-3 font-mono text-[10px] uppercase tracking-[0.25em] text-boneDim">
                  Album projects
                </h2>
                <AlbumList
                  albums={albums}
                  onNewAlbum={() => (user ? setShowNewAlbum(true) : router.push('/login'))}
                />
              </section>

              <section>
                <h2 className="mb-3 font-mono text-[10px] uppercase tracking-[0.25em] text-boneDim">
                  Unsorted tracks
                </h2>
                <SongList songs={unsorted} />
              </section>
            </>
          )}
        </div>
      </div>

      {showNewAlbum && (
        <NewAlbumForm
          onClose={() => setShowNewAlbum(false)}
          onCreated={(album) => {
            setAlbums((prev) => [{ ...album, song_count: 0, owner_username: user?.username ?? null }, ...prev]);
            setShowNewAlbum(false);
          }}
        />
      )}
    </main>
  );
}
