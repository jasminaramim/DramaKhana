import { useState, type FormEvent } from 'react';
import { X } from 'lucide-react';
import type { User } from '../types';
import { api, setToken } from '../lib/api';

interface AuthModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: (user: User) => void;
}

export function AuthModal({ open, onClose, onSuccess }: AuthModalProps) {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (!open) return null;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const res =
        mode === 'login'
          ? await api.post<{ token: string; user: User }>('/api/auth/login', { identifier: email, password })
          : await api.post<{ token: string; user: User }>('/api/auth/register', { name, email, password });
      setToken(res.token);
      onSuccess(res.user);
      onClose();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-[#1A211D] border border-white/15 rounded-2xl p-6 sm:p-8 relative shadow-2xl">
        <button
          type="button"
          aria-label="Close sign in dialog"
          onClick={onClose}
          className="absolute top-4 right-4 w-9 h-9 rounded-lg flex items-center justify-center text-white/60 hover:text-white hover:bg-white/5 cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        <h2 className="font-display text-3xl font-bold text-white mb-1">
          {mode === 'login' ? 'Welcome Back' : 'Create Account'}
        </h2>
        <p className="text-xs text-white/60 mb-6">
          {mode === 'login'
            ? 'Sign in with your username or email to access your watchlist or Admin Studio.'
            : 'Join DramaKhana to curate your Pakistani drama watchlist.'}
        </p>

        {error && (
          <div className="mb-4 px-3.5 py-2.5 rounded-lg bg-[#791F35]/60 border border-rose-400/30 text-xs text-rose-100">
            {error}
          </div>
        )}

        <form onSubmit={submit} className="space-y-4">
          {mode === 'register' && (
            <div>
              <label className="block text-xs font-medium text-white/75 mb-1.5">Full Name</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ayesha Siddiqui"
                className="w-full h-11 px-3.5 rounded-lg bg-[#101512] border border-white/15 text-sm text-white focus:outline-none focus:border-[#D4AF6A]"
              />
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-white/75 mb-1.5">
              {mode === 'login' ? 'Username or Email' : 'Email Address'}
            </label>
            <input
              type={mode === 'login' ? 'text' : 'email'}
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={mode === 'login' ? 'jasmin or name@example.com' : 'name@example.com'}
              className="w-full h-11 px-3.5 rounded-lg bg-[#101512] border border-white/15 text-sm text-white focus:outline-none focus:border-[#D4AF6A]"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-white/75 mb-1.5">Password</label>
            <input
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full h-11 px-3.5 rounded-lg bg-[#101512] border border-white/15 text-sm text-white focus:outline-none focus:border-[#D4AF6A]"
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full h-11 rounded-lg bg-[#087F5B] hover:bg-[#099268] disabled:opacity-60 text-white text-sm font-semibold transition-colors cursor-pointer"
          >
            {submitting ? 'Please wait...' : mode === 'login' ? 'Sign In' : 'Create Account'}
          </button>
        </form>

        {mode === 'login' && (
          <div className="mt-5 pt-4 border-t border-white/10 space-y-2">
            <p className="text-[11px] text-white/50">Quick Access Accounts:</p>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => {
                  setEmail('jasmin');
                  setPassword('jasmin1142005');
                }}
                className="px-3 py-2 rounded-lg bg-[#101512] border border-white/12 hover:border-[#D4AF6A] text-xs text-[#D4AF6A] font-medium cursor-pointer"
              >
                Fill Admin (jasmin)
              </button>
              <button
                type="button"
                onClick={() => {
                  setEmail('viewer@dramakhana.pk');
                  setPassword('Viewer2026!');
                }}
                className="px-3 py-2 rounded-lg bg-[#101512] border border-white/12 hover:border-[#087F5B] text-xs text-white/80 font-medium cursor-pointer"
              >
                Fill Viewer Demo
              </button>
            </div>
          </div>
        )}

        <div className="mt-5 text-center text-xs text-white/60">
          {mode === 'login' ? (
            <>
              New to DramaKhana?{' '}
              <button
                type="button"
                onClick={() => {
                  setError('');
                  setMode('register');
                }}
                className="text-[#D4AF6A] font-semibold hover:underline cursor-pointer"
              >
                Create an account
              </button>
            </>
          ) : (
            <>
              Already have an account?{' '}
              <button
                type="button"
                onClick={() => {
                  setError('');
                  setMode('login');
                }}
                className="text-[#D4AF6A] font-semibold hover:underline cursor-pointer"
              >
                Sign in
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
