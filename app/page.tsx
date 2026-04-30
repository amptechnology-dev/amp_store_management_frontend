"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import React from "react";

export default function Home() {
  const router = useRouter();

  return (
    <main className="jd-home jd-simple-home">
      <div className="jd-bg-orb jd-bg-orb-one" />
      <div className="jd-bg-orb jd-bg-orb-two" />

      <section className="jd-simple-shell">
        <div className="jd-simple-card">
          <div className="jd-brand jd-simple-brand">
            <Image src="/img/icons/icon-48x48.png" alt="Justdail" width={48} height={48} />
            <div>
              <h1>Justdail</h1>
              <p>Ecommerce Management System</p>
            </div>
          </div>

          <h2>Welcome to Justdail</h2>
          <p>
            Simple and reliable software for daily petrol pump operations.
            Manage sales, stock, workers, and billing from one place.
          </p>

          <div className="jd-simple-actions">
            <button className="jd-btn-primary" onClick={() => router.push("/login")}>
              Login
            </button>
          </div>

          <div className="jd-simple-image-wrap">
            <Image
              src="/img/avatars/avatar-1.jpg"
              alt="Justdail Home"
              width={680}
              height={240}
              className="jd-simple-image"
            />
          </div>
        </div>
      </section>
    </main>
  );
}
