"use client";

import React, { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { InputText } from "primereact/inputtext";
import { Button } from "primereact/button";
import { toast } from "react-toastify";
import axiosInstance from "@/service/axios.service";

type SubCategoryInput = {
  _id?: string;
  name: string;
  imageFile?: File;
  imagePreview?: string;
  existingImage?: string;
};

type CategoryFormProps = {
  categoryId: string | null;
  onClose: () => void;
  onSuccess: () => void;
};

function CategoryForm({ categoryId, onClose, onSuccess }: CategoryFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loading, setLoading] = useState(false);
  const isEditMode = !!categoryId;

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm({
    defaultValues: { name: "", description: "" },
  });

  const [categoryImageFile, setCategoryImageFile] = useState<File | null>(null);
  const [categoryImagePreview, setCategoryImagePreview] = useState<string>("");
  const [existingCategoryImage, setExistingCategoryImage] =
    useState<string>("");

  const [subCategories, setSubCategories] = useState<SubCategoryInput[]>([
    { name: "" },
  ]);

  // ── Fetch for edit mode ─────────────────────────────────────────────────────
  useEffect(() => {
    if (categoryId) fetchCategoryData();
  }, [categoryId]);

  const fetchCategoryData = async () => {
    try {
      setLoading(true);
      const res = await axiosInstance.get(`/api/category/${categoryId}`);
      const cat = res.data.category;
      setValue("name", cat.name);
      setValue("description", cat.description || "");
      if (cat.image) setExistingCategoryImage(cat.image);
      if (cat.subCategories?.length) {
        setSubCategories(
          cat.subCategories.map((s: any) => ({
            _id: s._id,
            name: s.name,
            imagePreview: s.image || "",
            existingImage: s.image || "",
          })),
        );
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to fetch category");
      onClose();
    } finally {
      setLoading(false);
    }
  };

  // ── Category image ──────────────────────────────────────────────────────────
  const handleCategoryImage = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setCategoryImageFile(file);
    const reader = new FileReader();
    reader.onload = (ev) =>
      setCategoryImagePreview(ev.target?.result as string);
    reader.readAsDataURL(file);
  };

  // ── Subcategory helpers ─────────────────────────────────────────────────────
  const addSubCategory = () =>
    setSubCategories((prev) => [...prev, { name: "" }]);

  const removeSubCategory = (idx: number) =>
    setSubCategories((prev) => prev.filter((_, i) => i !== idx));

  const updateSubCategoryName = (idx: number, name: string) =>
    setSubCategories((prev) =>
      prev.map((s, i) => (i === idx ? { ...s, name } : s)),
    );

  const handleSubCategoryImage = (
    idx: number,
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) =>
      setSubCategories((prev) =>
        prev.map((s, i) =>
          i === idx
            ? {
                ...s,
                imageFile: file,
                imagePreview: ev.target?.result as string,
              }
            : s,
        ),
      );
    reader.readAsDataURL(file);
  };

  // ── Submit ──────────────────────────────────────────────────────────────────
  const onSubmit = async (data: { name: string; description: string }) => {
    if (subCategories.some((s) => !s.name.trim())) {
      toast.error("All subcategory names are required");
      return;
    }

    setIsSubmitting(true);
    try {
      const formData = new FormData();
      formData.append("name", data.name);
      formData.append("description", data.description);

      // category image
      if (categoryImageFile) {
        formData.append("image", categoryImageFile);
      } else if (existingCategoryImage) {
        formData.append("image", existingCategoryImage);
      }

      // subCategories as JSON string (name array)
      const subCategoryNames = subCategories.map((s) => ({
        ...(s._id ? { _id: s._id } : {}), // ← add
        name: s.name.trim(),
      }));
      formData.append("subCategories", JSON.stringify(subCategoryNames));

      // subcategory images — subCategoryImage_0, subCategoryImage_1 ...
      subCategories.forEach((s, idx) => {
        if (s.imageFile) {
          formData.append(`subCategoryImage_${idx}`, s.imageFile);
        } else if (s.existingImage) {
          formData.append(`existingSubCategoryImage_${idx}`, s.existingImage);
        }
      });

      const url = isEditMode ? `/api/category/${categoryId}` : `/api/category`;
      const method = isEditMode ? "put" : "post";

      const res = await axiosInstance.request({
        url,
        method,
        data: formData,
        headers: { "Content-Type": "multipart/form-data" },
      });

      toast.success(
        res.data.message ||
          `Category ${isEditMode ? "updated" : "created"} successfully!`,
      );
      onSuccess();
    } catch (err: any) {
      toast.error(
        err.response?.data?.message ||
          `Failed to ${isEditMode ? "update" : "create"} category`,
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
    <div className="px-4 pt-2 pb-4 min-h-[80vh]">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        {/* ── Basic Info ── */}
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-gray-800 flex items-center gap-2">
            <i className="pi pi-tag text-blue-600"></i>
            Basic Information
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-sm font-semibold text-gray-700">
                Category Name <span className="text-red-500">*</span>
              </label>
              <div className="p-inputgroup">
                <span className="p-inputgroup-addon bg-blue-50">
                  <i className="pi pi-tag text-blue-600"></i>
                </span>
                <InputText
                  className="w-full"
                  placeholder="e.g. Groceries"
                  {...register("name", {
                    required: "Category name is required",
                  })}
                />
              </div>
              {errors.name && (
                <small className="text-red-500 flex items-center gap-1">
                  <i className="pi pi-exclamation-circle"></i>
                  {errors.name.message}
                </small>
              )}
            </div>

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
          </div>
        </div>

        {/* ── Category Image ── */}
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-gray-800 flex items-center gap-2">
            <i className="pi pi-image text-green-600"></i>
            Category Image
          </h3>
          {(categoryImagePreview || existingCategoryImage) && (
            <div className="relative w-40 h-28 rounded overflow-hidden border">
              <img
                src={categoryImagePreview || existingCategoryImage}
                alt="category"
                className="w-full h-full object-cover"
              />
              <button
                type="button"
                onClick={() => {
                  setCategoryImageFile(null);
                  setCategoryImagePreview("");
                  setExistingCategoryImage("");
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
            onChange={handleCategoryImage}
            className="w-full p-2 border border-yellow-300 rounded-lg"
          />
        </div>

        {/* ── Subcategories ── */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-800 flex items-center gap-2">
              <i className="pi pi-sitemap text-purple-600"></i>
              Subcategories
            </h3>
            <Button
              type="button"
              label="Add"
              icon="pi pi-plus"
              onClick={addSubCategory}
              style={{
                background: "#ffcf00",
                color: "#1d232f",
                border: "1px solid #e0ac1f",
                padding: "4px 12px",
                fontSize: "12px",
              }}
            />
          </div>

          <div className="space-y-3">
            {subCategories.map((sub, idx) => (
              <div
                key={idx}
                className="border border-gray-200 rounded-lg p-3 bg-gray-50 space-y-2"
              >
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-gray-500 w-5">
                    {idx + 1}.
                  </span>
                  <div className="p-inputgroup flex-1">
                    <span className="p-inputgroup-addon bg-purple-50">
                      <i className="pi pi-tag text-purple-500"></i>
                    </span>
                    <InputText
                      value={sub.name}
                      onChange={(e) =>
                        updateSubCategoryName(idx, e.target.value)
                      }
                      placeholder={`Subcategory name`}
                      className="w-full"
                    />
                  </div>
                  {subCategories.length > 1 && (
                    <Button
                      type="button"
                      icon="pi pi-trash"
                      onClick={() => removeSubCategory(idx)}
                      severity="danger"
                      text
                      style={{ padding: "4px" }}
                    />
                  )}
                </div>

                {/* subcategory image */}
                {sub.imagePreview && (
                  <div className="relative w-24 h-16 rounded overflow-hidden border ml-7">
                    <img
                      src={sub.imagePreview}
                      alt={`sub-${idx}`}
                      className="w-full h-full object-cover"
                    />
                    <button
                      type="button"
                      onClick={() =>
                        setSubCategories((prev) =>
                          prev.map((s, i) =>
                            i === idx
                              ? {
                                  ...s,
                                  imageFile: undefined,
                                  imagePreview: "",
                                  existingImage: "",
                                }
                              : s,
                          ),
                        )
                      }
                      className="absolute top-1 right-1 bg-red-500 text-white p-1 rounded-full text-xs"
                    >
                      ×
                    </button>
                  </div>
                )}
                <div className="ml-7">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleSubCategoryImage(idx, e)}
                    className="w-full p-1.5 border border-purple-200 rounded-lg text-xs"
                  />
                </div>
              </div>
            ))}
          </div>
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
                  ? "Update Category"
                  : "Create Category"
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

export default CategoryForm;
