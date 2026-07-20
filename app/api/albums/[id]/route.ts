import { NextResponse } from 'next/server';
import { del } from '@vercel/blob';
import { deleteAlbum, getAlbum, listSongsByAlbum, updateAlbum } from '@/lib/db';
import { getSessionUser } from '@/lib/auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(_request: Request, { params }: { params: { id: string } }) {
  try {
    const album = await getAlbum(params.id);
    if (!album) {
      return NextResponse.json({ error: 'Album not found.' }, { status: 404 });
    }
    const songs = await listSongsByAlbum(params.id);
    return NextResponse.json({ album, songs });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to load album' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  try {
    const existing = await getAlbum(params.id);
    if (!existing) {
      return NextResponse.json({ error: 'Album not found.' }, { status: 404 });
    }

    const user = await getSessionUser();
    if (!user || user.id !== existing.owner_id) {
      return NextResponse.json({ error: 'Only the album owner can edit it.' }, { status: 403 });
    }

    const data = await request.json();
    const { title, thumbnailUrl, thumbnailPathname } = data ?? {};

    if (title !== undefined && (typeof title !== 'string' || !title.trim())) {
      return NextResponse.json({ error: 'Album title cannot be empty.' }, { status: 400 });
    }

    const oldThumbnailPathname = existing.thumbnail_pathname;
    const album = await updateAlbum(params.id, {
      title: typeof title === 'string' ? title.trim() : undefined,
      thumbnailUrl: thumbnailUrl !== undefined ? thumbnailUrl : undefined,
      thumbnailPathname: thumbnailPathname !== undefined ? thumbnailPathname : undefined,
    });

    // Clean up the previous thumbnail blob if it was replaced.
    if (
      thumbnailPathname !== undefined &&
      oldThumbnailPathname &&
      oldThumbnailPathname !== thumbnailPathname
    ) {
      try {
        await del(oldThumbnailPathname);
      } catch {
        // Non-fatal.
      }
    }

    return NextResponse.json({ album });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to update album' },
      { status: 500 }
    );
  }
}

export async function DELETE(_request: Request, { params }: { params: { id: string } }) {
  try {
    const album = await getAlbum(params.id);
    if (!album) {
      return NextResponse.json({ error: 'Album not found.' }, { status: 404 });
    }

    const user = await getSessionUser();
    if (!user || user.id !== album.owner_id) {
      return NextResponse.json({ error: 'Only the album owner can delete it.' }, { status: 403 });
    }

    if (album.thumbnail_pathname) {
      try {
        await del(album.thumbnail_pathname);
      } catch {
        // If the blob is already gone, don't block deleting the record.
      }
    }

    await deleteAlbum(params.id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to delete album' },
      { status: 500 }
    );
  }
}
