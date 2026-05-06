"use client";

import React, { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import { useForm, Controller } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import axiosInstance from "@/service/axios.service";
import { toast } from "react-toastify";
import { Button } from "primereact/button";
import { Dialog } from "primereact/dialog";
import { Dropdown } from "primereact/dropdown";
import { InputText } from "primereact/inputtext";
import { InputTextarea } from "primereact/inputtextarea";
import { Checkbox } from "primereact/checkbox";
import Image from "next/image";
import { useProfileStore } from "@/lib/store/profileStore";

// Zod Schemas
const timingByDaySchema = z.object({
  monday: z.string().optional(),
  tuesday: z.string().optional(),
  wednesday: z.string().optional(),
  thursday: z.string().optional(),
  friday: z.string().optional(),
  saturday: z.string().optional(),
  sunday: z.string().optional(),
});

const baseStoreFormSchema = z.object({
  name: z.string().optional(),
  email: z.string().optional(),
  phone: z.string().optional(),
  password: z.string().optional(),
  storeName: z.string().min(2, "Store name is required"),
  storeType: z.string().min(1, "Store type is required"),
  description: z.string().optional(),
  contactNo: z.string().min(10, "Contact number is required"),
  whatsappNo: z.string().min(10, "WhatsApp number is required"),
  website: z.string().optional(),
  gstin: z.string().optional(),
  lat: z.number().min(-90).max(90, "Invalid latitude"),
  long: z.number().min(-180).max(180, "Invalid longitude"),
  area: z.string().min(2, "Area is required"),
  state: z.string().min(2, "State is required"),
  country: z.string().min(2, "Country is required"),
  timingOpen: z.string().optional(),
  timingClose: z.string().optional(),
  timingByDay: timingByDaySchema.optional(),
  seoDescription: z.string().optional(),
  seoKeyword: z.string().optional(),
  isActive: z.boolean().optional(),
  isVerify: z.boolean().optional(),
});

const getStoreFormSchema = (isEditMode: boolean, mode: "admin" | "store") =>
  baseStoreFormSchema.superRefine((values, context) => {
    const requireOwnerFields = mode !== "store";

    if (requireOwnerFields && !values.name?.trim()) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["name"],
        message: "Owner name is required",
      });
    }

    if (requireOwnerFields && !values.email?.trim()) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["email"],
        message: "Valid email is required",
      });
    } else if (requireOwnerFields && values.email && !/^\S+@\S+\.\S+$/.test(values.email)) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["email"],
        message: "Valid email is required",
      });
    }

    if (requireOwnerFields && !values.phone?.trim()) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["phone"],
        message: "Valid phone number required",
      });
    } else if (requireOwnerFields && (values.phone?.length || 0) < 10) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["phone"],
        message: "Valid phone number required",
      });
    }

    if (!isEditMode && !values.password?.trim() && requireOwnerFields) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["password"],
        message: "Password is required",
      });
      return;
    }

    if (!isEditMode && requireOwnerFields && (values.password?.length || 0) < 6) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["password"],
        message: "Password must be at least 6 characters",
      });
    }
  });

type StoreFormData = z.infer<typeof baseStoreFormSchema>;

type StoreFormProps = {
  storeId?: string | null;
  createEndpoint?: string;
  mode?: "admin" | "store";
  onClose: () => void;
  onSuccess: () => void;
};

const DAYS = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
] as const;

const STORE_TYPES = [
  { label: "Grocery", value: "Grocery", icon: "pi pi-shopping-basket" },
  { label: "Electronics", value: "Electronics", icon: "pi pi-mobile" },
  { label: "Clothing", value: "Clothing", icon: "pi pi-tag" },
  { label: "Pharmacy", value: "Pharmacy", icon: "pi pi-heart" },
  { label: "Books", value: "Books", icon: "pi pi-book" },
  { label: "Furniture", value: "Furniture", icon: "pi pi-table" },
  { label: "Other", value: "Other", icon: "pi pi-ellipsis-h" },
] as const;

type StoreTypeOption = {
  label: string;
  value: string;
  icon: string;
};

const INDIAN_STATES = [
  "Andhra Pradesh",
  "Arunachal Pradesh",
  "Assam",
  "Bihar",
  "Chhattisgarh",
  "Goa",
  "Gujarat",
  "Haryana",
  "Himachal Pradesh",
  "Jharkhand",
  "Karnataka",
  "Kerala",
  "Madhya Pradesh",
  "Maharashtra",
  "Manipur",
  "Meghalaya",
  "Mizoram",
  "Nagaland",
  "Odisha",
  "Punjab",
  "Rajasthan",
  "Sikkim",
  "Tamil Nadu",
  "Telangana",
  "Tripura",
  "Uttar Pradesh",
  "Uttarakhand",
  "West Bengal",
  "Andaman and Nicobar Islands",
  "Chandigarh",
  "Dadra and Nagar Haveli and Daman and Diu",
  "Delhi",
  "Jammu and Kashmir",
  "Ladakh",
  "Lakshadweep",
  "Puducherry",
] as const;

const parseTimeToDate = (value?: string) => {
  if (!value) return null;

  const normalized = value.trim().toLowerCase();
  const amPmMatch = normalized.match(/^(\d{1,2})(?::(\d{2}))?\s*(am|pm)$/i);
  if (amPmMatch) {
    const hours = Number(amPmMatch[1]) % 12;
    const minutes = Number(amPmMatch[2] || "0");
    const isPm = amPmMatch[3].toLowerCase() === "pm";
    const date = new Date();
    date.setHours(isPm ? hours + 12 : hours, minutes, 0, 0);
    return date;
  }

  const hhmmMatch = normalized.match(/^(\d{1,2}):(\d{2})$/);
  if (hhmmMatch) {
    const date = new Date();
    date.setHours(Number(hhmmMatch[1]), Number(hhmmMatch[2]), 0, 0);
    return date;
  }

  return null;
};

const formatTimeLabel = (value?: string) => {
  const parsed = parseTimeToDate(value);
  if (!parsed) return "";

  let hours = parsed.getHours();
  const minutes = parsed.getMinutes();
  const period = hours >= 12 ? "PM" : "AM";
  hours = hours % 12;
  if (hours === 0) hours = 12;

  const minuteText = minutes > 0 ? `:${String(minutes).padStart(2, "0")}` : "";
  return `${hours}${minuteText}${period}`;
};

const formatTimeInputValue = (value?: string) => {
  const parsed = parseTimeToDate(value);
  if (!parsed) return "";

  const hours = String(parsed.getHours()).padStart(2, "0");
  const minutes = String(parsed.getMinutes()).padStart(2, "0");
  return `${hours}:${minutes}`;
};

const buildWeekTiming = (openValue?: string, closeValue?: string) => {
  const openLabel = formatTimeLabel(openValue);
  const closeLabel = formatTimeLabel(closeValue);
  if (!openLabel || !closeLabel) return "";

  return `${openLabel} - ${closeLabel}`;
};

const formatTimeForApi = (value?: string) => formatTimeLabel(value);

type TimingRow = {
  id: string;
  day: string;
  timing: string;
};

const createTimingRow = (day = "", timing = ""): TimingRow => ({
  id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
  day,
  timing,
});

const normalizeDay = (value: string) => value.trim().toLowerCase();

const LocationPicker = dynamic(() => import("@/helper/LocationPicker"), {
  ssr: false,
});

const INDIA_CENTER = {
  latitude: 22.9734,
  longitude: 78.6569,
};

const STATE_CENTERS: Record<string, [number, number]> = {
  "Andhra Pradesh": [15.9129, 79.7400],
  "Arunachal Pradesh": [28.2180, 94.7278],
  Assam: [26.2006, 92.9376],
  Bihar: [25.0961, 85.3131],
  Chhattisgarh: [21.2787, 81.8661],
  Goa: [15.2993, 74.1240],
  Gujarat: [22.2587, 71.1924],
  Haryana: [29.0588, 76.0856],
  "Himachal Pradesh": [31.1048, 77.1734],
  Jharkhand: [23.6102, 85.2799],
  Karnataka: [15.3173, 75.7139],
  Kerala: [10.8505, 76.2711],
  "Madhya Pradesh": [22.9734, 78.6569],
  Maharashtra: [19.7515, 75.7139],
  Manipur: [24.6637, 93.9063],
  Meghalaya: [25.4670, 91.3662],
  Mizoram: [23.1645, 92.9376],
  Nagaland: [26.1584, 94.5624],
  Odisha: [20.9517, 85.0985],
  Punjab: [31.1471, 75.3412],
  Rajasthan: [27.0238, 74.2179],
  Sikkim: [27.5330, 88.5122],
  "Tamil Nadu": [11.1271, 78.6569],
  Telangana: [18.1124, 79.0193],
  Tripura: [23.9408, 91.9882],
  "Uttar Pradesh": [26.8467, 80.9462],
  Uttarakhand: [30.0668, 79.0193],
  "West Bengal": [22.9868, 87.8550],
  "Andaman and Nicobar Islands": [11.7401, 92.6586],
  Chandigarh: [30.7333, 76.7794],
  "Dadra and Nagar Haveli and Daman and Diu": [20.3974, 72.8328],
  Delhi: [28.7041, 77.1025],
  "Jammu and Kashmir": [33.7782, 76.5762],
  Ladakh: [34.2268, 77.5619],
  Lakshadweep: [10.5667, 72.6417],
  Puducherry: [11.9416, 79.8083],
};

function StoreForm({
  storeId,
  createEndpoint = "/api/register/create-user",
  mode = "admin",
  onClose,
  onSuccess,
}: StoreFormProps) {
  const { profile } = useProfileStore();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loading, setLoading] = useState(false);
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [existingImages, setExistingImages] = useState<string[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [timingRows, setTimingRows] = useState<TimingRow[]>([]);
  const [timingOpen, setTimingOpen] = useState("");
  const [timingClose, setTimingClose] = useState("");
  const [keywords, setKeywords] = useState<string[]>([]);
  const [keywordInput, setKeywordInput] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [isVerify, setIsVerify] = useState(false);
  const [isMapLoading, setIsMapLoading] = useState(false);
  const canShowVerifyField = profile?.role === "ADMIN";

  const isEditMode = !!storeId;
  const isStoreMode = mode === "store" && !isEditMode;
  const storeFormSchema = getStoreFormSchema(isEditMode, mode);

  const {
    register,
    handleSubmit,
    control,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<StoreFormData>({
    resolver: zodResolver(storeFormSchema),
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      password: "",
      storeName: "",
      storeType: "",
      description: "",
      contactNo: "",
      whatsappNo: "",
      website: "",
      gstin: "",
      lat: 0,
      long: 0,
      area: "",
      state: "",
      country: "India",
      timingOpen: "",
      timingClose: "",
      seoDescription: "",
      seoKeyword: "",
      isActive: true,
      isVerify: false,
    },
  });

  useEffect(() => {
    if (storeId && isEditMode) {
      fetchStoreData();
    }
  }, [storeId]);

  const selectedLat = watch("lat");
  const selectedLong = watch("long");
  const selectedArea = watch("area");
  const selectedState = watch("state");
  const selectedCountry = watch("country") || "India";
  const mapCenter = STATE_CENTERS[selectedState] || [INDIA_CENTER.latitude, INDIA_CENTER.longitude];
  const storeTypeOptions: StoreTypeOption[] = STORE_TYPES.map((option) => ({ ...option }));

  const renderStoreTypeOption = (option: StoreTypeOption) => (
    <div className="flex items-center gap-2">
      <i className={`${option.icon} text-yellow-700`} />
      <span>{option.label}</span>
    </div>
  );

  const renderStoreTypeValue = (option: StoreTypeOption | null) => {
    if (!option) {
      return <span className="text-gray-400">Select store type</span>;
    }

    return (
      <div className="flex items-center gap-2">
        <i className={`${option.icon} text-yellow-700`} />
        <span>{option.label}</span>
      </div>
    );
  };

  const setLocationFromMap = async (latitude: number, longitude: number) => {
    setValue("lat", latitude, { shouldDirty: true, shouldValidate: true });
    setValue("long", longitude, { shouldDirty: true, shouldValidate: true });

    setIsMapLoading(true);
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${latitude}&lon=${longitude}&addressdetails=1`,
        { headers: { Accept: "application/json" } }
      );

      if (!response.ok) {
        throw new Error("Unable to resolve location from map");
      }

      const result = await response.json();
      const address = (result?.address || {}) as Record<string, string | undefined>;

      const areaName =
        address.suburb ||
        address.city_district ||
        address.city ||
        address.town ||
        address.village ||
        address.municipality ||
        address.county ||
        address.state_district ||
        result?.display_name?.split(",")[0] ||
        selectedArea ||
        "";

      const stateName = address.state || address.region || address.state_district || selectedState || "";
      const countryName = address.country || selectedCountry || "India";

      setValue("area", areaName, { shouldDirty: true, shouldValidate: true });
      if (stateName) {
        setValue("state", stateName, { shouldDirty: true, shouldValidate: true });
      }
      setValue("country", countryName, { shouldDirty: true, shouldValidate: true });
    } catch (error: any) {
      toast.error(error?.message || "Failed to resolve location from map");
    } finally {
      setIsMapLoading(false);
    }
  };

  const fetchStoreData = async () => {
    try {
      setLoading(true);
      const res = await axiosInstance.get(
        `/api/register/single-store/${storeId}`
      );
      const store = res.data.store;

      // Set form values
      setValue("name", store.owner?.name || "");
      setValue("email", store.owner?.email || "");
      setValue("phone", store.owner?.phone || "");
      setValue("storeName", store.storeName?.trim() || "");
      setValue("storeType", store.storeType?.trim() || "");
      setValue("description", store.description?.trim() || "");
      setValue("contactNo", store.contactNo?.trim() || "");
      setValue("whatsappNo", store.whatsappNo?.trim() || "");
      setValue("website", store.website?.trim() || "");
      setValue("gstin", store.gstin?.trim() || "");
      setValue("lat", store.lat || 0);
      setValue("long", store.long || 0);
      setValue("area", store.address?.area?.trim() || "");
      setValue("state", store.address?.state?.trim() || "");
      setValue("country", store.address?.country?.trim() || "");
      setValue("seoDescription", store.imageSeo?.description || "");

      const openValue = formatTimeInputValue(store.timing?.open);
      const closeValue = formatTimeInputValue(store.timing?.close);
      setValue("timingOpen", openValue);
      setValue("timingClose", closeValue);
      setTimingOpen(openValue);
      setTimingClose(closeValue);

      // Set image data
      setExistingImages(store.images || []);

      // Set timing by day
      if (store.timingByDay && Object.keys(store.timingByDay).length > 0) {
        // Cast to a known record shape so TS knows the entry value is string | undefined
        setTimingRows(
          Object.entries(store.timingByDay as Record<string, string | undefined>)
            .filter(([, timing]) => Boolean(timing))
            .map(([day, timing]) => createTimingRow(day, timing ?? ""))
        );
      } else {
        setTimingRows([]);
      }

      // Set keywords
      if (store.imageSeo?.keyword) {
        const kwds = store.imageSeo.keyword
          .split(",")
          .map((k: string) => k.trim())
          .filter((k: string) => k);
        setKeywords(kwds);
        setValue("seoKeyword", kwds.join(", "));
      }

      // Set status (respect explicit boolean from API; fallback to defaults when undefined)
      setIsActive(typeof store.isActive === "boolean" ? store.isActive : true);
      setIsVerify(typeof store.isVerify === "boolean" ? store.isVerify : false);

      setLoading(false);
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to fetch store data");
      onClose();
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      setImageFiles([...imageFiles, ...files]);

      // Create previews
      files.forEach((file) => {
        const reader = new FileReader();
        reader.onload = (event) => {
          setImagePreviews((prev) => [...prev, event.target?.result as string]);
        };
        reader.readAsDataURL(file);
      });
    }
  };

  const removeImage = (index: number, isExisting: boolean) => {
    if (isExisting) {
      setExistingImages(existingImages.filter((_, i) => i !== index));
    } else {
      setImageFiles(imageFiles.filter((_, i) => i !== index));
      setImagePreviews(imagePreviews.filter((_, i) => i !== index));
    }
  };

  const addKeyword = () => {
    if (keywordInput.trim()) {
      const newKeywords = [...keywords, keywordInput.trim()];
      setKeywords(newKeywords);
      setValue("seoKeyword", newKeywords.join(", "));
      setKeywordInput("");
    }
  };

  const removeKeyword = (index: number) => {
    const newKeywords = keywords.filter((_, i) => i !== index);
    setKeywords(newKeywords);
    setValue("seoKeyword", newKeywords.join(", "));
  };

  const addTimingRow = () => {
    const generalTiming = buildWeekTiming(timingOpen, timingClose);
    setTimingRows((prev) => [...prev, createTimingRow("", generalTiming)]);
  };

  const updateTimingRow = (id: string, field: "day" | "timing", value: string) => {
    setTimingRows((prev) =>
      prev.map((row) => (row.id === id ? { ...row, [field]: value } : row))
    );
  };

  const removeTimingRow = (id: string) => {
    setTimingRows((prev) => prev.filter((row) => row.id !== id));
  };

  const handleGeneralTimingChange = (field: "open" | "close", value: string) => {
    if (field === "open") {
      setTimingOpen(value);
    } else {
      setTimingClose(value);
    }
  };

  const onSubmit = async (data: StoreFormData) => {
    setIsSubmitting(true);
    try {
      const formData = new FormData();

      // Append all text fields
      if (!isStoreMode) {
        if (data.name) formData.append("name", data.name);
        if (data.email) formData.append("email", data.email);
        if (data.phone) formData.append("phone", data.phone);
        if (data.password && !isEditMode) {
          formData.append("password", data.password);
        }
      }
      formData.append("storeName", data.storeName || "");
      formData.append("storeType", data.storeType || "");
      formData.append("description", data.description || "");
      formData.append("contactNo", data.contactNo || "");
      formData.append("whatsappNo", data.whatsappNo || "");
      formData.append("website", data.website || "");
      formData.append("gstin", data.gstin || "");
      formData.append("lat", data.lat.toString());
      formData.append("long", data.long.toString());

      const timingOpenValue = formatTimeForApi(timingOpen);
      const timingCloseValue = formatTimeForApi(timingClose);
      if (timingOpenValue) {
        formData.append("timing[open]", timingOpenValue);
      }
      if (timingCloseValue) {
        formData.append("timing[close]", timingCloseValue);
      }

      // Address fields
      formData.append("address[area]", data.area);
      formData.append("address[state]", data.state);
      formData.append("address[country]", data.country);

      // Timing by day
      timingRows.forEach((row) => {
        const day = normalizeDay(row.day);
        if (day && row.timing) {
          formData.append(`timingByDay[${day}]`, row.timing);
        }
      });

      // Existing images
      existingImages.forEach((url, index) => {
        formData.append(`existingImages[${index}]`, url);
      });

      // New Images
      imageFiles.forEach((file, index) => {
        formData.append(`image[${index}]`, file);
      });

      // SEO
      formData.append("imageSeo[description]", data.seoDescription || "");
      formData.append("imageSeo[keyword]", keywords.join(","));

      // Status
      formData.append("isActive", isActive.toString());
      formData.append("isVerify", isVerify.toString());

      let res;
      if (isEditMode) {
        res = await axiosInstance.put(
          `/api/register/update-store-and-user/${storeId}`,
          formData,
          {
            headers: {
              "Content-Type": "multipart/form-data",
            },
          }
        );
      } else {
        res = await axiosInstance.post(
          createEndpoint,
          formData,
          {
            headers: {
              "Content-Type": "multipart/form-data",
            },
          }
        );
      }

      toast.success(res.data.message || `Store ${isEditMode ? "updated" : "created"} successfully!`);
      reset();
      setImageFiles([]);
      setImagePreviews([]);
      setExistingImages([]);
      setKeywords([]);
      onSuccess();
    } catch (error: any) {
      console.error("Store operation error:", error);
      toast.error(error.response?.data?.message || "Failed to save store");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center p-4">
        <i className="pi pi-spin pi-spinner text-3xl" style={{ color: "#d89f00" }}></i>
      </div>
    );
  }

  return (
    <div className="px-4 pt-2 pb-4 min-h-[80vh]">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {!isStoreMode && (
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-gray-800 flex items-center gap-2">
              <i className="pi pi-user" style={{ color: "#d89f00" }}></i>
              Owner Information
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-sm font-semibold text-gray-700 flex items-center gap-1">
                  Owner Name <span className="text-red-500">*</span>
                </label>
                <InputText
                  {...register("name")}
                  placeholder="Enter owner name"
                  onInput={(e: React.FormEvent<HTMLInputElement>) => {
                    e.currentTarget.value = e.currentTarget.value.replace(/\d/g, "");
                  }}
                  className={`w-full p-2 border rounded-lg ${errors.name ? "border-red-500" : "border-yellow-300"}`}
                />
                {errors.name && <small className="text-red-500">{errors.name.message}</small>}
              </div>

              <div className="space-y-1">
                <label className="text-sm font-semibold text-gray-700 flex items-center gap-1">
                  Email <span className="text-red-500">*</span>
                </label>
                <InputText
                  {...register("email")}
                  type="email"
                  placeholder="Enter email"
                  className={`w-full p-2 border rounded-lg ${errors.email ? "border-red-500" : "border-yellow-300"}`}
                />
                {errors.email && <small className="text-red-500">{errors.email.message}</small>}
              </div>

              <div className="space-y-1">
                <label className="text-sm font-semibold text-gray-700 flex items-center gap-1">
                  Phone <span className="text-red-500">*</span>
                </label>
                <InputText
                  {...register("phone")}
                  placeholder="Enter phone"
                  inputMode="numeric"
                  onInput={(e: React.FormEvent<HTMLInputElement>) => {
                    e.currentTarget.value = e.currentTarget.value.replace(/\D/g, "");
                  }}
                  className={`w-full p-2 border rounded-lg ${errors.phone ? "border-red-500" : "border-yellow-300"}`}
                />
                {errors.phone && <small className="text-red-500">{errors.phone.message}</small>}
              </div>

              <div className="space-y-1">
                <label className="text-sm font-semibold text-gray-700 flex items-center gap-1">
                  Password {!isEditMode && <span className="text-red-500">*</span>}
                </label>
                <InputText
                  {...register("password")}
                  type="password"
                  placeholder="Enter password"
                  className={`w-full p-2 border rounded-lg ${errors.password ? "border-red-500" : "border-yellow-300"}`}
                />
                {errors.password && <small className="text-red-500">{errors.password.message}</small>}
              </div>
            </div>
          </div>
        )}

        {/* Store Information */}
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-gray-800 flex items-center gap-2">
            <i className="pi pi-shop" style={{ color: "#d89f00" }}></i>
            Store Information
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-sm font-semibold text-gray-700 flex items-center gap-1">
                Store Name <span className="text-red-500">*</span>
              </label>
              <InputText
                {...register("storeName")}
                placeholder="Enter store name"
                className={`w-full p-2 border rounded-lg ${errors.storeName ? "border-red-500" : "border-yellow-300"}`}
              />
              {errors.storeName && <small className="text-red-500">{errors.storeName.message}</small>}
            </div>

            <div className="space-y-1">
              <label className="text-sm font-semibold text-gray-700 flex items-center gap-1">
                Store Type <span className="text-red-500">*</span>
              </label>
              <Controller
                name="storeType"
                control={control}
                render={({ field }) => (
                  <Dropdown
                    value={field.value}
                    onChange={(e) => field.onChange(e.value)}
                    options={storeTypeOptions}
                    optionLabel="label"
                    optionValue="value"
                    placeholder="Select store type"
                    className={`w-full ${errors.storeType ? "border-red-500" : "border-yellow-300"}`}
                    panelClassName="!text-sm"
                    itemTemplate={renderStoreTypeOption}
                    valueTemplate={renderStoreTypeValue}
                  />
                )}
              />
              {errors.storeType && <small className="text-red-500">{errors.storeType.message}</small>}
            </div>

            <div className="space-y-1">
              <label className="text-sm font-semibold text-gray-700 flex items-center gap-1">
                Contact Number <span className="text-red-500">*</span>
              </label>
              <InputText
                {...register("contactNo")}
                placeholder="Enter contact number"
                inputMode="numeric"
                onInput={(e: React.FormEvent<HTMLInputElement>) => {
                  e.currentTarget.value = e.currentTarget.value.replace(/\D/g, "");
                }}
                className={`w-full p-2 border rounded-lg ${errors.contactNo ? "border-red-500" : "border-yellow-300"}`}
              />
              {errors.contactNo && <small className="text-red-500">{errors.contactNo.message}</small>}
            </div>

            <div className="space-y-1">
              <label className="text-sm font-semibold text-gray-700 flex items-center gap-1">
                WhatsApp Number <span className="text-red-500">*</span>
              </label>
              <InputText
                {...register("whatsappNo")}
                placeholder="Enter WhatsApp number"
                inputMode="numeric"
                onInput={(e: React.FormEvent<HTMLInputElement>) => {
                  e.currentTarget.value = e.currentTarget.value.replace(/\D/g, "");
                }}
                className={`w-full p-2 border rounded-lg ${errors.whatsappNo ? "border-red-500" : "border-yellow-300"}`}
              />
              {errors.whatsappNo && <small className="text-red-500">{errors.whatsappNo.message}</small>}
            </div>

            <div className="space-y-1">
              <label className="text-sm font-semibold text-gray-700">Website</label>
              <InputText
                {...register("website")}
                placeholder="Enter website URL"
                className={`w-full p-2 border rounded-lg ${errors.website ? "border-red-500" : "border-yellow-300"}`}
              />
              {errors.website && <small className="text-red-500">{errors.website.message}</small>}
            </div>

            <div className="space-y-1 md:col-span-2">
              <label className="text-sm font-semibold text-gray-700">Description</label>
              <InputTextarea
                {...register("description")}
                placeholder="Enter store description"
                rows={3}
                className={`w-full p-2 border rounded-lg ${errors.description ? "border-red-500" : "border-yellow-300"}`}
              />
            </div>
          </div>
        </div>

        {/* Location Information */}
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-gray-800 flex items-center gap-2">
            <i className="pi pi-map-marker" style={{ color: "#d89f00" }}></i>
            Location Information
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-sm font-semibold text-gray-700">Country</label>
              <Controller
                name="country"
                control={control}
                render={({ field }) => (
                  <InputText
                    value={field.value || "India"}
                    readOnly
                    className="w-full p-2 border rounded-lg border-yellow-300 bg-gray-100 text-gray-700"
                  />
                )}
              />
              {errors.country && <small className="text-red-500">{errors.country.message}</small>}
            </div>

            <div className="space-y-1">
              <label className="text-sm font-semibold text-gray-700">State</label>
              <Controller
                name="state"
                control={control}
                render={({ field }) => (
                  <Dropdown
                    value={field.value}
                    onChange={(e) => field.onChange(e.value)}
                    options={INDIAN_STATES.map((stateName) => ({ label: stateName, value: stateName }))}
                    placeholder="Select state"
                    className={`w-full ${errors.state ? "border-red-500" : "border-yellow-300"}`}
                    panelClassName="!text-sm"
                  />
                )}
              />
              {errors.state && <small className="text-red-500">{errors.state.message}</small>}
            </div>

            <div className="space-y-1 md:col-span-2">
              <label className="text-sm font-semibold text-gray-700">Area</label>
              <InputText
                {...register("area")}
                placeholder="Enter area"
                className={`w-full p-2 border rounded-lg ${errors.area ? "border-red-500" : "border-yellow-300"}`}
              />
              {errors.area && <small className="text-red-500">{errors.area.message}</small>}
            </div>

            <div className="space-y-2 md:col-span-2">
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div>
                  <label className="text-sm font-semibold text-gray-700">Select area on map</label>
                  <p className="text-xs text-gray-500 mt-1">
                    Click the map or drag the marker to fill area, latitude, and longitude automatically.
                  </p>
                </div>
                <div className="text-xs text-gray-500 text-right">
                  <div>Lat: {Number(selectedLat || INDIA_CENTER.latitude).toFixed(6)}</div>
                  <div>Long: {Number(selectedLong || INDIA_CENTER.longitude).toFixed(6)}</div>
                </div>
              </div>

              <div
                className="rounded-2xl overflow-hidden border border-yellow-200 shadow-[0_16px_40px_rgba(15,23,42,0.12)]"
                style={{
                  minHeight: 320,
                  background: "linear-gradient(180deg, rgba(255,255,255,0.9) 0%, rgba(255,251,236,0.98) 100%)",
                }}
              >
                {isMapLoading ? (
                  <div className="h-[320px] flex items-center justify-center bg-gradient-to-br from-yellow-50 to-white text-gray-600">
                    Resolving location...
                  </div>
                ) : (
                  <LocationPicker
                    latitude={Number(selectedLat || INDIA_CENTER.latitude)}
                    longitude={Number(selectedLong || INDIA_CENTER.longitude)}
                    center={mapCenter}
                    onPick={(latitude, longitude) => {
                      void setLocationFromMap(latitude, longitude);
                    }}
                  />
                )}
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-sm font-semibold text-gray-700">GSTIN</label>
              <InputText
                {...register("gstin")}
                placeholder="Enter GSTIN"
                className={`w-full p-2 border rounded-lg border-yellow-300`}
              />
            </div>

            <input type="hidden" {...register("lat", { valueAsNumber: true })} />
            <input type="hidden" {...register("long", { valueAsNumber: true })} />
          </div>
        </div>

        {/* Timing Information */}
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-gray-800 flex items-center gap-2">
            <i className="pi pi-clock" style={{ color: "#d89f00" }}></i>
            General Timing
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-sm font-semibold text-gray-700 flex items-center gap-1">
                Open Time <span className="text-red-500">*</span>
              </label>
              <input
                type="time"
                value={timingOpen}
                onChange={(e) => handleGeneralTimingChange("open", e.target.value)}
                className="w-full p-2 border border-yellow-300 rounded-lg"
              />
            </div>

            <div className="space-y-1">
              <label className="text-sm font-semibold text-gray-700 flex items-center gap-1">
                Close Time <span className="text-red-500">*</span>
              </label>
              <input
                type="time"
                value={timingClose}
                onChange={(e) => handleGeneralTimingChange("close", e.target.value)}
                className="w-full p-2 border border-yellow-300 rounded-lg"
              />
            </div>
          </div>

          {buildWeekTiming(timingOpen, timingClose) && (
            <div className="text-sm text-gray-600 bg-yellow-50 border border-yellow-200 rounded-lg px-3 py-2">
              General timing: <span className="font-semibold text-gray-800">{buildWeekTiming(timingOpen, timingClose)}</span>
            </div>
          )}

          <div className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm text-gray-600">Add day-specific timings only when needed.</p>
              <Button
                type="button"
                label="Add Day Timing"
                icon="pi pi-plus"
                onClick={addTimingRow}
                className="!bg-yellow-400 !text-gray-900 !border-yellow-500"
              />
            </div>

            {timingRows.length === 0 ? (
              <div className="rounded-lg border border-dashed border-yellow-300 bg-yellow-50/70 px-4 py-5 text-sm text-gray-600">
                No daily timings added yet. Use the button above to add Monday, Tuesday, or any other day you want.
              </div>
            ) : (
              <div className="space-y-3">
                {timingRows.map((row) => (
                  <div key={row.id} className="grid grid-cols-1 md:grid-cols-[1.1fr_1.4fr_auto] gap-3 items-end">
                    <div className="space-y-1">
                      <label className="text-sm font-semibold text-gray-700 flex items-center gap-1">
                        Day <span className="text-red-500">*</span>
                      </label>
                      <InputText
                        value={row.day}
                        onChange={(e) => updateTimingRow(row.id, "day", e.target.value)}
                        placeholder="Monday"
                        className="w-full p-2 border border-yellow-300 rounded-lg"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-sm font-semibold text-gray-700 flex items-center gap-1">
                        Timing <span className="text-red-500">*</span>
                      </label>
                      <InputText
                        value={row.timing}
                        onChange={(e) => updateTimingRow(row.id, "timing", e.target.value)}
                        placeholder="e.g., 9AM - 9PM"
                        className="w-full p-2 border border-yellow-300 rounded-lg"
                      />
                    </div>

                    <Button
                      type="button"
                      icon="pi pi-trash"
                      rounded
                      text
                      severity="danger"
                      onClick={() => removeTimingRow(row.id)}
                      className="!w-11 !h-11"
                      title="Delete timing"
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Images */}
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-gray-800 flex items-center gap-2">
            <i className="pi pi-image" style={{ color: "#d89f00" }}></i>
            Store Images
          </h3>

          {/* Existing Images */}
          {existingImages.length > 0 && (
            <div>
              <label className="text-sm font-semibold text-gray-700 block mb-2">Existing Images</label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {existingImages.map((img, idx) => (
                  <div key={idx} className="relative group">
                    <img
                      src={img}
                      alt={`Existing ${idx}`}
                      className="w-full h-24 object-cover rounded-lg border-2 border-yellow-300"
                    />
                    <button
                      type="button"
                      onClick={() => removeImage(idx, true)}
                      className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition"
                    >
                      <i className="pi pi-times text-xs"></i>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* New Images Preview */}
          {imagePreviews.length > 0 && (
            <div>
              <label className="text-sm font-semibold text-gray-700 block mb-2">New Images Preview</label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {imagePreviews.map((preview, idx) => (
                  <div key={idx} className="relative group">
                    <img
                      src={preview}
                      alt={`Preview ${idx}`}
                      className="w-full h-24 object-cover rounded-lg border-2 border-green-300"
                    />
                    <button
                      type="button"
                      onClick={() => removeImage(idx, false)}
                      className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition"
                    >
                      <i className="pi pi-times text-xs"></i>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Upload New Images */}
          <div className="space-y-1">
            <label className="text-sm font-semibold text-gray-700">Add More Images</label>
            <input
              type="file"
              multiple
              onChange={handleImageChange}
              className="w-full p-2 border border-yellow-300 rounded-lg"
              accept="image/*"
            />
            <small className="text-gray-600">
              Total images: {existingImages.length + imageFiles.length}
            </small>
          </div>
        </div>

        {/* SEO Information */}
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-gray-800 flex items-center gap-2">
            <i className="pi pi-search" style={{ color: "#d89f00" }}></i>
            SEO Information
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-sm font-semibold text-gray-700">SEO Description</label>
              <InputTextarea
                {...register("seoDescription")}
                placeholder="Enter SEO description"
                rows={2}
                className="w-full p-2 border border-yellow-300 rounded-lg"
              />
            </div>

            <div className="space-y-1">
              <label className="text-sm font-semibold text-gray-700">SEO Keywords (Comma Separated)</label>
              <div className="flex gap-2">
                <InputText
                  value={keywordInput}
                  onChange={(e) => setKeywordInput(e.target.value)}
                  placeholder="Type keyword and press +"
                  className="flex-1 p-2 border border-yellow-300 rounded-lg"
                  onKeyPress={(e) => e.key === "Enter" && addKeyword()}
                />
                <Button
                  type="button"
                  icon="pi pi-plus"
                  onClick={addKeyword}
                  className="p-2"
                  style={{
                    background: "#ffcf00",
                    color: "#1d232f",
                    border: "1px solid #e0ac1f",
                  }}
                />
              </div>

              {/* Keywords Display */}
              <div className="flex flex-wrap gap-2 mt-2">
                {keywords.map((keyword, idx) => (
                  <span
                    key={idx}
                    className="bg-yellow-100 text-yellow-800 px-3 py-1 rounded-full text-sm flex items-center gap-2"
                  >
                    {keyword}
                    <button
                      type="button"
                      onClick={() => removeKeyword(idx)}
                      className="text-red-500 hover:text-red-700"
                    >
                      <i className="pi pi-times text-xs"></i>
                    </button>
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Status & Verification */}
        {isEditMode && (
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-gray-800 flex items-center gap-2">
              <i className="pi pi-check-circle" style={{ color: "#d89f00" }}></i>
              Status & Verification
            </h3>

            <div className="flex gap-6">
              <div className="flex items-center gap-2">
                <Checkbox
                  checked={isActive}
                  onChange={(e) => setIsActive(e.checked || false)}
                  inputId="isActive"
                />
                <label htmlFor="isActive" className="text-sm font-semibold text-gray-700">
                  Active Store
                </label>
              </div>

              {/* {canShowVerifyField && (
                <div className="flex items-center gap-2">
                  <Checkbox
                    checked={isVerify}
                    onChange={(e) => setIsVerify(e.checked || false)}
                    inputId="isVerify"
                  />
                  <label htmlFor="isVerify" className="text-sm font-semibold text-gray-700">
                    Verified Store
                  </label>
                </div>
              )} */}
            </div>
          </div>
        )}

        {/* SUBMIT BUTTONS */}
        <div className="flex gap-3 pt-3">
          <Button
            type="button"
            label="Cancel"
            icon="pi pi-times"
            onClick={onClose}
            className="flex-1"
            style={{ background: "#f5f5f5", color: "#666", border: "1px solid #ddd" }}
            disabled={isSubmitting}
          />
          <Button
            type="submit"
            label={isSubmitting ? "Saving..." : isEditMode ? "Update Store" : "Create Store"}
            icon={isSubmitting ? "pi pi-spin pi-spinner" : isEditMode ? "pi pi-pencil" : "pi pi-check"}
            className="flex-1"
            style={{
              background: "linear-gradient(120deg,#f3be27,#e4a90e)",
              color: "#3b2f0f",
              border: "1px solid #e0ac1f",
            }}
            disabled={isSubmitting}
          />
        </div>
      </form>
    </div>
  );
}

export default StoreForm;

