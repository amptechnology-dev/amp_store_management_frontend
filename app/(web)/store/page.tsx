"use client";

import React, {
  useEffect,
  useMemo,
  useState,
  useCallback,
  useRef,
} from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import axiosInstance from "@/service/axios.service";
import VortexLoader from "@/app/(web)/components/VortexLoader";
import { ChevronLeft, ChevronRight, Grid3X3 } from "lucide-react";

const Header = dynamic(() => import("../components/Header"), { ssr: false });
const Footer = dynamic(() => import("../components/Footer"), { ssr: false });

// ─── Types ────────────────────────────────────────────────────────────────────

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
  userId: { _id: string; name: string; email: string; phone: string };
  address: { area: string; state: string; country: string };
  timing: { open: string; close: string };
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
  | "all"
  | "featured"
  | "topViewed"
  | "topRated"
  | "gst"
  | "random";

// ─── Static Data ──────────────────────────────────────────────────────────────

const CATEGORY_ICONS = [
  {
    label: "Restaurants",
    icon: "https://cdn-icons-png.flaticon.com/64/3075/3075977.png",
  },
  {
    label: "Hotels",
    icon: "https://cdn-icons-png.flaticon.com/64/2933/2933824.png",
  },
  {
    label: "Beauty Spa",
    icon: "https://cdn-icons-png.flaticon.com/64/3081/3081840.png",
  },
  {
    label: "Home Decor",
    icon: "https://cdn-icons-png.flaticon.com/64/1670/1670088.png",
  },
  {
    label: "Wedding Planning",
    icon: "https://cdn-icons-png.flaticon.com/64/2961/2961948.png",
  },
  {
    label: "Education",
    icon: "https://cdn-icons-png.flaticon.com/64/3976/3976625.png",
  },
  {
    label: "Rent & Hire",
    icon: "https://cdn-icons-png.flaticon.com/64/619/619153.png",
  },
  {
    label: "Hospitals",
    icon: "https://cdn-icons-png.flaticon.com/64/2382/2382461.png",
  },
  {
    label: "Contractors",
    icon: "https://cdn-icons-png.flaticon.com/64/1048/1048945.png",
  },
  {
    label: "Pet Shops",
    icon: "https://cdn-icons-png.flaticon.com/64/2138/2138508.png",
  },
  {
    label: "Groceries",
    icon: "https://cdn-icons-png.flaticon.com/64/1261/1261163.png",
  },
  {
    label: "Electronics",
    icon: "https://cdn-icons-png.flaticon.com/64/2586/2586488.png",
  },
];

const HERO_SLIDES = [
  {
    id: 1,
    image: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=800&h=400&fit=crop",
    overlayColor: "linear-gradient(90deg, rgba(245,230,200,0.92) 45%, rgba(245,230,200,0.3) 100%)",
    headline: "Get Loan Against\nProperty",
    subtext: "At a competitive interest rate starting from ",
    highlight: "9.00%",
    subtext2: " from AMP Credit",
    cta: "Apply Now →",
    brand: "AMP Finance",
  },
  {
    id: 2,
    image: "https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=800&h=400&fit=crop",
    overlayColor: "linear-gradient(90deg, rgba(30,30,60,0.88) 45%, rgba(30,30,60,0.3) 100%)",
    headline: "Find the Best\nDeals Near You",
    subtext: "Discover top-rated stores and ",
    highlight: "exclusive offers",
    subtext2: " in your area",
    cta: "Explore Now →",
    brand: "AMP Shopping",
  },
];

const SERVICE_CARDS = [
  {
    id: 1,
    label: "B2B",
    sub: "Quick Quotes",
    bg: "linear-gradient(135deg, #2563eb, #1d4ed8)",
    image: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&h=230&fit=crop&crop=top",
  },
  {
    id: 2,
    label: "REPAIRS & SERVICES",
    sub: "Get Nearest Vendor",
    bg: "linear-gradient(135deg, #7c3aed, #6d28d9)",
    image: "https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=200&h=230&fit=crop&crop=top",
  },
  {
    id: 3,
    label: "REAL ESTATE",
    sub: "Finest Agents",
    bg: "linear-gradient(135deg, #7c3aed, #4f46e5)",
    image: "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=200&h=230&fit=crop&crop=top",
  },
  {
    id: 4,
    label: "DOCTORS",
    sub: "Book Now",
    bg: "linear-gradient(135deg, #059669, #047857)",
    image: "https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=200&h=230&fit=crop&crop=top",
  },
];

const FEED_MODES: Array<{ key: FeedMode; label: string; icon: string }> = [
  { key: "all", label: "All Stores", icon: "pi-th-large" },
  { key: "featured", label: "Featured", icon: "pi-star-fill" },
  { key: "topViewed", label: "Top Viewed", icon: "pi-eye" },
  { key: "topRated", label: "Top Rated", icon: "pi-thumbs-up" },
  { key: "gst", label: "GST Verified", icon: "pi-id-card" },
  { key: "random", label: "Random", icon: "pi-refresh" },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fallbackImage = "https://images.unsplash.com/photo-1568605114967-8130f3a36994?w=800&h=400&fit=crop";
const normalizeText = (v: unknown) =>
  String(v ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "")
    .trim();
const titleCase = (v: string) =>
  v
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());
const STATE_ALIASES: Record<string, string> = { westbengal: "West Bengal" };
const canonicalizeState = (v?: string) => {
  const t = v?.trim();
  if (!t) return "";
  const n = normalizeText(t);
  return STATE_ALIASES[n] || titleCase(t);
};
const parseTimeToMin = (v: string) => {
  const n = v.trim().toUpperCase().replace(/\s+/g, "");
  const m = n.match(/^(\d{1,2})(?::(\d{2}))?(AM|PM)$/);
  if (!m) return null;
  let h = Number(m[1]);
  const min = Number(m[2] || "0");
  if (m[3] === "AM") h = h === 12 ? 0 : h;
  else h = h === 12 ? 12 : h + 12;
  return h * 60 + min;
};
const isOpenNow = (open: string, close: string) => {
  const o = parseTimeToMin(open);
  const c = parseTimeToMin(close);
  if (o === null || c === null) return false;
  const now = new Date().getHours() * 60 + new Date().getMinutes();
  if (o === c) return true;
  return o < c ? now >= o && now < c : now >= o || now < c;
};
const toNum = (v: unknown, fb = 0) => {
  const p = typeof v === "number" ? v : Number(v);
  return Number.isFinite(p) ? p : fb;
};
const toTs = (v?: string) => {
  if (!v) return 0;
  const t = new Date(v).getTime();
  return Number.isFinite(t) ? t : 0;
};
const avgRating = (s: Store) => {
  const r = s.reviews || [];
  if (!r.length) return 0;
  return r.reduce((sum, rv) => sum + (Number(rv.rating) || 0), 0) / r.length;
};
const reviewCount = (s: Store) => s.reviews?.length || 0;
const hasGst = (s: Store) => Boolean(s.gstin?.trim());
const discoveryScore = (s: Store) => {
  const age = Math.max(0, (Date.now() - toTs(s.createdAt)) / 86400000);
  return (
    (s.isFeatured ? 70 : 0) +
    (s.isVerify ? 60 : 0) +
    (hasGst(s) ? 12 : 0) +
    (s.isActive ? 8 : 0) +
    avgRating(s) * 15 +
    Math.min(reviewCount(s), 20) * 2 +
    Math.max(0, 80 - age)
  );
};

const initials = (name: string) =>
  name
    .split(" ")
    .filter(Boolean)
    .map((p) => p[0])
    .join("")
    .toUpperCase()
    .slice(0, 2) || "ST";
const GRADIENTS = [
  "from-rose-500 to-orange-500",
  "from-sky-500 to-cyan-500",
  "from-emerald-500 to-teal-500",
  "from-violet-500 to-fuchsia-500",
  "from-amber-500 to-yellow-500",
  "from-indigo-500 to-blue-500",
];
const storeGradient = (name: string) =>
  GRADIENTS[Math.abs(name.charCodeAt(0)) % GRADIENTS.length];
const renderStars = (rating: number) =>
  Array.from({ length: 5 }, (_, i) => (
    <i
      key={i}
      className={`pi ${i < Math.round(rating) ? "pi-star-fill text-amber-400" : "pi-star text-slate-300"} text-[11px]`}
    />
  ));

// ─── HeroBanner ───────────────────────────────────────────────────────────────

function HeroBanner() {
  const [current, setCurrent] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const startTimer = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setCurrent((p) => (p + 1) % HERO_SLIDES.length);
    }, 4500);
  }, []);

  useEffect(() => {
    startTimer();
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [startTimer]);

  const go = (idx: number) => { setCurrent(idx); startTimer(); };
  const prev = () => { setCurrent((p) => (p - 1 + HERO_SLIDES.length) % HERO_SLIDES.length); startTimer(); };
  const next = () => { setCurrent((p) => (p + 1) % HERO_SLIDES.length); startTimer(); };
  const slide = HERO_SLIDES[current];

  return (
    <div className="flex gap-3">
      {/* LEFT: Wide Slider */}
      <div
        className="relative flex-1 min-w-0 overflow-hidden rounded-2xl"
        style={{ height: 230 }}
      >
        {HERO_SLIDES.map((s, idx) => (
          <div
            key={s.id}
            className="absolute inset-0 transition-opacity duration-700"
            style={{ opacity: idx === current ? 1 : 0, zIndex: idx === current ? 1 : 0 }}
          >
            <img
              src={s.image}
              alt=""
              className="absolute right-0 top-0 h-full w-auto object-cover object-top"
              onError={(e: any) => { e.target.src = fallbackImage; }}
            />
            <div className="absolute inset-0" style={{ background: s.overlayColor }} />
          </div>
        ))}

        {/* Text content */}
        <div className="absolute inset-0 z-10 flex flex-col justify-center p-6 max-w-[55%]">
          <h2 className="text-xl font-black leading-tight text-slate-900 sm:text-2xl"
            style={{ whiteSpace: "pre-line" }}>
            {slide.headline}
          </h2>
          <p className="mt-2 text-xs text-slate-600 leading-relaxed">
            {slide.subtext}
            <span className="font-black text-amber-600">{slide.highlight}</span>
            {slide.subtext2}
          </p>
          <button className="mt-4 w-fit rounded-lg bg-amber-600 px-5 py-2 text-sm font-bold text-white transition hover:bg-amber-700 shadow-md">
            {slide.cta}
          </button>
          <p className="mt-2 text-[10px] font-semibold text-slate-400 uppercase tracking-widest">
            {slide.brand}
          </p>
        </div>

        {/* Dots */}
        <div className="absolute bottom-3 left-6 z-10 flex gap-1.5">
          {HERO_SLIDES.map((_, idx) => (
            <button
              key={idx}
              onClick={() => go(idx)}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                idx === current ? "w-5 bg-amber-600" : "w-1.5 bg-slate-400/50"
              }`}
            />
          ))}
        </div>

        {/* Arrows */}
        <button
          onClick={prev}
          className="absolute left-2 top-1/2 z-20 -translate-y-1/2 flex h-7 w-7 items-center justify-center rounded-full bg-black/20 text-white hover:bg-black/40 transition"
        >
          <i className="pi pi-chevron-left text-xs" />
        </button>
        <button
          onClick={next}
          className="absolute right-2 top-1/2 z-20 -translate-y-1/2 flex h-7 w-7 items-center justify-center rounded-full bg-black/20 text-white hover:bg-black/40 transition"
        >
          <i className="pi pi-chevron-right text-xs" />
        </button>
      </div>

      {/* RIGHT: 4 Service Cards */}
      <div
        className="hidden sm:grid grid-cols-2 gap-2 shrink-0"
        style={{ width: "43%", height: 230 }}
      >
        {SERVICE_CARDS.map((card) => (
          <div
            key={card.id}
            className="relative overflow-hidden rounded-xl cursor-pointer group"
            style={{ background: card.bg }}
          >
            <img
              src={card.image}
              alt={card.label}
              className="absolute bottom-0 right-0 h-full w-auto object-cover object-top opacity-70 group-hover:opacity-90 transition-opacity"
              onError={(e: any) => { e.target.style.display = "none"; }}
            />
            {/* Dark gradient so text is readable */}
            <div className="absolute inset-0 bg-gradient-to-r from-black/40 to-transparent" />

            <div className="relative z-10 p-3">
              <p className="text-[10px] font-semibold text-white/75 leading-tight uppercase tracking-wide">
                {card.sub}
              </p>
              <h3 className="mt-0.5 text-sm font-black leading-tight text-white">
                {card.label}
              </h3>
            </div>

            <div className="absolute bottom-3 left-3 z-10 flex h-6 w-6 items-center justify-center rounded-full bg-white/25 text-white group-hover:bg-white/40 transition">
              <i className="pi pi-chevron-right text-[10px]" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── CategoryGrid (Just Dial icon boxes) ──────────────────────────────────────

function CategoryGrid({
  activeTab,
  onTabChange,
}: {
  activeTab: string;
  onTabChange: (label: string) => void;
}) {
  const [showAll, setShowAll] = useState(false);
  const sliderRef = useRef<HTMLDivElement>(null);

  const scroll = (direction: "left" | "right") => {
    if (!sliderRef.current) return;

    sliderRef.current.scrollBy({
      left: direction === "left" ? -300 : 300,
      behavior: "smooth",
    });
  };

  const renderCategoryButton = (
    label: string,
    icon?: string,
    isAll?: boolean,
  ) => (
    <button
      key={label}
      onClick={() =>
        onTabChange(isAll ? "all" : activeTab === label ? "all" : label)
      }
      className={`flex shrink-0 flex-col items-center gap-2 rounded-xl border px-3 py-3 transition hover:border-orange-400 hover:shadow-sm ${
        activeTab === label || (isAll && activeTab === "all")
          ? "border-orange-400 bg-orange-50"
          : "border-slate-200 bg-white"
      }`}
      style={{ minWidth: 90 }}
    >
      {isAll ? (
        <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-slate-100 text-2xl">
          🏠
        </div>
      ) : (
        <img
          src={icon}
          alt={label}
          className="h-11 w-11 object-contain"
          onError={(e: any) => {
            e.target.style.display = "none";
          }}
        />
      )}

      <span className="text-center text-[11px] font-semibold leading-tight text-slate-700">
        {label}
      </span>
    </button>
  );

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => setShowAll(!showAll)}
          className="flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-2 text-xs font-medium hover:bg-slate-50"
        >
          <Grid3X3 size={14} />
          {showAll ? "Slider View" : "Show All"}
        </button>
      </div>

      {/* Grid View */}
      {showAll ? (
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8">
          {renderCategoryButton("all", undefined, true)}

          {CATEGORY_ICONS.map((cat) =>
            renderCategoryButton(cat.label, cat.icon),
          )}
        </div>
      ) : (
        <div className="relative">
          {/* Left Arrow */}
          <button
            onClick={() => scroll("left")}
            className="absolute left-0 top-1/2 z-10 -translate-y-1/2 rounded-full bg-white p-2 shadow-md border border-slate-200"
          >
            <ChevronLeft size={18} />
          </button>

          {/* Slider */}
          <div
            ref={sliderRef}
            className="flex gap-3 overflow-x-hidden scroll-smooth px-10"
          >
            {renderCategoryButton("all", undefined, true)}

            {CATEGORY_ICONS.map((cat) =>
              renderCategoryButton(cat.label, cat.icon),
            )}
          </div>

          {/* Right Arrow */}
          <button
            onClick={() => scroll("right")}
            className="absolute right-0 top-1/2 z-10 -translate-y-1/2 rounded-full bg-white p-2 shadow-md border border-slate-200"
          >
            <ChevronRight size={18} />
          </button>
        </div>
      )}
    </div>
  );
}

// ─── StoreCard ────────────────────────────────────────────────────────────────

function StoreCard({ store }: { store: Store }) {
  const rating = avgRating(store);
  const reviews = reviewCount(store);
  const views = toNum(store.viewCount);
  const open =
    store.isActive &&
    isOpenNow(store.timing?.open || "", store.timing?.close || "");
  const owner = store.userId?.name || "—";
  const location = [store.address?.area, store.address?.state]
    .filter(Boolean)
    .join(", ");

  return (
    <article className="group flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md">
      <div className="relative aspect-[16/10] overflow-hidden bg-slate-100">
        {store.images?.length > 0 ? (
          <img
            src={store.images[0]}
            alt={store.storeName}
            className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
            onError={(e: any) => {
              e.target.src = fallbackImage;
            }}
          />
        ) : (
          <div
            className={`flex h-full items-center justify-center bg-gradient-to-br ${storeGradient(store.storeName)} text-white`}
          >
            <div className="text-center">
              <div className="text-3xl font-black tracking-widest">
                {initials(store.storeName)}
              </div>
              <div className="mt-1 text-[10px] uppercase tracking-widest text-white/70">
                Store
              </div>
            </div>
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
        <div className="absolute left-3 top-3 flex flex-wrap gap-1.5">
          {store.isFeatured && (
            <span className="rounded-full bg-amber-400 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-900">
              Featured
            </span>
          )}
          {hasGst(store) && (
            <span className="rounded-full bg-emerald-500 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
              GST ✓
            </span>
          )}
        </div>
        <div
          className={`absolute bottom-3 left-3 flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase ${
            open ? "bg-emerald-500 text-white" : "bg-slate-700 text-slate-300"
          }`}
        >
          <span
            className={`h-1.5 w-1.5 rounded-full ${open ? "bg-white" : "bg-slate-400"}`}
          />
          {open ? "Open" : "Closed"}
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-3 p-4">
        <div>
          <h4 className="line-clamp-1 text-[1.05rem] font-bold leading-snug text-slate-900">
            {store.storeName}
          </h4>
        </div>
        <div className="flex items-center gap-3 text-xs font-semibold text-slate-600">
          <span className="flex items-center gap-1">
            {renderStars(rating)}
            <span className="ml-1 text-slate-700">
              {reviews > 0 ? `${rating.toFixed(1)} (${reviews})` : "No reviews"}
            </span>
          </span>
          <span className="text-slate-400">·</span>
          <span className="flex items-center gap-1">
            <i className="pi pi-eye text-slate-400" />
            {views}
          </span>
        </div>
        <div className="mt-auto flex items-center justify-between border-t border-slate-100 pt-3">
          <p
            className="min-w-0 truncate text-xs text-slate-500"
            title={location}
          >
            📍 {location || "Location not set"}
          </p>
          <Link href={`/store/${store._id}`} className="shrink-0">
            <button className="rounded-full bg-blue-600 px-3.5 py-1.5 text-xs font-semibold text-white transition hover:bg-blue-700">
              View →
            </button>
          </Link>
        </div>
      </div>
    </article>
  );
}

function SkeletonCard() {
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="h-44 animate-pulse bg-slate-100" />
      <div className="space-y-3 p-4">
        <div className="h-3 w-1/3 animate-pulse rounded-full bg-slate-100" />
        <div className="h-4 w-3/4 animate-pulse rounded-full bg-slate-100" />
        <div className="h-3 w-1/2 animate-pulse rounded-full bg-slate-100" />
        <div className="h-10 animate-pulse rounded-xl bg-slate-100" />
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

const INITIAL_SIZE = 12;
const LOAD_STEP = 12;

export default function Home() {
  const [search, setSearch] = useState("");
  const [location, setLocation] = useState("");
  const [activeFeed, setActiveFeed] = useState<FeedMode>("all");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedState, setSelectedState] = useState("all");
  const [selectedArea, setSelectedArea] = useState("all");
  const [allStores, setAllStores] = useState<Store[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [visibleCount, setVisibleCount] = useState(INITIAL_SIZE);
  const [activeCategoryTab, setActiveCategoryTab] = useState("all");

  // fetch
  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const res = await axiosInstance.get("/api/register/public-all-stores");
        setAllStores(res.data.stores || []);
      } catch {
        setError("Failed to load stores. Please try again.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  useEffect(() => {
    setVisibleCount(INITIAL_SIZE);
  }, [
    search,
    location,
    activeFeed,
    selectedCategory,
    selectedState,
    selectedArea,
    activeCategoryTab,
  ]);

  const uniqueCategories = useMemo(
    () =>
      Array.from(
        new Set(allStores.map((s) => s.storeType?.trim()).filter(Boolean)),
      ).sort(),
    [allStores],
  );

  const uniqueStates = useMemo(() => {
    const map = new Map<string, string>();
    allStores.forEach((s) => {
      const label = canonicalizeState(s.address?.state);
      if (!label) return;
      const key = normalizeText(label);
      if (!map.has(key)) map.set(key, label);
    });
    return Array.from(map.values()).sort((a, b) => a.localeCompare(b));
  }, [allStores]);

  const uniqueAreas = useMemo(() => {
    const scoped =
      selectedState === "all"
        ? allStores
        : allStores.filter(
            (s) =>
              normalizeText(canonicalizeState(s.address?.state)) ===
              normalizeText(selectedState),
          );
    const map = new Map<string, string>();
    scoped.forEach((s) => {
      const area = s.address?.area?.trim();
      if (!area) return;
      const key = normalizeText(area);
      if (!map.has(key)) map.set(key, area);
    });
    return Array.from(map.values()).sort((a, b) => a.localeCompare(b));
  }, [allStores, selectedState]);

  useEffect(() => {
    setSelectedArea("all");
  }, [selectedState]);

  const visibleStores = useMemo(() => {
    const q = normalizeText(search);
    const catKey = normalizeText(selectedCategory);
    const stateKey =
      selectedState === "all" ? "" : normalizeText(selectedState);
    const areaKey = selectedArea === "all" ? "" : normalizeText(selectedArea);
    const tabKey =
      activeCategoryTab === "all" ? "" : normalizeText(activeCategoryTab);

    const locationKey = normalizeText(location);
    let stores = allStores.filter((s) => {
      const searchable = normalizeText(
        [
          s.storeName,
          s.storeType,
          s.address?.area,
          s.address?.state,
          s.description,
          s.userId?.name,
        ]
          .filter(Boolean)
          .join(" "),
      );
      if (q && !searchable.includes(q)) return false;
      if (locationKey) {
        const locationSearch = normalizeText(
          [s.address?.area, s.address?.state, s.storeType]
            .filter(Boolean)
            .join(" "),
        );
        if (!locationSearch.includes(locationKey)) return false;
      }
      if (selectedCategory !== "all" && normalizeText(s.storeType) !== catKey)
        return false;
      if (
        stateKey &&
        normalizeText(canonicalizeState(s.address?.state)) !== stateKey
      )
        return false;
      if (areaKey && normalizeText(s.address?.area) !== areaKey) return false;
      if (tabKey && normalizeText(s.storeType) !== tabKey) return false;
      return true;
    });

    switch (activeFeed) {
      case "featured":
        return stores
          .filter((s) => s.isFeatured)
          .sort((a, b) => discoveryScore(b) - discoveryScore(a));
      case "topViewed":
        return stores.sort((a, b) => toNum(b.viewCount) - toNum(a.viewCount));
      case "topRated":
        return stores
          .filter((s) => avgRating(s) > 0)
          .sort(
            (a, b) =>
              avgRating(b) - avgRating(a) || reviewCount(b) - reviewCount(a),
          );
      case "gst":
        return stores
          .filter(hasGst)
          .sort((a, b) => discoveryScore(b) - discoveryScore(a));
      case "random":
        return [...stores].sort(() => Math.random() - 0.5);
      default:
        return stores.sort((a, b) => discoveryScore(b) - discoveryScore(a));
    }
  }, [
    allStores,
    search,
    activeFeed,
    selectedCategory,
    selectedState,
    selectedArea,
    activeCategoryTab,
  ]);

  const pagedStores = useMemo(
    () => visibleStores.slice(0, visibleCount),
    [visibleStores, visibleCount],
  );
  const canLoadMore = visibleStores.length > visibleCount;
  const hasFilters = !!(
    search.trim() ||
    location.trim() ||
    activeFeed !== "all" ||
    selectedCategory !== "all" ||
    selectedState !== "all" ||
    selectedArea !== "all" ||
    activeCategoryTab !== "all"
  );

  const clearAll = () => {
    setSearch("");
    setLocation("");
    setActiveFeed("all");
    setSelectedCategory("all");
    setSelectedState("all");
    setSelectedArea("all");
    setActiveCategoryTab("all");
  };

  if (loading) return <VortexLoader />;

  return (
    <div className="min-h-screen bg-white text-slate-900">
      <Header />

      {/* ════════════════════════════════════════
          SECTION 3 — Category Icons (JD tiles)
      ════════════════════════════════════════ */}
      <section className="border-b border-slate-200 bg-white px-4 py-5 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <CategoryGrid
            activeTab={activeCategoryTab}
            onTabChange={setActiveCategoryTab}
          />
        </div>
      </section>

      {/* ════════════════════════════════════════
          SECTION 2 — Hero Slider + Service Cards
      ════════════════════════════════════════ */}
      <section className="border-b border-slate-100 bg-white px-4 py-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <HeroBanner />
        </div>
      </section>

      {/* ════════════════════════════════════════
          SECTION 4 — Filters + Store Grid
      ════════════════════════════════════════ */}
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
          {/* ── Sidebar ── */}
          <aside className="w-full shrink-0 space-y-4 lg:sticky lg:top-4 lg:w-56">
            {/* Browse by */}
            <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-100 px-4 py-3">
                <h3 className="text-xs font-bold uppercase tracking-widest text-slate-500">
                  Browse by
                </h3>
              </div>
              <div className="p-2">
                {FEED_MODES.map((mode) => (
                  <button
                    key={mode.key}
                    onClick={() => setActiveFeed(mode.key)}
                    className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-semibold transition ${
                      activeFeed === mode.key
                        ? "bg-blue-50 text-blue-700"
                        : "text-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    <i
                      className={`pi ${mode.icon} text-sm ${activeFeed === mode.key ? "text-blue-600" : "text-slate-400"}`}
                    />
                    {mode.label}
                    {activeFeed === mode.key && (
                      <i className="pi pi-check ml-auto text-xs text-blue-600" />
                    )}
                  </button>
                ))}
              </div>
            </div>

            {hasFilters && (
              <button
                onClick={clearAll}
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
              >
                <i className="pi pi-filter-slash" /> Clear all filters
              </button>
            )}
          </aside>

          {/* ── Store Grid ── */}
          <div className="min-w-0 flex-1 space-y-5">
            {/* Results header */}
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-xl font-black text-slate-900">
                  {FEED_MODES.find((m) => m.key === activeFeed)?.label ||
                    "All Stores"}
                </h2>
                <p className="text-sm text-slate-500">
                  {visibleStores.length} stores found
                  {search.trim() ? ` for "${search}"` : ""}
                </p>
              </div>
              {hasFilters && (
                <div className="flex flex-wrap gap-2">
                  {search.trim() && (
                    <span className="flex items-center gap-1 rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
                      &quot;{search}&quot;
                      <button onClick={() => setSearch("")}>
                        <i className="pi pi-times text-[10px]" />
                      </button>
                    </span>
                  )}
                  {selectedCategory !== "all" && (
                    <span className="flex items-center gap-1 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-700">
                      {selectedCategory}
                      <button onClick={() => setSelectedCategory("all")}>
                        <i className="pi pi-times text-[10px]" />
                      </button>
                    </span>
                  )}
                  {selectedState !== "all" && (
                    <span className="flex items-center gap-1 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-700">
                      {selectedState}
                      <button onClick={() => setSelectedState("all")}>
                        <i className="pi pi-times text-[10px]" />
                      </button>
                    </span>
                  )}
                </div>
              )}
            </div>

            {error ? (
              <div className="rounded-2xl border border-rose-100 bg-rose-50 p-8 text-center">
                <i className="pi pi-exclamation-triangle mb-3 text-3xl text-rose-500" />
                <p className="font-bold text-slate-900">
                  Could not load stores
                </p>
                <p className="mt-1 text-sm text-slate-600">{error}</p>
                <button
                  onClick={() => window.location.reload()}
                  className="mt-4 rounded-full bg-rose-600 px-5 py-2 text-sm font-bold text-white"
                >
                  Try again
                </button>
              </div>
            ) : loading ? (
              <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
                {Array.from({ length: 9 }).map((_, i) => (
                  <SkeletonCard key={i} />
                ))}
              </div>
            ) : visibleStores.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center">
                <div className="mx-auto mb-3 text-5xl">🔍</div>
                <p className="font-bold text-slate-900">No stores found</p>
                <p className="mt-1 text-sm text-slate-500">
                  Try clearing filters or changing the category.
                </p>
                <button
                  onClick={clearAll}
                  className="mt-4 rounded-full bg-blue-600 px-5 py-2 text-sm font-bold text-white"
                >
                  Reset filters
                </button>
              </div>
            ) : (
              <>
                <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
                  {pagedStores.map((store) => (
                    <StoreCard key={store._id} store={store} />
                  ))}
                </div>
                {canLoadMore && (
                  <div className="flex justify-center pt-2">
                    <button
                      onClick={() =>
                        setVisibleCount((c) =>
                          Math.min(c + LOAD_STEP, visibleStores.length),
                        )
                      }
                      className="rounded-full border border-slate-300 bg-white px-8 py-3 text-sm font-bold text-slate-700 shadow-sm transition hover:bg-slate-50"
                    >
                      Load more (
                      {Math.min(LOAD_STEP, visibleStores.length - visibleCount)}{" "}
                      stores)
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}
