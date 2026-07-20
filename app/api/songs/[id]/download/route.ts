import { NextResponse } from 'next/server';
import { getSong } from '@/lib/db';
import { getSessionUser } from '@/lib/auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(_request: Request, { params }: { params: { id: string } }) {
  const song = await getSong(params.id);
  if (!song) {
    return NextResponse.json({ error: 'Song not found.' }, { status: 404 });
  }

  if (song.visibility === 'private') {
    const user = await getSessionUser();
    if (!user || user.id !== song.owner_id) {
      return NextResponse.json(
        { error: 'The owner has made this track unavailable to download.' },
        { status: 403 }
      );
    }
  }

  const upstream = await fetch(song.audio_url);
  if (!upstream.ok || !upstream.body) {
    return NextResponse.json({ error: 'Could not fetch audio file.' }, { status: 502 });
  }

  const filename = song.original_filename || `${song.title}.audio`;

  return new NextResponse(upstream.body, {
    headers: {
      'Content-Type': song.mime_type || 'application/octet-stream',
      'Content-Disposition': `attachment; filename="${filename.replace(/"/g, '')}"`,
      ...(upstream.headers.get('content-length')
        ? { 'Content-Length': upstream.headers.get('content-length')! }
        : {}),
    },
  });
}
