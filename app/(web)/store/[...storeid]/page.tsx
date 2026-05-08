'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { Button } from 'primereact/button';
import { Carousel } from 'primereact/carousel';
import { Chip } from 'primereact/chip';
import Link from 'next/link';
import axiosInstance from '@/service/axios.service';
import Header from '../../components/Header';
import Footer from '../../components/Footer';

interface Product {
  _id: string;
  name: string;
  images: string[];
  description: string;
  sellingPrice: number;
  isActive: boolean;
  isVerified: boolean;
  storeId: string;
  userId: string;
  createdAt: string;
  updatedAt: string;
  __v: number;
}

interface User {
  _id: string;
  name: string;
  email: string;
  phone: string;
}

interface ReviewUser {
  _id: string;
  name: string;
  email: string;
  picture?: string;
}

interface Review {
  _id: string;
  comment: string;
  rating: number;
  userId: ReviewUser;
  createdAt: string;
  updatedAt: string;
}

interface Address {
  area: string;
  state: string;
  country: string;
}

interface Timing {
  open: string;
  close: string;
}

interface TimingByDay {
  [key: string]: string;
}

interface ImageSeo {
  description: string;
  keyword: string;
  _id: string;
}

interface Store {
  _id: string;
  storeName: string;
  storeType?: string;
  userId: User;
  address: Address;
  timing: Timing;
  timingByDay?: TimingByDay;
  images: string[];
  lat: number;
  long: number;
  contactNo: string;
  whatsappNo: string;
  email: string;
  website: string;
  description: string;
  gstin?: string;
  imageSeo?: ImageSeo;
  isActive: boolean;
  isVerify: boolean;
  reviews: any[];
  createdAt: string;
  updatedAt: string;
  storeUniqueId: string;
  __v: number;
}

interface StoreDetailsResponse {
  store: Store;
  totalProducts: number;
  products: Product[];
}

const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

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

const buildWhatsAppShareUrl = (phoneNumber: string, message: string) => {
  const digitsOnly = phoneNumber.replace(/\D/g, '');
  const normalizedPhone = digitsOnly.startsWith('91') ? digitsOnly : `91${digitsOnly}`;
  return `https://wa.me/${normalizedPhone}?text=${encodeURIComponent(message)}`;
};

const getInitials = (name: string) =>
  name
    .split(' ')
    .filter(Boolean)
    .map((part) => part[0])
    .join('')
    .toUpperCase()
    .slice(0, 2) || 'ST';

const getAverageRating = (reviews: any[]) => {
  if (!reviews || reviews.length === 0) {
    return 0;
  }

  const total = reviews.reduce((sum, review) => sum + (Number(review?.rating) || 0), 0);
  return total / reviews.length;
};

const formatNumber = (value: number) => new Intl.NumberFormat('en-IN').format(value);

const formatReviewDate = (value: string) =>
  new Intl.DateTimeFormat('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(new Date(value));

const renderRatingStars = (rating: number) =>
  Array.from({ length: 5 }, (_, index) => (
    <i
      key={index}
      className={`pi pi-star-fill ${index < Math.round(rating) ? 'text-amber-400' : 'text-slate-200'}`}
    />
  ));

const quickFactCard = (label: string, value: string, tone: string) => (
  <div className={`rounded-2xl border border-white/70 bg-white/90 p-4 shadow-sm ${tone}`}>
    <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-500">{label}</p>
    <p className="mt-2 text-lg font-bold text-slate-950">{value}</p>
  </div>
);

export default function StoreDetails() {
  const params = useParams();
  const storeId = params?.storeid?.[0];

  const [store, setStore] = useState<Store | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [reviewComment, setReviewComment] = useState('');
  const [reviewRating, setReviewRating] = useState(0);
  const [reviewSubmitting, setReviewSubmitting] = useState(false);
  const [reviewSubmitError, setReviewSubmitError] = useState<string | null>(null);
  const [reviewSubmitSuccess, setReviewSubmitSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reviewsError, setReviewsError] = useState<string | null>(null);

  const fetchReviews = async (currentStoreId: string) => {
    const reviewResponse = await axiosInstance.get(`/api/review/store-reviews/${currentStoreId}`);
    setReviews(reviewResponse.data?.reviews || []);
  };

  useEffect(() => {
    const fetchStoreDetails = async () => {
      if (!storeId) {
        setError('Store not found');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);
        setReviewsError(null);
        const response = await axiosInstance.get(
          `/api/register/store-with-products/${storeId}`
        );
        const data: StoreDetailsResponse = response.data;
        setStore(data.store);
        setProducts(data.products || []);

        try {
          await fetchReviews(storeId);
        } catch (reviewErr: any) {
          console.error('Error fetching store reviews:', reviewErr);
          setReviews([]);
          setReviewsError('Customer comments are temporarily unavailable.');
        }
      } catch (err: any) {
        console.error('Error fetching store details:', err);
        setError(
          err.response?.data?.message || 'Failed to load store details. Please try again later.'
        );
      } finally {
        setLoading(false);
      }
    };

    fetchStoreDetails();
  }, [storeId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-yellow-50 via-white to-amber-50 flex flex-col">
        <Header />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <i className="pi pi-spin pi-spinner text-5xl text-yellow-600 mb-4 block"></i>
            <p className="text-lg font-semibold text-gray-600">Loading store details...</p>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  if (error || !store) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-yellow-50 via-white to-amber-50 flex flex-col">
        <Header />
        <div className="flex-1 flex items-center justify-center px-4">
          <div className="text-center max-w-md">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-red-100 rounded-full mb-6">
              <i className="pi pi-exclamation-triangle text-4xl text-red-500"></i>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-3">Oops!</h2>
            <p className="text-gray-600 mb-6">{error || 'Store not found'}</p>
            <Link href="/store">
              <Button
                label="Back to Stores"
                icon="pi pi-arrow-left"
                className="w-full"
                style={{
                  background: 'linear-gradient(120deg, #fbbf24, #f59e0b)',
                  border: 'none',
                  color: '#fff',
                  fontWeight: '600',
                }}
              />
            </Link>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  const handleAddToCart = () => {
    alert('Add to cart functionality coming soon!');
  };

  const handleSubmitReview = async () => {
    if (!storeId) {
      return;
    }

    const trimmedComment = reviewComment.trim();

    if (!trimmedComment) {
      setReviewSubmitError('Please write a comment before submitting.');
      return;
    }

    if (reviewRating < 1 || reviewRating > 5) {
      setReviewSubmitError('Please choose a rating between 1 and 5.');
      return;
    }

    try {
      setReviewSubmitting(true);
      setReviewSubmitError(null);
      setReviewSubmitSuccess(null);

      await axiosInstance.post(`/api/review/add-review/${storeId}`, {
        comment: trimmedComment,
        rating: reviewRating,
      });

      await fetchReviews(storeId);
      setReviewComment('');
      setReviewRating(0);
      setReviewSubmitSuccess('Your review was posted successfully.');
    } catch (submitErr: any) {
      console.error('Error adding review:', submitErr);
      setReviewSubmitError(
        submitErr?.response?.data?.message || 'Failed to submit your review. Please try again.'
      );
    } finally {
      setReviewSubmitting(false);
    }
  };

  const storeIsOpenNow = isStoreOpenNow(store.timing.open, store.timing.close);
  const averageRating = getAverageRating(reviews);
  const quickFacts = [
    {
      label: 'Products',
      value: `${formatNumber(products.length)} items`,
      tone: 'from-amber-50 to-orange-50',
    },
    {
      label: 'Verification',
      value: store.isVerify ? 'Verified store' : 'Pending review',
      tone: 'from-emerald-50 to-teal-50',
    },
    {
      label: 'Rating',
      value: averageRating > 0 ? `${averageRating.toFixed(1)} / 5` : 'No ratings yet',
      tone: 'from-violet-50 to-fuchsia-50',
    },
    {
      label: 'Status',
      value: storeIsOpenNow ? 'Open now' : 'Closed now',
      tone: storeIsOpenNow ? 'from-emerald-50 to-lime-50' : 'from-rose-50 to-orange-50',
    },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-[radial-gradient(circle_at_top_left,_rgba(251,191,36,0.16),_transparent_28%),radial-gradient(circle_at_top_right,_rgba(244,114,182,0.10),_transparent_30%),linear-gradient(180deg,_#fffdf7_0%,_#ffffff_36%,_#fff7ed_100%)] text-slate-900">
      <Header />

      <main className="flex-1 px-4 pb-12 pt-6 sm:px-6 sm:pb-16 sm:pt-8 lg:px-8 lg:pb-20">
        <div className="mx-auto max-w-7xl">
          <Link href="/store" className="mb-5 inline-flex items-center gap-2 rounded-full border border-amber-200 bg-white/85 px-4 py-2 text-sm font-semibold text-amber-700 shadow-sm backdrop-blur transition hover:-translate-y-0.5">
            <Button
              icon="pi pi-arrow-left"
              label="Back to Stores"
              text
              className="p-0 font-semibold text-amber-700 hover:text-amber-800"
            />
          </Link>

          <section className="overflow-hidden rounded-[2rem] border border-white/80 bg-white/85 shadow-[0_24px_80px_rgba(15,23,42,0.12)] backdrop-blur-xl">
            <div className="grid lg:grid-cols-[1.35fr_0.9fr] lg:items-stretch">
              <div className="flex min-h-[20rem] flex-col overflow-hidden lg:min-h-[28rem]">
                {store.images && store.images.length > 0 ? (
                  <Carousel
                    value={store.images.map((img, idx) => ({ id: idx, url: img }))}
                    numVisible={1}
                    numScroll={1}
                    itemTemplate={(item) => (
                      <div className="relative h-[20rem] sm:h-[24rem] lg:h-[28rem] w-full overflow-hidden">
                        <img
                          src={item.url}
                          alt={`${store.storeName} image ${item.id + 1}`}
                          className="h-full w-full object-cover"
                          onError={(e: any) => {
                            e.target.src = 'https://images.unsplash.com/photo-1568605114967-8130f3a36994?w=1200&h=900&fit=crop';
                          }}
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/15 to-transparent" />
                      </div>
                    )}
                    autoplayInterval={5000}
                    showIndicators
                    circular
                    style={{ height: '100%', flex: 1 }}
                  />
                ) : (
                  <div className="flex h-[20rem] sm:h-[24rem] lg:h-[28rem] items-center justify-center bg-gradient-to-br from-amber-500 via-orange-500 to-rose-500 text-white">
                    <div className="text-center">
                      <div className="text-6xl font-black tracking-[0.24em]">{getInitials(store.storeName)}</div>
                      <p className="mt-3 text-sm font-semibold uppercase tracking-[0.3em] text-white/80">Store banner</p>
                    </div>
                  </div>
                )}

                <div className="border-t border-slate-200 bg-white/95 p-5 sm:p-6 lg:p-7">
                  <div className="flex flex-wrap gap-2">
                    {store.isVerify && (
                      <Chip label="Verified" icon="pi pi-check-circle" className="bg-emerald-50 text-emerald-700 font-bold" />
                    )}
                    {store.gstin && <Chip label="GST Verified" icon="pi pi-id-card" className="bg-sky-50 text-sky-700 font-bold" />}
                    <Chip
                      label={storeIsOpenNow ? 'Open now' : 'Closed now'}
                      className={storeIsOpenNow ? 'bg-emerald-500 text-white font-bold' : 'bg-rose-500 text-white font-bold'}
                    />
                  </div>

                  <div className="mt-4 flex flex-col gap-3">
                    <p className="text-xs font-semibold uppercase tracking-[0.35em] text-amber-600">
                      {store.storeType || 'Local store'}
                    </p>
                    <h1 className="text-3xl font-black leading-tight text-slate-950 sm:text-4xl lg:text-[2.6rem]">
                      {store.storeName}
                    </h1>
                    <p className="max-w-3xl text-sm leading-7 text-slate-600 sm:text-base">
                      {store.description || 'A trusted local store with professional contact details, helpful hours, and product listings.'}
                    </p>
                  </div>

                  <div className="mt-5 grid gap-3 sm:grid-cols-2">
                    <div className="rounded-2xl bg-slate-50 p-4">
                      <p className="text-xs font-semibold uppercase tracking-[0.25em] text-slate-500">Location</p>
                      <p className="mt-1 text-sm font-bold text-slate-950">{store.address.area}</p>
                      <p className="text-sm text-slate-600">
                        {store.address.state}, {store.address.country}
                      </p>
                    </div>
                    <div className="rounded-2xl bg-slate-50 p-4">
                      <p className="text-xs font-semibold uppercase tracking-[0.25em] text-slate-500">Working hours</p>
                      <p className="mt-1 text-sm font-bold text-slate-950">
                        {store.timing.open} - {store.timing.close}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <aside className="border-t border-slate-200 bg-white/95 p-5 sm:p-6 lg:border-l lg:border-t-0 lg:p-7">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.3em] text-amber-600">Store profile</p>
                    <h2 className="mt-2 text-2xl font-black text-slate-950">{store.storeName}</h2>
                    <p className="mt-1 text-sm text-slate-500">ID: {store.storeUniqueId}</p>
                  </div>
                  <div className="rounded-2xl bg-slate-950 px-4 py-3 text-right text-white">
                    <p className="text-[11px] uppercase tracking-[0.28em] text-white/70">Rating</p>
                    <p className="mt-1 text-lg font-black">
                      {averageRating > 0 ? averageRating.toFixed(1) : 'N/A'}
                    </p>
                    <p className="text-xs text-white/70">{reviews.length} reviews</p>
                  </div>
                </div>

                <div className="mt-5 grid grid-cols-2 gap-3">
                  {quickFacts.map((fact) => (
                    <div key={fact.label}>
                      {quickFactCard(fact.label, fact.value, fact.tone)}
                    </div>
                  ))}
                </div>

                <div className="mt-5 space-y-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-500">Owner</p>
                    <p className="mt-1 text-lg font-bold text-slate-950">{store.userId.name}</p>
                    <p className="text-sm text-slate-600">{store.userId.email}</p>
                  </div>

                  <div className="grid gap-2 text-sm text-slate-700">
                    <p className="flex items-start gap-2">
                      <i className="pi pi-map-marker mt-0.5 text-amber-500" />
                      <span>
                        <span className="block font-semibold text-slate-950">{store.address.area}</span>
                        <span className="text-slate-500">{store.address.state}, {store.address.country}</span>
                      </span>
                    </p>
                    <p className="flex items-center gap-2">
                      <i className="pi pi-clock text-amber-500" />
                      <span className="font-semibold text-slate-900">{store.timing.open} - {store.timing.close}</span>
                    </p>
                  </div>
                </div>

                <div className="mt-5 space-y-3">
                  <a
                    href={`tel:${store.contactNo}`}
                    className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-800 shadow-sm transition hover:border-amber-200 hover:text-amber-700"
                  >
                    <span className="flex items-center gap-3">
                      <i className="pi pi-phone text-amber-500" />
                      Call now
                    </span>
                    <span className="text-slate-500">{store.contactNo}</span>
                  </a>

                  <a
                    href={buildWhatsAppShareUrl(store.whatsappNo || store.contactNo, `Hi, I am interested in ${store.storeName}.`)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-800 shadow-sm transition hover:border-emerald-200 hover:text-emerald-700"
                  >
                    <span className="flex items-center gap-3">
                      <i className="pi pi-whatsapp text-emerald-500" />
                      WhatsApp
                    </span>
                    <span className="text-slate-500">Chat</span>
                  </a>

                  <a
                    href={`mailto:${store.email}`}
                    className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-800 shadow-sm transition hover:border-sky-200 hover:text-sky-700"
                  >
                    <span className="flex items-center gap-3">
                      <i className="pi pi-envelope text-sky-500" />
                      Email
                    </span>
                    <span className="truncate text-slate-500">{store.email}</span>
                  </a>
                </div>

                <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {store.website && (
                    <a href={store.website} target="_blank" rel="noopener noreferrer" className="block">
                      <Button
                        label="Visit Website"
                        icon="pi pi-external-link"
                        className="w-full border-none bg-gradient-to-r from-slate-950 to-slate-800 font-semibold text-white"
                      />
                    </a>
                  )}
                  <Button
                    label="Share Store"
                    icon="pi pi-share-alt"
                    className="border-none bg-gradient-to-r from-amber-500 to-orange-500 font-semibold text-white"
                    onClick={() => {
                      window.open(
                        buildWhatsAppShareUrl(
                          store.whatsappNo || store.contactNo,
                          `Check out ${store.storeName} at ${store.address.area}, ${store.address.state}.`
                        ),
                        '_blank'
                      );
                    }}
                  />
                </div>
              </aside>
            </div>
          </section>

          <section className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {quickFacts.map((fact) => (
              <div key={fact.label}>
                {quickFactCard(fact.label, fact.value, fact.tone)}
              </div>
            ))}
          </section>

          <section className="mt-8 grid gap-6 lg:grid-cols-[1.2fr_0.8fr] lg:items-start">
            <div className="space-y-6">
              <div className="rounded-[1.75rem] border border-white/70 bg-white/90 p-5 shadow-[0_16px_40px_rgba(15,23,42,0.08)] sm:p-6">
                <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.3em] text-amber-600">Products</p>
                    <h3 className="mt-2 text-2xl font-black text-slate-950">Browse the store catalog</h3>
                  </div>
                  <p className="text-sm text-slate-500">{products.length} product{products.length === 1 ? '' : 's'} available</p>
                </div>

                {products.length === 0 ? (
                  <div className="rounded-[1.5rem] border border-dashed border-slate-300 bg-slate-50 px-6 py-12 text-center">
                    <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-white text-amber-600 shadow-sm">
                      <i className="pi pi-inbox text-2xl" />
                    </div>
                    <h4 className="text-xl font-black text-slate-950">No products yet</h4>
                    <p className="mt-2 text-sm leading-6 text-slate-600">
                      This store has not added products yet. Check back soon for updates.
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
                    {products.map((product) => (
                      <article
                        key={product._id}
                        className="group overflow-hidden rounded-[1.4rem] border border-slate-200 bg-white shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-[0_20px_50px_rgba(15,23,42,0.12)]"
                      >
                        <div className="relative h-48 overflow-hidden bg-slate-100">
                          {product.images && product.images.length > 0 ? (
                            <Carousel
                              value={product.images.map((img, idx) => ({ id: idx, url: img }))}
                              numVisible={1}
                              numScroll={1}
                              itemTemplate={(item) => (
                                <div className="relative h-48 w-full">
                                  <img
                                    src={item.url}
                                    alt={`${product.name} image ${item.id + 1}`}
                                    className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.05]"
                                    onError={(e: any) => {
                                      e.target.src = 'https://images.unsplash.com/photo-1572635196237-14b3f281503f?w=800&h=600&fit=crop';
                                    }}
                                  />
                                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/10 to-transparent" />
                                </div>
                              )}
                              autoplayInterval={5000}
                              showIndicators
                              circular
                              style={{ height: '100%' }}
                            />
                          ) : (
                            <div className="flex h-full items-center justify-center bg-gradient-to-br from-amber-100 to-orange-100 text-4xl font-black text-amber-600">
                              {product.name.charAt(0).toUpperCase()}
                            </div>
                          )}

                          {product.isVerified && (
                            <div className="absolute left-3 top-3 rounded-full bg-emerald-500 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-white shadow-lg">
                              Verified
                            </div>
                          )}
                          <div className="absolute bottom-3 right-3 rounded-full bg-slate-950/80 px-3 py-1 text-xs font-semibold text-white backdrop-blur-sm">
                            ₹{product.sellingPrice}
                          </div>
                        </div>

                        <div className="flex flex-col gap-3 p-4">
                          <div>
                            <h4 className="text-base font-bold text-slate-950 line-clamp-2">{product.name}</h4>
                            <p className="mt-1 text-sm leading-6 text-slate-600 line-clamp-2">{product.description}</p>
                          </div>

                          <div className="flex items-center justify-between rounded-2xl bg-slate-50 px-3 py-2 text-sm">
                            <span className="font-semibold text-slate-700">Price</span>
                            <span className="text-lg font-black text-amber-600">₹{product.sellingPrice}</span>
                          </div>

                          <div className="flex items-center gap-2">
                            <Button
                              label="Add to Cart"
                              icon="pi pi-shopping-cart"
                              onClick={handleAddToCart}
                              className="flex-1 border-none bg-gradient-to-r from-amber-500 to-orange-500 font-semibold text-white shadow-md"
                            />
                            <a
                              href={buildWhatsAppShareUrl(
                                store.whatsappNo || store.contactNo,
                                `Hi, I am interested in ${product.name} from ${store.storeName}.\n\nProduct Details:\n${product.description}\n\nPrice: ₹${product.sellingPrice}`
                              )}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-500 text-white shadow-md transition hover:bg-emerald-600"
                              title="Share on WhatsApp"
                            >
                              <i className="pi pi-whatsapp text-xl" />
                            </a>
                          </div>
                        </div>
                      </article>
                    ))}
                  </div>
                )}
              </div>

              <div className="rounded-[1.75rem] border border-white/70 bg-white/90 p-5 shadow-[0_16px_40px_rgba(15,23,42,0.08)] sm:p-6">
                <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.35em] text-amber-600">Reviews</p>
                    <h3 className="mt-2 text-2xl font-black text-slate-950 sm:text-3xl">Customer comments</h3>
                    <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
                      Real feedback from people who visited this store. Ratings, comments, and reviewer details
                      are shown exactly as submitted.
                    </p>
                  </div>
                  <div className="min-w-[11rem] rounded-[1.5rem] bg-slate-950 px-5 py-4 text-white shadow-[0_16px_35px_rgba(15,23,42,0.18)]">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-white/60">Average rating</p>
                    <p className="mt-2 text-3xl font-black leading-none">
                      {averageRating > 0 ? averageRating.toFixed(1) : 'No ratings yet'}
                    </p>
                    <p className="mt-2 text-sm text-white/70">{reviews.length} customer review{reviews.length === 1 ? '' : 's'}</p>
                  </div>
                </div>

                <div className="mb-6 overflow-hidden rounded-[1.5rem] border border-amber-100 bg-gradient-to-br from-amber-50 via-white to-orange-50 p-5 shadow-[0_12px_32px_rgba(15,23,42,0.06)] sm:p-6">
                  <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                    <div className="max-w-2xl">
                      <p className="text-xs font-semibold uppercase tracking-[0.35em] text-amber-600">Write a review</p>
                      <h4 className="mt-2 text-xl font-black text-slate-950">Share your experience with this store</h4>
                      <p className="mt-2 text-sm leading-6 text-slate-600">
                        Leave a short comment and choose a star rating. Your review will appear in the customer comments list after submission.
                      </p>
                    </div>

                    <div className="shrink-0 rounded-[1.25rem] bg-white px-4 py-3 shadow-sm ring-1 ring-amber-100">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-slate-400">Your rating</p>
                      <div className="mt-2 flex items-center gap-2">
                        {Array.from({ length: 5 }, (_, index) => {
                          const ratingValue = index + 1;
                          const active = ratingValue <= reviewRating;

                          return (
                            <button
                              key={ratingValue}
                              type="button"
                              onClick={() => setReviewRating(ratingValue)}
                              className="transition-transform duration-150 hover:-translate-y-0.5"
                              aria-label={`Set rating to ${ratingValue} star${ratingValue > 1 ? 's' : ''}`}
                            >
                              <i
                                className={`pi pi-star-fill text-xl ${active ? 'text-amber-400' : 'text-slate-200'}`}
                              />
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  <div className="mt-5 grid gap-4">
                    <textarea
                      value={reviewComment}
                      onChange={(event) => {
                        setReviewComment(event.target.value);
                        if (reviewSubmitError) setReviewSubmitError(null);
                        if (reviewSubmitSuccess) setReviewSubmitSuccess(null);
                      }}
                      rows={4}
                      placeholder="Write your comment here..."
                      className="w-full rounded-[1.25rem] border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-amber-400 focus:ring-4 focus:ring-amber-100"
                    />

                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <p className="text-xs text-slate-500">
                        Rating:{' '}
                        <span className="font-semibold text-slate-700">
                          {reviewRating > 0 ? `${reviewRating} star${reviewRating > 1 ? 's' : ''}` : 'No rating selected'}
                        </span>
                      </p>

                      <Button
                        label={reviewSubmitting ? 'Posting Review...' : 'Post Review'}
                        icon={reviewSubmitting ? 'pi pi-spin pi-spinner' : 'pi pi-send'}
                        disabled={reviewSubmitting}
                        onClick={handleSubmitReview}
                        className="border-none bg-gradient-to-r from-amber-500 to-orange-500 font-semibold text-white shadow-md"
                      />
                    </div>

                    {reviewSubmitError && (
                      <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                        {reviewSubmitError}
                      </div>
                    )}

                    {reviewSubmitSuccess && (
                      <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                        {reviewSubmitSuccess}
                      </div>
                    )}
                  </div>
                </div>

                {reviewsError ? (
                  <div className="rounded-[1.5rem] border border-rose-200 bg-rose-50 px-5 py-8 text-center text-sm text-rose-700">
                    {reviewsError}
                  </div>
                ) : reviews.length === 0 ? (
                  <div className="rounded-[1.5rem] border border-dashed border-slate-300 bg-slate-50 px-6 py-10 text-center">
                    <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-white text-amber-600 shadow-sm">
                      <i className="pi pi-comment text-2xl" />
                    </div>
                    <h4 className="text-xl font-black text-slate-950">No comments yet</h4>
                    <p className="mt-2 text-sm leading-6 text-slate-600">
                      Customer reviews will appear here once people start sharing their feedback.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {reviews.map((review) => (
                      <article
                        key={review._id}
                        className="overflow-hidden rounded-[1.5rem] border border-slate-200 bg-white shadow-sm transition duration-300 hover:-translate-y-0.5 hover:shadow-[0_18px_40px_rgba(15,23,42,0.10)]"
                      >
                        <div className="h-1 bg-gradient-to-r from-amber-400 via-orange-400 to-rose-400" />

                        <div className="p-5 sm:p-6">
                          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                            <div className="flex items-center gap-4">
                              {review.userId.picture ? (
                                <img
                                  src={review.userId.picture}
                                  alt={review.userId.name}
                                  className="h-14 w-14 rounded-full object-cover ring-4 ring-amber-50"
                                />
                              ) : (
                                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-amber-500 to-orange-500 text-base font-black text-white shadow-sm">
                                  {getInitials(review.userId.name)}
                                </div>
                              )}

                              <div className="min-w-0">
                                <div className="flex flex-wrap items-center gap-2">
                                  <h4 className="text-base font-bold text-slate-950">{review.userId.name}</h4>
                                  <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-emerald-700">
                                    Verified buyer
                                  </span>
                                </div>
                                <p className="mt-1 truncate text-sm text-slate-500">{review.userId.email}</p>
                                <div className="mt-3 flex items-center gap-1 text-sm">
                                  {renderRatingStars(review.rating)}
                                </div>
                              </div>
                            </div>

                            <div className="shrink-0 rounded-2xl bg-slate-50 px-3 py-2 text-left sm:text-right">
                              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">
                                Posted on
                              </p>
                              <p className="mt-1 text-sm font-semibold text-slate-700">
                                {formatReviewDate(review.createdAt)}
                              </p>
                            </div>
                          </div>

                          <div className="mt-5 rounded-[1.35rem] bg-gradient-to-br from-slate-50 to-white px-4 py-4 sm:px-5">
                            <div className="mb-2 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">
                              <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
                              Comment
                            </div>
                            <p className="text-[15px] leading-7 text-slate-700">{review.comment}</p>
                          </div>
                        </div>
                      </article>
                    ))}
                  </div>
                )}
              </div>

              {store.timingByDay && Object.keys(store.timingByDay).length > 0 && (
                <div className="rounded-[1.75rem] border border-white/70 bg-white/90 p-5 shadow-[0_16px_40px_rgba(15,23,42,0.08)] sm:p-6">
                  <h3 className="mb-5 flex items-center gap-2 text-2xl font-black text-slate-950">
                    <i className="pi pi-calendar text-amber-500" /> Weekly Hours
                  </h3>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-7">
                    {daysOfWeek.map((day) => (
                      <div key={day} className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                        <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-slate-500">{day}</p>
                        <p className="mt-1 text-sm font-semibold text-amber-700">
                          {store.timingByDay?.[day.toLowerCase()] || `${store.timing.open} - ${store.timing.close}`}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <aside className="space-y-6 lg:sticky lg:top-24 self-start">
              <div className="rounded-[1.75rem] border border-white/70 bg-white/90 p-5 shadow-[0_16px_40px_rgba(15,23,42,0.08)] sm:p-6">
                <p className="text-xs font-semibold uppercase tracking-[0.3em] text-amber-600">About store</p>
                <h3 className="mt-2 text-2xl font-black text-slate-950">{store.storeName}</h3>
                <p className="mt-3 text-sm leading-7 text-slate-600">
                  {store.description || 'This store has not provided a description yet.'}
                </p>

                <div className="mt-5 grid gap-3">
                  <div className="rounded-2xl bg-slate-50 p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.25em] text-slate-500">Owner</p>
                    <p className="mt-1 text-base font-bold text-slate-950">{store.userId.name}</p>
                    <p className="text-sm text-slate-600">{store.userId.phone}</p>
                  </div>
                  <div className="rounded-2xl bg-slate-50 p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.25em] text-slate-500">Working hours</p>
                    <p className="mt-1 text-base font-bold text-slate-950">
                      {store.timing.open} - {store.timing.close}
                    </p>
                  </div>
                  {store.website && (
                    <a href={store.website} target="_blank" rel="noopener noreferrer">
                      <Button
                        label="Visit Website"
                        icon="pi pi-external-link"
                        className="w-full border-none bg-slate-950 font-semibold text-white"
                      />
                    </a>
                  )}
                </div>
              </div>

              <div className="rounded-[1.75rem] border border-white/70 bg-white/90 p-5 shadow-[0_16px_40px_rgba(15,23,42,0.08)] sm:p-6">
                <p className="text-xs font-semibold uppercase tracking-[0.3em] text-amber-600">Quick contacts</p>
                <div className="mt-4 space-y-3">
                  <a href={`tel:${store.contactNo}`} className="flex items-center gap-3 rounded-2xl bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-800 transition hover:bg-amber-50 hover:text-amber-700">
                    <i className="pi pi-phone text-amber-500" />
                    {store.contactNo}
                  </a>
                  <a href={`mailto:${store.email}`} className="flex items-center gap-3 rounded-2xl bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-800 transition hover:bg-sky-50 hover:text-sky-700 break-all">
                    <i className="pi pi-envelope text-sky-500" />
                    {store.email}
                  </a>
                  <a href={buildWhatsAppShareUrl(store.whatsappNo || store.contactNo, `Hi, I am interested in ${store.storeName}.`)} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 rounded-2xl bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-800 transition hover:bg-emerald-50 hover:text-emerald-700">
                    <i className="pi pi-whatsapp text-emerald-500" />
                    WhatsApp chat
                  </a>
                </div>
              </div>
            </aside>
          </section>
        </div>
      </main>

      <Footer />
    </div>
  );
}
