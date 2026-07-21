# Tapehouse

Upload songs, attach names and lyrics, swap the audio file whenever you like, warp
playback speed and pitch independently, download the original file back out, and
group tracks into album projects with reorderable tracks and their own cover art —
all from a browser, hosted on Vercel. Playback keeps going as you browse to other
pages, with skip next/previous through whatever album you're listening to.
Accounts keep things tidy: every track and album has an owner, only that owner can
rename, edit, replace, reorder, or delete it, and each owner decides per-track
whether the download link is public or for their eyes only.

- **Storage:** audio files live in Vercel Blob; titles, lyrics, and file
  references live in a Postgres database (Neon, via Vercel's Storage tab).
  Everything is available from any device you sign in from.
- **Speed & pitch:** playback runs through granular synthesis
  ([Tone.js](https://tonejs.github.io/) `GrainPlayer`), so you can slow a
  track down without dropping its pitch, or shift pitch without changing
  tempo — independently, in real time.

## 1. Get the code onto GitHub

Push this folder to a new GitHub repository (or use GitHub's "Import" to
upload it directly).

## 2. Deploy to Vercel

1. Go to [vercel.com/new](https://vercel.com/new) and import the repository.
2. Before the first deploy finishes setting up, open the project's
   **Storage** tab and add:
   - **Postgres** (the Neon integration) — this sets a `DATABASE_URL`
     environment variable automatically.
   - **Blob** — this sets a `BLOB_READ_WRITE_TOKEN` environment variable
     automatically.
3. Go to **Settings → Environment Variables** and add one more variable
   yourself: `SESSION_SECRET`, a long random string (e.g. generate one with
   `openssl rand -base64 32` on your machine, or any password generator).
   This signs login sessions — keep it secret and don't reuse it elsewhere.
4. Redeploy if the project deployed before you added storage/the secret.
   That's it — the database tables are created automatically the first
   time the app touches them, no migration step required.

## 3. Run it locally (optional)

```bash
npm install
```

Copy `.env.example` to `.env.local` and fill in the two values — you can
copy them from the Vercel project's Storage tab (Settings → Environment
Variables) or from `vercel env pull .env.local` if you have the Vercel CLI
linked to the project.

```bash
npm run dev
```

Open http://localhost:3000.

## How it's built

- **Next.js 14** (App Router) + TypeScript + Tailwind.
- Audio files upload directly from the browser to Vercel Blob (so large
  WAV/FLAC masters never pass through a serverless function's request-body
  limit); the app's own API only ever stores small JSON records.
- `app/api/songs` — list/create tracks.
- `app/api/songs/[id]` — read/rename/edit-lyrics/move-to-album/delete a track.
- `app/api/songs/[id]/audio` — replace a track's audio file, cleaning up
  the old Blob object afterward.
- `app/api/songs/[id]/download` — proxies the file back through your own
  domain with a `Content-Disposition: attachment` header, so the browser
  reliably downloads it with the original filename (cross-origin `download`
  attributes on `<a>` tags aren't dependable, so this avoids that).
- `app/api/albums` / `app/api/albums/[id]` — create, rename, re-cover, and
  delete album projects. Deleting an album unsorts its tracks rather than
  deleting them.
- `components/AudioPlayer.tsx` — the player, with horizontal **Speed**
  (0.5×–2×) and **Pitch** (±12 semitones) sliders, each independent of the
  other and built on native `<input type="range">` for reliable touch/swipe
  behavior on phones.
- Album cover art uploads reuse the same direct-to-Blob flow as audio, just
  restricted to image types via a `clientPayload` hint sent from the
  browser.
- `components/PlayerProvider.tsx` — a single Tone.js source lives in React
  context at the root layout, above the routed page content, so playback
  isn't tied to any one page and survives client-side navigation. It also
  tracks an ordered "queue" (an album's tracks) so **Skip next/previous**
  works, and auto-advances to the next track when one ends. A persistent
  mini-player (`components/NowPlayingBar.tsx`) shows whatever's currently
  playing at the bottom of every page.
  - Playback uses a plain `Tone.Player` by default — ordinary, artifact-free
    audio. It only swaps over to `Tone.GrainPlayer` (which enables
    independent speed/pitch control via granular synthesis, and can
    introduce a slight audible warble as a side effect of that technique)
    the moment you actually move the Speed or Pitch slider away from
    normal. Untouched playback is always the clean engine.
- Track order within an album is a `position` column, editable only by the
  album's owner via up/down controls on `components/AlbumTrackList.tsx` and
  persisted through `app/api/albums/[id]/reorder`.
- `app/api/auth/*` — register, login, logout, and "who am I" endpoints.
  Passwords are hashed with bcrypt; sessions are a signed, `httpOnly`
  cookie (via `jose`), not stored server-side.
- Every track and album has an `owner_id`. The API checks the session's
  user against that owner on every rename, lyric edit, audio replace,
  album move, thumbnail change, and delete — not just the UI, so someone
  can't bypass it by calling the API directly.
- Each track has a `visibility` of `public` or `private`, toggleable only
  by its owner, which gates the **Download** button and the
  `/api/songs/[id]/download` route specifically.

**A limitation worth knowing:** setting a track to "private" blocks the
Download button and the download API for everyone but the owner — but
playback itself is intentionally still open to anyone with the link (that's
what makes the app useful for sharing works-in-progress). Since the
underlying audio has to be streamable to play at all, a technically
determined visitor could still capture that stream and save it by other
means — there's no way to allow in-browser playback while making the bytes
truly unobtainable without a much heavier DRM setup, which is out of scope
here. Treat "private" as "not casually downloadable," not as encryption.

## Supported audio formats

`.wav`, `.mp3`, `.flac` — up to 200MB per file (adjustable in
`lib/constants.ts`).
