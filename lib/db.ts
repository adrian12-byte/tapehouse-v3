import { neon } from '@neondatabase/serverless';

export type Visibility = 'public' | 'private';

export type User = {
  id: string;
  username: string;
  password_hash: string;
  created_at: string;
};

export type Song = {
  id: string;
  title: string;
  lyrics: string;
  audio_url: string;
  audio_pathname: string;
  original_filename: string | null;
  mime_type: string | null;
  size_bytes: number | null;
  album_id: string | null;
  owner_id: string | null;
  owner_username: string | null;
  visibility: Visibility;
  created_at: string;
  updated_at: string;
};

export type Album = {
  id: string;
  title: string;
  thumbnail_url: string | null;
  thumbnail_pathname: string | null;
  owner_id: string | null;
  owner_username: string | null;
  created_at: string;
  updated_at: string;
};

export type AlbumWithCount = Album & { song_count: number };

function sql() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error(
      'DATABASE_URL is not set. Add a Postgres integration (e.g. Neon) from the Vercel Storage tab, or set it in .env.local for local development.'
    );
  }
  return neon(url);
}

let schemaReady: Promise<void> | null = null;

export function ensureSchema(): Promise<void> {
  if (!schemaReady) {
    schemaReady = (async () => {
      const db = sql();
      await db`
        CREATE TABLE IF NOT EXISTS users (
          id TEXT PRIMARY KEY,
          username TEXT NOT NULL UNIQUE,
          password_hash TEXT NOT NULL,
          created_at TIMESTAMPTZ NOT NULL DEFAULT now()
        )
      `;
      await db`
        CREATE TABLE IF NOT EXISTS albums (
          id TEXT PRIMARY KEY,
          title TEXT NOT NULL,
          thumbnail_url TEXT,
          thumbnail_pathname TEXT,
          owner_id TEXT REFERENCES users(id) ON DELETE SET NULL,
          created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
        )
      `;
      await db`
        CREATE TABLE IF NOT EXISTS songs (
          id TEXT PRIMARY KEY,
          title TEXT NOT NULL,
          lyrics TEXT NOT NULL DEFAULT '',
          audio_url TEXT NOT NULL,
          audio_pathname TEXT NOT NULL,
          original_filename TEXT,
          mime_type TEXT,
          size_bytes BIGINT,
          album_id TEXT REFERENCES albums(id) ON DELETE SET NULL,
          owner_id TEXT REFERENCES users(id) ON DELETE SET NULL,
          visibility TEXT NOT NULL DEFAULT 'public',
          created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
        )
      `;
      // Backfill for databases created before album/user support existed.
      await db`ALTER TABLE songs ADD COLUMN IF NOT EXISTS album_id TEXT REFERENCES albums(id) ON DELETE SET NULL`;
      await db`ALTER TABLE songs ADD COLUMN IF NOT EXISTS owner_id TEXT REFERENCES users(id) ON DELETE SET NULL`;
      await db`ALTER TABLE songs ADD COLUMN IF NOT EXISTS visibility TEXT NOT NULL DEFAULT 'public'`;
      await db`ALTER TABLE albums ADD COLUMN IF NOT EXISTS owner_id TEXT REFERENCES users(id) ON DELETE SET NULL`;
    })();
  }
  return schemaReady;
}

/* ---------------------------- Users ---------------------------- */

export async function createUser(input: {
  id: string;
  username: string;
  passwordHash: string;
}): Promise<User> {
  await ensureSchema();
  const db = sql();
  const rows = await db`
    INSERT INTO users (id, username, password_hash)
    VALUES (${input.id}, ${input.username}, ${input.passwordHash})
    RETURNING *
  `;
  return rows[0] as User;
}

export async function getUserByUsername(username: string): Promise<User | null> {
  await ensureSchema();
  const db = sql();
  const rows = await db`SELECT * FROM users WHERE username = ${username}`;
  return (rows[0] as User) ?? null;
}

export async function getUserById(id: string): Promise<User | null> {
  await ensureSchema();
  const db = sql();
  const rows = await db`SELECT * FROM users WHERE id = ${id}`;
  return (rows[0] as User) ?? null;
}

/* ---------------------------- Songs ---------------------------- */

export async function listSongs(): Promise<Song[]> {
  await ensureSchema();
  const db = sql();
  const rows = await db`
    SELECT s.*, u.username AS owner_username
    FROM songs s
    LEFT JOIN users u ON u.id = s.owner_id
    ORDER BY s.created_at DESC
  `;
  return rows as Song[];
}

export async function listSongsByAlbum(albumId: string): Promise<Song[]> {
  await ensureSchema();
  const db = sql();
  const rows = await db`
    SELECT s.*, u.username AS owner_username
    FROM songs s
    LEFT JOIN users u ON u.id = s.owner_id
    WHERE s.album_id = ${albumId}
    ORDER BY s.created_at ASC
  `;
  return rows as Song[];
}

export async function getSong(id: string): Promise<Song | null> {
  await ensureSchema();
  const db = sql();
  const rows = await db`
    SELECT s.*, u.username AS owner_username
    FROM songs s
    LEFT JOIN users u ON u.id = s.owner_id
    WHERE s.id = ${id}
  `;
  return (rows[0] as Song) ?? null;
}

export async function createSong(input: {
  id: string;
  title: string;
  lyrics: string;
  audioUrl: string;
  audioPathname: string;
  originalFilename: string;
  mimeType: string;
  sizeBytes: number;
  albumId?: string | null;
  ownerId: string;
  visibility?: Visibility;
}): Promise<Song> {
  await ensureSchema();
  const db = sql();
  await db`
    INSERT INTO songs (id, title, lyrics, audio_url, audio_pathname, original_filename, mime_type, size_bytes, album_id, owner_id, visibility)
    VALUES (${input.id}, ${input.title}, ${input.lyrics}, ${input.audioUrl}, ${input.audioPathname}, ${input.originalFilename}, ${input.mimeType}, ${input.sizeBytes}, ${input.albumId ?? null}, ${input.ownerId}, ${input.visibility ?? 'public'})
  `;
  return (await getSong(input.id)) as Song;
}

export async function updateSongMeta(
  id: string,
  input: { title?: string; lyrics?: string; albumId?: string | null; visibility?: Visibility }
): Promise<Song | null> {
  await ensureSchema();
  const db = sql();
  const current = await getSong(id);
  if (!current) return null;
  const title = input.title ?? current.title;
  const lyrics = input.lyrics ?? current.lyrics;
  const albumId = input.albumId !== undefined ? input.albumId : current.album_id;
  const visibility = input.visibility ?? current.visibility;
  await db`
    UPDATE songs SET title = ${title}, lyrics = ${lyrics}, album_id = ${albumId}, visibility = ${visibility}, updated_at = now()
    WHERE id = ${id}
  `;
  return getSong(id);
}

export async function updateSongAudio(
  id: string,
  input: {
    audioUrl: string;
    audioPathname: string;
    originalFilename: string;
    mimeType: string;
    sizeBytes: number;
  }
): Promise<Song | null> {
  await ensureSchema();
  const db = sql();
  await db`
    UPDATE songs
    SET audio_url = ${input.audioUrl},
        audio_pathname = ${input.audioPathname},
        original_filename = ${input.originalFilename},
        mime_type = ${input.mimeType},
        size_bytes = ${input.sizeBytes},
        updated_at = now()
    WHERE id = ${id}
  `;
  return getSong(id);
}

export async function deleteSong(id: string): Promise<Song | null> {
  await ensureSchema();
  const db = sql();
  const rows = await db`DELETE FROM songs WHERE id = ${id} RETURNING *`;
  return (rows[0] as Song) ?? null;
}

/* ---------------------------- Albums ---------------------------- */

export async function listAlbums(): Promise<AlbumWithCount[]> {
  await ensureSchema();
  const db = sql();
  const rows = await db`
    SELECT a.*, u.username AS owner_username, COUNT(s.id)::int AS song_count
    FROM albums a
    LEFT JOIN users u ON u.id = a.owner_id
    LEFT JOIN songs s ON s.album_id = a.id
    GROUP BY a.id, u.username
    ORDER BY a.created_at DESC
  `;
  return rows as AlbumWithCount[];
}

export async function getAlbum(id: string): Promise<Album | null> {
  await ensureSchema();
  const db = sql();
  const rows = await db`
    SELECT a.*, u.username AS owner_username
    FROM albums a
    LEFT JOIN users u ON u.id = a.owner_id
    WHERE a.id = ${id}
  `;
  return (rows[0] as Album) ?? null;
}

export async function createAlbum(input: {
  id: string;
  title: string;
  ownerId: string;
  thumbnailUrl?: string | null;
  thumbnailPathname?: string | null;
}): Promise<Album> {
  await ensureSchema();
  const db = sql();
  await db`
    INSERT INTO albums (id, title, thumbnail_url, thumbnail_pathname, owner_id)
    VALUES (${input.id}, ${input.title}, ${input.thumbnailUrl ?? null}, ${input.thumbnailPathname ?? null}, ${input.ownerId})
  `;
  return (await getAlbum(input.id)) as Album;
}

export async function updateAlbum(
  id: string,
  input: { title?: string; thumbnailUrl?: string | null; thumbnailPathname?: string | null }
): Promise<Album | null> {
  await ensureSchema();
  const db = sql();
  const current = await getAlbum(id);
  if (!current) return null;
  const title = input.title ?? current.title;
  const thumbnailUrl = input.thumbnailUrl !== undefined ? input.thumbnailUrl : current.thumbnail_url;
  const thumbnailPathname =
    input.thumbnailPathname !== undefined ? input.thumbnailPathname : current.thumbnail_pathname;
  await db`
    UPDATE albums
    SET title = ${title}, thumbnail_url = ${thumbnailUrl}, thumbnail_pathname = ${thumbnailPathname}, updated_at = now()
    WHERE id = ${id}
  `;
  return getAlbum(id);
}

export async function deleteAlbum(id: string): Promise<Album | null> {
  await ensureSchema();
  const db = sql();
  // Songs in the album are kept, just unlinked (ON DELETE SET NULL).
  const rows = await db`DELETE FROM albums WHERE id = ${id} RETURNING *`;
  return (rows[0] as Album) ?? null;
}
