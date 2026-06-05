'use client';

import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { UserRole, type CreateUserDto, type UserDto, type WhatsappNumberDto } from '@waflow/shared';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';

export default function AdminPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  const [users, setUsers] = useState<UserDto[]>([]);
  const [numbers, setNumbers] = useState<WhatsappNumberDto[]>([]);
  const [form, setForm] = useState<CreateUserDto>({ username: '', password: '', role: UserRole.Operator });
  const [editing, setEditing] = useState<string | null>(null);
  const [assigned, setAssigned] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    const [u, n] = await Promise.all([
      api.get<UserDto[]>('/users'),
      api.get<WhatsappNumberDto[]>('/numbers'),
    ]);
    setUsers(u);
    setNumbers(n);
  }, []);

  useEffect(() => {
    if (!loading && (!user || user.role !== UserRole.Admin)) {
      router.replace('/');
      return;
    }
    if (user?.role === UserRole.Admin) {
      void reload();
    }
  }, [loading, user, router, reload]);

  const createUser = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      await api.post<UserDto>('/users', form);
      setForm({ username: '', password: '', role: UserRole.Operator });
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create user');
    }
  };

  const removeUser = async (id: string) => {
    if (!confirm('Delete this user?')) return;
    await api.del(`/users/${id}`);
    await reload();
  };

  const openAssign = async (operatorId: string) => {
    setEditing(operatorId);
    const res = await api.get<{ numberIds: string[] }>(`/users/${operatorId}/numbers`);
    setAssigned(res.numberIds);
  };

  const toggle = (numberId: string) => {
    setAssigned((prev) =>
      prev.includes(numberId) ? prev.filter((x) => x !== numberId) : [...prev, numberId],
    );
  };

  const saveAssign = async () => {
    if (!editing) return;
    await api.put(`/users/${editing}/numbers`, { numberIds: assigned });
    setEditing(null);
  };

  if (loading || user?.role !== UserRole.Admin) {
    return <div className="flex min-h-screen items-center justify-center text-gray-500">Loading…</div>;
  }

  return (
    <div className="mx-auto max-w-3xl space-y-8 p-8">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-wa-green">Admin</h1>
        <a href="/" className="text-sm text-gray-400 hover:text-gray-200">
          ← Back to inbox
        </a>
      </div>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-gray-300">New user</h2>
        <form onSubmit={createUser} className="flex flex-wrap items-end gap-2">
          <input
            placeholder="Username"
            value={form.username}
            onChange={(e) => setForm({ ...form, username: e.target.value })}
            className="rounded bg-wa-panel px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-wa-green"
            required
          />
          <input
            placeholder="Password (min 8)"
            type="password"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            className="rounded bg-wa-panel px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-wa-green"
            required
          />
          <select
            value={form.role}
            onChange={(e) => setForm({ ...form, role: e.target.value as CreateUserDto['role'] })}
            className="rounded bg-wa-panel px-3 py-2 text-sm outline-none"
          >
            <option value={UserRole.Operator}>Operator</option>
            <option value={UserRole.Admin}>Admin</option>
          </select>
          <button className="rounded bg-wa-green px-4 py-2 text-sm font-medium text-black">Create</button>
        </form>
        {error && <p className="text-sm text-red-400">{error}</p>}
      </section>

      <section className="space-y-2">
        <h2 className="text-sm font-semibold text-gray-300">Users</h2>
        <div className="divide-y divide-black/30 rounded bg-wa-panel">
          {users.map((u) => (
            <div key={u.id} className="flex items-center justify-between px-4 py-3">
              <div>
                <span className="text-sm text-gray-100">{u.username}</span>
                <span className="ml-2 text-xs text-gray-400">
                  {u.role === UserRole.Admin ? 'admin' : 'operator'}
                </span>
              </div>
              <div className="flex items-center gap-3">
                {u.role === UserRole.Operator && (
                  <button onClick={() => openAssign(u.id)} className="text-xs text-wa-green hover:underline">
                    Numbers
                  </button>
                )}
                {u.id !== user.id && (
                  <button onClick={() => removeUser(u.id)} className="text-xs text-red-400 hover:underline">
                    Delete
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </section>

      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={() => setEditing(null)}>
          <div className="w-full max-w-sm space-y-3 rounded-lg bg-wa-panel p-6" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-sm font-semibold text-gray-200">Assigned numbers</h3>
            <div className="max-h-64 space-y-1 overflow-y-auto">
              {numbers.map((n) => (
                <label key={n.id} className="flex items-center gap-2 rounded px-2 py-1 hover:bg-wa-hover">
                  <input type="checkbox" checked={assigned.includes(n.id)} onChange={() => toggle(n.id)} />
                  <span className="text-sm text-gray-100">{n.name}</span>
                </label>
              ))}
              {numbers.length === 0 && <p className="text-xs text-gray-500">No numbers yet</p>}
            </div>
            <div className="flex gap-2">
              <button onClick={saveAssign} className="flex-1 rounded bg-wa-green py-2 text-sm font-medium text-black">
                Save
              </button>
              <button onClick={() => setEditing(null)} className="rounded px-3 py-2 text-sm text-gray-400">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
