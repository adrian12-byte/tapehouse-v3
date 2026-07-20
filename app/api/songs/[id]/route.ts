import { NextResponse } from 'next/server';
import { del } from '@vercel/blob';
import { deleteSong, getAlbum, getSong, updateSongMeta } from '@/lib/db';
import { getSessionUser } from '@/lib/auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(_request: Request, { params }: { params: { id: string } }) {
  try {
    const song = await getSong(params.id);
    if (!song) {
      return NextResponse.json({ error: 'Song not found.' }, { status: 404 });
    }
    return NextResponse.json({ song });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to load song' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  try {
    const existing = await getSong(params.id);
    if (!existing) {
      return NextResponse.json({ error: 'Song not found.' }, { status: 404 });
    }

    const user = await getSessionUser();
    if (!user || user.id !== existing.owner_id) {
      return NextResponse.json({ error: 'Only the track owner can edit it.' }, { status: 403 });
    }

    const data = await request.json();
    const { title, lyrics, albumId, visibility } = data ?? {};

    if (title !== undefined && (typeof title !== 'string' || !title.trim())) {
      return NextResponse.json({ error: 'Song name cannot be empty.' }, { status: 400 });
    }

    if (visibility !== undefined && visibility !== 'public' && visibility !== 'private') {
      return NextResponse.json({ error: 'Visibility must be "public" or "private".' }, { status: 400 });
    }

    let resolvedAlbumId: string | null | undefined;
    if (albumId === undefined) {
      resolvedAlbumId = undefined;
    } else if (albumId === null || albumId === '') {
      resolvedAlbumId = null;
    } else {
      const album = await getAlbum(String(albumId));
      if (!album || album.owner_id !== user.id) {
        return NextResponse.json({ error: 'You can only move tracks into your own albums.' }, { status: 403 });
      }
      resolvedAlbumId = album.id;
    }

    const song = await updateSongMeta(params.id, {
      title: typeof title === 'string' ? title.trim() : undefined,
      lyrics: typeof lyrics === 'string' ? lyrics : undefined,
      albumId: resolvedAlbumId,
      visibility,
    });

    if (!song) {
      return NextResponse.json({ error: 'Song not found.' }, { status: 404 });
    }
    return NextResponse.json({ song });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to update song' },
      { status: 500 }
    );
  }
}

export async function DELETE(_request: Request, { params }: { params: { id: string } }) {
  try {
    const song = await getSong(params.id);
    if (!song) {
      return NextResponse.json({ error: 'Song not found.' }, { status: 404 });
    }

    const user = await getSessionUser();
    if (!user || user.id !== song.owner_id) {
      return NextResponse.json({ error: 'Only the track owner can delete it.' }, { status: 403 });
    }

    try {
      await del(song.audio_pathname);
    } catch {
      // If the blob is already gone, don't block deleting the record.
    }

    await deleteSong(params.id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to delete song' },
      { status: 500 }
    );
  }
}
