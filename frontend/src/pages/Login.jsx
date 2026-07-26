import React, { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useForm } from "react-hook-form";
import { Sprout, Eye, EyeOff } from "lucide-react";
import toast from "react-hot-toast";
import { useAuth } from "../context/AuthContext.jsx";
import { getErrorMessage } from "../utils/errorMessage";

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [showPassword, setShowPassword] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm();

  const onSubmit = async (values) => {
    try {
      await login(values);
      const redirectTo = location.state?.from?.pathname || "/dashboard";
      navigate(redirectTo, { replace: true });
    } catch (error) {
      toast.error(getErrorMessage(error, "Invalid email or password"));
    }
  };

  return (
    <div className="min-h-screen bg-paper flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="flex items-center justify-center gap-2 mb-8">
          <div className="w-9 h-9 rounded-stub bg-canopy-600 flex items-center justify-center">
            <Sprout className="w-5 h-5 text-paper" />
          </div>
          <span className="font-display text-xl font-semibold">KrishiBond</span>
        </div>

        <div className="stub-card p-8">
          <h1 className="font-display text-2xl font-semibold text-center">
            Welcome back
          </h1>
          <p className="text-sm text-ink-faint text-center mt-1">
            Log in to manage your contracts
          </p>

          <form onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-4">
            <div>
              <label className="label" htmlFor="email">
                Email
              </label>
              <input
                id="email"
                type="email"
                className="input-field"
                placeholder="you@example.com"
                {...register("email", { required: "Email is required" })}
              />
              {errors.email && (
                <p className="text-xs text-clay-500 mt-1">
                  {errors.email.message}
                </p>
              )}
            </div>

            <div>
              <label className="label" htmlFor="password">
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  className="input-field pr-10"
                  placeholder="••••••••"
                  {...register("password", {
                    required: "Password is required",
                  })}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-faint"
                  tabIndex={-1}
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
              {errors.password && (
                <p className="text-xs text-clay-500 mt-1">
                  {errors.password.message}
                </p>
              )}
            </div>

            <div className="flex justify-end">
              <Link
                to="/forgot-password"
                className="text-xs text-canopy-700 hover:underline"
              >
                Forgot password?
              </Link>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="btn-primary w-full"
            >
              {isSubmitting ? "Logging in…" : "Log in"}
            </button>
          </form>
        </div>

        <p className="text-center text-sm text-ink-faint mt-6">
          New to KrishiBond?{" "}
          <Link
            to="/register"
            className="text-canopy-700 font-medium hover:underline"
          >
            Create an account
          </Link>
        </p>
      </div>
    </div>
  );
}
