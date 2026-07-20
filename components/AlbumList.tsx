'use client';

import Link from 'next/link';
import type { AlbumWithCount } from '@/lib/db';

export default function AlbumList({
  albums,
  onNewAlbum,
}: {
  albums: AlbumWithCount[];
  onNewAlbum: () => void;
}) {
  return (
    <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
      <li>
        <button
          type="button"
          onClick={onNewAlbum}
          className="flex h-full min-h-[168px] w-full flex-col items-center justify-center gap-2 border border-dashed border-hairline text-boneDim transition hover:border-brass hover:text-brassBright"
        >
          <span className="flex h-9 w-9 items-center justify-center rounded-full border border-current">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M8 2.5v11M2.5 8h11" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
            </svg>
          </span>
          <span className="text-xs uppercase tracking-wide">New album</span>
        </button>
      </li>
      {albums.map((album) => (
        <li key={album.id}>
          <Link
            href={`/album/${album.id}`}
            className="group flex h-full flex-col border border-hairline bg-panel transition hover:border-brass/70"
          >
            <div className="aspect-square w-full overflow-hidden bg-panelLight">
              {album.thumbnail_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={album.thumbnail_url}
                  alt=""
                  className="h-full w-full object-cover transition group-hover:scale-[1.03]"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center">
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" className="text-hairline">
                    <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.4" />
                    <circle cx="12" cy="12" r="2.5" fill="currentColor" />
                  </svg>
                </div>
              )}
            </div>
            <div className="p-3">
              <h3 className="truncate font-display text-sm text-bone group-hover:text-brassBright">
                {album.title}
              </h3>
              <p className="mt-0.5 font-mono text-[10px] uppercase tracking-wide text-boneDim">
                {album.song_count} {album.song_count === 1 ? 'track' : 'tracks'}
                {album.owner_username ? ` · ${album.owner_username}` : ''}
              </p>
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );
}
