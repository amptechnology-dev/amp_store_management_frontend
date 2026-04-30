"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Avatar } from "primereact/avatar";

// ---------------- TYPES ----------------

type SidebarProps = {
  role: "ADMIN" | "MANAGER" | "CASHIER" | "STORE";
  user: {
    name: string;
    image: string;
    email: string;
  };
};

type MenuItem = {
  label: string;
  icon?: string;
  href?: string;
};

type Section = {
  title: string;
  items: MenuItem[];
};

// ---------------- COMPONENT ----------------

const Sidebar: React.FC<SidebarProps> = ({ role, user }) => {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [openMenus, setOpenMenus] = useState<Record<string, boolean>>({});
  const [isMobile, setIsMobile] = useState(false);

  const isActive = (href?: string) => {
    if (!href) return false;
    return pathname === href || pathname.startsWith(href + "/");
  };

  // Load collapsed state
  useEffect(() => {
    try {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);

      if (mobile) {
        // default collapsed on first mobile visit
        setCollapsed(true);
        try {
          window.localStorage.setItem("sidebarCollapsed", "1");
        } catch {}
      } else {
        const v = window.localStorage.getItem("sidebarCollapsed");
        setCollapsed(v === "1");
      }
    } catch (e) {
      console.log("Error loading sidebar state", e);
    }

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === "sidebarCollapsed") {
        setCollapsed(e.newValue === "1");
      }
    };

    const handleToggleEvent = () => {
      const v = window.localStorage.getItem("sidebarCollapsed");
      setCollapsed(v === "1");
    };

    const handleResize = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      if (mobile) {
        setCollapsed(true);
        try {
          window.localStorage.setItem("sidebarCollapsed", "1");
        } catch {}
      }
    };

    window.addEventListener("storage", handleStorageChange);
    window.addEventListener("sidebarToggle", handleToggleEvent);
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("storage", handleStorageChange);
      window.removeEventListener("sidebarToggle", handleToggleEvent);
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  const sections: Section[] = [
    {
      title: "Menu",
      items: [
        { label: "Products", icon: "pi-box", href: "/dashboard/products" },
        { label: "Store", icon: "pi-shop", href: "/dashboard/store" },
      ],
    },
  ];

  // ---------------- UI ----------------
  const sidebarWidth = isMobile ? 260 : collapsed ? 88 : 260;
  const sidebarStyle: React.CSSProperties = {
    width: sidebarWidth,
    background: "linear-gradient(180deg,#fff9e0,#ffefb7)",
    color: "#3f3010",
    position: "fixed",
    top: isMobile ? "64px" : 0,
    left: 0,
    height: isMobile ? "calc(100vh - 64px)" : "100vh",
    transition: "transform 0.28s ease, width 0.28s ease",
    transform: isMobile ? (collapsed ? "translateX(-100%)" : "translateX(0)") : "none",
    paddingTop: isMobile ? 12 : 20,
    overflowY: "auto",
    borderRight: "1px solid #efd992",
    zIndex: isMobile ? 1000 : undefined,
    boxShadow: isMobile ? "0 8px 20px rgba(0,0,0,0.08)" : undefined,
  };

  return (
    <nav style={sidebarStyle}>
      {/* HEADER */}
      <div style={{ padding: "0 20px", marginBottom: 20 }}>
        {!collapsed && <h2 style={{ margin: 0, color: "#3b2e0e" }}>Amp Store</h2>}
      </div>

      {/* USER */}
      {!collapsed && (
        <div style={{ padding: "0 20px", marginBottom: 20 }}>
          <div style={{ display: "flex", gap: 10 }}>
            <Avatar image={user.image} shape="circle" />
            <div>
              <div style={{ fontWeight: 600 }}>
                {user.name}
              </div>
              <div style={{ fontSize: 12, opacity: 0.7 }}>
                {user.email}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MENU */}
      <div style={{ padding: "0 10px" }}>
        {sections.map((sec) => (
          <div key={sec.title} style={{ marginBottom: 20 }}>
            {!collapsed && (
              <div style={{ fontSize: 11, opacity: 0.65, marginBottom: 8 }}>
                {sec.title}
              </div>
            )}

            {sec.items.map((item) => {
              const active = isActive(item.href);

              return (
                <div key={item.label}>
                  <Link
                    href={item.href || "#"}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 12,
                      padding: "11px 10px",
                      borderRadius: 10,
                      textDecoration: "none",
                      color: active ? "#4f3b0d" : "#6f5a20",
                      background: active
                        ? "linear-gradient(90deg,#ffe186,#ffd45e)"
                        : "rgba(255,255,255,0.45)",
                      border: active ? "1px solid #e8be45" : "1px solid #efd992",
                      marginBottom: 8,
                      fontWeight: active ? 700 : 600,
                    }}
                  >
                    {item.icon && <i className={`pi ${item.icon}`} />}
                    {!collapsed && <span style={{ flex: 1 }}>{item.label}</span>}
                  </Link>
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </nav>
  );
};

export default Sidebar;