"use client";

import React from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "primereact/button";
import { ToastContainer } from "react-toastify";
import StoreForm from "@/components/store/StoreForm";

export default function RegisterPage() {
	const router = useRouter();

	return (
		<main
			style={{
				minHeight: "100vh",
				padding: "18px 12px",
				background:
					"radial-gradient(850px 460px at 7% 10%, rgba(255, 205, 0, 0.28), transparent 60%), radial-gradient(760px 400px at 95% 90%, rgba(255, 187, 0, 0.2), transparent 60%), linear-gradient(170deg,#fffef6 0%, #fff8db 55%, #fff4c3 100%)",
			}}
		>
			<section style={{ maxWidth: 1240, margin: "0 auto" }}>
				<div
					style={{
						borderRadius: 24,
						overflow: "hidden",
						border: "1px solid #f0e2af",
						boxShadow: "0 12px 28px rgba(15,23,42,0.08)",
						background: "linear-gradient(180deg,#ffffff,#fffdf4)",
					}}
				>
					<div
						style={{
							display: "grid",
							gridTemplateColumns: "repeat(12, minmax(0, 1fr))",
							minHeight: "calc(100vh - 36px)",
						}}
					>
						<div
							style={{
								gridColumn: "span 12",
								padding: 24,
								background:
									"linear-gradient(180deg, rgba(255, 247, 204, 0.95) 0%, rgba(255, 253, 244, 0.98) 100%)",
								borderBottom: "1px solid #f2e5b7",
							}}
						>
							<div
								style={{
									display: "flex",
									alignItems: "center",
									justifyContent: "space-between",
									gap: 16,
									flexWrap: "wrap",
								}}
							>
								<div>
									<p style={{ margin: 0, color: "#a06f00", fontSize: 13, fontWeight: 700, letterSpacing: 1.2 }}>
										AMP SHOPPING
									</p>
									<h1 style={{ margin: "6px 0 0", color: "#3b2e0e", fontSize: 34, fontWeight: 800 }}>
										Register your store
									</h1>
									<p style={{ marginTop: 8, marginBottom: 0, color: "#6f5c2c", fontSize: 15, maxWidth: 760 }}>
										Create your store profile with the same powerful form used in the dashboard, wrapped in a cleaner and more welcoming public experience.
									</p>
								</div>

								<div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
									<Link href="/login" style={{ textDecoration: "none" }}>
										<Button
											type="button"
											label="Back to Login"
											icon="pi pi-sign-in"
											outlined
											style={{
												borderColor: "#e0ac1f",
												color: "#8a6711",
												background: "#fffef9",
											}}
										/>
									</Link>
									<Link href="/" style={{ textDecoration: "none" }}>
										<Button
											type="button"
											label="Home"
											icon="pi pi-home"
											text
											style={{ color: "#8a6711" }}
										/>
									</Link>
								</div>
							</div>
						</div>

						<aside
							style={{
								gridColumn: "span 12",
								padding: 24,
								borderBottom: "1px solid #f2e5b7",
							}}
						>
							<div
								style={{
									display: "grid",
									gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
									gap: 14,
								}}
							>
								{[
									{
										icon: "pi pi-check-circle",
										title: "Same API flow",
										text: "Uses the existing StoreForm submission logic and multipart payload structure.",
									},
									{
										icon: "pi pi-mobile",
										title: "Responsive design",
										text: "The layout stays clean on mobile, tablet, and desktop.",
									},
									{
										icon: "pi pi-shield",
										title: "Verified onboarding",
										text: "Built for a smoother store registration experience with validation and toasts.",
									},
								].map((item) => (
									<div
										key={item.title}
										style={{
											borderRadius: 18,
											padding: 18,
											background: "linear-gradient(180deg,#ffffff,#fffdf4)",
											border: "1px solid #f0e2af",
											boxShadow: "0 8px 18px rgba(15,23,42,0.04)",
										}}
									>
										<div
											style={{
												width: 44,
												height: 44,
												borderRadius: 14,
												display: "grid",
												placeItems: "center",
												background: "#fff6d4",
												border: "1px solid #efd78a",
												color: "#8a6a00",
												fontSize: 18,
												marginBottom: 12,
											}}
										>
											<i className={item.icon}></i>
										</div>
										<h3 style={{ margin: 0, color: "#3b2e0e", fontSize: 18, fontWeight: 700 }}>{item.title}</h3>
										<p style={{ margin: "8px 0 0", color: "#6f5c2c", fontSize: 14, lineHeight: 1.6 }}>
											{item.text}
										</p>
									</div>
								))}
							</div>
						</aside>

						<div
							style={{
								gridColumn: "span 12",
								padding: 24,
							}}
						>
							<div
								style={{
									borderRadius: 20,
									overflow: "hidden",
									border: "1px solid #f0e2af",
									boxShadow: "0 12px 28px rgba(15,23,42,0.08)",
									background: "linear-gradient(180deg,#ffffff,#fffdf4)",
								}}
							>
								<div style={{ padding: 24 }}>
									<div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
										<div>
											<h2 style={{ margin: 0, color: "#3b2e0e", fontSize: 28, fontWeight: 800 }}>
												Store Registration
											</h2>
											<p style={{ marginTop: 6, marginBottom: 0, color: "#6f5c2c", fontSize: 15 }}>
												Fill in your store details below. The same fields and API flow are used across the dashboard.
											</p>
										</div>
										<div
											style={{
												width: 52,
												height: 52,
												borderRadius: 16,
												display: "grid",
												placeItems: "center",
												background: "#fff6d4",
												border: "1px solid #efd78a",
												color: "#8a6a00",
												fontSize: 20,
												fontWeight: 700,
											}}
										>
											AMP
										</div>
									</div>

									<div style={{ marginTop: 18 }}>
										<StoreForm
											createEndpoint="/api/register/register-store-owner"
											onClose={() => router.push("/login")}
											onSuccess={() => router.push("/login")}
										/>
									</div>
								</div>
							</div>
						</div>
					</div>
				</div>
			</section>

			<ToastContainer position="top-right" />
		</main>
	);
}
