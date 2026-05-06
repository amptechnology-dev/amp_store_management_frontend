"use client";

import React, { useEffect, useState } from "react";
import axiosInstance from "@/service/axios.service";
import { useProfileStore } from '@/lib/store/profileStore';
import axios from "axios";
import { ToastContainer, toast } from "react-toastify";
import { Dialog } from "primereact/dialog";
import { DataTable } from "primereact/datatable";
import { Column } from "primereact/column";
import { InputText } from "primereact/inputtext";
import { Dropdown } from "primereact/dropdown";
import { IconField } from "primereact/iconfield";
import { InputIcon } from "primereact/inputicon";
import { ConfirmDialog, confirmDialog } from "primereact/confirmdialog";
import { Button } from "primereact/button";
import { formatDate } from "@/helper/DateTime";
import StoreForm from "@/components/store/StoreForm";
import Image from "next/image";

const EmptyState = () => (
    <div className="flex flex-col items-center justify-center h-full text-center">
        <div className="text-6xl mb-4">🏪</div>
        <h2 className="text-xl font-semibold text-gray-700">
            No Stores Available
        </h2>
        <p className="text-gray-500 mt-2 max-w-md">
            You haven't added any stores yet. Once you create a store, it will appear
            here for management.
        </p>
    </div>
);

function StoreListPage() {
    const [loading, setLoading] = useState(false);
    const [storeData, setStoreData] = useState<any[]>([]);
    const [visible, setVisible] = useState(false);
    const [editStoreId, setEditStoreId] = useState<string | null>(null);
    const [viewMode, setViewMode] = useState<"card" | "table">("card");
    const [rankVisible, setRankVisible] = useState(false);
    const [rankStoreId, setRankStoreId] = useState<string | null>(null);
    const [rankValue, setRankValue] = useState<number | null>(null);
    const rankOptions = [1, 2, 3].map((rank) => ({ label: String(rank), value: rank }));

    const [pagination, setPagination] = useState({
        page: 1,
        rows: 5,
        total: 0,
    });

    const [searchInput, setSearchInput] = useState<string>("");
    const [debouncedSearch, setDebouncedSearch] = useState<string>("");

    /* ================= FETCH STORES ================= */
    const { profile, fetchProfile } = useProfileStore();

    useEffect(() => {
        // ensure profile is loaded first, then fetch stores
        fetchProfile();
    }, []);

    useEffect(() => {
        // only fetch stores after profile is available
        if (profile) storeDataGet();
    }, [profile, pagination.page, pagination.rows, debouncedSearch]);

    useEffect(() => {
        const t = setTimeout(() => setDebouncedSearch(searchInput.trim()), 500);
        return () => clearTimeout(t);
    }, [searchInput]);

    useEffect(() => {
        setPagination((prev) => ({ ...prev, page: 1 }));
    }, [debouncedSearch]);

    const storeDataGet = async () => {
        try {
            setLoading(true);

            // If ADMIN, fetch all stores with pagination/search
            if (profile?.role === 'ADMIN') {
                const res = await axiosInstance.get("/api/register/all-stores", {
                    params: {
                        page: pagination.page,
                        limit: pagination.rows,
                        ...(debouncedSearch ? { search: debouncedSearch } : {}),
                    },
                });

                setStoreData(res.data.stores || []);
                setPagination((prev) => ({
                    ...prev,
                    total: res.data.totalStores || 0,
                }));
            } else {
                // Non-admin (STORE users) see only their stores
                const res = await axiosInstance.get('/api/register/user-based-stores');
                const list = res.data?.stores || [];
                setStoreData(list);
                setPagination((prev) => ({
                    ...prev,
                    // set total to returned totalStores if present, otherwise list length
                    total: res.data?.totalStores ?? list.length,
                    // make rows equal to list length so paginator doesn't mismatch
                    rows: list.length > 0 ? list.length : prev.rows,
                    page: 1,
                }));
            }
        } catch (error: any) {
            if (axios.isAxiosError(error)) {
                toast.error(error.response?.data?.message || "Something went wrong");
            } else {
                toast.error("Unexpected error occurred");
            }
        } finally {
            setLoading(false);
        }
    };

    /* ================= ACTIONS ================= */
    const handleAddStore = () => {
        setEditStoreId(null);
        setVisible(true);
    };

    const handleUpdate = (rowData: any) => {
        setEditStoreId(rowData._id);
        setVisible(true);
    };

    const openRankDialog = (rowData: any) => {
        setRankStoreId(rowData._id);
        setRankValue(typeof rowData.rank === "number" ? rowData.rank : rowData.rank ? Number(rowData.rank) : null);
        setRankVisible(true);
    };

    const closeRankDialog = () => {
        setRankVisible(false);
        setRankStoreId(null);
        setRankValue(null);
    };

    const handleRankUpdate = async () => {
        if (!rankStoreId || rankValue === null || Number.isNaN(rankValue)) {
            toast.error("Please enter a valid rank");
            return;
        }

        if (rankValue < 1 || rankValue > 3) {
            toast.error("Rank must be between 1 and 3");
            return;
        }

        try {
            const res = await axiosInstance.patch(`/api/register/update-store-rank/${rankStoreId}`, {
                rank: rankValue,
            });
            toast.success(res.data.message || "Store rank updated successfully");
            closeRankDialog();
            await storeDataGet();
        } catch (err: any) {
            toast.error(err?.response?.data?.message || "Rank update failed");
        }
    };

    const verifyStore = async (rowData: any) => {
        try {
            const res = await axiosInstance.patch(`/api/register/verify-store-status/${rowData._id}`, {
                isVerify: !rowData.isVerify,
            });
            toast.success(res.data.message || "Store verification status updated successfully");
            await storeDataGet();
        } catch (err: any) {
            toast.error(err?.response?.data?.message || "Verification update failed");
        }
    };

    const confirmDelete = (rowData: any) => {
        confirmDialog({
            message: `Are you sure you want to delete "${rowData.storeName}"?`,
            header: "Delete Confirmation",
            icon: "pi pi-exclamation-triangle",
            acceptClassName: "p-button-danger",
            accept: async () => {
                try {
                    const res = await axiosInstance.delete(
                        `/api/register/delete-store-and-user/${rowData._id}`
                    );
                    toast.success(res.data.message || "Store deleted successfully");
                    await storeDataGet();
                } catch (err: any) {
                    toast.error(err?.response?.data?.message || "Delete failed");
                }
            },
        });
    };

    const imageTemplate = (images: string[]) => {
        return (
            <div className="w-full h-28 sm:h-32 md:h-36 lg:h-40 relative rounded-t-lg overflow-hidden bg-gray-100">
                <img
                    src={images[0]}
                    alt="Store"
                    className="absolute inset-0 h-full w-full object-cover"
                />
            </div>
        );
    };

    const getInitials = (name?: string) => {
        if (!name) return "?";
        const parts = name.trim().split(/\s+/);
        if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
        return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
    };

    const stringToBg = (str?: string) => {
        const colors = [
            "bg-blue-500",
            "bg-green-500",
            "bg-red-500",
            "bg-yellow-500",
            "bg-indigo-500",
            "bg-pink-500",
            "bg-teal-500",
            "bg-orange-500",
        ];
        if (!str) return colors[0];
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            hash = str.charCodeAt(i) + ((hash << 5) - hash);
        }
        return colors[Math.abs(hash) % colors.length];
    };

    const storeCardTemplate = (store: any) => {
        const initials = getInitials(store?.storeName || "");
        const bgClass = stringToBg(store?.storeName || "");
        const ownerName = store?.userId?.name || store?.ownerName || "Unknown Owner";

        return (
                <div key={store._id} className="bg-white rounded-xl shadow-md hover:shadow-lg transition-shadow overflow-hidden border border-gray-200 flex flex-col h-full">
                {/* Image Carousel */}
                {store.images && store.images.length > 0 ? (
                    imageTemplate(store.images)
                ) : (
                    <div className={`w-full h-28 sm:h-32 md:h-36 lg:h-40 flex items-center justify-center text-white text-3xl font-bold ${bgClass}`}>
                        {initials}
                    </div>
                )}

                {/* Store Info */}
                <div className="p-3 sm:p-4 flex flex-col gap-2 flex-1">
                    <div>
                        <h3 className="text-sm md:text-base font-semibold text-gray-800 mb-1 line-clamp-1">
                        {store.storeName}
                    </h3>
                        <p className="text-xs text-gray-600 line-clamp-1">
                            Owner: <span className="font-medium">{ownerName}</span>
                        </p>
                    </div>

                    {/* Location & Contact */}
                    <div className="text-xs text-gray-700 space-y-0.5 flex-1">
                        <p>
                            <span className="font-medium">📍 Location:</span>{" "}
                            {store.address?.area}, {store.address?.state}
                        </p>
                        <p>
                            <span className="font-medium">📞 Contact:</span> {store.contactNo}
                        </p>
                        <p>
                            <span className="font-medium">📧 Email:</span> {store.email}
                        </p>
                        <p>
                            <span className="font-medium">⏰ Timing:</span> {store.timing?.open} -{" "}
                            {store.timing?.close}
                        </p>
                    </div>

                    {/* Status Badge */}
                    <div className="flex items-center gap-2 flex-wrap">
                        <span
                            className={`px-2 py-0.5 rounded-full text-xs font-semibold ${store.isActive
                                    ? "bg-green-100 text-green-800"
                                    : "bg-red-100 text-red-800"
                                }`}
                        >
                            {store.isActive ? "✓ Active" : "✗ Inactive"}
                        </span>
                        {store.isVerify && (
                            <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-800">
                                ✓ Verified
                            </span>
                        )}
                    </div>

                    {/* Action Buttons */}
                    <div className="grid grid-cols-2 gap-2 mt-auto pt-1 md:grid-cols-4">
                        {profile?.role === "STORE" ? (
                            <>
                                <Button
                                    icon="pi pi-pencil"
                                    label="Edit"
                                    onClick={() => handleUpdate(store)}
                                    className="w-full text-xs"
                                    style={{
                                        background: "#ffcf00",
                                        color: "#1d232f",
                                        border: "1px solid #e0ac1f",
                                        padding: "4px 8px",
                                    }}
                                />
                                <Button
                                    icon="pi pi-trash"
                                    label="Delete"
                                    onClick={() => confirmDelete(store)}
                                    className="w-full text-xs"
                                    severity="danger"
                                    style={{
                                        padding: "4px 8px",
                                    }}
                                />
                            </>
                        ) : profile?.role === "ADMIN" ? (
                            <>
                                <Button
                                    icon="pi pi-pencil"
                                    label="Edit"
                                    onClick={() => handleUpdate(store)}
                                    className="w-full text-xs"
                                    style={{
                                        background: "#ffcf00",
                                        color: "#1d232f",
                                        border: "1px solid #e0ac1f",
                                        padding: "4px 8px",
                                    }}
                                />
                                <Button
                                    icon="pi pi-trash"
                                    label="Delete"
                                    onClick={() => confirmDelete(store)}
                                    className="w-full text-xs"
                                    severity="danger"
                                    style={{
                                        padding: "4px 8px",
                                    }}
                                />
                                <Button
                                    icon={store.isVerify ? "pi pi-check-circle" : "pi pi-shield"}
                                    label="Verified"
                                    onClick={() => verifyStore(store)}
                                    className="w-full text-xs"
                                    style={{
                                        background: store.isVerify ? "#dcfce7" : "#dbeafe",
                                        color: store.isVerify ? "#166534" : "#1d4ed8",
                                        border: "1px solid #e0ac1f",
                                        padding: "4px 8px",
                                    }}
                                />
                                <Button
                                    icon="pi pi-sort-numeric-down"
                                    label="Rank"
                                    onClick={() => openRankDialog(store)}
                                    className="w-full text-xs"
                                    style={{
                                        background: "#fff7db",
                                        color: "#8a5b00",
                                        border: "1px solid #e0ac1f",
                                        padding: "4px 8px",
                                    }}
                                />
                            </>
                        ) : null}
                    </div>
                </div>
            </div>
        );
    };

    const imageTableTemplate = (rowData: any) => {
        const initials = getInitials(rowData?.storeName || "");
        const bgClass = stringToBg(rowData?.storeName || "");

        if (rowData.images && rowData.images.length > 0) {
            return (
                <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-lg overflow-hidden border border-gray-200 bg-gray-100">
                    <img src={rowData.images[0]} alt="Store" className="h-full w-full object-cover" />
                </div>
            );
        }

        return (
            <div className={`h-10 w-10 sm:h-12 sm:w-12 rounded-lg flex items-center justify-center text-white font-semibold ${bgClass}`}>
                {initials}
            </div>
        );
    };

    const actionTemplate = (rowData: any) => {
        if (profile?.role === "STORE") {
            return (
                <div onClick={(e) => e.stopPropagation()} className="flex gap-2">
                    <Button
                        icon="pi pi-pencil"
                        label="Edit"
                        onClick={() => handleUpdate(rowData)}
                        className="flex-1 text-xs"
                        style={{
                            background: "#ffcf00",
                            color: "#1d232f",
                            border: "1px solid #e0ac1f",
                            padding: "4px 8px",
                        }}
                    />
                    <Button
                        icon="pi pi-trash"
                        label="Delete"
                        onClick={() => confirmDelete(rowData)}
                        className="flex-1 text-xs"
                        severity="danger"
                        style={{
                            padding: "4px 8px",
                        }}
                    />
                </div>
            );
        }

        if (profile?.role === "ADMIN") {
            return (
                <div onClick={(e) => e.stopPropagation()} className="flex gap-2">
                    <Button
                        icon="pi pi-pencil"
                        label="Edit"
                        onClick={() => handleUpdate(rowData)}
                        className="flex-1 text-xs"
                        style={{
                            background: "#ffcf00",
                            color: "#1d232f",
                            border: "1px solid #e0ac1f",
                            padding: "4px 8px",
                        }}
                    />
                    <Button
                        icon="pi pi-trash"
                        label="Delete"
                        onClick={() => confirmDelete(rowData)}
                        className="flex-1 text-xs"
                        severity="danger"
                        style={{
                            padding: "4px 8px",
                        }}
                    />
                    <Button
                        icon="pi pi-sort-numeric-down"
                        label="Rank"
                        onClick={() => openRankDialog(rowData)}
                        className="flex-1 text-xs"
                        style={{
                            background: "#fff7db",
                            color: "#8a5b00",
                            border: "1px solid #e0ac1f",
                            padding: "4px 8px",
                        }}
                    />
                    <Button
                        icon={rowData.isVerify ? "pi pi-check-circle" : "pi pi-shield"}
                        label="Verified"
                        onClick={() => verifyStore(rowData)}
                        className="flex-1 text-xs"
                        style={{
                            background: rowData.isVerify ? "#dcfce7" : "#dbeafe",
                            color: rowData.isVerify ? "#166534" : "#1d4ed8",
                            border: "1px solid #e0ac1f",
                            padding: "4px 8px",
                        }}
                    />
                </div>
            );
        }

        return null;
    };

    const header = (
        <div className="flex flex-col gap-2 sm:flex-row sm:justify-between sm:items-center p-2 sm:p-3 rounded-lg" style={{ background: "linear-gradient(120deg,#f3be27,#e4a90e)" }}>
            <div className="min-w-0">
                <h2 className="text-sm sm:text-base font-semibold text-gray-800">Stores</h2>
                <p className="text-xs text-gray-700">Manage stores</p>
            </div>

            <div className="flex flex-col sm:flex-row gap-1 sm:gap-2 items-stretch sm:items-center w-full sm:w-auto">
                <IconField iconPosition="left" className="w-full sm:w-auto flex-1 sm:flex-none">
                    <InputIcon className="pi pi-search" />
                    <InputText
                        value={searchInput}
                        onChange={(e) => setSearchInput(e.target.value)}
                        placeholder="Search store"
                        className="p-inputtext-sm w-full"
                    />
                </IconField>

                {/* View Mode Toggle */}
                <div className="flex gap-0.5 bg-white/30 rounded-lg p-1 w-full sm:w-auto justify-between sm:justify-start">
                    <Button
                        icon="pi pi-th"
                        onClick={() => setViewMode("card")}
                        className={viewMode === "card" ? "font-semibold" : ""}
                        style={{
                            minWidth: "36px",
                            padding: "6px",
                            background: viewMode === "card" ? "#fff" : "transparent",
                            color: viewMode === "card" ? "#d89f00" : "#1d232f",
                            border: "1px solid #e0ac1f",
                        }}
                    />
                    <Button
                        icon="pi pi-bars"
                        onClick={() => setViewMode("table")}
                        className={viewMode === "table" ? "font-semibold" : ""}
                        style={{
                            minWidth: "36px",
                            padding: "6px",
                            background: viewMode === "table" ? "#fff" : "transparent",
                            color: viewMode === "table" ? "#d89f00" : "#1d232f",
                            border: "1px solid #e0ac1f",
                        }}
                    />
                </div>

                <Button
                    label="Add Store"
                    icon="pi pi-plus"
                    onClick={handleAddStore}
                    className="w-full sm:w-auto"
                    style={{ background: "#fff", color: "#d89f00", border: "1px solid #e0ac1f" }}
                />
            </div>
        </div>
    );

    const EditStoreHeader = (
        <div className="flex items-center gap-3 p-3 rounded-t-lg" style={{ background: "linear-gradient(120deg,#f3be27,#e4a90e)" }}>
            <div className="bg-white/20 backdrop-blur-sm p-2 rounded-lg">
                <i className="pi pi-shop text-white text-xl"></i>
            </div>
            <div>
                <h2 className="text-lg font-semibold text-gray-800">Edit Store</h2>
                <p className="text-sm text-gray-700">Update store information</p>
            </div>
        </div>
    );

    const AddStoreHeader = (
        <div className="flex items-center gap-3 p-3 rounded-t-lg" style={{ background: "linear-gradient(120deg,#f3be27,#e4a90e)" }}>
            <div className="bg-white/20 backdrop-blur-sm p-2 rounded-lg">
                <i className="pi pi-shop text-white text-xl"></i>
            </div>
            <div>
                <h2 className="text-lg font-semibold text-gray-800">Add New Store</h2>
                <p className="text-sm text-gray-700">Create a new store</p>
            </div>
        </div>
    );

    const isStoreAddMode = profile?.role === "STORE" && !editStoreId;
    const storeCreateEndpoint = isStoreAddMode
        ? "/api/register/create-store"
        : "/api/register/create-user";

    return (
        <div className="w-full flex justify-start items-start pt-2">
            <div className="w-full bg-white rounded-lg shadow p-2 sm:p-4">
                {/* Header */}
                {header}

                {/* Empty State */}
                {storeData.length === 0 && !loading && (
                    <EmptyState />
                )}

                {/* Card View */}
                {viewMode === "card" && storeData.length > 0 && (
                    <div className="p-2 sm:p-3">
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-2 2xl:grid-cols-3 gap-4">
                            {storeData.map((store) => (
                                <div key={store._id} className="w-full">
                                    {storeCardTemplate(store)}
                                </div>
                            ))}
                        </div>

                        {/* Pagination for Card View */}
                        <div className="flex flex-col gap-3 sm:flex-row sm:justify-between sm:items-center mt-6 p-3 border-t border-gray-200">
                            <p className="text-xs sm:text-sm text-gray-600">
                                Showing {(pagination.page - 1) * pagination.rows + 1} to{" "}
                                {Math.min(pagination.page * pagination.rows, pagination.total)} of{" "}
                                {pagination.total} stores
                            </p>
                            <div className="flex gap-2 justify-between sm:justify-end">
                                <Button
                                    icon="pi pi-chevron-left"
                                    onClick={() =>
                                        setPagination((prev) =>
                                            prev.page > 1 ? { ...prev, page: prev.page - 1 } : prev
                                        )
                                    }
                                    disabled={pagination.page === 1}
                                    text
                                />
                                <span className="px-3 py-2 bg-gray-100 rounded text-xs sm:text-sm">
                                    {pagination.page} / {Math.ceil(pagination.total / pagination.rows)}
                                </span>
                                <Button
                                    icon="pi pi-chevron-right"
                                    onClick={() =>
                                        setPagination((prev) =>
                                            prev.page < Math.ceil(pagination.total / pagination.rows)
                                                ? { ...prev, page: prev.page + 1 }
                                                : prev
                                        )
                                    }
                                    disabled={
                                        pagination.page ===
                                        Math.ceil(pagination.total / pagination.rows)
                                    }
                                    text
                                />
                            </div>
                        </div>
                    </div>
                )}

                {/* Table View */}
                {viewMode === "table" && storeData.length > 0 && (
                    <DataTable
                        value={storeData}
                        lazy
                        paginator
                        first={(pagination.page - 1) * pagination.rows}
                        rows={pagination.rows}
                        totalRecords={pagination.total}
                        loading={loading}
                        rowsPerPageOptions={[5, 10, 25, 50]}
                        onPage={(e) =>
                            setPagination((prev) => ({
                                ...prev,
                                page: (e.page ?? 0) + 1,
                                rows: e.rows ?? prev.rows,
                            }))
                        }
                        responsiveLayout="scroll"
                    >
                        <Column header="Avatar" body={(row) => imageTableTemplate(row)} />
                        <Column header="Image" body={(row) => imageTableTemplate(row)} />
                        <Column field="storeName" header="Store Name" sortable />
                        <Column
                            header="Owner Name"
                            body={(row: any) => row.userId?.name || row.ownerName || "-"}
                        />
                        <Column field="email" header="Email" />
                        <Column field="contactNo" header="Contact" />
                        <Column field="storeUniqueId" header="Store ID" />
                        <Column
                            header="Location"
                            body={(row: any) => `${row.address?.area}, ${row.address?.state}`}
                        />
                        <Column
                            header="Created"
                            body={(row: any) => formatDate(row.createdAt)}
                        />
                        {(profile?.role === "ADMIN" || profile?.role === "STORE") && (
                            <Column header="Actions" body={actionTemplate} />
                        )}
                    </DataTable>
                )}

                {/* Loading State */}
                {loading && (
                    <div className="flex justify-center items-center h-64">
                        <i className="pi pi-spin pi-spinner text-4xl text-yellow-500"></i>
                    </div>
                )}

                <Dialog
                    header={editStoreId ? EditStoreHeader : AddStoreHeader}
                    visible={visible}
                    style={{ width: "60vw" }}
                    contentStyle={{ maxHeight: "85vh", overflow: "auto" }}
                    onHide={() => {
                        setVisible(false);
                        setEditStoreId(null);
                    }}
                >
                    <StoreForm
                        storeId={editStoreId}
                        mode={isStoreAddMode ? "store" : "admin"}
                        createEndpoint={storeCreateEndpoint}
                        onClose={() => {
                            setVisible(false);
                            setEditStoreId(null);
                        }}
                        onSuccess={() => {
                            storeDataGet();
                            setVisible(false);
                            setEditStoreId(null);
                        }}
                    />
                </Dialog>

                <Dialog
                    header="Update Store Rank"
                    visible={rankVisible}
                    style={{ width: "28rem" }}
                    contentStyle={{ overflow: "visible" }}
                    onHide={closeRankDialog}
                >
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <label className="text-sm font-semibold text-gray-700">
                                Rank <span className="text-red-500">*</span>
                            </label>
                            <Dropdown
                                value={rankValue}
                                onChange={(e) => setRankValue((e.value as number | null) ?? null)}
                                options={rankOptions}
                                placeholder="Select rank"
                                className="w-full"
                                panelClassName="!text-sm"
                            />
                            <p className="text-xs text-gray-500">Choose a rank from the dropdown.</p>
                        </div>

                        <div className="flex gap-3 pt-2">
                            <Button
                                type="button"
                                label="Cancel"
                                icon="pi pi-times"
                                onClick={closeRankDialog}
                                className="flex-1"
                                style={{ background: "#f5f5f5", color: "#666", border: "1px solid #ddd" }}
                            />
                            <Button
                                type="button"
                                label="Update Rank"
                                icon="pi pi-check"
                                onClick={handleRankUpdate}
                                className="flex-1"
                                style={{ background: "#f3be27", color: "#3b2f0f", border: "1px solid #e0ac1f" }}
                            />
                        </div>
                    </div>
                </Dialog>

                <ConfirmDialog />
                <ToastContainer position="top-right" />
            </div>
        </div>
    );
}

export default StoreListPage;
