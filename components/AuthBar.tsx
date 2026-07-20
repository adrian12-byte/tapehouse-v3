'use client';

import Link from 'next/link';
import { useAuth } from './AuthProvider';

export default function AuthBar() {
  const { user, loading, logout } = useAuth();

  if (loading) return <div className="h-8" />;

  if (!user) {
    return (
      <Link
        href="/login"
        className="border border-hairline px-3 py-1.5 font-mono text-xs uppercase tracking-wide text-boneDim transition hover:border-brass hover:text-brassBright"
      >
        Sign in
      </Link>
    );
  }

  return (
    <div className="flex items-center gap-3">
      <span className="font-mono text-xs text-boneDim">
        signed in as <span className="text-bone">{user.username}</span>
      </span>
      <button
        type="button"
        onClick={() => logout()}
        className="border border-hairline px-3 py-1.5 font-mono text-xs uppercase tracking-wide text-boneDim transition hover:border-rust hover:text-rust"
      >
        Log out
      </button>
    </div>
  );
}
