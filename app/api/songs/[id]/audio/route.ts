import { NextResponse } from 'next/server';
import { del } from '@vercel/blob';
import { getSong, updateSongAudio } from '@/lib/db';
import { getSessionUser } from '@/lib/auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Called by the client after the replacement file has already been
// uploaded directly to Blob storage.
export async function PUT(request: Request, { params }: { params: { id: string } }) {
  try {
    const existing = await getSong(params.id);
    if (!existing) {
      return NextResponse.json({ error: 'Song not found.' }, { status: 404 });
    }

    const user = await getSessionUser();
    if (!user || user.id !== existing.owner_id) {
      return NextResponse.json({ error: 'Only the track owner can replace its audio.' }, { status: 403 });
    }

    const data = await request.json();
    const { url, pathname, filename, mimeType, size } = data ?? {};

    if (!url || !pathname) {
      return NextResponse.json({ error: 'Missing uploaded audio reference.' }, { status: 400 });
    }

    const song = await updateSongAudio(params.id, {
      audioUrl: url,
      audioPathname: pathname,
      originalFilename: filename ?? existing.original_filename ?? 'audio',
      mimeType: mimeType ?? existing.mime_type ?? 'application/octet-stream',
      sizeBytes: typeof size === 'number' ? size : existing.size_bytes ?? 0,
    });

    // Clean up the old blob now that the record points at the new one.
    if (existing.audio_pathname && existing.audio_pathname !== pathname) {
      try {
        await del(existing.audio_pathname);
      } catch {
        // Non-fatal — the record is already updated.
      }
    }

    return NextResponse.json({ song });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to replace audio' },
      { status: 500 }
    );
  }
}
