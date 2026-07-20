import { NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { createUser, getUserByUsername } from '@/lib/db';
import { createSessionToken, hashPassword, isValidUsername, SESSION_COOKIE_MAX_AGE, SESSION_COOKIE_NAME } from '@/lib/auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const { username, password } = await request.json();

    if (typeof username !== 'string' || !isValidUsername(username)) {
      return NextResponse.json(
        { error: 'Username must be 3–24 characters: letters, numbers, underscores.' },
        { status: 400 }
      );
    }
    if (typeof password !== 'string' || password.length < 8) {
      return NextResponse.json(
        { error: 'Password must be at least 8 characters.' },
        { status: 400 }
      );
    }

    const existing = await getUserByUsername(username);
    if (existing) {
      return NextResponse.json({ error: 'That username is already taken.' }, { status: 409 });
    }

    const passwordHash = await hashPassword(password);
    const user = await createUser({ id: randomUUID(), username, passwordHash });
    const token = await createSessionToken({ id: user.id, username: user.username });

    const res = NextResponse.json({ user: { id: user.id, username: user.username } }, { status: 201 });
    res.cookies.set(SESSION_COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: SESSION_COOKIE_MAX_AGE,
    });
    return res;
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to register' },
      { status: 500 }
    );
  }
}
