'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/components/AuthProvider';

export default function LoginPage() {
  const router = useRouter();
  const { login, register } = useAuth();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      if (mode === 'login') {
        await login(username, password);
      } else {
        await register(username, password);
      }
      router.push('/');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center px-6 py-12">
      <Link href="/" className="mb-8 font-mono text-xs uppercase tracking-wide text-boneDim hover:text-brassBright">
        ← The deck
      </Link>

      <div className="tape-grain bg-panel p-6 shadow-console ring-1 ring-hairline">
        <div className="mb-5 flex gap-4 border-b border-hairline">
          <button
            type="button"
            onClick={() => setMode('login')}
            className={`pb-2 text-sm uppercase tracking-wide transition ${
              mode === 'login' ? 'border-b-2 border-brass text-bone' : 'text-boneDim'
            }`}
          >
            Sign in
          </button>
          <button
            type="button"
            onClick={() => setMode('register')}
            className={`pb-2 text-sm uppercase tracking-wide transition ${
              mode === 'register' ? 'border-b-2 border-brass text-bone' : 'text-boneDim'
            }`}
          >
            Create account
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <label htmlFor="username" className="mb-1.5 block text-xs uppercase tracking-wide text-boneDim">
            Username
          </label>
          <input
            id="username"
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            autoComplete="username"
            className="mb-4 w-full border border-hairline bg-ink px-3 py-2 text-sm text-bone outline-none focus:border-signal"
          />

          <label htmlFor="password" className="mb-1.5 block text-xs uppercase tracking-wide text-boneDim">
            Password
          </label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
            className="mb-1 w-full border border-hairline bg-ink px-3 py-2 text-sm text-bone outline-none focus:border-signal"
          />
          {mode === 'register' && (
            <p className="mb-4 font-mono text-[10px] text-boneDim">At least 8 characters.</p>
          )}

          {error && <p className="mt-3 mb-1 font-mono text-xs text-rust">{error}</p>}

          <button
            type="submit"
            disabled={busy}
            className="mt-4 w-full bg-brass py-2.5 text-sm font-medium text-ink transition hover:bg-brassBright disabled:opacity-50"
          >
            {busy ? 'Working…' : mode === 'login' ? 'Sign in' : 'Create account'}
          </button>
        </form>
      </div>
    </main>
  );
}
