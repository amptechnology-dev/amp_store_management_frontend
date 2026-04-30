"use client";

import React, { useState, useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import axiosInstance from "@/service/axios.service";
import { toast } from "react-toastify";
import { Button } from "primereact/button";
import { Dialog } from "primereact/dialog";
import { InputText } from "primereact/inputtext";
import { InputTextarea } from "primereact/inputtextarea";
import { InputNumber } from "primereact/inputnumber";
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
  name: z.string().min(2, "Owner name is required"),
  email: z.string().email("Valid email is required"),
  phone: z.string().min(10, "Valid phone number required"),
  password: z.string().optional(),
  storeName: z.string().min(2, "Store name is required"),
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

const getStoreFormSchema = (isEditMode: boolean) =>
  baseStoreFormSchema.superRefine((values, context) => {
    if (!isEditMode && !values.password?.trim()) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["password"],
        message: "Password is required",
      });
      return;
    }

    if (!isEditMode && (values.password?.length || 0) < 6) {
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

function StoreForm({ storeId, createEndpoint = "/api/register/create-user", onClose, onSuccess }: StoreFormProps) {
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
  const canShowVerifyField = profile?.role === "ADMIN";

  const isEditMode = !!storeId;
  const storeFormSchema = getStoreFormSchema(isEditMode);

  const {
    register,
    handleSubmit,
    control,
    reset,
    setValue,
    formState: { errors },
  } = useForm<StoreFormData>({
    resolver: zodResolver(storeFormSchema),
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      password: "",
      storeName: "",
      description: "",
      contactNo: "",
      whatsappNo: "",
      website: "",
      gstin: "",
      lat: 0,
      long: 0,
      area: "",
      state: "",
      country: "",
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
      formData.append("name", data.name);
      formData.append("email", data.email);
      formData.append("phone", data.phone);
      if (data.password && !isEditMode) {
        formData.append("password", data.password);
      }
      formData.append("storeName", data.storeName);
      formData.append("description", data.description || "");
      formData.append("contactNo", data.contactNo);
      formData.append("whatsappNo", data.whatsappNo);
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
        {/* Owner Information */}
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
              <label className="text-sm font-semibold text-gray-700">Area</label>
              <InputText
                {...register("area")}
                placeholder="Enter area"
                className={`w-full p-2 border rounded-lg ${errors.area ? "border-red-500" : "border-yellow-300"}`}
              />
              {errors.area && <small className="text-red-500">{errors.area.message}</small>}
            </div>

            <div className="space-y-1">
              <label className="text-sm font-semibold text-gray-700">State</label>
              <InputText
                {...register("state")}
                placeholder="Enter state"
                className={`w-full p-2 border rounded-lg ${errors.state ? "border-red-500" : "border-yellow-300"}`}
              />
              {errors.state && <small className="text-red-500">{errors.state.message}</small>}
            </div>

            <div className="space-y-1">
              <label className="text-sm font-semibold text-gray-700">Country</label>
              <InputText
                {...register("country")}
                placeholder="Enter country"
                className={`w-full p-2 border rounded-lg ${errors.country ? "border-red-500" : "border-yellow-300"}`}
              />
              {errors.country && <small className="text-red-500">{errors.country.message}</small>}
            </div>

            <div className="space-y-1">
              <label className="text-sm font-semibold text-gray-700">GSTIN</label>
              <InputText
                {...register("gstin")}
                placeholder="Enter GSTIN"
                className={`w-full p-2 border rounded-lg border-yellow-300`}
              />
            </div>

            <div className="space-y-1">
              <label className="text-sm font-semibold text-gray-700">Latitude</label>
              <Controller
                name="lat"
                control={control}
                render={({ field }) => (
                  <InputNumber
                    value={field.value}
                    onValueChange={(e) => field.onChange(e.value)}
                    placeholder="Enter latitude"
                    mode="decimal"
                    minFractionDigits={4}
                    maxFractionDigits={6}
                    step={0.0001}
                    className={`w-full p-2 border rounded-lg border-yellow-300`}
                    inputClassName="w-full"
                  />
                )}
              />
              {errors.lat && <small className="text-red-500">{errors.lat.message}</small>}
            </div>

            <div className="space-y-1">
              <label className="text-sm font-semibold text-gray-700">Longitude</label>
              <Controller
                name="long"
                control={control}
                render={({ field }) => (
                  <InputNumber
                    value={field.value}
                    onValueChange={(e) => field.onChange(e.value)}
                    placeholder="Enter longitude"
                    mode="decimal"
                    minFractionDigits={4}
                    maxFractionDigits={6}
                    step={0.0001}
                    className={`w-full p-2 border rounded-lg border-yellow-300`}
                    inputClassName="w-full"
                  />
                )}
              />
            </div>
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

