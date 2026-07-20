import { NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { createAlbum, listAlbums } from '@/lib/db';
import { getSessionUser } from '@/lib/auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const albums = await listAlbums();
    return NextResponse.json({ albums });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to load albums' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: 'Sign in to create an album.' }, { status: 401 });
    }

    const data = await request.json();
    const { title, thumbnailUrl, thumbnailPathname } = data ?? {};

    if (!title || typeof title !== 'string' || !title.trim()) {
      return NextResponse.json({ error: 'An album title is required.' }, { status: 400 });
    }

    const album = await createAlbum({
      id: randomUUID(),
      title: title.trim(),
      ownerId: user.id,
      thumbnailUrl: typeof thumbnailUrl === 'string' ? thumbnailUrl : null,
      thumbnailPathname: typeof thumbnailPathname === 'string' ? thumbnailPathname : null,
    });

    return NextResponse.json({ album }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create album' },
      { status: 500 }
    );
  }
}
