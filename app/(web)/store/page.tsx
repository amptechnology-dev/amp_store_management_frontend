'use client';

import React, { useEffect, useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { Button } from 'primereact/button';
import { InputText } from 'primereact/inputtext';
import { IconField } from 'primereact/iconfield';
import { InputIcon } from 'primereact/inputicon';
import axiosInstance from '@/service/axios.service';

const Header = dynamic(() => import('../components/Header'), { ssr: false });
const Footer = dynamic(() => import('../components/Footer'), { ssr: false });

interface StoreReview {
  rating?: number;
  comment?: string;
}

interface Store {
  _id: string;
  storeName: string;
  storeType: string;
  userId: {
    _id: string;
    name: string;
    email: string;
    phone: string;
  };
  address: {
    area: string;
    state: string;
    country: string;
  };
  timing: {
    open: string;
    close: string;
  };
  contactNo: string;
  whatsappNo: string;
  email: string;
  website: string;
  description: string;
  images: string[];
  lat: number;
  long: number;
  gstin?: string;
  isActive: boolean;
  isVerify: boolean;
  storeUniqueId: string;
  rank?: number;
  reviews?: StoreReview[];
  createdAt?: string;
}

type FeedMode =
  | 'all'
  | 'featured'
  | 'newest'
  | 'popular'
  | 'topRated'
  | 'nearby'
  | 'sponsored'
  | 'gst'
  | 'random';

type LocationPoint = {
  latitude: number;
  longitude: number;
};

const fallbackImage = 'https://images.unsplash.com/photo-1568605114967-8130f3a36994?w=1200&h=900&fit=crop';

const feedModes: Array<{ key: FeedMode; label: string; description: string; icon: string }> = [
  { key: 'all', label: 'All Stores', description: 'Show everything', icon: 'pi-th-large' },
  { key: 'featured', label: 'Featured Stores', description: 'Promoted or trusted', icon: 'pi-star' },
  { key: 'newest', label: 'Newest Stores', description: 'Freshly opened', icon: 'pi-clock' },
  { key: 'popular', label: 'Popular Stores', description: 'Viewed and loved', icon: 'pi-chart-line' },
  { key: 'topRated', label: 'Top Rated Stores', description: 'Best reviews', icon: 'pi-thumbs-up' },
  { key: 'nearby', label: 'Nearby Stores', description: 'Around your location', icon: 'pi-map-marker' },
  { key: 'sponsored', label: 'Sponsored Stores', description: 'Higher promotion rank', icon: 'pi-bolt' },
  { key: 'gst', label: 'GST Verified', description: 'Tax verified shops', icon: 'pi-id-card' },
  { key: 'random', label: 'Explore Random', description: 'Discover something new', icon: 'pi-refresh' },
];

const parseStoreTimeToMinutes = (value: string) => {
  const normalized = value.trim().toUpperCase().replace(/\s+/g, '');
  const match = normalized.match(/^(\d{1,2})(?::(\d{2}))?(AM|PM)$/);

  if (!match) {
    return null;
  }

  let hours = Number(match[1]);
  const minutes = Number(match[2] || '0');
  const period = match[3];

  if (period === 'AM') {
    hours = hours === 12 ? 0 : hours;
  } else {
    hours = hours === 12 ? 12 : hours + 12;
  }

  return hours * 60 + minutes;
};

const isStoreOpenNow = (openTime: string, closeTime: string) => {
  const openMinutes = parseStoreTimeToMinutes(openTime);
  const closeMinutes = parseStoreTimeToMinutes(closeTime);

  if (openMinutes === null || closeMinutes === null) {
    return false;
  }

  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  if (openMinutes === closeMinutes) {
    return true;
  }

  if (openMinutes < closeMinutes) {
    return currentMinutes >= openMinutes && currentMinutes < closeMinutes;
  }

  return currentMinutes >= openMinutes || currentMinutes < closeMinutes;
};

const toNumber = (value: unknown, fallback = 0) => {
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const toTimestamp = (value?: string) => {
  if (!value) {
    return 0;
  }

  const timestamp = new Date(value).getTime();
  return Number.isFinite(timestamp) ? timestamp : 0;
};

const getAverageRating = (store: Store) => {
  const reviews = store.reviews || [];

  if (reviews.length === 0) {
    return 0;
  }

  const total = reviews.reduce((sum, review) => sum + (Number(review.rating) || 0), 0);
  return total / reviews.length;
};

const getReviewCount = (store: Store) => store.reviews?.length || 0;

const getInitials = (name: string) => {
  const pieces = name.split(' ').filter(Boolean);

  if (pieces.length === 0) {
    return 'ST';
  }

  return pieces
    .map((piece) => piece[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
};

const stringToBg = (str: string) => {
  const colors = [
    'bg-gradient-to-br from-rose-500 to-orange-500',
    'bg-gradient-to-br from-sky-500 to-cyan-500',
    'bg-gradient-to-br from-emerald-500 to-teal-500',
    'bg-gradient-to-br from-violet-500 to-fuchsia-500',
    'bg-gradient-to-br from-amber-500 to-yellow-500',
    'bg-gradient-to-br from-indigo-500 to-blue-500',
    'bg-gradient-to-br from-lime-500 to-green-500',
    'bg-gradient-to-br from-pink-500 to-red-500',
  ];

  const index = Math.abs(str.charCodeAt(0)) % colors.length;
  return colors[index];
};

const getStoreRank = (store: Store) => {
  const rank = toNumber(store.rank, 3);
  return rank > 0 ? rank : 3;
};

const hasGst = (store: Store) => Boolean((store as Store & { gstin?: string }).gstin?.trim());

const isSponsoredStore = (store: Store) => getStoreRank(store) <= 1;

const isFeaturedStore = (store: Store) => store.isVerify && getStoreRank(store) <= 2;

const getPriorityScore = (store: Store) => {
  const rank = getStoreRank(store);
  const rating = getAverageRating(store);
  const reviewCount = getReviewCount(store);
  const ageInDays = Math.max(0, (Date.now() - toTimestamp(store.createdAt)) / 86400000);
  const recencyBonus = Math.max(0, 80 - ageInDays);

  return (
    (store.isVerify ? 60 : 0) +
    (hasGst(store) ? 12 : 0) +
    (store.isActive ? 8 : 0) +
    (4 - Math.min(rank, 4)) * 12 +
    rating * 15 +
    Math.min(reviewCount, 20) * 2 +
    recencyBonus
  );
};

const getPopularityScore = (store: Store) => {
  const rating = getAverageRating(store);
  const reviewCount = getReviewCount(store);
  const ageInDays = Math.max(0, (Date.now() - toTimestamp(store.createdAt)) / 86400000);

  return reviewCount * 9 + rating * 20 + (store.isVerify ? 8 : 0) + (store.isActive ? 6 : 0) + Math.max(0, 90 - ageInDays);
};

const getDistanceKm = (userLocation: LocationPoint, store: Store) => {
  if (!Number.isFinite(store.lat) || !Number.isFinite(store.long)) {
    return null;
  }

  const earthRadiusKm = 6371;
  const dLat = ((store.lat - userLocation.latitude) * Math.PI) / 180;
  const dLon = ((store.long - userLocation.longitude) * Math.PI) / 180;
  const lat1 = (userLocation.latitude * Math.PI) / 180;
  const lat2 = (store.lat * Math.PI) / 180;

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.sin(dLon / 2) * Math.sin(dLon / 2) * Math.cos(lat1) * Math.cos(lat2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return earthRadiusKm * c;
};

const formatDistance = (distanceKm: number) => {
  if (!Number.isFinite(distanceKm)) {
    return 'Nearby';
  }

  if (distanceKm < 1) {
    return `${Math.max(100, Math.round(distanceKm * 1000))} m away`;
  }

  return `${distanceKm.toFixed(distanceKm < 10 ? 1 : 0)} km away`;
};

const sortRandomly = <T,>(items: T[]) => [...items].sort(() => Math.random() - 0.5);

function StoreCard({ store, userLocation }: { store: Store; userLocation: LocationPoint | null }) {
  const rating = getAverageRating(store);
  const reviewCount = getReviewCount(store);
  const distance = userLocation ? getDistanceKm(userLocation, store) : null;
  const openNow = store.isActive && isStoreOpenNow(store.timing?.open || '', store.timing?.close || '');
  const storeRank = getStoreRank(store);
  const summary = [store.storeType, store.address?.state, store.address?.area].filter(Boolean).join(' • ');

  return (
    <article className="group flex h-full flex-col overflow-hidden rounded-[1.8rem] border border-white/80 bg-white/95 shadow-[0_18px_44px_rgba(15,23,42,0.08)] transition duration-300 hover:-translate-y-1 hover:shadow-[0_28px_70px_rgba(15,23,42,0.14)]">
      <div className="relative h-44 overflow-hidden bg-slate-100">
        {store.images?.length > 0 ? (
          <img
            src={store.images[0]}
            alt={`${store.storeName} store banner`}
            className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.06]"
            onError={(event: any) => {
              event.target.src = fallbackImage;
            }}
          />
        ) : (
          <div className={`flex h-full items-center justify-center text-white ${stringToBg(store.storeName)}`}>
            <div className="text-center">
              <div className="text-4xl font-black tracking-[0.2em]">{getInitials(store.storeName)}</div>
              <div className="mt-2 text-xs uppercase tracking-[0.3em] text-white/80">Local store</div>
            </div>
          </div>
        )}

        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/15 to-transparent" />

        <div className="absolute left-3 top-3 flex flex-wrap gap-2">
          {isFeaturedStore(store) && (
            <span className="rounded-full bg-white/95 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-amber-700 shadow-lg backdrop-blur">
              Featured
            </span>
          )}
          {isSponsoredStore(store) && (
            <span className="rounded-full bg-gradient-to-r from-rose-500 to-orange-500 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-white shadow-lg">
              Sponsored
            </span>
          )}
          {hasGst(store) && (
            <span className="rounded-full bg-emerald-500/95 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-white shadow-lg">
              GST Verified
            </span>
          )}
        </div>

        <div className="absolute right-3 top-3 flex flex-col items-end gap-2">
          <span className="rounded-full bg-slate-950/70 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-white backdrop-blur-sm">
            Rank {storeRank}
          </span>
          {distance !== null && (
            <span className="rounded-full bg-white/95 px-3 py-1 text-[11px] font-semibold text-slate-800 shadow-lg">
              {formatDistance(distance)}
            </span>
          )}
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-4 p-4 sm:p-5">
        <div className="space-y-3">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <h4 className="truncate text-[1.05rem] font-extrabold text-slate-950 sm:text-lg">{store.storeName}</h4>
              <p className="mt-1 truncate text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">
                {summary || 'General store'}
              </p>
            </div>
            <div
              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] ${
                openNow ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
              }`}
            >
              <span className={`h-2 w-2 rounded-full ${openNow ? 'bg-emerald-500' : 'bg-rose-500'}`} />
              {openNow ? 'Open now' : 'Closed'}
            </div>
          </div>

          <p className="line-clamp-2 text-sm leading-6 text-slate-600">
            {store.description || 'A trusted local store with useful products and easy contact options.'}
          </p>

          <div className="flex flex-wrap gap-2">
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
              {reviewCount > 0 ? `${rating.toFixed(1)} rating` : 'No ratings yet'}
            </span>
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
              {store.address?.area || 'Area pending'}
            </span>
            {hasGst(store) && <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">GST</span>}
          </div>
        </div>

        <div className="mt-auto flex items-center justify-between gap-3 border-t border-slate-100 pt-4">
          <p className="text-xs font-medium text-slate-500">
            {store.address?.state || 'State not set'}{store.address?.country ? `, ${store.address.country}` : ''}
          </p>

          <Link href={`/store/${store._id}`} className="shrink-0">
            <Button
              label="View Details"
              icon="pi pi-arrow-right"
              iconPos="right"
              rounded
              className="border-none bg-gradient-to-r from-amber-500 to-orange-500 px-4 py-2 text-sm font-semibold text-white shadow-lg transition-transform hover:-translate-y-0.5"
            />
          </Link>
        </div>
      </div>
    </article>
  );
}

export default function Home() {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFeed, setActiveFeed] = useState<FeedMode>('all');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedState, setSelectedState] = useState('all');
  const [selectedArea, setSelectedArea] = useState('all');
  const [allStores, setAllStores] = useState<Store[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userLocation, setUserLocation] = useState<LocationPoint | null>(null);
  const [locationLoading, setLocationLoading] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);

  useEffect(() => {
    const fetchStores = async () => {
      try {
        setLoading(true);
        setError(null);

        const response = await axiosInstance.get('/api/register/public-all-stores');
        const stores = response.data.stores || [];
        setAllStores(stores);
      } catch (fetchError) {
        console.error('Error fetching stores:', fetchError);
        setError('Failed to load stores. Please try again later.');
        setAllStores([]);
      } finally {
        setLoading(false);
      }
    };

    void fetchStores();
  }, []);

  const requestLocation = () => {
    if (!navigator.geolocation) {
      setLocationError('Your browser does not support location access.');
      return;
    }

    setLocationLoading(true);
    setLocationError(null);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setUserLocation({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        });
        setLocationLoading(false);
      },
      (geoError) => {
        setLocationError(
          geoError.code === geoError.PERMISSION_DENIED
            ? 'Location access denied. Enable it to sort nearby stores.'
            : 'Unable to fetch your location right now.'
        );
        setLocationLoading(false);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
    );
  };

  const uniqueCategories = useMemo(
    () => Array.from(new Set(allStores.map((store) => store.storeType).filter(Boolean))).sort(),
    [allStores]
  );

  const uniqueStates = useMemo(
    () => Array.from(new Set(allStores.map((store) => store.address?.state).filter(Boolean))).sort(),
    [allStores]
  );

  const uniqueAreas = useMemo(() => {
    const scopedStores = selectedState === 'all'
      ? allStores
      : allStores.filter((store) => store.address?.state === selectedState);

    return Array.from(new Set(scopedStores.map((store) => store.address?.area).filter(Boolean))).sort();
  }, [allStores, selectedState]);

  useEffect(() => {
    setSelectedArea('all');
  }, [selectedState]);

  const baseFilteredStores = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    return allStores.filter((store) => {
      const searchableFields = [
        store.storeName,
        store.storeType,
        store.address?.area,
        store.address?.state,
        store.address?.country,
        store.description,
        store.userId?.name,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      if (query && !searchableFields.includes(query)) {
        return false;
      }

      if (selectedCategory !== 'all' && store.storeType !== selectedCategory) {
        return false;
      }

      if (selectedState !== 'all' && store.address?.state !== selectedState) {
        return false;
      }

      if (selectedArea !== 'all' && store.address?.area !== selectedArea) {
        return false;
      }

      return true;
    });
  }, [allStores, searchQuery, selectedCategory, selectedState, selectedArea]);

  const visibleStores = useMemo(() => {
    const stores = [...baseFilteredStores];

    switch (activeFeed) {
      case 'featured':
        return stores.filter((store) => isFeaturedStore(store)).sort((left, right) => getPriorityScore(right) - getPriorityScore(left));
      case 'newest':
        return stores.sort((left, right) => toTimestamp(right.createdAt) - toTimestamp(left.createdAt));
      case 'popular':
        return stores.sort((left, right) => getPopularityScore(right) - getPopularityScore(left));
      case 'topRated':
        return stores
          .filter((store) => getAverageRating(store) > 0)
          .sort((left, right) => {
            const ratingDiff = getAverageRating(right) - getAverageRating(left);
            if (ratingDiff !== 0) {
              return ratingDiff;
            }

            return getReviewCount(right) - getReviewCount(left);
          });
      case 'nearby':
        if (!userLocation) {
          return stores.sort((left, right) => getPriorityScore(right) - getPriorityScore(left));
        }

        return stores.sort((left, right) => {
          const leftDistance = getDistanceKm(userLocation, left) ?? Number.POSITIVE_INFINITY;
          const rightDistance = getDistanceKm(userLocation, right) ?? Number.POSITIVE_INFINITY;
          return leftDistance - rightDistance;
        });
      case 'sponsored':
        return stores.filter((store) => isSponsoredStore(store)).sort((left, right) => getPriorityScore(right) - getPriorityScore(left));
      case 'gst':
        return stores.filter((store) => hasGst(store)).sort((left, right) => getPriorityScore(right) - getPriorityScore(left));
      case 'random':
        return sortRandomly(stores);
      case 'all':
      default:
        return stores.sort((left, right) => getPriorityScore(right) - getPriorityScore(left));
    }
  }, [baseFilteredStores, activeFeed, userLocation]);

  const featuredCount = useMemo(() => allStores.filter((store) => isFeaturedStore(store)).length, [allStores]);
  const sponsoredCount = useMemo(() => allStores.filter((store) => isSponsoredStore(store)).length, [allStores]);
  const gstCount = useMemo(() => allStores.filter((store) => hasGst(store)).length, [allStores]);
  const topRatedCount = useMemo(() => allStores.filter((store) => getAverageRating(store) >= 4).length, [allStores]);
  const nearbyCount = useMemo(() => {
    if (!userLocation) {
      return 0;
    }

    return allStores.filter((store) => {
      const distance = getDistanceKm(userLocation, store);
      return distance !== null && distance <= 50;
    }).length;
  }, [allStores, userLocation]);

  const clearFilters = () => {
    setSearchQuery('');
    setActiveFeed('all');
    setSelectedCategory('all');
    setSelectedState('all');
    setSelectedArea('all');
  };

  const activeFeedLabel = feedModes.find((feedMode) => feedMode.key === activeFeed)?.label || 'All Stores';
  const hasAnyFilters =
    searchQuery.trim().length > 0 ||
    activeFeed !== 'all' ||
    selectedCategory !== 'all' ||
    selectedState !== 'all' ||
    selectedArea !== 'all';

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(251,191,36,0.15),_transparent_30%),radial-gradient(circle_at_top_right,_rgba(244,114,182,0.12),_transparent_28%),linear-gradient(180deg,_#fffdf7_0%,_#ffffff_38%,_#fff7ed_100%)] text-slate-900">
      <Header />

      <section className="relative overflow-hidden px-4 pb-12 pt-10 sm:px-6 sm:pb-16 sm:pt-16 lg:px-8 lg:pb-20 lg:pt-20">
        <div className="absolute inset-0 -z-10 opacity-80">
          <div className="absolute left-[-5rem] top-10 h-64 w-64 rounded-full bg-amber-300/25 blur-3xl" />
          <div className="absolute right-[-4rem] top-28 h-72 w-72 rounded-full bg-rose-300/20 blur-3xl" />
          <div className="absolute bottom-0 left-1/2 h-80 w-80 -translate-x-1/2 rounded-full bg-white/70 blur-3xl" />
        </div>

        <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
          <div className="space-y-6">
            <div className="inline-flex items-center gap-2 rounded-full border border-amber-200 bg-white/80 px-4 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-amber-700 shadow-sm backdrop-blur">
              <span className="h-2 w-2 rounded-full bg-amber-500" />
              Store discovery hub
            </div>

            <div className="space-y-4">
              <h1 className="max-w-2xl text-4xl font-black leading-tight tracking-tight text-slate-950 sm:text-5xl lg:text-6xl">
                Find featured, nearby, verified, and trending stores in one beautiful list.
              </h1>
              <p className="max-w-2xl text-base leading-7 text-slate-600 sm:text-lg">
                Browse every public store with fast filtering for promotion, newest openings, popularity, top ratings,
                location, store type, sponsored placements, area-wise discovery, and GST verification.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <Link
                href="#store-browser"
                className="inline-flex items-center justify-center rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white shadow-lg transition-transform hover:-translate-y-0.5"
              >
                Explore stores
              </Link>
              <Link
                href="/register"
                className="inline-flex items-center justify-center rounded-full border border-amber-200 bg-white/85 px-5 py-3 text-sm font-semibold text-amber-700 shadow-sm transition-transform hover:-translate-y-0.5"
              >
                Register store
              </Link>
              <button
                type="button"
                onClick={requestLocation}
                className="inline-flex items-center justify-center rounded-full border border-slate-200 bg-white/85 px-5 py-3 text-sm font-semibold text-slate-700 shadow-sm transition-transform hover:-translate-y-0.5"
              >
                {locationLoading ? 'Detecting location...' : 'Use my location'}
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {[
                { label: 'Stores', value: allStores.length, tone: 'from-amber-500 to-orange-500' },
                { label: 'Featured', value: featuredCount, tone: 'from-emerald-500 to-teal-500' },
                { label: 'Sponsored', value: sponsoredCount, tone: 'from-rose-500 to-orange-500' },
                { label: 'GST verified', value: gstCount, tone: 'from-sky-500 to-cyan-500' },
              ].map((stat) => (
                <div key={stat.label} className="rounded-[1.5rem] border border-white/70 bg-white/90 p-4 shadow-lg backdrop-blur-sm">
                  <div className={`inline-flex rounded-full bg-gradient-to-r ${stat.tone} px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-white`}>
                    {stat.label}
                  </div>
                  <p className="mt-3 text-3xl font-black text-slate-950">{stat.value}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="relative">
            <div className="absolute inset-0 rounded-[2rem] bg-gradient-to-br from-amber-400/20 via-white/50 to-rose-400/20 blur-2xl" />
            <div className="relative overflow-hidden rounded-[2rem] border border-white/80 bg-white/85 p-4 shadow-[0_24px_80px_rgba(15,23,42,0.16)] backdrop-blur-xl sm:p-6">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-[1.5rem] bg-slate-950 p-5 text-white shadow-xl">
                  <p className="text-xs uppercase tracking-[0.3em] text-white/60">Current view</p>
                  <h2 className="mt-3 text-2xl font-black">{activeFeedLabel}</h2>
                  <p className="mt-2 text-sm leading-6 text-white/75">
                    {hasAnyFilters
                      ? 'Filters are shaping the list in real time.'
                      : 'The default feed puts strong stores first while keeping every store visible.'}
                  </p>
                </div>

                <div className="overflow-hidden rounded-[1.5rem] bg-gradient-to-br from-amber-500 to-orange-500 p-5 text-white shadow-xl">
                  <p className="text-xs uppercase tracking-[0.3em] text-white/70">Nearby</p>
                  <h3 className="mt-3 text-2xl font-black">{userLocation ? `${nearbyCount} close matches` : 'Enable location'}</h3>
                  <p className="mt-2 text-sm leading-6 text-white/85">
                    {userLocation
                      ? 'Nearby sort is based on your browser location and store coordinates.'
                      : 'Click Use my location to rank stores around you.'}
                  </p>
                </div>
              </div>

              <div className="mt-4 rounded-[1.5rem] border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-500">Location status</p>
                <p className="mt-2 text-sm font-medium text-slate-700">
                  {locationError
                    ? locationError
                    : userLocation
                      ? 'Location enabled. Nearby filters are active.'
                      : 'Nearby mode is ready once you allow location access.'}
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="store-browser" className="px-4 pb-12 sm:px-6 lg:px-8 lg:pb-16">
        <div className="mx-auto max-w-7xl rounded-[2rem] border border-white/70 bg-white/85 p-4 shadow-[0_24px_80px_rgba(15,23,42,0.08)] backdrop-blur-xl sm:p-6 lg:p-8">
          <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
            <div className="max-w-3xl space-y-3">
              <div className="inline-flex items-center gap-2 rounded-full bg-amber-50 px-4 py-2 text-xs font-semibold uppercase tracking-[0.28em] text-amber-700">
                Filter system
              </div>
              <h2 className="text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">
                Store list with promotion, popularity, rating, location, and category controls.
              </h2>
              <p className="text-sm leading-7 text-slate-600 sm:text-base">
                Search by store name, area, state, category, or owner. Then switch the feed to spotlight featured stores,
                newest openings, popular stores, top-rated stores, nearby stores, sponsored placements, GST verified stores,
                or random exploration.
              </p>
            </div>

            <div className="min-w-[18rem] rounded-[1.5rem] border border-amber-100 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800">
              Showing <span className="text-slate-950">{visibleStores.length}</span> stores in the {activeFeedLabel.toLowerCase()} view.
            </div>
          </div>

          <div className="mt-6 space-y-5 rounded-[1.75rem] border border-slate-200 bg-slate-50 p-4 sm:p-5">
            <div className="grid gap-4 xl:grid-cols-[1.4fr_1fr]">
              <div>
                <IconField iconPosition="left">
                  <InputIcon className="pi pi-search text-slate-400" />
                  <InputText
                    type="text"
                    value={searchQuery}
                    onChange={(event) => setSearchQuery(event.target.value)}
                    placeholder="Search by store name, area, state, type, or owner"
                    className="w-full rounded-2xl border border-amber-200 bg-white px-4 py-3 text-sm font-medium text-slate-900 shadow-sm outline-none transition focus:border-amber-400 focus:ring-4 focus:ring-amber-100"
                  />
                </IconField>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={requestLocation}
                  className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-amber-200 hover:text-amber-700"
                >
                  <i className="pi pi-map-marker" />
                  {locationLoading ? 'Locating...' : userLocation ? 'Update location' : 'Enable nearby search'}
                </button>
                <button
                  type="button"
                  onClick={clearFilters}
                  className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-slate-300 hover:text-slate-900"
                >
                  <i className="pi pi-filter-slash" />
                  Clear filters
                </button>
              </div>
            </div>

            <div className="overflow-x-auto pb-1">
              <div className="flex min-w-max gap-3">
                {feedModes.map((feedMode) => {
                  const active = activeFeed === feedMode.key;

                  return (
                    <button
                      key={feedMode.key}
                      type="button"
                      onClick={() => setActiveFeed(feedMode.key)}
                      className={`group flex min-w-[12rem] flex-col gap-1 rounded-[1.4rem] border px-4 py-3 text-left transition ${
                        active
                          ? 'border-amber-400 bg-gradient-to-br from-amber-500 to-orange-500 text-white shadow-lg'
                          : 'border-slate-200 bg-white text-slate-700 hover:border-amber-200 hover:shadow-md'
                      }`}
                    >
                      <span className="flex items-center gap-2 text-sm font-bold">
                        <i className={`pi ${feedMode.icon} ${active ? 'text-white' : 'text-amber-500'}`} />
                        {feedMode.label}
                      </span>
                      <span className={`text-xs font-medium ${active ? 'text-white/80' : 'text-slate-500'}`}>
                        {feedMode.description}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="grid gap-4 lg:grid-cols-3">
              <label className="space-y-2">
                <span className="text-xs font-semibold uppercase tracking-[0.25em] text-slate-500">Store Type / Category</span>
                <select
                  value={selectedCategory}
                  onChange={(event) => setSelectedCategory(event.target.value)}
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-900 shadow-sm outline-none transition focus:border-amber-400 focus:ring-4 focus:ring-amber-100"
                >
                  <option value="all">All categories</option>
                  {uniqueCategories.map((category) => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </select>
              </label>

              <label className="space-y-2">
                <span className="text-xs font-semibold uppercase tracking-[0.25em] text-slate-500">State</span>
                <select
                  value={selectedState}
                  onChange={(event) => setSelectedState(event.target.value)}
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-900 shadow-sm outline-none transition focus:border-amber-400 focus:ring-4 focus:ring-amber-100"
                >
                  <option value="all">All states</option>
                  {uniqueStates.map((state) => (
                    <option key={state} value={state}>
                      {state}
                    </option>
                  ))}
                </select>
              </label>

              <label className="space-y-2">
                <span className="text-xs font-semibold uppercase tracking-[0.25em] text-slate-500">Area</span>
                <select
                  value={selectedArea}
                  onChange={(event) => setSelectedArea(event.target.value)}
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-900 shadow-sm outline-none transition focus:border-amber-400 focus:ring-4 focus:ring-amber-100"
                >
                  <option value="all">All areas</option>
                  {uniqueAreas.map((area) => (
                    <option key={area} value={area}>
                      {area}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            {hasAnyFilters && (
              <div className="flex flex-wrap gap-2 text-xs font-semibold text-slate-600">
                {searchQuery.trim() && <span className="rounded-full bg-white px-3 py-1 shadow-sm">Search: {searchQuery.trim()}</span>}
                {activeFeed !== 'all' && <span className="rounded-full bg-white px-3 py-1 shadow-sm">Feed: {activeFeedLabel}</span>}
                {selectedCategory !== 'all' && <span className="rounded-full bg-white px-3 py-1 shadow-sm">Category: {selectedCategory}</span>}
                {selectedState !== 'all' && <span className="rounded-full bg-white px-3 py-1 shadow-sm">State: {selectedState}</span>}
                {selectedArea !== 'all' && <span className="rounded-full bg-white px-3 py-1 shadow-sm">Area: {selectedArea}</span>}
              </div>
            )}
          </div>

          <div className="mt-8">
            {loading ? (
              <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
                {Array.from({ length: 8 }).map((_, index) => (
                  <div key={index} className="overflow-hidden rounded-[1.6rem] border border-slate-200 bg-white shadow-sm">
                    <div className="h-52 animate-pulse bg-gradient-to-r from-slate-100 via-slate-200 to-slate-100" />
                    <div className="space-y-3 p-5">
                      <div className="h-5 w-3/4 animate-pulse rounded-full bg-slate-100" />
                      <div className="h-4 w-1/2 animate-pulse rounded-full bg-slate-100" />
                      <div className="h-20 animate-pulse rounded-2xl bg-slate-100" />
                    </div>
                  </div>
                ))}
              </div>
            ) : error ? (
              <div className="mx-auto max-w-2xl rounded-[1.75rem] border border-rose-100 bg-rose-50 p-8 text-center">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-white text-rose-500 shadow-sm">
                  <i className="pi pi-exclamation-triangle text-2xl" />
                </div>
                <h3 className="text-2xl font-black text-slate-950">Could not load stores</h3>
                <p className="mt-2 text-sm leading-6 text-slate-600">{error}</p>
                <Button
                  label="Try again"
                  icon="pi pi-refresh"
                  onClick={() => window.location.reload()}
                  className="mt-6 border-none bg-slate-950 px-5 py-3 text-sm font-semibold text-white"
                />
              </div>
            ) : visibleStores.length === 0 ? (
              <div className="mx-auto max-w-2xl rounded-[1.75rem] border border-dashed border-slate-300 bg-white p-8 text-center shadow-sm">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-amber-50 text-amber-600">
                  <i className="pi pi-search text-2xl" />
                </div>
                <h3 className="text-2xl font-black text-slate-950">No stores match this filter</h3>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  Try another category, clear the state or area filter, or switch to the all stores view.
                </p>
                <Button
                  label="Reset filters"
                  icon="pi pi-filter-slash"
                  onClick={clearFilters}
                  className="mt-6 border-none bg-gradient-to-r from-amber-500 to-orange-500 px-5 py-3 text-sm font-semibold text-white"
                />
              </div>
            ) : (
              <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
                {visibleStores.map((store) => (
                  <StoreCard key={store._id} store={store} userLocation={userLocation} />
                ))}
              </div>
            )}
          </div>
        </div>
      </section>

      <section className="px-4 pb-16 sm:px-6 lg:px-8 lg:pb-20">
        <div className="mx-auto max-w-7xl rounded-[2rem] border border-white/70 bg-white/85 p-6 shadow-[0_24px_80px_rgba(15,23,42,0.08)] backdrop-blur-xl sm:p-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="max-w-2xl">
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-amber-600">Why this works</p>
              <h3 className="mt-2 text-3xl font-black text-slate-950">Every store stays visible, but the most relevant ones rise first.</h3>
              <p className="mt-3 text-sm leading-7 text-slate-600">
                Featured and sponsored stores are highlighted, newest stores are easy to find, popular and top-rated stores
                are ranked by engagement and feedback, nearby stores can use your location, and state / area filtering keeps
                the list practical for browsing.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 lg:min-w-[32rem]">
              {[
                { label: 'Top rated', value: topRatedCount, tone: 'from-violet-500 to-fuchsia-500' },
                { label: 'Nearby ready', value: userLocation ? nearbyCount : 0, tone: 'from-sky-500 to-cyan-500' },
                { label: 'Categories', value: uniqueCategories.length, tone: 'from-emerald-500 to-teal-500' },
                { label: 'States', value: uniqueStates.length, tone: 'from-amber-500 to-orange-500' },
              ].map((stat) => (
                <div key={stat.label} className="rounded-[1.4rem] border border-slate-200 bg-slate-50 p-4 shadow-sm">
                  <div className={`inline-flex rounded-full bg-gradient-to-r ${stat.tone} px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-white`}>
                    {stat.label}
                  </div>
                  <p className="mt-3 text-2xl font-black text-slate-950">{stat.value}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
