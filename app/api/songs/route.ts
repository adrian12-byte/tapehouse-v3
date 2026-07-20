import { NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { createSong, getAlbum, listSongs } from '@/lib/db';
import { getSessionUser } from '@/lib/auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const songs = await listSongs();
    return NextResponse.json({ songs });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to load songs' },
      { status: 500 }
    );
  }
}

// Called by the client after the audio file has already been uploaded
// directly to Blob storage. This route only ever receives a small JSON
// payload, never the file bytes.
export async function POST(request: Request) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: 'Sign in to add a track.' }, { status: 401 });
    }

    const data = await request.json();
    const { title, lyrics, url, pathname, filename, mimeType, size, albumId } = data ?? {};

    if (!title || typeof title !== 'string') {
      return NextResponse.json({ error: 'A song name is required.' }, { status: 400 });
    }
    if (!url || !pathname) {
      return NextResponse.json({ error: 'Missing uploaded audio reference.' }, { status: 400 });
    }

    let resolvedAlbumId: string | null = null;
    if (typeof albumId === 'string' && albumId) {
      const album = await getAlbum(albumId);
      if (!album || album.owner_id !== user.id) {
        return NextResponse.json({ error: 'You can only add tracks to your own albums.' }, { status: 403 });
      }
      resolvedAlbumId = albumId;
    }

    const song = await createSong({
      id: randomUUID(),
      title: title.trim(),
      lyrics: typeof lyrics === 'string' ? lyrics : '',
      audioUrl: url,
      audioPathname: pathname,
      originalFilename: filename ?? 'audio',
      mimeType: mimeType ?? 'application/octet-stream',
      sizeBytes: typeof size === 'number' ? size : 0,
      albumId: resolvedAlbumId,
      ownerId: user.id,
    });

    return NextResponse.json({ song }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to save song' },
      { status: 500 }
    );
  }
}
