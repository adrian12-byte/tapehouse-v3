import { NextResponse } from 'next/server';
import { getAlbum, listSongsByAlbum, reorderAlbumSongs } from '@/lib/db';
import { getSessionUser } from '@/lib/auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: Request, { params }: { params: { id: string } }) {
  try {
    const album = await getAlbum(params.id);
    if (!album) {
      return NextResponse.json({ error: 'Album not found.' }, { status: 404 });
    }

    const user = await getSessionUser();
    if (!user || user.id !== album.owner_id) {
      return NextResponse.json({ error: 'Only the album owner can reorder tracks.' }, { status: 403 });
    }

    const { songIds } = await request.json();
    if (!Array.isArray(songIds) || songIds.some((id) => typeof id !== 'string')) {
      return NextResponse.json({ error: 'songIds must be an array of track IDs.' }, { status: 400 });
    }

    const current = await listSongsByAlbum(params.id);
    const currentIds = new Set(current.map((s) => s.id));
    if (songIds.length !== current.length || songIds.some((id) => !currentIds.has(id))) {
      return NextResponse.json({ error: "That track list doesn't match this album." }, { status: 400 });
    }

    await reorderAlbumSongs(params.id, songIds);
    const songs = await listSongsByAlbum(params.id);
    return NextResponse.json({ songs });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to reorder tracks' },
      { status: 500 }
    );
  }
}
