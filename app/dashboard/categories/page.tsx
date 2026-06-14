"use client";
import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import axiosInstance from "@/service/axios.service";
import { ToastContainer, toast } from "react-toastify";
import { DataTable } from "primereact/datatable";
import { Column } from "primereact/column";
import { InputText } from "primereact/inputtext";
import { IconField } from "primereact/iconfield";
import { InputIcon } from "primereact/inputicon";
import { Button } from "primereact/button";
import { formatDate } from "@/helper/DateTime";
import { Dialog } from "primereact/dialog";
import CategoryForm from "@/components/category/CategoryForm";
import { ConfirmDialog, confirmDialog } from "primereact/confirmdialog";

type SubCategory = {
  _id: string;
  name: string;
  image?: string;
  isActive?: boolean;
  createdAt?: string;
  updatedAt?: string;
};

type CategoryRow = {
  _id: string;
  name: string;
  image?: string;
  description?: string;
  isActive?: boolean;
  subCategories?: SubCategory[];
  createdAt?: string;
  updatedAt?: string;
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
  for (let i = 0; i < str.length; i += 1) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }

  return colors[Math.abs(hash) % colors.length];
};

const EmptyState = () => (
  <div className="flex flex-col items-center justify-center h-full text-center py-12 px-4">
    <div className="text-6xl mb-4">🗂️</div>
    <h2 className="text-xl font-semibold text-gray-700">No Categories Found</h2>
    <p className="text-gray-500 mt-2 max-w-md">
      There are no categories to display right now.
    </p>
  </div>
);

function Page() {
  const [categoryData, setCategoryData] = useState<CategoryRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchInput, setSearchInput] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [visible, setVisible] = useState(false);
  const [editCategoryId, setEditCategoryId] = useState<string | null>(null);

  const categoryDataGet = async () => {
    try {
      setLoading(true);
      const res = await axiosInstance.get("/api/category");
      setCategoryData(res.data.categories || []);
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

  const handleDelete = (rowData: CategoryRow) => {
    confirmDialog({
      message: `Are you sure you want to delete "${rowData.name}"?`,
      header: "Delete Confirmation",
      icon: "pi pi-exclamation-triangle",
      acceptClassName: "p-button-danger",
      accept: async () => {
        try {
          const res = await axiosInstance.delete(
            `/api/category/${rowData._id}`,
          );
          toast.success(res.data.message || "Category deleted successfully");
          categoryDataGet();
        } catch (err: any) {
          toast.error(err?.response?.data?.message || "Delete failed");
        }
      },
    });
  };

  useEffect(() => {
    categoryDataGet();
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchInput.trim()), 500);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const filteredCategories = useMemo(() => {
    if (!debouncedSearch) return categoryData;

    const term = debouncedSearch.toLowerCase();

    return categoryData.filter((category) =>
      [
        category.name,
        category.description,
        ...(category.subCategories?.map((subCategory) => subCategory.name) ??
          []),
      ].some((value) =>
        String(value || "")
          .toLowerCase()
          .includes(term),
      ),
    );
  }, [categoryData, debouncedSearch]);

  const categoryImageTemplate = (rowData: CategoryRow) => {
    if (rowData.image) {
      return (
        <div className="h-14 w-14 rounded-xl overflow-hidden border border-gray-200 bg-gray-100 mx-auto">
          <img
            src={rowData.image}
            alt={rowData.name}
            className="h-full w-full object-cover"
          />
        </div>
      );
    }

    return (
      <div
        className={`h-14 w-14 rounded-xl flex items-center justify-center text-white text-lg font-bold mx-auto ${stringToBg(rowData.name)}`}
      >
        {getInitials(rowData.name)}
      </div>
    );
  };

  const statusTemplate = (rowData: CategoryRow) => (
    <span
      className={`px-2 py-1 rounded-full text-xs font-medium ${
        rowData.isActive
          ? "bg-green-100 text-green-800"
          : "bg-red-100 text-red-800"
      }`}
    >
      {rowData.isActive ? "Active" : "Inactive"}
    </span>
  );

  const subCategoryTemplate = (rowData: CategoryRow) => {
    if (!rowData.subCategories?.length) {
      return (
        <span className="text-sm text-gray-400 italic">No subcategories</span>
      );
    }

    return (
      <div className="min-w-[280px] max-w-[520px]">
        <div className="flex flex-col gap-2">
          {rowData.subCategories.map((subCategory) => (
            <div
              key={subCategory._id}
              className="flex items-center gap-3 rounded-lg border border-gray-200 bg-gray-50 px-2.5 py-2"
            >
              {subCategory.image ? (
                <img
                  src={subCategory.image}
                  alt={subCategory.name}
                  className="h-8 w-8 rounded-md object-cover flex-shrink-0"
                />
              ) : (
                <div
                  className={`h-8 w-8 rounded-md flex items-center justify-center text-white text-xs font-bold flex-shrink-0 ${stringToBg(subCategory.name)}`}
                >
                  {getInitials(subCategory.name)}
                </div>
              )}

              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-gray-800 truncate">
                    {subCategory.name}
                  </span>
                  <span
                    className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${subCategory.isActive ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}
                  >
                    {subCategory.isActive ? "Active" : "Inactive"}
                  </span>
                </div>
                <p className="text-[11px] text-gray-500">
                  Created {formatDate(subCategory.createdAt || "")}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const header = (
    <div
      className="flex flex-col gap-2 sm:flex-row sm:justify-between sm:items-center p-2 sm:p-3 rounded-lg"
      style={{ background: "linear-gradient(120deg,#f3be27,#e4a90e)" }}
    >
      <div className="min-w-0">
        <h2 className="text-sm sm:text-base font-semibold text-gray-800">
          Categories
        </h2>
        <p className="text-xs text-gray-700">
          Manage categories and subcategories
        </p>
      </div>

      <div className="flex flex-col sm:flex-row gap-1 sm:gap-2 items-stretch sm:items-center w-full sm:w-auto">
        <IconField
          iconPosition="left"
          className="w-full sm:w-auto flex-1 sm:flex-none"
        >
          <InputIcon className="pi pi-search" />
          <InputText
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search category or subcategory"
            className="p-inputtext-sm w-full"
          />
        </IconField>

        <Button
          label="Add Category"
          icon="pi pi-plus"
          onClick={() => {
            setEditCategoryId(null);
            setVisible(true);
          }}
          className="w-full sm:w-auto"
          style={{
            background: "#fff",
            color: "#d89f00",
            border: "1px solid #e0ac1f",
          }}
        />

        <Button
          label="Refresh"
          icon="pi pi-refresh"
          onClick={categoryDataGet}
          className="w-full sm:w-auto"
          style={{
            background: "#fff",
            color: "#d89f00",
            border: "1px solid #e0ac1f",
          }}
        />
      </div>
    </div>
  );

  return (
    <div className="w-full flex justify-start items-start pt-2">
      <div className="w-full bg-white rounded-lg shadow p-2 sm:p-4">
        {header}

        {filteredCategories.length === 0 && !loading && <EmptyState />}

        {filteredCategories.length > 0 && (
          <div className="mt-3 overflow-hidden rounded-lg border border-gray-200">
            <DataTable
              value={filteredCategories}
              loading={loading}
              stripedRows
              scrollable
              scrollHeight="flex"
              responsiveLayout="scroll"
              className="p-datatable-sm"
              emptyMessage="No categories found"
              dataKey="_id"
              tableStyle={{ minWidth: "900px" }}
            >
              <Column
                header="#"
                body={(_, options) => options.rowIndex + 1}
                style={{ width: "72px" }}
              />
              <Column
                header="Image"
                body={categoryImageTemplate}
                style={{ width: "110px" }}
              />
              <Column field="name" header="Name" sortable />
              <Column
                field="description"
                header="Description"
                body={(rowData: CategoryRow) => (
                  <span className="text-sm text-gray-600">
                    {rowData.description || "No description"}
                  </span>
                )}
              />
              <Column
                field="isActive"
                header="Status"
                body={statusTemplate}
                style={{ width: "120px" }}
              />
              <Column header="Subcategories" body={subCategoryTemplate} />
              <Column
                field="createdAt"
                header="Created"
                body={(rowData: CategoryRow) => (
                  <span className="text-sm text-gray-600">
                    {formatDate(rowData.createdAt || "")}
                  </span>
                )}
                style={{ width: "160px" }}
              />
              <Column
                header="Actions"
                style={{ width: "160px" }}
                body={(rowData: CategoryRow) => (
                  <div className="flex gap-2">
                    <Button
                      icon="pi pi-pencil"
                      label="Edit"
                      onClick={() => {
                        setEditCategoryId(rowData._id);
                        setVisible(true);
                      }}
                      style={{
                        background: "#ffcf00",
                        color: "#1d232f",
                        border: "1px solid #e0ac1f",
                        padding: "4px 10px",
                        fontSize: "12px",
                      }}
                    />
                    <Button
                      icon="pi pi-trash"
                      label="Delete"
                      severity="danger"
                      style={{ padding: "4px 10px", fontSize: "12px" }}
                      onClick={() => handleDelete(rowData)}
                    />
                  </div>
                )}
              />
            </DataTable>
          </div>
        )}

        <Dialog
          header={
            <div className="flex items-center gap-3 bg-gradient-to-r from-blue-500 to-indigo-600 mb-2 p-3 rounded-t-lg">
              <div className="bg-white/20 backdrop-blur-sm p-2 rounded-lg">
                <i className="pi pi-tag text-white text-xl"></i>
              </div>
              <div>
                <h2 className="text-lg font-semibold text-white">
                  {editCategoryId ? "Edit Category" : "Add New Category"}
                </h2>
                <p className="text-sm text-white/90">
                  {editCategoryId
                    ? "Update category information"
                    : "Create a new category"}
                </p>
              </div>
            </div>
          }
          visible={visible}
          style={{ width: "60vw" }}
          contentStyle={{ maxHeight: "85vh", overflow: "auto" }}
          onHide={() => {
            setVisible(false);
            setEditCategoryId(null);
          }}
        >
          <CategoryForm
            categoryId={editCategoryId}
            onClose={() => {
              setVisible(false);
              setEditCategoryId(null);
            }}
            onSuccess={() => {
              categoryDataGet();
              setVisible(false);
              setEditCategoryId(null);
            }}
          />
        </Dialog>

        <ConfirmDialog />

        <ToastContainer position="top-right" />
      </div>
    </div>
  );
}

export default Page;
