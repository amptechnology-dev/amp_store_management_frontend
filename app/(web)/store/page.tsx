'use client';

import React, { useEffect, useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { Button } from 'primereact/button';
import { InputText } from 'primereact/inputtext';
import { IconField } from 'primereact/iconfield';
import { InputIcon } from 'primereact/inputicon';
import axiosInstance from '@/service/axios.service';
import VortexLoader from '@/app/(web)/components/VortexLoader';
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
  isFeatured?: boolean;
  viewCount?: number;
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
  reviews?: StoreReview[];
  createdAt?: string;
}

type FeedMode =
  | 'all'
  | 'featured'
  | 'newest'
  | 'topViewed'
  | 'popular'
  | 'topRated'
  | 'nearby'
  | 'gst'
  | 'random';

type ViewCountFilter = 'all' | '1' | '5' | '10' | '20';

type LocationPoint = {
  latitude: number;
  longitude: number;
};

const fallbackImage = 'https://images.unsplash.com/photo-1568605114967-8130f3a36994?w=1200&h=900&fit=crop';

const feedModes: Array<{ key: FeedMode; label: string; description: string; icon: string }> = [
  { key: 'all', label: 'All Stores', description: 'Show everything', icon: 'pi-th-large' },
  { key: 'featured', label: 'Featured Stores', description: 'Promoted or trusted', icon: 'pi-star-fill' },
  { key: 'newest', label: 'Newest Stores', description: 'Freshly opened', icon: 'pi-clock' },
  { key: 'topViewed', label: 'Top Viewed', description: 'Most watched stores', icon: 'pi-eye' },
  { key: 'popular', label: 'Popular Stores', description: 'Viewed and loved', icon: 'pi-chart-line' },
  { key: 'topRated', label: 'Top Rated Stores', description: 'Best reviews', icon: 'pi-thumbs-up' },
  { key: 'nearby', label: 'Nearby Stores', description: 'Around your location', icon: 'pi-map-marker' },
  { key: 'gst', label: 'GST Verified', description: 'Tax verified shops', icon: 'pi-id-card' },
  { key: 'random', label: 'Explore Random', description: 'Discover something new', icon: 'pi-refresh' },
];

const viewCountFilters: Array<{ key: ViewCountFilter; label: string; description: string }> = [
  { key: 'all', label: 'All views', description: 'No view filter' },
  { key: '1', label: '1+ views', description: 'At least one view' },
  { key: '5', label: '5+ views', description: 'Moderately watched' },
  { key: '10', label: '10+ views', description: 'Well watched' },
  { key: '20', label: '20+ views', description: 'Highly watched' },
];

const STATE_LABEL_ALIASES: Record<string, string> = {
  westbengal: 'West Bengal',
};

const normalizeText = (value: unknown) =>
  String(value ?? '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '')
    .trim();

const titleCaseWords = (value: string) =>
  value
    .trim()
    .replace(/\s+/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, (character) => character.toUpperCase());

const canonicalizeState = (value?: string) => {
  const trimmed = value?.trim();
  if (!trimmed) {
    return '';
  }

  const normalized = normalizeText(trimmed);
  return STATE_LABEL_ALIASES[normalized] || titleCaseWords(trimmed);
};

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

const renderRatingStars = (rating: number) => {
  const roundedRating = Math.max(0, Math.min(5, rating));

  return Array.from({ length: 5 }, (_, index) => {
    const filled = index < Math.round(roundedRating);

    return (
      <i
        key={index}
        className={`pi ${filled ? 'pi-star-fill' : 'pi-star'} text-[0.72rem] ${filled ? 'text-amber-500' : 'text-slate-300'}`}
      />
    );
  });
};

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

const hasGst = (store: Store) => Boolean((store as Store & { gstin?: string }).gstin?.trim());

const isFeaturedStore = (store: Store) => Boolean(store.isFeatured);

const getStoreDiscoveryScore = (store: Store) => {
  const rating = getAverageRating(store);
  const reviewCount = getReviewCount(store);
  const ageInDays = Math.max(0, (Date.now() - toTimestamp(store.createdAt)) / 86400000);
  const recencyBonus = Math.max(0, 80 - ageInDays);

  return (
    (store.isFeatured ? 70 : 0) +
    (store.isVerify ? 60 : 0) +
    (hasGst(store) ? 12 : 0) +
    (store.isActive ? 8 : 0) +
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
  if (!Number.isFinite(store.lat) || !Number.isFinite(store.long) || (store.lat === 0 && store.long === 0)) {
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
  const viewCount = toNumber(store.viewCount);
  const distance = userLocation ? getDistanceKm(userLocation, store) : null;
  const openNow = store.isActive && isStoreOpenNow(store.timing?.open || '', store.timing?.close || '');
  const ownerName = store.userId?.name || 'Owner not set';
  const storeTypeLabel = store.storeType?.trim();
  const locationLabel = [store.address?.area?.trim(), store.address?.state?.trim(), store.address?.country?.trim()]
    .filter(Boolean)
    .join(', ');

  return (
    <article className="group relative flex h-full min-w-0 flex-col overflow-hidden rounded-3xl border border-slate-200/70 bg-white/90 shadow-[0_16px_50px_rgba(15,23,42,0.08)] transition duration-300 hover:-translate-y-1 hover:border-amber-200/80 hover:shadow-[0_26px_80px_rgba(15,23,42,0.14)] focus-within:ring-2 focus-within:ring-amber-400/60">
      <div className="relative aspect-[16/10] overflow-hidden bg-slate-100">
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
          {hasGst(store) && (
            <span className="rounded-full bg-emerald-500/95 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-white shadow-lg">
              GST Verified
            </span>
          )}
        </div>

        <div className="absolute right-3 top-3 flex flex-col items-end gap-2">
          {distance !== null && (
            <span className="rounded-full bg-white/95 px-3 py-1 text-[11px] font-semibold text-slate-800 shadow-lg">
              {formatDistance(distance)}
            </span>
          )}
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-4 p-5 sm:p-6">
        <div className="space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              {storeTypeLabel && (
                <div className="mb-2 inline-flex items-center gap-2">
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-700">
                    {storeTypeLabel}
                  </span>
                </div>
              )}
              <h4 className="text-[1.12rem] font-black leading-snug text-slate-950 sm:text-[1.22rem]">{store.storeName}</h4>
              <p className="mt-2 text-sm font-medium text-slate-700">
                Owner: <span className="font-semibold text-slate-950">{ownerName}</span>
              </p>
            </div>

            <div
              className={`mt-1 inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] ${openNow ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
                }`}
            >
              <span className={`h-2 w-2 rounded-full ${openNow ? 'bg-emerald-500' : 'bg-rose-500'}`} />
              {openNow ? 'Open now' : 'Closed'}
            </div>
          </div>

          {store.description?.trim() && (
            <p className="text-sm leading-6 text-slate-600 overflow-hidden [display:-webkit-box] [-webkit-line-clamp:2] [-webkit-box-orient:vertical]">
              {store.description.trim()}
            </p>
          )}

          <div className="flex flex-wrap gap-2">
            <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
              <span className="inline-flex items-center gap-0.5">{renderRatingStars(rating)}</span>
              <span>{reviewCount > 0 ? rating.toFixed(1) : 'No ratings yet'}</span>
            </span>
            <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
              <i className="pi pi-eye" />
              {viewCount} {viewCount === 1 ? 'view' : 'views'}
            </span>
          </div>
        </div>

        <div className="mt-auto flex items-center justify-between gap-3 border-t border-slate-100 pt-4">
          <p className="min-w-0 text-xs font-medium text-slate-500 truncate" title={locationLabel || undefined}>
            {locationLabel || 'Location not set'}
          </p>

          <Link href={`/store/${store._id}`} className="shrink-0">
            <Button
              label="View details"
              icon="pi pi-arrow-right"
              iconPos="right"
              rounded
              className="border-none bg-gradient-to-r from-amber-500 to-orange-500 px-4 py-2.5 text-sm font-semibold text-white shadow-lg transition-transform hover:-translate-y-0.5"
            />
          </Link>
        </div>
      </div>
    </article>
  );
}

export default function Home() {
  const INITIAL_PAGE_SIZE = 9;
  const LOAD_MORE_STEP = 9;
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFeed, setActiveFeed] = useState<FeedMode>('all');
  const [selectedViewCount, setSelectedViewCount] = useState<ViewCountFilter>('all');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedState, setSelectedState] = useState('all');
  const [selectedArea, setSelectedArea] = useState('all');
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);
  const [allStores, setAllStores] = useState<Store[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userLocation, setUserLocation] = useState<LocationPoint | null>(null);
  const [locationLoading, setLocationLoading] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [visibleCount, setVisibleCount] = useState(INITIAL_PAGE_SIZE);
  

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

  useEffect(() => {
    requestLocation();
  }, []);

  const uniqueCategories = useMemo(
    () => Array.from(new Set(allStores.map((store) => store.storeType?.trim()).filter(Boolean))).sort(),
    [allStores]
  );

  const uniqueStates = useMemo(
    () => {
      const stateMap = new Map<string, string>();

      allStores.forEach((store) => {
        const stateLabel = canonicalizeState(store.address?.state);
        if (!stateLabel) {
          return;
        }

        const normalizedState = normalizeText(stateLabel);
        if (!stateMap.has(normalizedState)) {
          stateMap.set(normalizedState, stateLabel);
        }
      });

      return Array.from(stateMap.values()).sort((left, right) => left.localeCompare(right));
    },
    [allStores]
  );

  const uniqueAreas = useMemo(() => {
    const scopedStores = selectedState === 'all'
      ? allStores
      : allStores.filter((store) => normalizeText(canonicalizeState(store.address?.state)) === normalizeText(selectedState));

    const areaMap = new Map<string, string>();

    scopedStores.forEach((store) => {
      const areaLabel = store.address?.area?.trim();
      if (!areaLabel) {
        return;
      }

      const normalizedArea = normalizeText(areaLabel);
      if (!areaMap.has(normalizedArea)) {
        areaMap.set(normalizedArea, areaLabel);
      }
    });

    return Array.from(areaMap.values()).sort((left, right) => left.localeCompare(right));
  }, [allStores, selectedState]);

  useEffect(() => {
    setSelectedArea('all');
  }, [selectedState]);

  useEffect(() => {
    setIsFiltersOpen(false);
  }, [activeFeed, searchQuery, selectedCategory, selectedState, selectedArea, userLocation]);

  useEffect(() => {
    setVisibleCount(INITIAL_PAGE_SIZE);
  }, [searchQuery, activeFeed, selectedCategory, selectedState, selectedArea, selectedViewCount]);

  const baseFilteredStores = useMemo(() => {
    const query = normalizeText(searchQuery);
    const selectedCategoryKey = normalizeText(selectedCategory);
    const selectedStateKey = selectedState === 'all' ? '' : normalizeText(selectedState);
    const selectedAreaKey = selectedArea === 'all' ? '' : normalizeText(selectedArea);
    const selectedViewCountValue = selectedViewCount === 'all' ? null : Number(selectedViewCount);

    return allStores.filter((store) => {
      const searchableFields = normalizeText([
        store.storeName,
        store.storeType,
        store.address?.area,
        store.address?.state,
        store.address?.country,
        store.description,
        store.userId?.name,
      ]
        .filter(Boolean)
        .join(' '));

      if (query && !searchableFields.includes(query)) {
        return false;
      }

      if (selectedCategory !== 'all' && normalizeText(store.storeType) !== selectedCategoryKey) {
        return false;
      }

      if (selectedState !== 'all' && normalizeText(canonicalizeState(store.address?.state)) !== selectedStateKey) {
        return false;
      }

      if (selectedArea !== 'all' && normalizeText(store.address?.area) !== selectedAreaKey) {
        return false;
      }

      if (selectedViewCountValue !== null && toNumber(store.viewCount) < selectedViewCountValue) {
        return false;
      }

      return true;
    });
  }, [allStores, searchQuery, selectedCategory, selectedState, selectedArea, selectedViewCount]);

  const visibleStores = useMemo(() => {
    const stores = [...baseFilteredStores];

    switch (activeFeed) {
      case 'featured':
        return stores.filter((store) => isFeaturedStore(store)).sort((left, right) => getStoreDiscoveryScore(right) - getStoreDiscoveryScore(left));
      case 'newest':
        return stores.sort((left, right) => toTimestamp(right.createdAt) - toTimestamp(left.createdAt));
      case 'topViewed':
        return stores.sort((left, right) => toNumber(right.viewCount) - toNumber(left.viewCount));
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
          return stores.sort((left, right) => getStoreDiscoveryScore(right) - getStoreDiscoveryScore(left));
        }

        return stores.sort((left, right) => {
          const leftDistance = getDistanceKm(userLocation, left) ?? Number.POSITIVE_INFINITY;
          const rightDistance = getDistanceKm(userLocation, right) ?? Number.POSITIVE_INFINITY;
          return leftDistance - rightDistance;
        });
      case 'gst':
        return stores.filter((store) => hasGst(store)).sort((left, right) => getStoreDiscoveryScore(right) - getStoreDiscoveryScore(left));
      case 'random':
        return sortRandomly(stores);
      case 'all':
      default:
        return stores.sort((left, right) => getStoreDiscoveryScore(right) - getStoreDiscoveryScore(left));
    }
  }, [baseFilteredStores, activeFeed, userLocation]);

  const featuredCount = useMemo(() => allStores.filter((store) => isFeaturedStore(store)).length, [allStores]);
  const verifiedCount = useMemo(() => allStores.filter((store) => store.isVerify).length, [allStores]);
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
    setSelectedViewCount('all');
    setSelectedCategory('all');
    setSelectedState('all');
    setSelectedArea('all');
  };

  const activeFeedLabel = feedModes.find((feedMode) => feedMode.key === activeFeed)?.label || 'All Stores';
  const hasAnyFilters =
    searchQuery.trim().length > 0 ||
    activeFeed !== 'all' ||
    selectedViewCount !== 'all' ||
    selectedCategory !== 'all' ||
    selectedState !== 'all' ||
    selectedArea !== 'all';
  const locationReady = Boolean(userLocation);
  const pagedStores = useMemo(() => visibleStores.slice(0, visibleCount), [visibleStores, visibleCount]);
  const canLoadMore = visibleStores.length > visibleCount;

  if (loading) {
    return <VortexLoader />;
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(251,191,36,0.15),_transparent_30%),radial-gradient(circle_at_top_right,_rgba(244,114,182,0.12),_transparent_28%),linear-gradient(180deg,_#fffdf7_0%,_#ffffff_38%,_#fff7ed_100%)] text-slate-900">
      <Header />

      {!locationReady && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 px-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-[2rem] border border-white/80 bg-white p-6 text-center shadow-[0_28px_80px_rgba(15,23,42,0.28)] sm:p-8">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-amber-50 text-amber-600">
              <i className="pi pi-map-marker text-2xl" />
            </div>
            <h2 className="mt-4 text-3xl font-black text-slate-950">Location is required</h2>
            <p className="mt-3 text-sm leading-7 text-slate-600">
              Please allow location access to continue. The store list, filters, and nearby sorting will unlock after permission is granted.
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <Button
                label={locationLoading ? 'Requesting...' : 'Allow location'}
                icon="pi pi-map-marker"
                onClick={requestLocation}
                disabled={locationLoading}
                className="border-none bg-gradient-to-r from-amber-500 to-orange-500 px-5 py-3 text-sm font-semibold text-white"
              />
              {locationError && (
                <Button
                  label="Try again"
                  icon="pi pi-refresh"
                  onClick={requestLocation}
                  className="border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700"
                />
              )}
            </div>
            {locationError && <p className="mt-4 text-sm font-medium text-rose-600">{locationError}</p>}
          </div>
        </div>
      )}

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
                location, store type, featured stores, area-wise discovery, and GST verification.
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
                { label: 'Verified', value: verifiedCount, tone: 'from-rose-500 to-orange-500' },
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
                      : 'Click Use my location to sort stores around you.'}
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
        <div className="mx-auto max-w-7xl space-y-6">
          <div className="rounded-[2rem] border border-white/70 bg-white/90 p-4 shadow-[0_24px_80px_rgba(15,23,42,0.08)] backdrop-blur-xl sm:p-5">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
              <div className="space-y-2">
                <div className="inline-flex items-center gap-2 rounded-full bg-amber-50 px-4 py-2 text-xs font-semibold uppercase tracking-[0.28em] text-amber-700">
                  Store filters
                </div>
                <h2 className="text-2xl font-black tracking-tight text-slate-950 sm:text-3xl">Choose what you want to browse</h2>
                <p className="text-sm leading-6 text-slate-600">
                  Keep the filter bar on top and change it any time while scrolling the store list.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setIsFiltersOpen((current) => !current)}
                className="inline-flex items-center justify-center rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm lg:hidden"
              >
                <i className={`pi ${isFiltersOpen ? 'pi-chevron-up' : 'pi-sliders-h'} mr-2`} />
                {isFiltersOpen ? 'Hide filters' : 'Show filters'}
              </button>
            </div>

            <div className={`${isFiltersOpen ? 'mt-5 block' : 'mt-5 hidden'} space-y-4 lg:block`}>
              <div className="grid gap-3 lg:grid-cols-[minmax(0,1.4fr)_auto_auto]">
                <IconField iconPosition="left" className="w-full min-w-0">
                  <InputIcon className="pi pi-search text-slate-400" />
                  <InputText
                    type="text"
                    value={searchQuery}
                    onChange={(event) => setSearchQuery(event.target.value)}
                    placeholder="Search stores"
                    className="w-full rounded-2xl border border-amber-200 bg-white py-3 pl-11 pr-4 text-sm font-medium text-slate-900 shadow-sm outline-none transition focus:border-amber-400 focus:ring-4 focus:ring-amber-100"
                  />
                </IconField>

                <label className="space-y-2">
                  <span className="sr-only">View count filter</span>
                  <select
                    value={selectedViewCount}
                    onChange={(event) => setSelectedViewCount(event.target.value as ViewCountFilter)}
                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-900 shadow-sm outline-none transition focus:border-amber-400 focus:ring-4 focus:ring-amber-100"
                  >
                    {viewCountFilters.map((filter) => (
                      <option key={filter.key} value={filter.key} title={filter.description}>
                        {filter.label}
                      </option>
                    ))}
                  </select>
                </label>

                <button
                  type="button"
                  onClick={requestLocation}
                  className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-amber-200 hover:text-amber-700"
                >
                  <i className="pi pi-map-marker" />
                  {locationLoading ? 'Locating...' : userLocation ? 'Update location' : 'Use location'}
                </button>

                <button
                  type="button"
                  onClick={clearFilters}
                  className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-slate-300 hover:text-slate-900"
                >
                  <i className="pi pi-filter-slash" />
                  Clear
                </button>
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
                        className={`group flex min-w-[11rem] flex-col gap-1 rounded-[1.2rem] border px-4 py-3 text-left transition ${active
                            ? 'border-amber-400 bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-lg'
                            : 'border-slate-200 bg-white text-slate-700 hover:border-amber-200 hover:shadow-md'
                          }`}
                      >
                        <span className="flex items-center gap-2 text-sm font-bold">
                          <i className={`pi ${feedMode.icon} ${active ? 'text-white' : 'text-amber-500'}`} />
                          {feedMode.label}
                        </span>
                        <span className={`text-[11px] font-medium ${active ? 'text-white/80' : 'text-slate-500'}`}>
                          {feedMode.description}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="grid gap-3 lg:grid-cols-3">
                <label className="space-y-2">
                  <span className="text-xs font-semibold uppercase tracking-[0.25em] text-slate-500">Category</span>
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
                  {searchQuery.trim() && <span className="rounded-full bg-white px-3 py-1 shadow-sm">Search</span>}
                  {activeFeed !== 'all' && <span className="rounded-full bg-white px-3 py-1 shadow-sm">{activeFeedLabel}</span>}
                  {selectedViewCount !== 'all' && <span className="rounded-full bg-white px-3 py-1 shadow-sm">{selectedViewCount}+ views</span>}
                  {selectedCategory !== 'all' && <span className="rounded-full bg-white px-3 py-1 shadow-sm">{selectedCategory}</span>}
                  {selectedState !== 'all' && <span className="rounded-full bg-white px-3 py-1 shadow-sm">{selectedState}</span>}
                  {selectedArea !== 'all' && <span className="rounded-full bg-white px-3 py-1 shadow-sm">{selectedArea}</span>}
                </div>
              )}
            </div>
          </div>

          <div className="flex flex-col gap-3 rounded-[2rem] border border-white/70 bg-white/85 p-4 shadow-[0_24px_80px_rgba(15,23,42,0.08)] backdrop-blur-xl sm:flex-row sm:items-end sm:justify-between sm:p-6">
            <div className="max-w-3xl space-y-2">
              <div className="inline-flex items-center gap-2 rounded-full bg-amber-50 px-4 py-2 text-xs font-semibold uppercase tracking-[0.28em] text-amber-700">
                Store results
              </div>
              <h2 className="text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">
                Results update instantly as you change the top filters.
              </h2>
              <p className="text-sm leading-7 text-slate-600 sm:text-base">
                {activeFeed !== 'all' || selectedViewCount !== 'all' || selectedCategory !== 'all' || selectedState !== 'all' || selectedArea !== 'all' || searchQuery.trim()
                  ? 'Use the sticky filter bar above to refine the list.'
                  : 'Browse featured, nearby, verified, and trending stores from here.'}
              </p>
            </div>

            <div className="min-w-[16rem] rounded-[1.5rem] border border-amber-100 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800">
              Showing <span className="text-slate-950">{Math.min(visibleCount, visibleStores.length)}</span> of{' '}
              <span className="text-slate-950">{visibleStores.length}</span> stores
            </div>
          </div>

          <div>
            {loading ? (
              <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
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
                  Try another category, clear the filters in the top bar, or switch to the all stores view.
                </p>
                <Button
                  label="Reset filters"
                  icon="pi pi-filter-slash"
                  onClick={clearFilters}
                  className="mt-6 border-none bg-gradient-to-r from-amber-500 to-orange-500 px-5 py-3 text-sm font-semibold text-white"
                />
              </div>
            ) : (
              <div className="space-y-10">
                <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
                  {pagedStores.map((store) => (
                    <StoreCard key={store._id} store={store} userLocation={userLocation} />
                  ))}
                </div>

                {canLoadMore && (
                  <div className="flex justify-center">
                    <Button
                      label={`Load more (${Math.min(LOAD_MORE_STEP, visibleStores.length - visibleCount)} more)`}
                      icon="pi pi-plus"
                      onClick={() => setVisibleCount((current) => Math.min(current + LOAD_MORE_STEP, visibleStores.length))}
                      className="border-none bg-slate-950 px-7 py-3 text-sm font-semibold text-white shadow-lg hover:bg-slate-900"
                    />
                  </div>
                )}
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
                Featured stores are highlighted, newest stores are easy to find, popular and top-rated stores are ordered by
                engagement and feedback, nearby stores can use your location, and state / area filtering keeps the list
                practical for browsing.
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
