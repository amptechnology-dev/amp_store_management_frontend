"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import { GoogleLogin, CredentialResponse } from "@react-oauth/google";
import { Button } from "primereact/button";
import { Chip } from "primereact/chip";
import Link from "next/link";
import axiosInstance from "@/service/axios.service";
import { useAppDispatch } from "@/lib/store/hooks";
import { tokenSlice } from "@/lib/store/features/storeToken";
import Header from "../../components/Header";
import Footer from "../../components/Footer";

const AUTH_TOKEN_KEY = "login-token";
const AUTH_USER_KEY = "login-user";

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

interface AuthUser {
  id: string;
  name: string;
  email: string;
  role?: string;
  picture?: string;
}

const daysOfWeek = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];

const readStoredUser = (): AuthUser | null => {
  if (typeof window === "undefined") return null;
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

const parseStoreTimeToMinutes = (value: string) => {
  const normalized = value.trim().toUpperCase().replace(/\s+/g, "");
  const match = normalized.match(/^(\d{1,2})(?::(\d{2}))?(AM|PM)$/);
  if (!match) return null;
  let hours = Number(match[1]);
  const minutes = Number(match[2] || "0");
  const period = match[3];
  if (period === "AM") {
    hours = hours === 12 ? 0 : hours;
  } else {
    hours = hours === 12 ? 12 : hours + 12;
  }
  return hours * 60 + minutes;
};

const isStoreOpenNow = (openTime: string, closeTime: string) => {
  const openMinutes = parseStoreTimeToMinutes(openTime);
  const closeMinutes = parseStoreTimeToMinutes(closeTime);
  if (openMinutes === null || closeMinutes === null) return false;
  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  if (openMinutes === closeMinutes) return true;
  if (openMinutes < closeMinutes)
    return currentMinutes >= openMinutes && currentMinutes < closeMinutes;
  return currentMinutes >= openMinutes || currentMinutes < closeMinutes;
};

const buildWhatsAppShareUrl = (phoneNumber: string, message: string) => {
  const digitsOnly = phoneNumber.replace(/\D/g, "");
  const normalizedPhone = digitsOnly.startsWith("91")
    ? digitsOnly
    : `91${digitsOnly}`;
  return `https://wa.me/${normalizedPhone}?text=${encodeURIComponent(message)}`;
};

const getInitials = (name: string) =>
  name
    .split(" ")
    .filter(Boolean)
    .map((part) => part[0])
    .join("")
    .toUpperCase()
    .slice(0, 2) || "ST";

const getAverageRating = (reviews: any[]) => {
  if (!reviews || reviews.length === 0) return 0;
  const total = reviews.reduce(
    (sum, review) => sum + (Number(review?.rating) || 0),
    0,
  );
  return total / reviews.length;
};

const formatReviewDate = (value: string) =>
  new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(value));

const renderRatingStars = (rating: number, size = "text-sm") =>
  Array.from({ length: 5 }, (_, index) => (
    <i
      key={index}
      className={`pi pi-star-fill ${size} ${index < Math.round(rating) ? "text-amber-400" : "text-slate-200"}`}
    />
  ));

// ─── Image Grid Gallery ────────────────────────────────────────────────────────
interface ImageGalleryProps {
  images: string[];
  storeName: string;
}

const ImageGallery: React.FC<ImageGalleryProps> = ({ images, storeName }) => {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  const openLightbox = (index: number) => setLightboxIndex(index);
  const closeLightbox = () => setLightboxIndex(null);

  const goNext = useCallback(() => {
    if (lightboxIndex === null) return;
    setLightboxIndex((lightboxIndex + 1) % images.length);
  }, [lightboxIndex, images.length]);

  const goPrev = useCallback(() => {
    if (lightboxIndex === null) return;
    setLightboxIndex((lightboxIndex - 1 + images.length) % images.length);
  }, [lightboxIndex, images.length]);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeLightbox();
      if (e.key === "ArrowRight") goNext();
      if (e.key === "ArrowLeft") goPrev();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [goNext, goPrev]);

  if (!images || images.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-500 via-orange-500 to-rose-500 text-white">
        <div className="text-center">
          <div className="text-5xl font-black tracking-widest">
            {getInitials(storeName)}
          </div>
          <p className="mt-2 text-sm font-semibold uppercase tracking-widest text-white/70">
            No photos available
          </p>
        </div>
      </div>
    );
  }

  const visibleImages = images.slice(0, 5);
  const remainingCount = images.length - 5;

  return (
    <>
      {/* Grid Layout */}
      <div className="overflow-hidden rounded-2xl">
        {images.length === 1 ? (
          <div
            className="relative h-64 w-full cursor-pointer overflow-hidden sm:h-80 lg:h-96"
            onClick={() => openLightbox(0)}
          >
            <img
              src={images[0]}
              alt={storeName}
              className="h-full w-full object-cover transition duration-500 hover:scale-105"
              onError={(e: any) => {
                e.target.src =
                  "https://images.unsplash.com/photo-1568605114967-8130f3a36994?w=1200&h=800&fit=crop";
              }}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
            <div className="absolute bottom-3 right-3 flex items-center gap-1.5 rounded-full bg-black/60 px-3 py-1.5 text-xs font-semibold text-white backdrop-blur-sm">
              <i className="pi pi-images text-xs" /> See photo
            </div>
          </div>
        ) : images.length === 2 ? (
          <div className="grid h-64 grid-cols-2 gap-1 sm:h-80">
            {images.map((img, i) => (
              <div
                key={i}
                className="relative cursor-pointer overflow-hidden"
                onClick={() => openLightbox(i)}
              >
                <img
                  src={img}
                  alt={`${storeName} ${i + 1}`}
                  className="h-full w-full object-cover transition duration-500 hover:scale-105"
                  onError={(e: any) => {
                    e.target.src =
                      "https://images.unsplash.com/photo-1568605114967-8130f3a36994?w=600&h=400&fit=crop";
                  }}
                />
                <div className="absolute inset-0 bg-black/0 transition hover:bg-black/10" />
              </div>
            ))}
          </div>
        ) : (
          /* Mobile-first gallery: one hero image on phones, mosaic on md+ */
          <div className="grid h-64 grid-cols-1 gap-1 sm:h-80 md:grid-cols-2">
            {/* Main large image */}
            <div
              className="relative h-full cursor-pointer overflow-hidden rounded-2xl md:rounded-l-2xl md:rounded-r-none"
              onClick={() => openLightbox(0)}
            >
              <img
                src={visibleImages[0]}
                alt={`${storeName} 1`}
                className="h-full w-full object-cover transition duration-500 hover:scale-105"
                onError={(e: any) => {
                  e.target.src =
                    "https://images.unsplash.com/photo-1568605114967-8130f3a36994?w=800&h=600&fit=crop";
                }}
              />
              <div className="absolute inset-0 bg-black/0 transition hover:bg-black/10" />
              <div className="absolute bottom-3 left-3 rounded-full bg-black/60 px-3 py-1 text-xs font-semibold text-white backdrop-blur-sm">
                <i className="pi pi-images mr-1 text-xs" />
                {storeName}
              </div>
            </div>

            {/* Right grid — only render available images */}
            <div
              className={`hidden gap-1 md:grid ${
                visibleImages.slice(1).length === 1
                  ? "grid-cols-1 grid-rows-1"
                  : visibleImages.slice(1).length === 2
                    ? "grid-cols-1 grid-rows-2"
                    : "grid-cols-2 grid-rows-2"
              }`}
            >
              {visibleImages.slice(1).map((img, idx) => {
                const pos = idx + 1;
                const isLast =
                  idx === visibleImages.slice(1).length - 1 &&
                  remainingCount > 0;
                return (
                  <div
                    key={pos}
                    className={`relative cursor-pointer overflow-hidden ${
                      idx === 0 ? "rounded-tr-2xl" : ""
                    } ${
                      idx === visibleImages.slice(1).length - 1
                        ? "rounded-br-2xl"
                        : ""
                    }`}
                    onClick={() => openLightbox(pos)}
                  >
                    <img
                      src={img}
                      alt={`${storeName} ${pos + 1}`}
                      className="h-full w-full object-cover transition duration-500 hover:scale-105"
                      onError={(e: any) => {
                        e.target.src =
                          "https://images.unsplash.com/photo-1568605114967-8130f3a36994?w=400&h=300&fit=crop";
                      }}
                    />
                    {isLast ? (
                      <div className="absolute inset-0 flex cursor-pointer flex-col items-center justify-center bg-black/55 backdrop-blur-[2px] transition hover:bg-black/65">
                        <i className="pi pi-images text-2xl text-white" />
                        <p className="mt-1 text-sm font-bold text-white">
                          +{remainingCount + 1} photos
                        </p>
                      </div>
                    ) : (
                      <div className="absolute inset-0 bg-black/0 transition hover:bg-black/10" />
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* See all photos button */}
        {images.length > 1 && (
          <button
            onClick={() => openLightbox(0)}
            className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-amber-300 hover:bg-amber-50 hover:text-amber-700"
          >
            <i className="pi pi-images text-amber-500" />
            See all {images.length} photos
          </button>
        )}
      </div>

      {/* Lightbox */}
      {lightboxIndex !== null && (
        <div
          className="fixed inset-0 z-[999] flex items-center justify-center bg-black/95"
          onClick={closeLightbox}
        >
          <button
            className="absolute right-4 top-4 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-white/15 text-white backdrop-blur-sm transition hover:bg-white/25"
            onClick={closeLightbox}
          >
            <i className="pi pi-times text-lg" />
          </button>

          <div className="absolute left-1/2 top-4 z-10 -translate-x-1/2 rounded-full bg-black/50 px-4 py-1.5 text-sm font-semibold text-white backdrop-blur-sm">
            {lightboxIndex + 1} / {images.length}
          </div>

          {images.length > 1 && (
            <button
              className="absolute left-4 z-10 flex h-12 w-12 items-center justify-center rounded-full bg-white/15 text-white backdrop-blur-sm transition hover:bg-white/25"
              onClick={(e) => {
                e.stopPropagation();
                goPrev();
              }}
            >
              <i className="pi pi-chevron-left text-lg" />
            </button>
          )}

          <div
            className="mx-16 flex max-h-[85vh] max-w-5xl items-center justify-center"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={images[lightboxIndex]}
              alt={`${storeName} ${lightboxIndex + 1}`}
              className="max-h-[85vh] max-w-full rounded-xl object-contain shadow-2xl"
              onError={(e: any) => {
                e.target.src =
                  "https://images.unsplash.com/photo-1568605114967-8130f3a36994?w=1200&h=800&fit=crop";
              }}
            />
          </div>

          {images.length > 1 && (
            <button
              className="absolute right-4 z-10 flex h-12 w-12 items-center justify-center rounded-full bg-white/15 text-white backdrop-blur-sm transition hover:bg-white/25"
              onClick={(e) => {
                e.stopPropagation();
                goNext();
              }}
            >
              <i className="pi pi-chevron-right text-lg" />
            </button>
          )}

          {images.length > 1 && (
            <div className="absolute bottom-4 left-1/2 flex -translate-x-1/2 gap-2 overflow-x-auto px-4">
              {images.map((img, i) => (
                <button
                  key={i}
                  onClick={(e) => {
                    e.stopPropagation();
                    setLightboxIndex(i);
                  }}
                  className={`h-14 w-14 flex-shrink-0 overflow-hidden rounded-lg border-2 transition ${
                    i === lightboxIndex
                      ? "border-amber-400 opacity-100"
                      : "border-transparent opacity-50 hover:opacity-80"
                  }`}
                >
                  <img
                    src={img}
                    alt={`thumb ${i}`}
                    className="h-full w-full object-cover"
                    onError={(e: any) => {
                      e.target.src =
                        "https://images.unsplash.com/photo-1568605114967-8130f3a36994?w=100&h=100&fit=crop";
                    }}
                  />
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </>
  );
};

// ─── Product Card ──────────────────────────────────────────────────────────────
interface ProductCardProps {
  product: Product;
  storeWhatsapp: string;
  storeName: string;
  onAddToCart: () => void;
}

const ProductCard: React.FC<ProductCardProps> = ({
  product,
  storeWhatsapp,
  storeName,
  onAddToCart,
}) => {
  const [imageIndex, setImageIndex] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);

  const images =
    product.images && product.images.length > 0 ? product.images : [];

  return (
    <>
      <article className="group flex h-full min-w-0 flex-col overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-[0_16px_40px_rgba(15,23,42,0.12)]">
        {/* Image area */}
        <div className="relative h-40 overflow-hidden bg-gradient-to-br from-amber-50 to-orange-50 lg:h-44">
          {images.length > 0 ? (
            <>
              <img
                src={images[imageIndex]}
                alt={product.name}
                className="h-full w-full cursor-pointer object-cover transition duration-500 group-hover:scale-105"
                onClick={() => setLightboxOpen(true)}
                onError={(e: any) => {
                  e.target.src =
                    "https://images.unsplash.com/photo-1572635196237-14b3f281503f?w=600&h=400&fit=crop";
                }}
              />
              {images.length > 1 && (
                <div className="absolute bottom-2 left-1/2 flex -translate-x-1/2 gap-1">
                  {images.map((_, i) => (
                    <button
                      key={i}
                      onClick={() => setImageIndex(i)}
                      className={`h-1.5 rounded-full transition-all duration-200 ${
                        i === imageIndex ? "w-4 bg-white" : "w-1.5 bg-white/50"
                      }`}
                    />
                  ))}
                </div>
              )}
              {images.length > 1 && (
                <>
                  <button
                    onClick={() =>
                      setImageIndex(
                        (imageIndex - 1 + images.length) % images.length,
                      )
                    }
                    className="absolute left-2 top-1/2 -translate-y-1/2 flex h-7 w-7 items-center justify-center rounded-full bg-black/40 text-white opacity-0 backdrop-blur-sm transition group-hover:opacity-100 hover:bg-black/60"
                  >
                    <i className="pi pi-chevron-left text-xs" />
                  </button>
                  <button
                    onClick={() =>
                      setImageIndex((imageIndex + 1) % images.length)
                    }
                    className="absolute right-2 top-1/2 -translate-y-1/2 flex h-7 w-7 items-center justify-center rounded-full bg-black/40 text-white opacity-0 backdrop-blur-sm transition group-hover:opacity-100 hover:bg-black/60"
                  >
                    <i className="pi pi-chevron-right text-xs" />
                  </button>
                </>
              )}
            </>
          ) : (
            <div
              className="flex h-full items-center justify-center cursor-pointer"
              onClick={() => setLightboxOpen(true)}
            >
              <div className="text-5xl font-black text-amber-300">
                {product.name.charAt(0).toUpperCase()}
              </div>
            </div>
          )}

          <div className="absolute left-3 top-3 flex flex-col gap-1">
            {product.isVerified && (
              <span className="rounded-full bg-emerald-500 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white shadow">
                Verified
              </span>
            )}
            {!product.isActive && (
              <span className="rounded-full bg-slate-700 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white shadow">
                Unavailable
              </span>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="flex flex-1 flex-col justify-between gap-2 p-1">
          <div className="flex-1">
            <h4 className="line-clamp-1 text-sm font-bold text-slate-900">
              Name : {product.name}
            </h4>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="text-lg font-black text-amber-600">
                Price : ₹{product.sellingPrice.toLocaleString("en-IN")}
              </p>
            </div>
            {images.length > 1 && (
              <button
                onClick={() => setLightboxOpen(true)}
                className="flex items-center gap-1 rounded-lg bg-slate-50 px-2.5 py-1.5 text-xs font-semibold text-slate-500 transition hover:bg-slate-100"
              >
                <i className="pi pi-images text-xs" />
                {images.length} photos
              </button>
            )}
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <button
              onClick={onAddToCart}
              className="flex w-full flex-1 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 py-2 text-xs font-bold text-white shadow-sm transition hover:from-amber-600 hover:to-orange-600 hover:shadow-md active:scale-95 sm:w-auto sm:py-2.5 sm:text-sm"
            >
              <i className="pi pi-shopping-cart text-sm" />
              Add to Cart
            </button>
            <a
              href={buildWhatsAppShareUrl(
                storeWhatsapp,
                `Hi, I am interested in *${product.name}* from *${storeName}*.\n\n${product.description}\n\nPrice: ₹${product.sellingPrice}`,
              )}
              target="_blank"
              rel="noopener noreferrer"
              className="flex h-9 w-full items-center justify-center rounded-xl bg-emerald-500 text-white shadow-sm transition hover:bg-emerald-600 sm:h-10 sm:w-10"
              title="Enquire on WhatsApp"
            >
              <i className="pi pi-whatsapp text-base" />
            </a>
          </div>
        </div>
      </article>

      {/* Product image lightbox */}
      {lightboxOpen && images.length > 0 && (
        <div
          className="fixed inset-0 z-[999] flex items-center justify-center bg-black/95"
          onClick={() => setLightboxOpen(false)}
        >
          <button
            className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full bg-white/15 text-white transition hover:bg-white/25"
            onClick={() => setLightboxOpen(false)}
          >
            <i className="pi pi-times text-lg" />
          </button>
          <div className="absolute top-4 left-1/2 -translate-x-1/2 rounded-full bg-black/50 px-4 py-1.5 text-sm font-semibold text-white">
            {imageIndex + 1} / {images.length}
          </div>
          {images.length > 1 && (
            <button
              className="absolute left-4 flex h-12 w-12 items-center justify-center rounded-full bg-white/15 text-white transition hover:bg-white/25"
              onClick={(e) => {
                e.stopPropagation();
                setImageIndex((imageIndex - 1 + images.length) % images.length);
              }}
            >
              <i className="pi pi-chevron-left text-lg" />
            </button>
          )}
          <div
            className="mx-16 max-h-[85vh] max-w-3xl"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={images[imageIndex]}
              alt={product.name}
              className="max-h-[85vh] max-w-full rounded-xl object-contain shadow-2xl"
              onError={(e: any) => {
                e.target.src =
                  "https://images.unsplash.com/photo-1572635196237-14b3f281503f?w=800&h=600&fit=crop";
              }}
            />
          </div>
          {images.length > 1 && (
            <button
              className="absolute right-4 flex h-12 w-12 items-center justify-center rounded-full bg-white/15 text-white transition hover:bg-white/25"
              onClick={(e) => {
                e.stopPropagation();
                setImageIndex((imageIndex + 1) % images.length);
              }}
            >
              <i className="pi pi-chevron-right text-lg" />
            </button>
          )}
        </div>
      )}
    </>
  );
};

// ─── Main Component ────────────────────────────────────────────────────────────
export default function StoreDetails() {
  const params = useParams();
  const storeId = params?.storeid?.[0];
  const dispatch = useAppDispatch();

  const [store, setStore] = useState<Store | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [reviewComment, setReviewComment] = useState("");
  const [reviewRating, setReviewRating] = useState(0);
  const [reviewSubmitting, setReviewSubmitting] = useState(false);
  const [reviewSubmitError, setReviewSubmitError] = useState<string | null>(
    null,
  );
  const [reviewSubmitSuccess, setReviewSubmitSuccess] = useState<string | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reviewsError, setReviewsError] = useState<string | null>(null);
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<"products" | "reviews" | "hours">(
    "products",
  );
  const [adIndex, setAdIndex] = useState(0);
  const ads = ["Ad 1", "Ad 2", "Ad 3", "Ad 4"];

  const fetchReviews = async (currentStoreId: string) => {
    const reviewResponse = await axiosInstance.get(
      `/api/review/store-reviews/${currentStoreId}`,
    );
    setReviews(reviewResponse.data?.reviews || []);
  };

  const syncAuthState = async () => {
    if (typeof window === "undefined") return;
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

  const handleGoogleSuccess = async (response: CredentialResponse) => {
    const token = response.credential;
    if (!token) return;
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
    } catch (error) {
      console.error("Google login failed:", error);
    } finally {
      setGoogleLoading(false);
    }
  };

  useEffect(() => {
    setMounted(true);
    void syncAuthState();
    const handleAuthChanged = () => void syncAuthState();
    const handleStorage = (event: StorageEvent) => {
      if (event.key === AUTH_TOKEN_KEY || event.key === AUTH_USER_KEY)
        void syncAuthState();
    };
    window.addEventListener("auth-changed", handleAuthChanged);
    window.addEventListener("storage", handleStorage);
    return () => {
      window.removeEventListener("auth-changed", handleAuthChanged);
      window.removeEventListener("storage", handleStorage);
    };
  }, []);

  useEffect(() => {
    const fetchStoreDetails = async () => {
      if (!authReady || !authUser) {
        setLoading(false);
        return;
      }
      if (!storeId) {
        setError("Store not found");
        setLoading(false);
        return;
      }
      try {
        setLoading(true);
        setError(null);
        setReviewsError(null);
        const response = await axiosInstance.get(
          `/api/register/store-with-products/${storeId}`,
        );
        const data: StoreDetailsResponse = response.data;
        setStore(data.store);
        setProducts(data.products || []);
        try {
          await fetchReviews(storeId);
        } catch (reviewErr: any) {
          setReviews([]);
          setReviewsError("Customer comments are temporarily unavailable.");
        }
      } catch (err: any) {
        setError(
          err.response?.data?.message ||
            "Failed to load store details. Please try again later.",
        );
      } finally {
        setLoading(false);
      }
    };
    fetchStoreDetails();
  }, [storeId, authReady, authUser]);

  if (!mounted || !authReady) {
    return (
      <div className="flex min-h-screen flex-col bg-slate-50">
        <Header />
        <div className="flex flex-1 items-center justify-center">
          <div className="text-center">
            <i className="pi pi-spin pi-spinner mb-4 block text-5xl text-amber-500" />
            <p className="font-semibold text-slate-500">
              Checking sign-in status…
            </p>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  if (!authUser) {
    return (
      <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(251,191,36,0.16),_transparent_28%),linear-gradient(180deg,_#fffdf7_0%,_#ffffff_60%)] text-slate-900">
        <Header />
        <main className="relative flex min-h-[calc(100vh-80px)] items-center justify-center px-4 py-16">
          <div className="fixed inset-0 z-30 bg-slate-950/50 backdrop-blur-sm" />
          <div className="relative z-40 w-full max-w-md overflow-hidden rounded-3xl border border-white/80 bg-white p-8 shadow-2xl">
            <div className="text-center">
              <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-slate-950 text-white">
                <i className="pi pi-lock text-2xl" />
              </div>
              <p className="text-xs font-bold uppercase tracking-widest text-amber-600">
                Sign in required
              </p>
              <h1 className="mt-3 text-2xl font-black text-slate-950">
                View this store
              </h1>
              <p className="mt-2 text-sm leading-relaxed text-slate-500">
                Store details are private. Sign in with Google to continue.
              </p>
              <div className="mt-6 flex flex-col items-center gap-3">
                <GoogleLogin
                  onSuccess={handleGoogleSuccess}
                  onError={() => console.error("Google login failed")}
                  text="continue_with"
                  shape="pill"
                  theme="outline"
                  size="large"
                  width="300"
                />
                {googleLoading && (
                  <div className="flex items-center gap-2 text-sm font-semibold text-amber-700">
                    <i className="pi pi-spin pi-spinner" /> Signing in…
                  </div>
                )}
              </div>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex min-h-screen flex-col bg-slate-50">
        <Header />
        <div className="flex flex-1 items-center justify-center">
          <div className="text-center">
            <i className="pi pi-spin pi-spinner mb-4 block text-5xl text-amber-500" />
            <p className="font-semibold text-slate-500">
              Loading store details…
            </p>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  if (error || !store) {
    return (
      <div className="flex min-h-screen flex-col bg-slate-50">
        <Header />
        <div className="flex flex-1 items-center justify-center px-4">
          <div className="max-w-sm text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
              <i className="pi pi-exclamation-triangle text-3xl text-red-500" />
            </div>
            <h2 className="text-xl font-bold text-slate-900">
              Something went wrong
            </h2>
            <p className="mt-2 text-sm text-slate-500">
              {error || "Store not found"}
            </p>
            <Link href="/store" className="mt-5 inline-block">
              <Button
                label="Back to Stores"
                icon="pi pi-arrow-left"
                className="border-none bg-slate-900 font-semibold text-white"
              />
            </Link>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  const handleSubmitReview = async () => {
    if (!storeId) return;
    const trimmedComment = reviewComment.trim();
    if (!trimmedComment) {
      setReviewSubmitError("Please write a comment before submitting.");
      return;
    }
    if (reviewRating < 1 || reviewRating > 5) {
      setReviewSubmitError("Please choose a rating between 1 and 5.");
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
      setReviewComment("");
      setReviewRating(0);
      setReviewSubmitSuccess("Your review was posted successfully.");
    } catch (submitErr: any) {
      setReviewSubmitError(
        submitErr?.response?.data?.message ||
          "Failed to submit your review. Please try again.",
      );
    } finally {
      setReviewSubmitting(false);
    }
  };

  const storeIsOpenNow = isStoreOpenNow(store.timing.open, store.timing.close);
  const averageRating = getAverageRating(reviews);

  return (
    <div className="min-h-screen overflow-x-hidden bg-[#f8f9fa] text-slate-900">
      <Header />

      <main className="mx-auto w-full max-w-6xl overflow-x-hidden px-2 py-4 sm:px-6 sm:py-6 lg:px-8">
        {/* ============================================== */}
        {/* STORE INFO CARD - TOP */}
        {/* ============================================== */}
        <div className="mb-4 grid min-w-0 gap-3 lg:grid-cols-3 items-start">
          {/* Left: Store Images — self-start stops it from stretching */}
          <div className="lg:col-span-2 min-w-0 self-start overflow-hidden rounded-2xl bg-white shadow-sm">
            <ImageGallery images={store.images} storeName={store.storeName} />
          </div>

          {/* Right: Store Info — self-start so it doesn't create extra height */}
          <aside className="min-w-0 self-start rounded-2xl border border-slate-100 bg-gradient-to-br from-white to-slate-50 p-4 shadow-sm sm:p-5">
            <h1 className="text-xl font-black text-slate-900 mb-2">
              {store.storeName}
            </h1>

            {/* Rating Summary */}
            <div className="mb-3 pb-3 border-b border-slate-200">
              <div className="flex items-center gap-2 mb-1">
                <div className="flex gap-0.5">
                  {renderRatingStars(averageRating, "text-sm")}
                </div>
                <span className="text-sm font-semibold text-slate-700">
                  {averageRating.toFixed(1)} ({reviews.length})
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Based on customer reviews
              </p>
            </div>

            {/* Contact Info */}
            <div className="space-y-2 mb-3">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-500 mb-0.5">
                  Owner
                </p>
                <p className="text-sm font-semibold text-slate-900">
                  {store.userId.name}
                </p>
              </div>
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-500 mb-0.5">
                  Contact
                </p>
                <p className="text-sm font-semibold text-slate-900">
                  {store.contactNo}
                </p>
              </div>
              {store.email && (
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-500 mb-0.5">
                    Email
                  </p>
                  <a
                    href={`mailto:${store.email}`}
                    className="text-sm font-medium text-blue-600 hover:text-blue-700 underline break-all"
                  >
                    {store.email}
                  </a>
                </div>
              )}
            </div>

            {/* Status Badge */}
            <div className="mb-3 pb-3 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <span
                  className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${
                    storeIsOpenNow
                      ? "bg-emerald-100 text-emerald-700"
                      : "bg-slate-100 text-slate-600"
                  }`}
                >
                  <i
                    className={`pi ${storeIsOpenNow ? "pi-check-circle" : "pi-times-circle"}`}
                  />
                  {storeIsOpenNow ? "Open Now" : "Closed"}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-1.5">
                {store.timing.open} - {store.timing.close}
              </p>
            </div>

            {/* CTA Button */}
            {store.website && (
              <a
                href={store.website}
                target="_blank"
                rel="noopener noreferrer"
                className="block w-full rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 py-2.5 text-center text-sm font-bold text-white shadow-md transition hover:from-amber-600 hover:to-orange-600 hover:shadow-lg"
              >
                Visit Website
              </a>
            )}
          </aside>
        </div>

        {/* ============================================== */}
        {/* MAIN CONTENT GRID */}
        {/* ============================================== */}
        <div className="grid min-w-0 gap-3 lg:grid-cols-3">
          {/* Left Section - Products & Ads */}
          <div className="min-w-0 lg:col-span-2 space-y-4">
            {/* PRODUCTS */}
            <div className="min-w-0 rounded-2xl bg-white p-4 shadow-sm border border-slate-100">
              <div className="mb-4 flex items-center justify-between border-b border-slate-200 pb-3">
                <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <i className="pi pi-shopping-bag text-amber-500" />
                  Products
                  <span className="text-sm font-normal text-slate-500">
                    ({products.length})
                  </span>
                </h2>
              </div>

              {products.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <i className="pi pi-inbox text-5xl text-slate-200 mb-3" />
                  <p className="text-sm text-slate-400">
                    No products available yet
                  </p>
                </div>
              ) : (
                <div className="grid min-w-0 grid-cols-2 gap-4 lg:grid-cols-2 xl:grid-cols-3">
                  {products.map((product) => (
                    <ProductCard
                      key={product._id}
                      product={product}
                      storeWhatsapp={store.whatsappNo || store.contactNo}
                      storeName={store.storeName}
                      onAddToCart={() => {}}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* ADS SECTION */}
            <div className="rounded-2xl bg-white p-4 shadow-sm border border-slate-100">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <i className="pi pi-megaphone text-amber-500" />
                  Featured Ads
                </h2>
                <div className="flex gap-2">
                  <button
                    onClick={() =>
                      setAdIndex((prev) => (prev - 1 + ads.length) % ads.length)
                    }
                    className="rounded-full bg-slate-100 p-2 text-slate-700 hover:bg-slate-200"
                    aria-label="Prev ad"
                  >
                    <i className="pi pi-chevron-left" />
                  </button>
                  <button
                    onClick={() =>
                      setAdIndex((prev) => (prev + 1) % ads.length)
                    }
                    className="rounded-full bg-slate-100 p-2 text-slate-700 hover:bg-slate-200"
                    aria-label="Next ad"
                  >
                    <i className="pi pi-chevron-right" />
                  </button>
                </div>
              </div>
              <div className="relative overflow-hidden">
                <div
                  className="flex transition-transform duration-300"
                  style={{ transform: `translateX(-${adIndex * 100}%)` }}
                >
                  {ads.map((ad, i) => (
                    <div
                      key={i}
                      className="w-full flex-shrink-0 rounded-xl bg-gradient-to-br from-amber-50 via-orange-50 to-rose-50 p-6 border border-amber-100 text-center"
                    >
                      <div className="text-2xl font-black text-amber-600 mb-2">
                        {ad}
                      </div>
                      <p className="text-xs text-slate-500">
                        Promotional content
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Right Section - Reviews */}
          <div className="min-w-0 rounded-2xl bg-white p-4 shadow-sm border border-slate-100 lg:sticky lg:top-24 h-fit">
            <div className="mb-4 flex items-center justify-between border-b border-slate-200 pb-3">
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <i className="pi pi-comments text-amber-500" />
                Reviews
              </h2>
              <span className="text-sm font-semibold px-2.5 py-1 rounded-full bg-amber-100 text-amber-700">
                {reviews.length}
              </span>
            </div>

            {reviews.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8">
                <i className="pi pi-star text-4xl text-slate-200 mb-2" />
                <p className="text-sm text-slate-400 text-center">
                  No reviews yet. Be the first to review!
                </p>
              </div>
            ) : (
              <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2">
                {reviews.map((review) => (
                  <div
                    key={review._id}
                    className="rounded-xl border border-slate-200 bg-slate-50 p-4 hover:border-amber-200 hover:bg-amber-50 transition"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <p className="text-sm font-bold text-slate-900">
                        {review.userId.name}
                      </p>
                      <div className="flex gap-0.5">
                        {renderRatingStars(review.rating, "text-xs")}
                      </div>
                    </div>
                    <p className="text-xs text-slate-500 mb-2">
                      {formatReviewDate(review.createdAt)}
                    </p>
                    <p className="text-sm text-slate-700 leading-relaxed">
                      {review.comment}
                    </p>
                  </div>
                ))}
              </div>
            )}

            {/* Add Review Form */}
            {authUser && (
              <div className="mt-6 pt-6 border-t border-slate-200">
                <p className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-3">
                  Share your feedback
                </p>
                <div className="mb-3 flex gap-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      onClick={() => setReviewRating(star)}
                      className="text-lg transition"
                    >
                      <i
                        className={`pi pi-star-fill ${
                          star <= reviewRating
                            ? "text-amber-400"
                            : "text-slate-200"
                        }`}
                      />
                    </button>
                  ))}
                </div>
                <textarea
                  value={reviewComment}
                  onChange={(e) => setReviewComment(e.target.value)}
                  placeholder="Share your experience..."
                  className="w-full rounded-lg border border-slate-300 p-3 text-sm resize-none focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
                  rows={3}
                />
                {reviewSubmitError && (
                  <p className="mt-2 text-xs text-red-600 font-semibold">
                    {reviewSubmitError}
                  </p>
                )}
                {reviewSubmitSuccess && (
                  <p className="mt-2 text-xs text-emerald-600 font-semibold">
                    {reviewSubmitSuccess}
                  </p>
                )}
                <button
                  onClick={handleSubmitReview}
                  disabled={reviewSubmitting}
                  className="mt-3 w-full rounded-lg bg-gradient-to-r from-amber-500 to-orange-500 py-2.5 font-bold text-white shadow-md transition hover:from-amber-600 hover:to-orange-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {reviewSubmitting && (
                    <i className="pi pi-spin pi-spinner text-sm" />
                  )}
                  {reviewSubmitting ? "Posting..." : "Post Review"}
                </button>
              </div>
            )}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
