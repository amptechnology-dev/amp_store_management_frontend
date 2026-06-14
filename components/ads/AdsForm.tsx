"use client";

import React, { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { InputText } from "primereact/inputtext";
import { InputNumber } from "primereact/inputnumber";
import { Button } from "primereact/button";
import { toast } from "react-toastify";
import axiosInstance from "@/service/axios.service";

type AdsFormProps = {
  adId: string | null;
  onClose: () => void;
  onSuccess: () => void;
};

function AdsForm({ adId, onClose, onSuccess }: AdsFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loading, setLoading] = useState(false);
  const isEditMode = !!adId;

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm({
    defaultValues: {
      title: "",
      description: "",
      redirectUrl: "",
    },
  });

  const [rank, setRank] = useState<number | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>("");
  const [existingImage, setExistingImage] = useState<string>("");

  // ── Fetch for edit mode ─────────────────────────────────────────────────────
  useEffect(() => {
    if (adId) fetchAdData();
  }, [adId]);

  const fetchAdData = async () => {
    try {
      setLoading(true);
      const res = await axiosInstance.get(`/api/ads/${adId}`);
      const ad = res.data.ads;
      setValue("title", ad.title);
      setValue("description", ad.description || "");
      setValue("redirectUrl", ad.redirectUrl || "");
      setRank(ad.rank ?? null);
      if (ad.image) setExistingImage(ad.image);
    } catch (err: any) {
      console.log("Erroor....", err);
      toast.error(err.response?.data?.message || "Failed to fetch ad");
      onClose();
    } finally {
      setLoading(false);
    }
  };

  // ── Image handler ───────────────────────────────────────────────────────────
  const handleImage = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageFile(file);
    const reader = new FileReader();
    reader.onload = (ev) => setImagePreview(ev.target?.result as string);
    reader.readAsDataURL(file);
  };

  // ── Submit ──────────────────────────────────────────────────────────────────
  const onSubmit = async (data: {
    title: string;
    description: string;
    redirectUrl: string;
  }) => {
    setIsSubmitting(true);
    try {
      const formData = new FormData();
      formData.append("title", data.title);
      formData.append("description", data.description);
      formData.append("redirectUrl", data.redirectUrl);
      if (rank !== null) formData.append("rank", String(rank));

      if (imageFile) {
        formData.append("image", imageFile);
      } else if (existingImage) {
        formData.append("image", existingImage);
      }

      const url = isEditMode ? `/api/ads/${adId}` : `/api/ads`;
      const method = isEditMode ? "put" : "post";

      const res = await axiosInstance.request({
        url,
        method,
        data: formData,
        headers: { "Content-Type": "multipart/form-data" },
      });

      toast.success(
        res.data.message ||
          `Ad ${isEditMode ? "updated" : "created"} successfully!`
      );
      onSuccess();
    } catch (err: any) {
      toast.error(
        err.response?.data?.message ||
          `Failed to ${isEditMode ? "update" : "create"} ad`
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center p-8">
        <i className="pi pi-spin pi-spinner text-3xl text-blue-500"></i>
      </div>
    );
  }

  return (
    <div className="px-4 pt-2 pb-4 min-h-[60vh]">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        {/* ── Basic Info ── */}
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-gray-800 flex items-center gap-2">
            <i className="pi pi-megaphone text-blue-600"></i>
            Basic Information
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {/* Title */}
            <div className="space-y-1">
              <label className="text-sm font-semibold text-gray-700">
                Title <span className="text-red-500">*</span>
              </label>
              <div className="p-inputgroup">
                <span className="p-inputgroup-addon bg-blue-50">
                  <i className="pi pi-pencil text-blue-600"></i>
                </span>
                <InputText
                  className="w-full"
                  placeholder="e.g. Cosmetic Adds"
                  {...register("title", { required: "Title is required" })}
                />
              </div>
              {errors.title && (
                <small className="text-red-500 flex items-center gap-1">
                  <i className="pi pi-exclamation-circle"></i>
                  {errors.title.message}
                </small>
              )}
            </div>

            {/* Rank */}
            <div className="space-y-1">
              <label className="text-sm font-semibold text-gray-700">
                Rank
              </label>
              <div className="p-inputgroup">
                <span className="p-inputgroup-addon bg-indigo-50">
                  <i className="pi pi-sort-numeric-up text-indigo-600"></i>
                </span>
                <InputNumber
                  value={rank}
                  onValueChange={(e) => setRank(e.value ?? null)}
                  placeholder="e.g. 1"
                  min={1}
                  className="w-full"
                  inputClassName="w-full"
                />
              </div>
            </div>

            {/* Description */}
            <div className="space-y-1">
              <label className="text-sm font-semibold text-gray-700">
                Description
              </label>
              <InputText
                className="w-full"
                placeholder="Short description"
                {...register("description")}
              />
            </div>

            {/* Redirect URL */}
            <div className="space-y-1">
              <label className="text-sm font-semibold text-gray-700">
                Redirect URL
              </label>
              <div className="p-inputgroup">
                <span className="p-inputgroup-addon bg-green-50">
                  <i className="pi pi-link text-green-600"></i>
                </span>
                <InputText
                  className="w-full"
                  placeholder="https://example.com"
                  {...register("redirectUrl")}
                />
              </div>
            </div>
          </div>
        </div>

        {/* ── Ad Image ── */}
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-gray-800 flex items-center gap-2">
            <i className="pi pi-image text-green-600"></i>
            Ad Image
          </h3>

          {(imagePreview || existingImage) && (
            <div className="relative w-48 h-32 rounded overflow-hidden border">
              <img
                src={imagePreview || existingImage}
                alt="ad"
                className="w-full h-full object-cover"
              />
              <button
                type="button"
                onClick={() => {
                  setImageFile(null);
                  setImagePreview("");
                  setExistingImage("");
                }}
                className="absolute top-1 right-1 bg-red-500 text-white p-1 rounded-full text-xs"
              >
                ×
              </button>
            </div>
          )}

          <input
            type="file"
            accept="image/*"
            onChange={handleImage}
            className="w-full p-2 border border-yellow-300 rounded-lg"
          />
        </div>

        {/* ── Buttons ── */}
        <div className="flex gap-3 pt-3">
          <Button
            type="button"
            label="Cancel"
            icon="pi pi-times"
            onClick={onClose}
            outlined
            disabled={isSubmitting}
            className="flex-1 bg-gray-100 text-gray-700 border-0 hover:bg-gray-200"
          />
          <Button
            type="submit"
            label={
              isSubmitting
                ? "Saving..."
                : isEditMode
                ? "Update Ad"
                : "Create Ad"
            }
            icon={isSubmitting ? "pi pi-spin pi-spinner" : "pi pi-check"}
            disabled={isSubmitting}
            className="flex-1 bg-gradient-to-r from-blue-500 to-blue-600 border-0 text-white shadow-lg"
          />
        </div>
      </form>
    </div>
  );
}

export default AdsForm;