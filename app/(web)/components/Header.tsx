'use client';

import React, { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { GoogleLogin, CredentialResponse } from '@react-oauth/google';
import axiosInstance from '@/service/axios.service';
import { useAppDispatch } from '@/lib/store/hooks';
import { tokenSlice } from '@/lib/store/features/storeToken';

const AUTH_TOKEN_KEY = 'login-token';
const AUTH_USER_KEY = 'login-user';

interface AuthUser {
  id: string;
  name: string;
  email: string;
  role?: string;
  picture?: string;
}

const readStoredUser = (): AuthUser | null => {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    const raw = window.localStorage.getItem(AUTH_USER_KEY);
    return raw ? (JSON.parse(raw) as AuthUser) : null;
  } catch {
    return null;
  }
};

const normalizeUser = (user: any): AuthUser => ({
  id: user?.id || user?._id || '',
  name: user?.name || user?.email || 'User',
  email: user?.email || '',
  role: user?.role,
  picture: user?.picture,
});

export default function Header() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const [googleLoading, setGoogleLoading] = useState(false);
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  const syncAuthState = async () => {
    if (typeof window === 'undefined') {
      return;
    }

    const token = window.localStorage.getItem(AUTH_TOKEN_KEY);
    const storedUser = readStoredUser();

    if (!token) {
      setAuthUser(null);
      setAuthReady(true);
      return;
    }

    dispatch(tokenSlice.actions.saveToken(token));

    if (storedUser?.name) {
      setAuthUser(storedUser);
      setAuthReady(true);
      return;
    }

    try {
      const response = await axiosInstance.get('/api/login/profile-page');
      const resolvedUser = normalizeUser(response.data?.user);

      window.localStorage.setItem(AUTH_USER_KEY, JSON.stringify(resolvedUser));
      setAuthUser(resolvedUser);
    } catch {
      setAuthUser(null);
    } finally {
      setAuthReady(true);
    }
  };

  useEffect(() => {
    setMounted(true);
    void syncAuthState();

    const handleAuthChanged = () => {
      void syncAuthState();
    };

    const handleStorage = (event: StorageEvent) => {
      if (event.key === AUTH_TOKEN_KEY || event.key === AUTH_USER_KEY) {
        void syncAuthState();
      }
    };

    window.addEventListener('auth-changed', handleAuthChanged);
    window.addEventListener('storage', handleStorage);

    return () => {
      window.removeEventListener('auth-changed', handleAuthChanged);
      window.removeEventListener('storage', handleStorage);
    };
  }, []);

  // close the profile menu when clicking outside or pressing Escape
  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMenuOpen(false);
    };

    document.addEventListener('click', onDocClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('click', onDocClick);
      document.removeEventListener('keydown', onKey);
    };
  }, []);

  const handleGoogleSuccess = async (response: CredentialResponse) => {
    const token = response.credential;

    if (!token) {
      return;
    }

    setGoogleLoading(true);

    try {
      const result = await axiosInstance.post('/api/login/continue-with-google', { token });
      const accessToken = result.data.token;
      const normalizedUser = normalizeUser(result.data.user);

      dispatch(tokenSlice.actions.saveToken(accessToken));
      window.localStorage.setItem(AUTH_TOKEN_KEY, accessToken);
      window.localStorage.setItem(AUTH_USER_KEY, JSON.stringify(normalizedUser));
      setAuthUser(normalizedUser);
      window.dispatchEvent(new Event('auth-changed'));

      console.log('Google login successful, token saved:', accessToken);

    } catch (error) {
      console.error('Google login failed:', error);
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await axiosInstance.post('/api/login/logout');
    } catch (error) {
      console.error('Logout request failed:', error);
    } finally {
      dispatch(tokenSlice.actions.clearToken());
      window.localStorage.removeItem(AUTH_TOKEN_KEY);
      window.localStorage.removeItem(AUTH_USER_KEY);
      setAuthUser(null);
      setMenuOpen(false);
      window.dispatchEvent(new Event('auth-changed'));
      router.push('/store');
    }
  };

  const displayName = authUser?.name || 'Guest';
  const displayInitials = displayName
    .split(' ')
    .filter(Boolean)
    .map((part) => part[0])
    .join('')
    .toUpperCase()
    .slice(0, 2) || 'U';

  const authControls = !mounted ? (
    <div className="flex min-h-[3.25rem] items-center gap-3" aria-hidden="true">
    <div className="h-10 w-32 animate-pulse rounded-full bg-slate-100" />
    <div className="h-10 w-28 animate-pulse rounded-lg bg-slate-100" />
  </div>
) : authReady && authUser ? (
  <div ref={menuRef} className="relative">
    
    {/* PROFILE CHIP */}
    <button
      type="button"
      aria-expanded={menuOpen}
      onClick={() => setMenuOpen((v) => !v)}
      className="
        flex items-center gap-3
        rounded-full
        border border-slate-200
        bg-white/70 backdrop-blur-md
        px-2.5 py-1.5
        shadow-sm
        transition-all
        hover:shadow-lg hover:scale-[1.02]
        hover:border-yellow-300
      "
    >
      {/* AVATAR */}
      <div className="h-9 w-9 rounded-full overflow-hidden flex items-center justify-center
        bg-gradient-to-br from-yellow-400 to-orange-500
        text-white font-bold shadow-md ring-2 ring-white"
      >
        {authUser.picture ? (
          <img
            src={authUser.picture}
            alt={authUser.name}
            className="h-full w-full object-cover"
          />
        ) : (
          <span className="text-xs">
            {displayInitials}
          </span>
        )}
      </div>

      {/* TEXT (desktop only) */}
      <div className="hidden sm:flex flex-col leading-tight max-w-[140px]">
        <span className="text-sm font-semibold text-slate-900 truncate">
          {displayName}
        </span>
        <span className="text-[11px] text-slate-500 truncate">
          {authUser.email}
        </span>
      </div>

      {/* DROPDOWN ICON */}
      <svg
        className={`h-4 w-4 text-slate-400 transition-transform ${
          menuOpen ? "rotate-180" : ""
        }`}
        viewBox="0 0 20 20"
        fill="currentColor"
      >
        <path
          fillRule="evenodd"
          d="M5.23 7.21a.75.75 0 011.06.02L10 10.94l3.71-3.71a.75.75 0 111.06 1.06l-4.24 4.24a.75.75 0 01-1.06 0L5.21 8.29a.75.75 0 01.02-1.08z"
          clipRule="evenodd"
        />
      </svg>
    </button>

    {/* DROPDOWN */}
    {menuOpen && (
      <div className="absolute right-0 mt-2 w-52 overflow-hidden rounded-xl border border-slate-100 bg-white shadow-xl">
        
        {/* USER INFO */}
        <div className="px-4 py-3 bg-slate-50 border-b">
          <p className="text-sm font-semibold text-slate-900 truncate">
            {displayName}
          </p>
          <p className="text-xs text-slate-500 truncate">
            {authUser.email}
          </p>
        </div>

        {/* LOGOUT */}
        <button
          onClick={handleLogout}
          className="w-full px-4 py-2.5 text-left text-sm text-red-600 hover:bg-red-50 transition"
        >
          Logout
        </button>
      </div>
    )}
  </div>
  ) : (
    <>
      <div className="min-w-0">
        <GoogleLogin
          onSuccess={handleGoogleSuccess}
          onError={() => console.error('Google login was cancelled or failed')}
          text="continue_with"
          shape="pill"
          theme="outline"
          size="large"
          width="240"
        />
      </div>

      <div className="flex items-center gap-2 sm:gap-3">
        <Link
          href="/login"
          className="inline-flex items-center justify-center rounded-lg border border-yellow-500 px-4 py-2 text-sm font-semibold text-yellow-700 transition-colors hover:bg-yellow-50"
        >
          Store Login
        </Link>
        <Link
          href="/register"
          className="inline-flex items-center justify-center rounded-lg bg-gradient-to-r from-yellow-500 to-yellow-600 px-4 py-2 text-sm font-semibold text-white shadow-md transition-transform hover:-translate-y-0.5"
        >
          Store Register
        </Link>
      </div>
    </>
  );

  return (
    <nav className="sticky top-0 z-50 bg-white/95 backdrop-blur-sm shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 sm:py-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-yellow-400 to-yellow-600 rounded-lg flex items-center justify-center text-white font-bold text-lg sm:text-xl shadow-md">
              AMP
            </div>
            <div>
              <h1 className="text-lg sm:text-xl font-bold bg-gradient-to-r from-yellow-500 to-yellow-600 bg-clip-text text-transparent">AMP Shopping</h1>
              <p className="text-xs text-gray-600 hidden sm:block">Best Deals Daily</p>
            </div>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
            {authControls}
          </div>
        </div>

        {googleLoading && !authUser && (
          <div className="mt-3 rounded-lg border border-yellow-100 bg-yellow-50 px-4 py-2 text-sm font-medium text-yellow-800 shadow-sm">
            Signing in with Google...
          </div>
        )}
      </div>
    </nav>
  );
}
