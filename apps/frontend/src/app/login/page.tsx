'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState, type FormEvent } from 'react';
import { useAuth } from '@/lib/auth';

export default function LoginPage() {
  const { user, loading, login } = useAuth();
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!loading && user) {
      router.replace('/');
    }
  }, [loading, user, router]);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await login({ username, password });
      router.replace('/');
    } catch {
      setError('Invalid username or password');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-wa-dark">
      <form
        onSubmit={onSubmit}
        className="w-full max-w-sm space-y-4 rounded-lg bg-wa-panel p-8 shadow-xl"
      >
        <div className="text-center">
          <h1 className="text-xl font-semibold text-wa-green">waflow</h1>
          <p className="mt-1 text-sm text-gray-400">Operator sign in</p>
        </div>
        <div>
          <label className="mb-1 block text-sm text-gray-300">Username</label>
          <input
            className="w-full rounded bg-wa-dark px-3 py-2 text-gray-100 outline-none ring-1 ring-transparent focus:ring-wa-green"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            autoComplete="username"
            required
          />
        </div>
        <div>
          <label className="mb-1 block text-sm text-gray-300">Password</label>
          <input
            type="password"
            className="w-full rounded bg-wa-dark px-3 py-2 text-gray-100 outline-none ring-1 ring-transparent focus:ring-wa-green"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            required
          />
        </div>
        {error && <p className="text-sm text-red-400">{error}</p>}
        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded bg-wa-green py-2 font-medium text-black transition hover:opacity-90 disabled:opacity-50"
        >
          {submitting ? 'Signing in…' : 'Sign in'}
        </button>
      </form>
    </div>
  );
}
