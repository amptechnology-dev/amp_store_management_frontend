'use client';

import React, { useState, useEffect } from 'react';
import { Button } from 'primereact/button';
import { InputText } from 'primereact/inputtext';
import { IconField } from 'primereact/iconfield';
import { InputIcon } from 'primereact/inputicon';
import { Dialog } from 'primereact/dialog';
import Link from 'next/link';
import axiosInstance from '@/service/axios.service';
import Header from '../components/Header';
import Footer from '../components/Footer';

interface Store {
  _id: string;
  storeName: string;
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
  isActive: boolean;
  isVerify: boolean;
  storeUniqueId: string;
}

const dummyStores: Store[] = [];

const advertisementSlots = [
  {
    id: 'ad-1',
    title: 'Featured Store Promotion',
    description: 'Premium placement for your store banner, offers, and seasonal campaigns.',
    image:
      'https://images.unsplash.com/photo-1524758631624-e2822e304c36?w=900&h=700&fit=crop',
    cta: 'Book Ad Space',
    tone: 'from-sky-500 to-blue-600',
  },
  {
    id: 'ad-2',
    title: 'Local Business Spotlight',
    description: 'Highlight trusted local stores with a dedicated spotlight card.',
    image:
      'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=900&h=700&fit=crop',
    cta: 'View Spotlight',
    tone: 'from-emerald-500 to-teal-600',
  },
  {
    id: 'ad-3',
    title: 'Seasonal Offer Banner',
    description: 'Reserve this section for rotating offers, coupons, and upcoming promotions.',
    image:
      'https://images.unsplash.com/photo-1519389950473-47ba0277781c?w=900&h=700&fit=crop',
    cta: 'Reserve Now',
    tone: 'from-amber-500 to-orange-600',
  },
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

export default function Home() {
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredStores, setFilteredStores] = useState<Store[]>([]);
  const [allStores, setAllStores] = useState<Store[]>([]);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch stores from API
  useEffect(() => {
    const fetchStores = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await axiosInstance.get('/api/register/public-all-stores');
        const stores = response.data.stores || [];
        setAllStores(stores);
        setFilteredStores(stores);
      } catch (err: any) {
        console.error('Error fetching stores:', err);
        setError('Failed to load stores. Please try again later.');
        setAllStores([]);
        setFilteredStores([]);
      } finally {
        setLoading(false);
      }
    };

    fetchStores();
  }, []);

  const handleSearch = (value: string) => {
    setSearchQuery(value);
    if (value.trim() === '') {
      setFilteredStores(allStores);
    } else {
      const filtered = allStores.filter((store) =>
        store.storeName.toLowerCase().includes(value.toLowerCase()) ||
        store.address.state.toLowerCase().includes(value.toLowerCase()) ||
        store.address.area.toLowerCase().includes(value.toLowerCase())
      );
      setFilteredStores(filtered);
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const stringToBg = (str: string) => {
    const colors = [
      'bg-red-500',
      'bg-blue-500',
      'bg-green-500',
      'bg-purple-500',
      'bg-pink-500',
      'bg-yellow-500',
      'bg-indigo-500',
      'bg-cyan-500',
    ];
    const index = str.charCodeAt(0) % colors.length;
    return colors[index];
  };

  const getStoreStatus = (store: Store) => {
    const openNow = store.isActive && isStoreOpenNow(store.timing.open, store.timing.close);

    return {
      openNow,
      label: openNow ? '✓ Open' : '✗ Closed',
      className: openNow ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700',
    };
  };

  const renderStoreCard = (store: Store) => {
    const storeStatus = getStoreStatus(store);

    return (
      <div key={store._id} className="bg-white rounded-xl shadow-md hover:shadow-2xl transition-all duration-300 overflow-hidden border border-yellow-100 flex flex-col h-full hover:border-yellow-300">
        <div className="relative w-full h-32 sm:h-36 md:h-40 overflow-hidden bg-gradient-to-br from-gray-100 to-gray-200 group-hover:scale-105 transition-transform duration-300">
          {store.images && store.images.length > 0 ? (
            <img
              src={store.images[0]}
              alt={`${store.storeName} banner`}
              className="w-full h-full object-cover"
              onError={(e: any) => {
                e.target.src = 'https://images.unsplash.com/photo-1568605114967-8130f3a36994?w=500&h=300&fit=crop';
              }}
            />
          ) : (
            <div
              className={`w-full h-full flex items-center justify-center text-white text-4xl font-bold ${stringToBg(
                store.storeName
              )} shadow-lg`}
            >
              {getInitials(store.storeName)}
            </div>
          )}

          {store.isVerify && (
            <div className="absolute top-2 right-2 bg-gradient-to-r from-yellow-400 to-yellow-500 text-white rounded-full p-1.5 shadow-lg z-10">
              <i className="pi pi-check text-sm font-bold"></i>
            </div>
          )}

          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-300"></div>
        </div>

        <div className="p-3 sm:p-4 flex flex-col gap-2 flex-1">
          <div>
            <h4 className="text-sm md:text-base font-bold text-gray-900 line-clamp-1">{store.storeName}</h4>
            <p className="text-xs text-gray-600 line-clamp-1">
              Owner: <span className="font-medium">{store.userId?.name || 'N/A'}</span>
            </p>
          </div>

          <div className="text-xs text-gray-700 space-y-1.5 flex-1">
            <p>
              <span className="font-semibold">📍</span> <span className="font-medium">{store.address?.area}</span>
              <br />
              <span className="text-gray-500 ml-6">
                {store.address?.state}, {store.address?.country}
              </span>
            </p>
            <p>
              <span className="font-semibold">📞</span>{' '}
              <a href={`tel:${store.contactNo}`} className="font-medium text-blue-600 hover:text-blue-700 hover:underline">
                {store.contactNo}
              </a>
            </p>
            <p>
              <span className="font-semibold">📧</span>{' '}
              <a
                href={`mailto:${store.email}`}
                className="font-medium text-blue-600 hover:text-blue-700 hover:underline break-all"
              >
                {store.email}
              </a>
            </p>
            <p>
              <span className="font-semibold">⏰</span> {store.timing?.open} - {store.timing?.close}
            </p>
          </div>

          <div className="flex items-center justify-between gap-2 pt-2 border-t border-gray-200">
            <span className={`px-2 py-1 rounded-full text-xs font-semibold ${storeStatus.className}`}>
              {storeStatus.label}
            </span>
            <Link href={`/store/${store._id}`}>
              <Button
                icon="pi pi-arrow-right"
                rounded
                text
                className="text-yellow-600 hover:text-yellow-700 hover:bg-yellow-50 font-bold"
                title="View Details"
              />
            </Link>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-yellow-50 via-white to-amber-50">
      {/* Header Component */}
      <Header />

      {/* Hero Section */}
      <section 
        className="relative py-12 sm:py-24 md:py-32 px-4 sm:px-6 lg:px-8 overflow-hidden"
        style={{
          backgroundImage: 'url(https://images.unsplash.com/photo-1556740738-b6a63e27c4df?w=1200&h=600&fit=crop)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundAttachment: 'fixed',
        }}
      >
        {/* Overlay */}
        <div className="absolute inset-0 bg-black/40 backdrop-blur-sm"></div>
        
        <div className="relative max-w-7xl mx-auto text-center z-10">
          <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold mb-3 sm:mb-6 text-white drop-shadow-lg">
            Shop Smart, Save More!
          </h2>
          <p className="text-base sm:text-lg md:text-xl text-white mb-6 sm:mb-10 max-w-2xl mx-auto font-semibold drop-shadow-md">
            Discover amazing deals from local stores and get the best shopping experience with AMP Shopping.
          </p>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 mb-4">
            <div className="bg-white/95 backdrop-blur-sm rounded-lg shadow-lg p-3 sm:p-4 border border-yellow-200 hover:shadow-xl transition-shadow">
              <p className="text-2xl sm:text-3xl font-bold text-yellow-600">{allStores.length}</p>
              <p className="text-xs sm:text-sm text-gray-700 font-medium">Registered Stores</p>
            </div>
            <div className="bg-white/95 backdrop-blur-sm rounded-lg shadow-lg p-3 sm:p-4 border border-orange-200 hover:shadow-xl transition-shadow">
              <p className="text-2xl sm:text-3xl font-bold text-orange-600">24/7</p>
              <p className="text-xs sm:text-sm text-gray-700 font-medium">Support</p>
            </div>
            <div className="bg-white/95 backdrop-blur-sm rounded-lg shadow-lg p-3 sm:p-4 border border-amber-200 hover:shadow-xl transition-shadow">
              <p className="text-2xl sm:text-3xl font-bold text-amber-600">100%</p>
              <p className="text-xs sm:text-sm text-gray-700 font-medium">Verified</p>
            </div>
            <div className="bg-white/95 backdrop-blur-sm rounded-lg shadow-lg p-3 sm:p-4 border border-yellow-300 hover:shadow-xl transition-shadow">
              <p className="text-2xl sm:text-3xl font-bold text-yellow-700">Safe</p>
              <p className="text-xs sm:text-sm text-gray-700 font-medium">Secure</p>
            </div>
          </div>
        </div>
      </section>

      {/* Advertisement Showcase */}
      <section className="relative z-10 px-4 sm:px-6 lg:px-8 pt-10 sm:pt-14 pb-8 sm:pb-16">
        <div className="max-w-7xl mx-auto rounded-[2rem] bg-white/90 backdrop-blur-sm shadow-[0_20px_60px_rgba(0,0,0,0.08)] border border-white/70 p-4 sm:p-6 lg:p-8">
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-5 sm:mb-8">
            <div className="max-w-3xl">
              <p className="text-xs uppercase tracking-[0.35em] text-yellow-600 font-bold">Advertisement</p>
              <h3 className="text-2xl sm:text-3xl font-bold text-gray-900 mt-2">Promotional space for stores</h3>
              <p className="text-sm sm:text-base text-gray-600 mt-2 leading-6">
                This block is static for now and can later be connected to dynamic ad content.
              </p>
            </div>
            <Link
              href="/register"
              className="inline-flex w-fit items-center justify-center rounded-full bg-gray-900 px-4 py-2 text-sm font-semibold text-white shadow-md transition-transform hover:-translate-y-0.5"
            >
              Register Store
            </Link>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-[1.6fr_1fr_1fr] gap-4 sm:gap-5">
            {advertisementSlots.map((slot, index) => (
              <article
                key={slot.id}
                className={`relative min-h-[260px] overflow-hidden rounded-3xl border border-white/60 bg-white shadow-xl ${
                  index === 0 ? 'lg:min-h-[360px]' : 'lg:min-h-[360px]'
                }`}
              >
                <div className="absolute inset-0">
                  <img src={slot.image} alt={slot.title} className="h-full w-full object-cover" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/35 to-black/10"></div>
                </div>
                <div className="relative flex h-full flex-col justify-end p-5 sm:p-6 text-white">
                  <span className="mb-3 w-fit rounded-full bg-white/15 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.25em] backdrop-blur-sm">
                    Advertisement
                  </span>
                  <h4 className="text-xl sm:text-2xl font-bold leading-tight">{slot.title}</h4>
                  <p className="mt-2 max-w-md text-sm sm:text-base text-white/85">{slot.description}</p>
                  <div className="mt-5 flex items-center gap-3">
                    <button
                      type="button"
                      className={`inline-flex items-center justify-center rounded-full bg-gradient-to-r ${slot.tone} px-4 py-2 text-sm font-semibold text-white shadow-lg transition-transform hover:-translate-y-0.5`}
                    >
                      {slot.cta}
                    </button>
                    <span className="text-xs font-semibold uppercase tracking-[0.2em] text-white/75">
                      Static placeholder
                    </span>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* Stores Section */}
      <section className="py-8 sm:py-16 px-4 sm:px-6 lg:px-8 bg-white/70">
        <div className="max-w-7xl mx-auto">
          <div className="mb-6 sm:mb-10 rounded-[1.75rem] border border-yellow-100 bg-white/95 backdrop-blur-sm shadow-lg p-4 sm:p-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div className="max-w-2xl">
                <p className="text-xs uppercase tracking-[0.35em] text-yellow-600 font-bold mb-2">Search Stores</p>
                <h3 className="text-2xl sm:text-3xl font-bold text-gray-900">
                  {searchQuery ? `Search Results (${filteredStores.length})` : 'Registered Stores'}
                </h3>
                <p className="text-sm sm:text-base text-gray-600 mt-2">
                  Search by store name, area, or state to filter the store list quickly.
                </p>
              </div>

              <div className="w-full lg:w-[32rem]">
                <IconField iconPosition="left">
                  <InputIcon className="pi pi-search text-gray-400" />
                  <InputText
                    type="text"
                    placeholder="Search by store name or location..."
                    value={searchQuery}
                    onChange={(e) => handleSearch(e.target.value)}
                    className="w-full text-sm sm:text-base"
                    style={{
                      padding: '14px 14px 14px 40px',
                      border: '2px solid #fbbf24',
                      borderRadius: '14px',
                      transition: 'all 0.3s ease',
                      boxShadow: '0 0 24px rgba(251, 191, 36, 0.18)',
                      backgroundColor: 'rgba(255, 255, 255, 0.98)',
                      fontWeight: '500',
                    }}
                  />
                </IconField>
              </div>
            </div>
          </div>

          <div className="mb-6 sm:mb-10 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
            <div>
              <h3 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">Store List</h3>
              <p className="text-sm sm:text-base text-gray-600">
                {searchQuery
                  ? 'Here are the stores matching your search'
                  : 'Browse our collection of verified local stores'}
              </p>
            </div>
            <div className="inline-flex w-fit items-center gap-2 rounded-full border border-yellow-200 bg-yellow-50 px-4 py-2 text-sm font-semibold text-yellow-800">
              <span className="h-2 w-2 rounded-full bg-yellow-500"></span>
              Marketplace ready
            </div>
          </div>

          {/* Loading State */}
          {loading ? (
            <div className="text-center py-12">
              <div className="inline-flex items-center justify-center mb-4">
                <i className="pi pi-spin pi-spinner text-4xl text-yellow-600"></i>
              </div>
              <p className="text-gray-600 font-semibold">Loading stores...</p>
            </div>
          ) : error ? (
            <div className="text-center py-12">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-red-100 rounded-full mb-4">
                <i className="pi pi-exclamation-triangle text-2xl text-red-500"></i>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Error Loading Stores</h3>
              <p className="text-gray-600 mb-6">{error}</p>
              <Button
                label="Try Again"
                icon="pi pi-refresh"
                onClick={() => window.location.reload()}
                className="w-auto"
              />
            </div>
          ) : filteredStores.length === 0 ? (
            <div className="text-center py-12">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-gray-100 rounded-full mb-4">
                <i className="pi pi-search text-2xl text-gray-400"></i>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No stores found</h3>
              <p className="text-gray-600 mb-6">Try a different search term</p>
              <Button
                label="View All Stores"
                icon="pi pi-arrow-right"
                onClick={() => handleSearch('')}
                className="w-auto"
              />
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-5">
              {filteredStores.map((store) => renderStoreCard(store))}
            </div>
          )}
        </div>
      </section>

      {/* Features Section */}
      <section className="py-8 sm:py-16 px-4 sm:px-6 lg:px-8 bg-white">
        <div className="max-w-7xl mx-auto">
          <h3 className="text-2xl sm:text-3xl font-bold text-center mb-8 sm:mb-12 bg-gradient-to-r from-yellow-500 to-orange-600 bg-clip-text text-transparent">
            Why Choose AMP Shopping?
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8">
            {[
              {
                icon: 'pi-shield-check',
                title: 'Verified Stores',
                description: 'All stores are verified and trusted by our community',
              },
              {
                icon: 'pi-phone',
                title: 'Direct Contact',
                description: 'Connect directly with store owners via call or email',
              },
              {
                icon: 'pi-map',
                title: 'Location Based',
                description: 'Find stores near you with detailed address information',
              },
            ].map((feature, idx) => (
              <div key={idx} className="text-center">
                <div className="w-16 h-16 sm:w-20 sm:h-20 mx-auto mb-4 bg-gradient-to-br from-yellow-100 to-orange-100 rounded-full flex items-center justify-center shadow-md">
                  <i className={`pi ${feature.icon} text-2xl sm:text-3xl text-yellow-600`}></i>
                </div>
                <h4 className="text-lg font-semibold text-gray-900 mb-2">{feature.title}</h4>
                <p className="text-sm text-gray-600">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-12 sm:py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center">
          <h3 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-4 sm:mb-6 bg-gradient-to-r from-yellow-500 to-orange-600 bg-clip-text text-transparent">
            Ready to Start Shopping?
          </h3>
          <p className="text-base sm:text-lg text-gray-700 mb-6 sm:mb-10 font-medium">
            Join thousands of shoppers and find amazing deals from local stores today!
          </p>
          <div className="flex flex-col sm:flex-row gap-4 sm:gap-6 justify-center">
            <Button
              label="Start Shopping"
              icon="pi pi-shopping-bag"
              onClick={() => setShowLoginModal(true)}
              className="w-full sm:w-auto font-bold"
              style={{
                background: 'linear-gradient(120deg, #fbbf24, #f59e0b)',
                border: 'none',
                padding: '12px 32px',
                boxShadow: '0 4px 15px rgba(251, 191, 36, 0.4)',
              }}
            />
            <Button
              label="Learn More"
              icon="pi pi-info-circle"
              text
              className="w-full sm:w-auto text-yellow-600 font-bold hover:text-yellow-700"
              style={{ padding: '12px 32px' }}
            />
          </div>
        </div>
      </section>

      {/* Login Modal */}
      <Dialog
        visible={showLoginModal}
        onHide={() => setShowLoginModal(false)}
        header={
          <div className="flex items-center gap-2 p-2">
            <div className="w-8 h-8 bg-gradient-to-br from-yellow-400 to-yellow-600 rounded-lg flex items-center justify-center text-white font-bold text-sm">
              AMP
            </div>
            <span className="text-lg font-bold">AMP Shopping Login</span>
          </div>
        }
        modal
        className="w-full sm:w-96"
        style={{ borderRadius: '16px' }}
        headerStyle={{ borderBottom: '2px solid #fbbf24', backgroundColor: '#fafaf9' }}
      >
        <div className="flex flex-col gap-6 p-4">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Welcome Back!</h2>
            <p className="text-gray-600">Sign in to your AMP Shopping account</p>
          </div>

          {/* Google Login Button */}
          <button
            onClick={() => {
              alert('Redirecting to Google Login...');
              window.location.href = '/api/auth/google';
            }}
            className="w-full flex items-center justify-center gap-3 bg-white border-2 border-gray-300 hover:border-yellow-500 rounded-lg py-3 px-4 font-semibold text-gray-800 transition-all duration-300 hover:shadow-md"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path
                fill="#1f2937"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34a853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#fbbc05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              />
              <path
                fill="#ea4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
            Continue with Google
          </button>

          {/* Divider */}
          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-gray-300"></div>
            <span className="text-gray-500 text-sm">or</span>
            <div className="flex-1 h-px bg-gray-300"></div>
          </div>

          {/* Email Login Button */}
          <Link href="/login" className="w-full">
            <button className="w-full bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-600 hover:to-orange-600 text-white font-bold py-3 px-4 rounded-lg transition-all duration-300 shadow-md hover:shadow-lg">
              <i className="pi pi-envelope mr-2"></i>
              Continue with Email
            </button>
          </Link>

          {/* Signup Link */}
          <div className="text-center">
            <p className="text-gray-600 text-sm">
              Don't have an account?{' '}
              <Link href="/register" className="text-yellow-600 font-semibold hover:text-yellow-700 underline">
                Sign up now
              </Link>
            </p>
          </div>

          {/* Privacy Notice */}
          <p className="text-xs text-gray-500 text-center">
            By signing in, you agree to our Terms of Service and Privacy Policy
          </p>
        </div>
      </Dialog>

      {/* Footer Component */}
      <Footer />
    </div>
  );
}
