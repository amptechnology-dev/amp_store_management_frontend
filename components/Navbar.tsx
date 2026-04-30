"use client";

import React, { useEffect, useState } from "react";
import { Avatar } from "primereact/avatar";
import { Button } from "primereact/button";
import { Menu } from "primereact/menu";
import type { MenuItem } from "primereact/menuitem";
import axiosInstance from "@/service/axios.service";
import { toast } from "react-toastify";

interface NavbarProps {
    role: "ADMIN" | "MANAGER" | "CASHIER" | "STORE";
    user: {
        name: string;
        image: string;
    };
}

const Navbar: React.FC<NavbarProps> = ({ user, role }) => {
    const [collapsed, setCollapsed] = useState<boolean>(false);
    const [isMobile, setIsMobile] = useState<boolean>(false);
    const menuRef = React.useRef<Menu>(null);

    useEffect(() => {
        try {
            const v = window.localStorage.getItem('sidebarCollapsed');
            setCollapsed(v === '1');
        } catch (e) {
            // ignore
        }

        const handleToggleEvent = () => {
            const v = window.localStorage.getItem("sidebarCollapsed");
            setCollapsed(v === "1");
        };

        window.addEventListener("sidebarToggle", handleToggleEvent);

        const checkMobile = () => setIsMobile(window.innerWidth < 768);
        checkMobile();
        window.addEventListener('resize', checkMobile);

        return () => {
            window.removeEventListener("sidebarToggle", handleToggleEvent);
            window.removeEventListener('resize', checkMobile);
        };
    }, []);

    const handleLogout = async () => {
        try {
            await axiosInstance.post("/api/login/logout");
            localStorage.removeItem("login-token");
            document.cookie = "login-token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
            toast.success("Logged out successfully");
            setTimeout(() => (window.location.href = "/login"), 500);
        } catch (error: any) {
            console.error("Logout error:", error);
            localStorage.removeItem("login-token");
            document.cookie = "login-token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
            toast.error("Logout failed, but clearing session");
            setTimeout(() => (window.location.href = "/login"), 500);
        }
    };

    const userMenuItems: MenuItem[] = [
        {
            label: "Profile",
            icon: "pi pi-user",
            command: () => {
                window.location.href = "/dashboard/profile";
            },
        },
        { separator: true },
        {
            label: "Update Password",
            icon: "pi pi-lock",
            command: () => {
                window.location.href = "/dashboard/update-password";
            },
        },
        { separator: true },
        {
            label: "Log out",
            icon: "pi pi-sign-out",
            command: handleLogout,
        },
    ];

    const roleLabel =
        role === "ADMIN"
            ? "Administrator"
            : role === "MANAGER"
                ? "Manager"
                : role === "STORE"
                    ? "Store"
                    : "Cashier";

    const pageTitle = "Amp Store Management System";

    const toggleSidebar = () => {
        try {
            const next = !collapsed;
            setCollapsed(next);
            window.localStorage.setItem('sidebarCollapsed', next ? '1' : '0');
            window.dispatchEvent(new Event('sidebarToggle'));
        } catch (e) {
            console.log('Error toggling sidebar', e);
        }
    };

    const navStyle: React.CSSProperties = {
        background: "linear-gradient(90deg, #fffef9, #fff7db)",
        borderBottom: "1px solid #efd992",
        padding: isMobile ? "8px 12px" : "12px 24px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        boxShadow: "0 4px 14px rgba(128, 96, 9, 0.12)",
        position: "fixed",
        top: 0,
        left: isMobile ? 0 : (collapsed ? "88px" : "260px"),
        right: 0,
        height: isMobile ? "64px" : "72px",
        transition: "left 0.3s, padding 0.2s",
        zIndex: 999,
    };

    return (
        <nav style={navStyle}>
            <div style={{ display: "flex", alignItems: "center", gap: isMobile ? 10 : 16, flexWrap: 'wrap' }}>
                <Button
                    icon="pi pi-bars"
                    rounded
                    text
                    severity="secondary"
                    onClick={toggleSidebar}
                    style={{ color: "#9f6f00" }}
                />

                <div>
                    <h1 style={{ margin: 0, fontSize: isMobile ? 16 : 20, fontWeight: 700, color: "#3d2f0f" }}>
                        {pageTitle}
                    </h1>
                    {!isMobile && (
                        <p style={{ margin: 0, fontSize: 13, color: "#7a632b" }}>
                            Welcome back, manage Amp Store operations
                        </p>
                    )}
                </div>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: isMobile ? 8 : 12 }}>
                {!isMobile && (
                    <div style={{ width: 1, height: 32, background: "#e9d9a4", margin: "0 8px" }} />
                )}

                <div>
                    <Menu className="" model={userMenuItems} popup ref={menuRef} />
                    <div
                        onClick={(e) => menuRef.current?.toggle(e)}
                        style={{
                            display: "flex",
                            alignItems: "center",
                            gap: isMobile ? 8 : 12,
                            padding: isMobile ? "4px 8px" : "6px 12px",
                            borderRadius: 12,
                            cursor: "pointer",
                            border: "1px solid #efd992",
                            background: "#fffdf4",
                        }}
                    >
                        <Avatar image={user.image} shape="circle" />

                        {!isMobile && (
                            <div>
                                <div style={{ fontWeight: 600, color: "#3d2f0f" }}>{user.name}</div>
                                <div style={{ fontSize: 12, color: "#7a632b" }}>{roleLabel}</div>
                            </div>
                        )}

                        <i className="pi pi-chevron-down" style={{ color: "#9f6f00" }} />
                    </div>
                </div>
            </div>
        </nav>
    );
};

export default Navbar;
