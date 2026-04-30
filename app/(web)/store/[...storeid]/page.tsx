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

export default function StoreDetails() {
  const params = useParams();
  const storeId = params?.storeid?.[0];

  const [store, setStore] = useState<Store | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showLoginModal, setShowLoginModal] = useState(false);

  // Fetch store details and products
  useEffect(() => {
    const fetchStoreDetails = async () => {
      if (!storeId) return;

      try {
        setLoading(true);
        setError(null);
        const response = await axiosInstance.get(
          `/api/register/store-with-products/${storeId}`
        );
        const data: StoreDetailsResponse = response.data;
        setStore(data.store);
        setProducts(data.products || []);
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
        <Header onLoginClick={() => setShowLoginModal(true)} />
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
        <Header onLoginClick={() => setShowLoginModal(true)} />
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

  const storeIsOpenNow = isStoreOpenNow(store.timing.open, store.timing.close);

  return (
    <div className="min-h-screen bg-gradient-to-br from-yellow-50 via-white to-amber-50 flex flex-col">
      {/* Header */}
      <Header onLoginClick={() => setShowLoginModal(true)} />

      {/* Main Content */}
      <main className="flex-1 py-8 sm:py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          {/* Back Button */}
          <Link href="/store" className="inline-block mb-6">
            <Button
              icon="pi pi-arrow-left"
              label="Back to Stores"
              text
              className="text-yellow-600 hover:text-yellow-700 font-semibold p-0"
            />
          </Link>

          {/* Store Header Section */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8 mb-8">
            {/* Store Images Carousel */}
            <div className="lg:col-span-2">
              <div className="bg-white rounded-2xl shadow-xl overflow-hidden border-2 border-yellow-100">
                {store.images && store.images.length > 0 ? (
                  <Carousel
                    value={store.images.map((img, idx) => ({ id: idx, url: img }))}
                    numVisible={1}
                    numScroll={1}
                    itemTemplate={(item) => (
                      <div className="w-full h-96 sm:h-[500px]">
                        <img
                          src={item.url}
                          alt={`${store.storeName} image ${item.id + 1}`}
                          className="w-full h-full object-cover"
                          onError={(e: any) => {
                            e.target.src =
                              'https://images.unsplash.com/photo-1568605114967-8130f3a36994?w=800&h=600&fit=crop';
                          }}
                        />
                      </div>
                    )}
                    autoplayInterval={5000}
                    showIndicators
                    circular
                    style={{ height: '100%' }}
                  />
                ) : (
                  <div className="w-full h-96 sm:h-[500px] bg-gradient-to-br from-yellow-200 to-orange-200 flex items-center justify-center text-white text-6xl font-bold">
                    {store.storeName.charAt(0).toUpperCase()}
                  </div>
                )}
              </div>

              {/* Store Summary */}
              <div className="mt-4 bg-white rounded-2xl shadow-md border-2 border-yellow-100 p-4 sm:p-5">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div>
                    <div className="flex flex-wrap gap-3 mb-3">
                      {store.isVerify && (
                        <Chip
                          label="✓ Verified Store"
                          icon="pi pi-check-circle"
                          className="bg-green-100 text-green-700 font-bold text-sm"
                        />
                      )}
                      {storeIsOpenNow ? (
                        <Chip
                          label="🟢 Open Now"
                          className="bg-emerald-100 text-emerald-700 font-bold text-sm"
                        />
                      ) : (
                        <Chip
                          label="🔴 Closed Now"
                          className="bg-red-100 text-red-700 font-bold text-sm"
                        />
                      )}
                    </div>
                    <h2 className="text-xl sm:text-2xl font-bold text-gray-900">{store.storeName}</h2>
                    <p className="text-sm text-gray-600 mt-1">
                      {store.address.area}, {store.address.state}, {store.address.country}
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-3 sm:min-w-72">
                    <div className="rounded-xl bg-yellow-50 border border-yellow-200 px-4 py-3">
                      <p className="text-xs uppercase tracking-wide text-gray-500 font-semibold">Working Hours</p>
                      <p className="text-sm font-bold text-gray-900 mt-1">
                        {store.timing.open} - {store.timing.close}
                      </p>
                    </div>
                    <div className="rounded-xl bg-emerald-50 border border-emerald-200 px-4 py-3">
                      <p className="text-xs uppercase tracking-wide text-gray-500 font-semibold">Products</p>
                      <p className="text-sm font-bold text-gray-900 mt-1">{products.length} Items</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Store Info Card */}
            <div className="lg:col-span-1">
              <div className="bg-white rounded-2xl shadow-xl p-6 border-2 border-yellow-100 h-full">
                <h1 className="text-3xl font-bold text-gray-900 mb-1">{store.storeName}</h1>
                <p className="text-sm text-gray-500 mb-4">ID: {store.storeUniqueId}</p>

                {/* Owner Info */}
                <div className="mb-6 pb-6 border-b-2 border-gray-200">
                  <p className="text-sm font-semibold text-gray-600 mb-1">Owner</p>
                  <p className="text-lg font-bold text-gray-900">{store.userId.name}</p>
                  <p className="text-sm text-gray-600">{store.userId.email}</p>
                </div>

                {/* Address */}
                <div className="mb-6 pb-6 border-b-2 border-gray-200">
                  <p className="text-sm font-semibold text-gray-600 mb-2 flex items-center gap-2">
                    <i className="pi pi-map-marker text-yellow-600"></i> Location
                  </p>
                  <p className="text-gray-900 font-medium">{store.address.area}</p>
                  <p className="text-gray-600 text-sm">{store.address.state}, {store.address.country}</p>
                </div>

                {/* Store Timing */}
                <div className="mb-6 pb-6 border-b-2 border-gray-200">
                  <p className="text-sm font-semibold text-gray-600 mb-2 flex items-center gap-2">
                    <i className="pi pi-clock text-yellow-600"></i> Working Hours
                  </p>
                  <p className="text-gray-900 font-medium">
                    {store.timing.open} - {store.timing.close}
                  </p>
                </div>

                {/* Contact */}
                <div className="mb-6 pb-6 border-b-2 border-gray-200">
                  <p className="text-sm font-semibold text-gray-600 mb-3">Contact</p>
                  <div className="space-y-2">
                    <a
                      href={`tel:${store.contactNo}`}
                      className="flex items-center gap-3 text-yellow-600 hover:text-yellow-700 font-medium transition"
                    >
                      <i className="pi pi-phone"></i>
                      {store.contactNo}
                    </a>
                    <a
                      href={`https://wa.me/${store.whatsappNo}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-3 text-green-600 hover:text-green-700 font-medium transition"
                    >
                      <i className="pi pi-heart"></i>
                      WhatsApp
                    </a>
                    <a
                      href={`mailto:${store.email}`}
                      className="flex items-center gap-3 text-blue-600 hover:text-blue-700 font-medium transition"
                    >
                      <i className="pi pi-envelope"></i>
                      Email
                    </a>
                  </div>
                </div>

                {/* Description */}
                {store.description && (
                  <div className="mb-6">
                    <p className="text-sm font-semibold text-gray-600 mb-2">About Store</p>
                    <p className="text-gray-700 text-sm leading-relaxed">{store.description}</p>
                  </div>
                )}

                {/* Website */}
                {store.website && (
                  <a
                    href={store.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block w-full"
                  >
                    <Button
                      label="Visit Website"
                      icon="pi pi-external-link"
                      className="w-full"
                      text
                      style={{ color: '#ca8a04' }}
                    />
                  </a>
                )}
              </div>
            </div>
          </div>

          {/* Daily Timing (if available) */}
          {store.timingByDay && Object.keys(store.timingByDay).length > 0 && (
            <div className="mb-8 bg-white rounded-2xl shadow-md border-2 border-yellow-100 p-6">
              <h3 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                <i className="pi pi-calendar text-yellow-600"></i> Weekly Hours
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-7 gap-3">
                {daysOfWeek.map((day) => (
                  <div key={day} className="bg-gradient-to-br from-yellow-50 to-orange-50 rounded-lg p-3 border border-yellow-200">
                    <p className="text-xs font-bold text-gray-700 mb-1 uppercase">{day}</p>
                    <p className="text-sm font-semibold text-yellow-700">
                      {store.timingByDay?.[day.toLowerCase()] || store.timing.open + ' - ' + store.timing.close}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Products Section */}
          <div className="mb-12">
            <div className="mb-8">
              <h2 className="text-3xl font-bold text-gray-900 mb-2 flex items-center gap-2">
                <i className="pi pi-shopping-bag text-yellow-600"></i> Products ({products.length})
              </h2>
              <p className="text-gray-600">Browse through our exclusive collection</p>
            </div>

            {products.length === 0 ? (
              <div className="text-center py-16 bg-white rounded-2xl shadow-md border-2 border-gray-100">
                <i className="pi pi-inbox text-6xl text-gray-300 mb-4 block"></i>
                <h3 className="text-2xl font-bold text-gray-900 mb-2">No Products Yet</h3>
                <p className="text-gray-600">This store hasn't added any products yet. Check back soon!</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                {products.map((product) => (
                  <div
                    key={product._id}
                    className="group bg-white rounded-xl shadow-md hover:shadow-2xl transition-all duration-300 overflow-hidden border border-yellow-100 flex flex-col h-full hover:border-yellow-300"
                  >
                    {/* Product Image */}
                    <div className="relative w-full h-40 sm:h-44 overflow-hidden bg-gradient-to-br from-gray-100 to-gray-200 group-hover:scale-105 transition-transform duration-300">
                      {product.images && product.images.length > 0 ? (
                        <Carousel
                          value={product.images.map((img, idx) => ({ id: idx, url: img }))}
                          numVisible={1}
                          numScroll={1}
                          itemTemplate={(item) => (
                            <div className="w-full h-40 sm:h-44">
                              <img
                                src={item.url}
                                alt={`${product.name} image ${item.id + 1}`}
                                className="w-full h-full object-cover"
                                onError={(e: any) => {
                                  e.target.src =
                                    'https://images.unsplash.com/photo-1572635196237-14b3f281503f?w=400&h=300&fit=crop';
                                }}
                              />
                            </div>
                          )}
                          autoplayInterval={5000}
                          showIndicators
                          circular
                          style={{ height: '100%' }}
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-yellow-100 to-orange-100 text-yellow-600 font-bold text-3xl">
                          {product.name.charAt(0).toUpperCase()}
                        </div>
                      )}
                      {product.isVerified && (
                        <div className="absolute top-2 right-2 bg-green-500 text-white rounded-full p-1.5 shadow-lg z-10">
                          <i className="pi pi-check text-sm font-bold"></i>
                        </div>
                      )}
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-300"></div>
                    </div>

                    {/* Product Info */}
                    <div className="p-3 sm:p-4 flex flex-col gap-3 flex-1">
                      <div>
                        <h4 className="text-sm md:text-base font-bold text-gray-900 line-clamp-2">
                          {product.name}
                        </h4>
                        <p className="text-xs text-gray-600 line-clamp-2 mt-1">
                          {product.description}
                        </p>
                      </div>

                      {/* Price */}
                      <div className="flex items-center gap-2 py-2 border-t border-b border-gray-200">
                        <span className="text-lg md:text-xl font-bold text-yellow-600">
                          ₹{product.sellingPrice}
                        </span>
                        {product.isActive ? (
                          <span className="text-xs font-semibold bg-green-100 text-green-700 px-2 py-1 rounded-full ml-auto">
                            ✓ Available
                          </span>
                        ) : (
                          <span className="text-xs font-semibold bg-red-100 text-red-700 px-2 py-1 rounded-full ml-auto">
                            ✗ Unavailable
                          </span>
                        )}
                      </div>

                      {/* Action Button */}
                      <div className="flex items-center gap-2">
                        <Button
                          label="Add to Cart"
                          icon="pi pi-shopping-cart"
                          onClick={handleAddToCart}
                          className="flex-1 font-bold"
                          style={{
                            background: 'linear-gradient(120deg, #fbbf24, #f59e0b)',
                            border: 'none',
                            color: '#fff',
                          }}
                        />
                        <a
                          href={buildWhatsAppShareUrl(
                            store.whatsappNo || store.contactNo,
                            `Hi, I am interested in ${product.name} from ${store.storeName}.\n\nProduct Details:\n${product.description}\n\nPrice: ₹${product.sellingPrice}`
                          )}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center justify-center w-12 h-12 rounded-lg bg-green-500 text-white shadow-md hover:bg-green-600 transition-colors"
                          title="Share on WhatsApp"
                        >
                          <i className="pi pi-whatsapp text-xl"></i>
                        </a>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Footer */}
      <Footer />
    </div>
  );
}
