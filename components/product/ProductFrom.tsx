"use client";

import React, { useEffect, useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { InputText } from "primereact/inputtext";
import { InputNumber } from "primereact/inputnumber";
import { Dropdown } from "primereact/dropdown";
import { MultiSelect } from "primereact/multiselect";
import { Checkbox } from "primereact/checkbox";
import { Button } from "primereact/button";
import { Dialog } from "primereact/dialog";
import { toast } from "react-toastify";
import axiosInstance from "@/service/axios.service";
import { createProductSchema, updateProductSchema } from "@/helper/schema/Schema";
// import TankForm from "@/components/tank/TankForm";

type CreateProductFormData = z.infer<typeof createProductSchema>;
type UpdateProductFormData = z.infer<typeof updateProductSchema>;

type ProductFormProps = {
    productId: string | null;
    onClose: () => void;
    onSuccess: () => void;
};

// product type/unit options removed for simplified product form

function ProductFrom({ productId, onClose, onSuccess }: ProductFormProps) {
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [loading, setLoading] = useState(false);
    // tanks and tank dialog removed for simplified product form
    const isEditMode = !!productId;

    const {
        register,
        handleSubmit,
        control,
        reset,
        setValue,
        watch,
        formState: { errors },
    } = useForm<CreateProductFormData | UpdateProductFormData>({
        resolver: zodResolver(isEditMode ? updateProductSchema : createProductSchema),
        defaultValues: isEditMode
            ? {
                name: "",
                description: "",
                sellingPrice: 0,
                storeId: undefined,
            }
            : {
                name: "",
                description: "",
                sellingPrice: 0,
                storeId: undefined,
            },
    });

    const [imageFiles, setImageFiles] = useState<File[]>([]);
    const [existingImages, setExistingImages] = useState<string[]>([]);
    const [imagePreviews, setImagePreviews] = useState<string[]>([]);
    const [stores, setStores] = useState<any[]>([]);

    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files) return;
        const files = Array.from(e.target.files);
        setImageFiles((prev) => [...prev, ...files]);
        files.forEach((file) => {
            const reader = new FileReader();
            reader.onload = (ev) => {
                setImagePreviews((p) => [...p, ev.target?.result as string]);
            };
            reader.readAsDataURL(file);
        });
    };

    const removeImage = (index: number, isExisting = false) => {
        if (isExisting) {
            setExistingImages((prev) => prev.filter((_, i) => i !== index));
        } else {
            setImageFiles((prev) => prev.filter((_, i) => i !== index));
            setImagePreviews((prev) => prev.filter((_, i) => i !== index));
        }
    };

    // product type/unit logic removed for simplified product form

    useEffect(() => {
        fetchStores();
        if (productId) {
            fetchProductData();
        }
    }, [productId]);

    // tank helpers removed for simplified product form

    const fetchProductData = async () => {
        try {
            setLoading(true);
            const res = await axiosInstance.get(`/api/product/single-product/${productId}`);
            const product = res.data.product;

            setValue("name", product.name);
            setValue("description", product.description || "");
            setValue("sellingPrice", product.sellingPrice || 0);
            // isActive handled server-side; not part of simplified client form
            // populate existing images for edit mode
            if (product.images && Array.isArray(product.images)) {
                setExistingImages(product.images || []);
            }
            // populate storeId if present
            if (product.storeId) setValue("storeId", product.storeId);
        } catch (error: any) {
            toast.error(error.response?.data?.message || "Failed to fetch product data");
            onClose();
        } finally {
            setLoading(false);
        }
    };

    const fetchStores = async () => {
        try {
            const res = await axiosInstance.get('/api/register/user-based-stores');
            // API returns { totalStores, stores: [...] }
            const list = res.data?.stores || [];
            setStores(list);
        } catch (err: any) {
            console.error('Failed to fetch user stores', err);
        }
    };

    const onSubmit = async (data: CreateProductFormData | UpdateProductFormData) => {
        setIsSubmitting(true);
        try {
            const url = isEditMode
                ? `/api/product/update-product/${productId}`
                : `/api/product/create-product`;

            const formData = new FormData();
            formData.append("name", (data as any).name || "");
            formData.append("description", (data as any).description || "");
            formData.append("sellingPrice", String((data as any).sellingPrice ?? 0));
            if ((data as any).storeId) formData.append("storeId", String((data as any).storeId));

            existingImages.forEach((url, idx) => {
                formData.append(`existingImages[${idx}]`, url);
            });

            imageFiles.forEach((file, idx) => {
                formData.append(`image[${idx}]`, file);
            });

            const res = await axiosInstance.request({
                url,
                method: isEditMode ? 'put' : 'post',
                data: formData,
                headers: { 'Content-Type': 'multipart/form-data' },
            });

            toast.success(res.data.message || `Product ${isEditMode ? 'updated' : 'created'} successfully!`);
            reset();
            setImageFiles([]);
            setImagePreviews([]);
            setExistingImages([]);
            onSuccess();
        } catch (error: any) {
            console.error("Product operation error:", error);
            toast.error(error.response?.data?.message || `Failed to ${isEditMode ? "update" : "create"} product`);
        } finally {
            setIsSubmitting(false);
        }
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center p-4">
                <i className="pi pi-spin pi-spinner text-3xl text-blue-500"></i>
            </div>
        );
    }

    return (
        <div className="px-4 pt-2 pb-4 min-h-[80vh]">
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                {/* Basic Information */}
                <div className="space-y-3">
                    <h3 className="text-sm font-semibold text-gray-800 flex items-center gap-2">
                        <i className="pi pi-box text-blue-600"></i>
                        Basic Information
                    </h3>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div className="space-y-1">
                            <label className="text-sm font-semibold text-gray-700">
                                Product Name <span className="text-red-500">*</span>
                            </label>
                            <div className="p-inputgroup">
                                <span className="p-inputgroup-addon bg-blue-50">
                                    <i className="pi pi-tag text-blue-600"></i>
                                </span>
                                <InputText
                                    className="w-full"
                                    {...register("name")}
                                    placeholder="Enter product name"
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
                            <label className="text-sm font-semibold text-gray-700">Description</label>
                            <InputText className="w-full" {...register("description") as any} placeholder="Short description" />
                        </div>
                    </div>
                </div>

                {/* Pricing */}
                <div className="space-y-3">
                    <h3 className="text-sm font-semibold text-gray-800 flex items-center gap-2">
                        <span className="text-green-600 text-base">₹</span>
                        Pricing
                    </h3>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div className="space-y-1">
                            <label className="text-sm font-semibold text-gray-700">Selling Price <span className="text-red-500">*</span></label>
                            <Controller
                                name="sellingPrice"
                                control={control}
                                render={({ field }) => (
                                    <InputNumber
                                        value={field.value}
                                        onValueChange={(e) => field.onChange(e.value)}
                                        placeholder="Enter selling price"
                                        min={0}
                                        className="w-full"
                                        useGrouping={false}
                                        mode="decimal"
                                        minFractionDigits={2}
                                        maxFractionDigits={2}
                                    />
                                )}
                            />
                            {errors.sellingPrice && (
                                <small className="text-red-500 flex items-center gap-1">
                                    <i className="pi pi-exclamation-circle"></i>
                                    {errors.sellingPrice.message}
                                </small>
                            )}
                        </div>

                        <div className="space-y-1">
                            <label className="text-sm font-semibold text-gray-700">Store</label>
                            <Controller
                                name="storeId"
                                control={control}
                                render={({ field }) => (
                                    <Dropdown
                                        {...field}
                                        options={stores.map((s) => ({ label: s.storeName || s.storeName, value: s._id }))}
                                        optionLabel="label"
                                        optionValue="value"
                                        placeholder="Select store"
                                        className="w-full"
                                        onChange={(e) => field.onChange(e.value)}
                                    />
                                )}
                            />
                        </div>
                    </div>
                </div>

                {/* Images */}
                <div className="space-y-3">
                    <h3 className="text-sm font-semibold text-gray-800 flex items-center gap-2">
                        <i className="pi pi-image text-green-600"></i>
                        Product Images
                    </h3>

                    {existingImages.length > 0 && (
                        <div className="flex gap-2 flex-wrap">
                            {existingImages.map((url, idx) => (
                                <div key={idx} className="relative w-40 h-28 rounded overflow-hidden border">
                                    <img src={url} alt={`img-${idx}`} className="w-full h-full object-cover" />
                                    <button type="button" onClick={() => removeImage(idx, true)} className="absolute top-1 right-1 bg-red-500 text-white p-1 rounded-full text-xs">×</button>
                                </div>
                            ))}
                        </div>
                    )}

                    {imagePreviews.length > 0 && (
                        <div className="flex gap-2 flex-wrap">
                            {imagePreviews.map((src, idx) => (
                                <div key={idx} className="relative w-40 h-28 rounded overflow-hidden border">
                                    <img src={src} alt={`preview-${idx}`} className="w-full h-full object-cover" />
                                    <button type="button" onClick={() => removeImage(idx, false)} className="absolute top-1 right-1 bg-red-500 text-white p-1 rounded-full text-xs">×</button>
                                </div>
                            ))}
                        </div>
                    )}

                    <div className="space-y-1">
                        <input
                            type="file"
                            multiple
                            onChange={handleImageChange}
                            className="w-full p-2 border border-yellow-300 rounded-lg"
                            accept="image/*"
                        />
                    </div>
                </div>

                {/* Active status is managed by server; not editable here */}

                {/* SUBMIT BUTTONS */}
                <div className="flex gap-3 pt-3">
                    <Button
                        type="button"
                        label="Cancel"
                        icon="pi pi-times"
                        onClick={onClose}
                        className="flex-1 bg-gray-100 text-gray-700 border-0 hover:bg-gray-200"
                        outlined
                        disabled={isSubmitting}
                    />
                    <Button
                        type="submit"
                        label={isSubmitting ? "Saving..." : isEditMode ? "Update Product" : "Create Product"}
                        icon={isSubmitting ? "pi pi-spin pi-spinner" : "pi pi-check"}
                        className="flex-1 bg-gradient-to-r from-blue-500 to-blue-600 border-0 text-white shadow-lg hover:shadow-xl transform hover:scale-[1.02] transition-all duration-300"
                        disabled={isSubmitting}
                    />
                </div>
            </form>
        </div>
    );
}

export default ProductFrom;