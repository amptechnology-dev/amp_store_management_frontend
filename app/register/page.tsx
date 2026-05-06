"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { ToastContainer, toast } from "react-toastify";
import axiosInstance from "@/service/axios.service";

const registerSchema = z.object({
	name: z.string().trim().min(2, "Name is required"),
	email: z.string().trim().email("Enter a valid email address"),
	phone: z.string().trim().min(10, "Phone number is required"),
	password: z.string().min(6, "Password must be at least 6 characters"),
});

type RegisterFormValues = z.infer<typeof registerSchema>;

export default function RegisterPage() {
	const router = useRouter();
	const [showPassword, setShowPassword] = useState(false);
	const [isSubmitting, setIsSubmitting] = useState(false);

	const {
		register,
		handleSubmit,
		control,
		reset,
		formState: { errors },
	} = useForm<RegisterFormValues>({
		resolver: zodResolver(registerSchema),
		defaultValues: {
			name: "",
			email: "",
			phone: "",
			password: "",
		},
	});

	const onSubmit = async (values: RegisterFormValues) => {
		setIsSubmitting(true);

		try {
			const payload = {
				name: values.name.trim(),
				email: values.email.trim(),
				phone: values.phone.trim(),
				password: values.password,
			};

			const response = await axiosInstance.post("/api/register/register-owner", payload);
			toast.success(response.data?.message || "Registration successful");
			reset();
			setTimeout(() => {
				router.push("/login");
			}, 900);
		} catch (error: any) {
			toast.error(error?.response?.data?.message || "Registration failed. Please try again.");
		} finally {
			setIsSubmitting(false);
		}
	};

	return (
		<main
			style={{
				minHeight: "100vh",
				padding: "20px 14px",
				background:
					"radial-gradient(900px 500px at 10% 0%, rgba(255, 205, 0, 0.24), transparent 58%), radial-gradient(700px 420px at 100% 100%, rgba(255, 181, 0, 0.18), transparent 55%), linear-gradient(180deg, #fffef9 0%, #fff7df 100%)",
				display: "grid",
				placeItems: "center",
			}}
		>
			<section style={{ width: "100%", maxWidth: 720 }}>
				<div
					style={{
						borderRadius: 32,
						overflow: "hidden",
						border: "1px solid rgba(224, 172, 31, 0.25)",
						boxShadow: "0 24px 70px rgba(15,23,42,0.10)",
						background: "rgba(255,255,255,0.82)",
						backdropFilter: "blur(14px)",
					}}
				>
					<div
						style={{
							padding: "28px 22px",
							background:
								"linear-gradient(135deg, rgba(255, 248, 220, 0.98) 0%, rgba(255, 255, 255, 0.96) 55%, rgba(255, 241, 198, 0.92) 100%)",
							borderBottom: "1px solid rgba(224, 172, 31, 0.16)",
						}}
					>
						<div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
							<div>
								<p style={{ margin: 0, color: "#a06f00", fontSize: 12, fontWeight: 800, letterSpacing: 2.4 }}>
									AMP SHOPPING
								</p>
								<h1 style={{ margin: "10px 0 0", color: "#221b0f", fontSize: 36, fontWeight: 900, lineHeight: 1.1 }}>
									Register your account
								</h1>
								<p style={{ marginTop: 10, marginBottom: 0, color: "#6f5c2c", fontSize: 15, maxWidth: 760, lineHeight: 1.7 }}>
									Use this page for owner registration only. The store form keeps using its existing store-owner API.
								</p>
							</div>

							<div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
								<Link href="/login" style={{ textDecoration: "none" }}>
									<button
										type="button"
										style={{
											height: 42,
											padding: "0 14px",
											borderRadius: 12,
											border: "1px solid #e0ac1f",
											background: "#fffef9",
											color: "#8a6711",
											fontWeight: 700,
											cursor: "pointer",
										}}
									>
										Back to Login
									</button>
								</Link>
								<Link href="/" style={{ textDecoration: "none" }}>
									<button
										type="button"
										style={{
											height: 42,
											padding: "0 14px",
											borderRadius: 12,
											border: "1px solid transparent",
											background: "transparent",
											color: "#8a6711",
											fontWeight: 700,
											cursor: "pointer",
										}}
									>
										Home
									</button>
								</Link>
							</div>
						</div>
					</div>

					<div style={{ padding: 22 }}>
						<div
							style={{
								borderRadius: 22,
								padding: 20,
								background: "linear-gradient(180deg, #ffffff 0%, #fffdf7 100%)",
								border: "1px solid rgba(224, 172, 31, 0.16)",
								boxShadow: "0 10px 24px rgba(15,23,42,0.04)",
							}}
						>
							<p style={{ margin: 0, color: "#6f5c2c", fontSize: 14, lineHeight: 1.7 }}>
								Fill in the details below to create your owner account. You’ll be redirected to login after successful registration.
							</p>
						</div>
					</div>

					<div style={{ padding: "0 22px 22px" }}>
						<div
							style={{
								borderRadius: 24,
								overflow: "hidden",
								border: "1px solid rgba(224, 172, 31, 0.18)",
								boxShadow: "0 14px 34px rgba(15,23,42,0.08)",
								background: "linear-gradient(180deg, #ffffff 0%, #fffdf5 100%)",
							}}
						>
							<div style={{ padding: 22, borderBottom: "1px solid rgba(224, 172, 31, 0.14)" }}>
								<div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
									<div>
										<p style={{ margin: 0, color: "#a06f00", fontSize: 12, fontWeight: 800, letterSpacing: 1.6, textTransform: "uppercase" }}>
											Owner Registration
										</p>
										<h2 style={{ margin: "8px 0 0", color: "#221b0f", fontSize: 28, fontWeight: 900 }}>
											Create your owner account
										</h2>
										<p style={{ margin: "8px 0 0", color: "#6f5c2c", fontSize: 15, lineHeight: 1.7 }}>
											This uses /api/register/register-owner with the exact owner payload.
										</p>
									</div>
									<div
										style={{
											width: 54,
											height: 54,
											borderRadius: 18,
											display: "grid",
											placeItems: "center",
											background: "#111827",
											color: "#ffffff",
											fontSize: 20,
											fontWeight: 800,
										}}
									>
										AMP
									</div>
								</div>
							</div>

							<form onSubmit={handleSubmit(onSubmit)} style={{ padding: 22, display: "grid", gap: 16 }}>
								<div style={{ display: "grid", gap: 8 }}>
									<label htmlFor="name" style={{ fontWeight: 700, color: "#4f3f16" }}>
										Name
									</label>
									<input
										id="name"
										placeholder="Actovision"
										autoComplete="name"
										{...register("name")}
										style={{
											width: "100%",
											height: 46,
											borderRadius: 12,
											border: errors.name ? "1px solid #ef4444" : "1px solid #e8d89f",
											background: "#fffef9",
											padding: "0 14px",
											outline: "none",
										}}
									/>
									{errors.name && <small style={{ color: "#dc2626", fontSize: 12 }}>{errors.name.message}</small>}
								</div>

								<div style={{ display: "grid", gap: 8 }}>
									<label htmlFor="email" style={{ fontWeight: 700, color: "#4f3f16" }}>
										Email
									</label>
									<input
										id="email"
										type="email"
										placeholder="actovision@gmail.com"
										autoComplete="email"
										{...register("email")}
										style={{
											width: "100%",
											height: 46,
											borderRadius: 12,
											border: errors.email ? "1px solid #ef4444" : "1px solid #e8d89f",
											background: "#fffef9",
											padding: "0 14px",
											outline: "none",
										}}
									/>
									{errors.email && <small style={{ color: "#dc2626", fontSize: 12 }}>{errors.email.message}</small>}
								</div>

								<div style={{ display: "grid", gap: 8 }}>
									<label htmlFor="phone" style={{ fontWeight: 700, color: "#4f3f16" }}>
										Phone
									</label>
									<input
										id="phone"
										type="tel"
										placeholder="8017505010"
										autoComplete="tel"
										{...register("phone")}
										style={{
											width: "100%",
											height: 46,
											borderRadius: 12,
											border: errors.phone ? "1px solid #ef4444" : "1px solid #e8d89f",
											background: "#fffef9",
											padding: "0 14px",
											outline: "none",
										}}
									/>
									{errors.phone && <small style={{ color: "#dc2626", fontSize: 12 }}>{errors.phone.message}</small>}
								</div>

								<div style={{ display: "grid", gap: 8 }}>
									<label htmlFor="password" style={{ fontWeight: 700, color: "#4f3f16" }}>
										Password
									</label>
									<Controller
										name="password"
										control={control}
										render={({ field }) => (
											<div style={{ position: "relative" }}>
												<input
													id="password"
													type={showPassword ? "text" : "password"}
													placeholder="8017505010"
													autoComplete="new-password"
													value={field.value || ""}
													onChange={(event) => field.onChange(event.target.value)}
													style={{
														width: "100%",
														height: 46,
														borderRadius: 12,
														border: errors.password ? "1px solid #ef4444" : "1px solid #e8d89f",
														background: "#fffef9",
														padding: "0 84px 0 14px",
														outline: "none",
													}}
												/>
												<button
													type="button"
													onClick={() => setShowPassword((value) => !value)}
													style={{
														position: "absolute",
														right: 10,
														top: "50%",
														transform: "translateY(-50%)",
														border: "none",
														background: "transparent",
														color: "#8a6711",
														fontWeight: 700,
														cursor: "pointer",
													}}
												>
													{showPassword ? "Hide" : "Show"}
												</button>
											</div>
										)}
									/>
									{errors.password && <small style={{ color: "#dc2626", fontSize: 12 }}>{errors.password.message}</small>}
								</div>

								<button
									type="submit"
									disabled={isSubmitting}
									style={{
										height: 48,
										borderRadius: 12,
										border: "1px solid #e0ac1f",
										background: isSubmitting ? "linear-gradient(120deg,#f1d47e,#edcc6b)" : "linear-gradient(120deg,#f3be27,#e4a90e)",
										color: "#3b2f0f",
										fontWeight: 800,
										fontSize: 16,
										cursor: isSubmitting ? "not-allowed" : "pointer",
										marginTop: 4,
									}}
								>
									{isSubmitting ? "Creating account..." : "Create owner account"}
								</button>
							</form>
						</div>
					</div>
				</div>
			</section>

			<ToastContainer position="top-right" />
		</main>
	);
}
