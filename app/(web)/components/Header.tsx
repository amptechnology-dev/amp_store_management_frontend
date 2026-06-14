"use client";

import React, { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { GoogleLogin, CredentialResponse } from "@react-oauth/google";
import axiosInstance from "@/service/axios.service";
import { useAppDispatch } from "@/lib/store/hooks";
import { tokenSlice } from "@/lib/store/features/storeToken";

const AUTH_TOKEN_KEY = "login-token";
const AUTH_USER_KEY = "login-user";

interface AuthUser {
  id: string;
  name: string;
  email: string;
  role?: string;
  picture?: string;
}

const readStoredUser = (): AuthUser | null => {
  if (typeof window === "undefined") {
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
  id: user?.id || user?._id || "",
  name: user?.name || user?.email || "User",
  email: user?.email || "",
  role: user?.role,
  picture: user?.picture,
});

export default function Header() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const [storeSearch, setStoreSearch] = useState("");
  const [locationSearch, setLocationSearch] = useState("");
  const [googleLoading, setGoogleLoading] = useState(false);
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchResults, setSearchResults] = useState<
    { _id: string; storeName: string }[]
  >([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const searchRef = useRef<HTMLDivElement | null>(null);
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);

  const syncAuthState = async () => {
    if (typeof window === "undefined") {
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
      const response = await axiosInstance.get("/api/login/profile-page");
      const resolvedUser = normalizeUser(response.data?.user);

      window.localStorage.setItem(AUTH_USER_KEY, JSON.stringify(resolvedUser));
      setAuthUser(resolvedUser);
    } catch {
      setAuthUser(null);
    } finally {
      setAuthReady(true);
    }
  };

  // ✅ শুধু এটা রাখো (1st এবং 3rd delete করো)
  useEffect(() => {
    setMounted(true);
    void syncAuthState();

    const handleAuthChanged = () => void syncAuthState();
    const handleStorage = (event: StorageEvent) => {
      if (event.key === AUTH_TOKEN_KEY || event.key === AUTH_USER_KEY) {
        void syncAuthState();
      }
    };

    // onDocClick এবং onKey এখানেই merge করো
    const onDocClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setMenuOpen(false);
        setShowDropdown(false);
      }
    };

    window.addEventListener("auth-changed", handleAuthChanged);
    window.addEventListener("storage", handleStorage);
    document.addEventListener("click", onDocClick);
    document.addEventListener("keydown", onKey);

    return () => {
      window.removeEventListener("auth-changed", handleAuthChanged);
      window.removeEventListener("storage", handleStorage);
      document.removeEventListener("click", onDocClick);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  const handleGoogleSuccess = async (response: CredentialResponse) => {
    const token = response.credential;

    if (!token) {
      return;
    }

    setGoogleLoading(true);

    try {
      const result = await axiosInstance.post(
        "/api/login/continue-with-google",
        { token },
      );
      const accessToken = result.data.token;
      const normalizedUser = normalizeUser(result.data.user);

      dispatch(tokenSlice.actions.saveToken(accessToken));
      window.localStorage.setItem(AUTH_TOKEN_KEY, accessToken);
      window.localStorage.setItem(
        AUTH_USER_KEY,
        JSON.stringify(normalizedUser),
      );
      setAuthUser(normalizedUser);
      window.dispatchEvent(new Event("auth-changed"));

      console.log("Google login successful, token saved:", accessToken);
    } catch (error) {
      console.error("Google login failed:", error);
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleStoreSearch = (value: string) => {
    setStoreSearch(value);
    setShowDropdown(true);

    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);

    if (!value.trim()) {
      setSearchResults([]);
      setShowDropdown(false);
      return;
    }

    searchDebounceRef.current = setTimeout(async () => {
      setSearchLoading(true);
      console.log("🔍 Calling search API with:", value.trim()); // ← এটা add করো
      try {
        const res = await axiosInstance.get(
          `/api/register/search-store-names?search=${encodeURIComponent(value.trim())}`,
        );
        console.log("✅ Search response:", res.data); // ← এটা add করো
        setSearchResults(res.data.stores || []);
        setShowDropdown(true); // ← এটা explicitly set করো
      } catch (err) {
        console.error("❌ Search API error:", err); // ← এটা add করো
        setSearchResults([]);
      } finally {
        setSearchLoading(false);
      }
    }, 350);
  };

  const handleResultClick = (storeId: string) => {
    setShowDropdown(false);
    setStoreSearch("");
    setSearchResults([]);
    router.push(`/store/${storeId}`);
  };

  const handleLogout = async () => {
    try {
      await axiosInstance.post("/api/login/logout");
    } catch (error) {
      console.error("Logout request failed:", error);
    } finally {
      dispatch(tokenSlice.actions.clearToken());
      window.localStorage.removeItem(AUTH_TOKEN_KEY);
      window.localStorage.removeItem(AUTH_USER_KEY);
      setAuthUser(null);
      setMenuOpen(false);
      window.dispatchEvent(new Event("auth-changed"));
      router.push("/store");
    }
  };

  const displayName = authUser?.name || "Guest";
  const displayInitials =
    displayName
      .split(" ")
      .filter(Boolean)
      .map((part) => part[0])
      .join("")
      .toUpperCase()
      .slice(0, 2) || "U";

  const searchControls = (
    <div className="flex flex-col md:flex-row flex-1 gap-3 max-w-3xl">
      {/* Store Search with Dropdown */}
      <div ref={searchRef} className="group relative flex-1">
        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-yellow-500 z-10">
          🔍
        </div>

        <input
          type="text"
          value={storeSearch}
          onChange={(e) => handleStoreSearch(e.target.value)}
          onFocus={() => storeSearch.trim() && setShowDropdown(true)}
          placeholder="Search stores, products..."
          autoComplete="off"
          className="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50/80 pl-12 pr-4 text-sm font-medium shadow-sm transition-all focus:bg-white focus:border-yellow-400 focus:ring-4 focus:ring-yellow-100 focus:outline-none"
        />

        {/* Dropdown */}
        {showDropdown && storeSearch.trim() && (
          <div className="absolute left-0 right-0 top-[calc(100%+8px)] z-[999] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl">
            {searchLoading ? (
              <div className="flex items-center gap-3 px-4 py-3">
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-yellow-400 border-t-transparent" />
                <span className="text-sm text-slate-500">Searching...</span>
              </div>
            ) : searchResults.length > 0 ? (
              <ul>
                {searchResults.map((store, idx) => (
                  <li key={store._id}>
                    <button
                      onClick={() => handleResultClick(store._id)}
                      className={`flex w-full items-center gap-3 px-4 py-3 text-left text-sm transition hover:bg-yellow-50 ${
                        idx !== searchResults.length - 1
                          ? "border-b border-slate-100"
                          : ""
                      }`}
                    >
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-yellow-400 to-orange-500 text-xs font-bold text-white">
                        {store.storeName.charAt(0).toUpperCase()}
                      </span>
                      <span className="font-medium text-slate-800">
                        {store.storeName}
                      </span>
                      <span className="ml-auto text-slate-400">→</span>
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="px-4 py-4 text-center text-sm text-slate-400">
                No stores found for &quot;{storeSearch}&quot;
              </div>
            )}
          </div>
        )}
      </div>

      {/* Location Search — unchanged */}
      <div className="group relative flex-1">
        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-yellow-500">
          📍
        </div>
        <input
          type="text"
          value={locationSearch}
          onChange={(e) => setLocationSearch(e.target.value)}
          placeholder="Search location..."
          className="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50/80 pl-12 pr-4 text-sm font-medium shadow-sm transition-all focus:bg-white focus:border-yellow-400 focus:ring-4 focus:ring-yellow-100 focus:outline-none"
        />
      </div>
    </div>
  );

  const authControls = !mounted ? (
    <div className="flex min-h-[3.25rem] items-center gap-3" aria-hidden="true">
      <div className="h-10 w-32 animate-pulse rounded-full bg-slate-100" />
      <div className="h-10 w-28 animate-pulse rounded-lg bg-slate-100" />
    </div>
  ) : authReady && authUser ? (
  <div ref={menuRef} className="relative z-[999]">
    <button
      type="button"
      aria-expanded={menuOpen}
      onClick={() => setMenuOpen((v) => !v)}
      style={{ borderRadius: "9999px" }}
      className="flex items-center justify-center h-10 w-10 rounded-full border-2 border-yellow-400 shadow-sm hover:ring-4 hover:ring-yellow-100 transition-all overflow-hidden"
    >
      {authUser.picture ? (
        <img
          src={authUser.picture}
          alt={authUser.name}
          referrerPolicy="no-referrer"
          style={{ borderRadius: "9999px", width: "100%", height: "100%", objectFit: "cover" }}
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-yellow-400 to-orange-500 text-white font-bold text-sm">
          {displayInitials}
        </div>
      )}
    </button>

    {menuOpen && (
      <div className="fixed mt-2 w-48 rounded-2xl border border-slate-100 bg-white shadow-2xl overflow-hidden"
        style={{
          top: menuRef.current
            ? menuRef.current.getBoundingClientRect().bottom + 8
            : 60,
          left: menuRef.current
            ? menuRef.current.getBoundingClientRect().left - 100
            : "auto",
          zIndex: 9999,
        }}
      >
        {/* Top accent */}
        <div className="h-1 w-full bg-gradient-to-r from-yellow-400 to-orange-500" />

        {/* User info */}
        <div className="px-4 py-3 border-b border-slate-100">
          <p className="text-xs font-semibold text-slate-900 truncate">{displayName}</p>
        </div>

        {/* Logout */}
        <button
          onClick={handleLogout}
          className="flex w-full items-center gap-2.5 px-4 py-3 text-sm font-semibold text-red-500 hover:bg-red-50 transition-colors"
        >
          <span className="text-base">🚪</span>
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
          onError={() => console.error("Google login was cancelled or failed")}
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
    <nav className="sticky top-0 z-40 border-b border-slate-200 bg-white/80 backdrop-blur-xl shadow-sm overflow-visible">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 sm:py-4">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between lg:w-full">
          {/* Top row */}
          <div className="flex items-center justify-between lg:contents">
            {/* Logo — always left */}
            <Link href="/store" className="flex items-center gap-2.5 shrink-0">
              <div className="w-9 h-9 bg-gradient-to-br from-yellow-400 to-yellow-600 rounded-xl flex items-center justify-center text-white font-black text-sm shadow-md">
                AMP
              </div>
              <div className="flex flex-col leading-tight">
                <span className="text-base font-black text-slate-900 tracking-tight">
                  AMP <span className="text-yellow-500">Shopping</span>
                </span>
                <span className="text-[11px] text-slate-400 font-medium hidden sm:block">
                  Best Deals Daily
                </span>
              </div>
            </Link>

            {/* Avatar — mobile right, desktop hidden (desktop এ নিচে আলাদা) */}
            <div className="flex lg:hidden">{authControls}</div>
          </div>

          {/* Search */}
          <div className="flex flex-1 lg:px-8">{searchControls}</div>

          {/* Auth — desktop only */}
          <div className="hidden lg:flex justify-end shrink-0">
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
