"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm, Controller } from 'react-hook-form';
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { LoginSchema } from "@/helper/schema/Schema"
import axiosInstance from '@/service/axios.service'
import { useAppDispatch } from "@/lib/store/hooks"
import { tokenSlice } from "../../lib/store/features/storeToken"

const AUTH_TOKEN_KEY = 'login-token';
const AUTH_USER_KEY = 'login-user';

export default function LoginPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();
  const dispatch = useAppDispatch();

  type LoginForm = z.infer<typeof LoginSchema>;

  const {
    register,
    control,
    handleSubmit,
    formState: { errors }
  } = useForm<LoginForm>({
    resolver: zodResolver(LoginSchema)
  });

  const onSubmit = async (data: LoginForm) => {
    setError("");
    setLoading(true);

    try {
      const res = await axiosInstance.post('/api/login', data);
      const token = res.data.token;
      console.log("My token...", token);

      dispatch(tokenSlice.actions.saveToken(token));
      localStorage.setItem(AUTH_TOKEN_KEY, token);

      try {
        const profileResponse = await axiosInstance.get('/api/login/profile-page');
        const user = profileResponse.data?.user;

        if (user) {
          localStorage.setItem(
            AUTH_USER_KEY,
            JSON.stringify({
              id: user._id || user.id,
              name: user.name || user.email || 'User',
              email: user.email || '',
              role: user.role,
              picture: user.picture,
            })
          );
        }
      } catch (profileError) {
        console.error('Unable to load profile after login:', profileError);
      }

      window.dispatchEvent(new Event('auth-changed'));
      console.log("Response...", res)
      router.push("/dashboard/store");
    } catch (error: any) {
      console.log("Login error:", error);
      const errorMessage = error.response?.data?.message || "Login failed. Please try again.";
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "18px 12px",
        background:
          "radial-gradient(850px 460px at 7% 10%, rgba(255, 205, 0, 0.28), transparent 60%), radial-gradient(760px 400px at 95% 90%, rgba(255, 187, 0, 0.2), transparent 60%), linear-gradient(170deg,#fffef6 0%, #fff8db 55%, #fff4c3 100%)",
      }}
    >
      <section style={{ width: "100%", maxWidth: 560 }}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr",
            gap: 18,
            alignItems: "stretch",
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
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
                <div>
                  <h3 style={{ margin: 0, color: "#3b2e0e", fontSize: 32, fontWeight: 700 }}>Welcome back</h3>
                  <p style={{ marginTop: 6, marginBottom: 0, color: "#6f5c2c", fontSize: 15 }}>
                    Use your Justdail admin credentials to continue.
                  </p>
                </div>
                <div
                  style={{
                    width: 48,
                    height: 48,
                    borderRadius: 14,
                    display: "grid",
                    placeItems: "center",
                    background: "#fff6d4",
                    border: "1px solid #efd78a",
                    color: "#8a6a00",
                    fontSize: 20,
                    fontWeight: 700,
                  }}
                >
                  U
                </div>
              </div>

              {error && (
                <div
                  style={{
                    marginTop: 14,
                    borderRadius: 10,
                    padding: "10px 12px",
                    background: "#fff1f2",
                    border: "1px solid #fecdd3",
                    color: "#b91c1c",
                    fontSize: 14,
                  }}
                >
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit(onSubmit)} style={{ marginTop: 18, display: "grid", gap: 14 }}>
                <div>
                  <label htmlFor="email" style={{ display: "block", fontWeight: 600, marginBottom: 7, color: "#4f3f16" }}>
                    Email
                  </label>
                  <input
                    id="email"
                    type="email"
                    {...register('email')}
                    placeholder="Please enter email address"
                    autoComplete="email"
                    style={{
                      width: "100%",
                      height: 44,
                      borderRadius: 10,
                      border: errors.email ? "1px solid #ef4444" : "1px solid #e8d89f",
                      background: "#fffef9",
                      padding: "0 12px",
                      outline: "none",
                    }}
                  />
                  {errors.email && (
                    <small style={{ color: "#dc2626", fontSize: 12, marginTop: 4, display: "block" }}>
                      {errors.email.message}
                    </small>
                  )}
                </div>

                <div>
                  <label htmlFor="password" style={{ display: "block", fontWeight: 600, marginBottom: 7, color: "#4f3f16" }}>
                    Password
                  </label>
                  <Controller
                    name="password"
                    control={control}
                    render={({ field }) => (
                      <div style={{ position: "relative", width: "100%" }}>
                        <input
                          id="password"
                          type={showPassword ? "text" : "password"}
                          value={field.value || ""}
                          onChange={(e) => field.onChange(e.target.value)}
                          placeholder="Enter password"
                          autoComplete="current-password"
                          style={{
                            width: "100%",
                            height: 44,
                            borderRadius: 10,
                            border: errors.password ? "1px solid #ef4444" : "1px solid #e8d89f",
                            background: "#fffef9",
                            padding: "0 40px 0 12px",
                            outline: "none",
                          }}
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword((prev) => !prev)}
                          aria-label={showPassword ? "Hide password" : "Show password"}
                          style={{
                            position: "absolute",
                            right: 10,
                            top: "50%",
                            transform: "translateY(-50%)",
                            border: "none",
                            background: "transparent",
                            color: "#8f7a40",
                            cursor: "pointer",
                            padding: 0,
                            display: "grid",
                            placeItems: "center",
                            fontSize: 13,
                            fontWeight: 700,
                          }}
                        >
                          {showPassword ? "Hide" : "Show"}
                        </button>
                      </div>
                    )}
                  />
                  {errors.password && (
                    <small style={{ color: "#dc2626", fontSize: 12, marginTop: 4, display: "block" }}>
                      {errors.password.message}
                    </small>
                  )}
                </div>

                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
                  <label style={{ display: "flex", alignItems: "center", gap: 10, color: "#655526", cursor: "pointer" }}>
                    <input
                      id="remember"
                      type="checkbox"
                      checked={remember}
                      onChange={(e) => setRemember(e.target.checked)}
                      style={{ width: 16, height: 16, accentColor: "#d89f00" }}
                    />
                    <span>
                      Remember me
                    </span>
                  </label>
                  <a href="/forget-password" style={{ color: "#a06f00", textDecoration: "none", fontWeight: 600 }}>
                    Forgot password?
                  </a>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  style={{
                    width: "100%",
                    height: 46,
                    borderRadius: 12,
                    border: "1px solid #e0ac1f",
                    background: loading
                      ? "linear-gradient(120deg,#f1d47e,#edcc6b)"
                      : "linear-gradient(120deg,#f3be27,#e4a90e)",
                    color: "#3b2f0f",
                    fontWeight: 700,
                    fontSize: 16,
                    cursor: loading ? "not-allowed" : "pointer",
                  }}
                >
                  {loading ? "Signing in..." : "Sign in"}
                </button>
              </form>

              <div style={{ marginTop: 14, textAlign: "center" }}>
                <small style={{ color: "#9b8651" }}>
                  Need account access? <a href="/admin/register">Contact administrator</a>
                </small>
              </div>

              <div style={{ marginTop: 10, textAlign: "center" }}>
                <button
                  type="button"
                  onClick={() => router.push("/")}
                  style={{
                    border: "none",
                    background: "transparent",
                    color: "#8a6711",
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  Back to Welcome
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
