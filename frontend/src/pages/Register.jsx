import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { Sprout, Wheat, Building2 } from "lucide-react";
import toast from "react-hot-toast";
import { useAuth } from "../context/AuthContext.jsx";
import { getErrorMessage } from "../utils/errorMessage";

export default function Register() {
  const { register: registerUser } = useAuth();
  const navigate = useNavigate();
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm({ defaultValues: { role: "farmer" } });

  const role = watch("role");
  const password = watch("password");

  const onSubmit = async (values) => {
    try {
      await registerUser(values);
      navigate("/dashboard", { replace: true });
    } catch (error) {
      toast.error(getErrorMessage(error, "Could not create your account"));
    }
  };

  return (
    <div className="min-h-screen bg-paper flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-md">
        <div className="flex items-center justify-center gap-2 mb-8">
          <div className="w-9 h-9 rounded-stub bg-canopy-600 flex items-center justify-center">
            <Sprout className="w-5 h-5 text-paper" />
          </div>
          <span className="font-display text-xl font-semibold">KrishiBond</span>
        </div>

        <div className="stub-card p-8">
          <h1 className="font-display text-2xl font-semibold text-center">
            Create your account
          </h1>
          <p className="text-sm text-ink-faint text-center mt-1">
            Join as a farmer or a buyer
          </p>

          <div className="grid grid-cols-2 gap-3 mt-6">
            <button
              type="button"
              onClick={() => setValue("role", "farmer")}
              className={`flex flex-col items-center gap-2 rounded-stub border-2 px-4 py-4 transition ${
                role === "farmer"
                  ? "border-canopy-600 bg-canopy-50"
                  : "border-ink/10 hover:border-ink/20"
              }`}
            >
              <Wheat
                className={`w-6 h-6 ${role === "farmer" ? "text-canopy-700" : "text-ink-faint"}`}
              />
              <span className="text-sm font-semibold">I'm a Farmer</span>
            </button>
            <button
              type="button"
              onClick={() => setValue("role", "buyer")}
              className={`flex flex-col items-center gap-2 rounded-stub border-2 px-4 py-4 transition ${
                role === "buyer"
                  ? "border-canopy-600 bg-canopy-50"
                  : "border-ink/10 hover:border-ink/20"
              }`}
            >
              <Building2
                className={`w-6 h-6 ${role === "buyer" ? "text-canopy-700" : "text-ink-faint"}`}
              />
              <span className="text-sm font-semibold">I'm a Buyer</span>
            </button>
          </div>
          <input type="hidden" {...register("role")} />

          <form onSubmit={handleSubmit(onSubmit)} className="mt-5 space-y-4">
            <div>
              <label className="label" htmlFor="name">
                Full name
              </label>
              <input
                id="name"
                className="input-field"
                placeholder={
                  role === "farmer" ? "Ramesh Meena" : "Amber Foods Pvt. Ltd."
                }
                {...register("name", { required: "Name is required" })}
              />
              {errors.name && (
                <p className="text-xs text-clay-500 mt-1">
                  {errors.name.message}
                </p>
              )}
            </div>

            <div>
              <label className="label" htmlFor="email">
                Email
              </label>
              <input
                id="email"
                type="email"
                className="input-field"
                placeholder="you@example.com"
                {...register("email", {
                  required: "Email is required",
                  pattern: {
                    value: /^\S+@\S+\.\S+$/,
                    message: "Enter a valid email",
                  },
                })}
              />
              {errors.email && (
                <p className="text-xs text-clay-500 mt-1">
                  {errors.email.message}
                </p>
              )}
            </div>

            <div>
              <label className="label" htmlFor="phone">
                Phone number
              </label>
              <input
                id="phone"
                className="input-field"
                placeholder="9876543210"
                {...register("phone", { required: "Phone number is required" })}
              />
              {errors.phone && (
                <p className="text-xs text-clay-500 mt-1">
                  {errors.phone.message}
                </p>
              )}
            </div>

            <div>
              <label className="label" htmlFor="location">
                Location
              </label>
              <input
                id="location"
                className="input-field"
                placeholder="District, State"
                {...register("location", { required: "Location is required" })}
              />
              {errors.location && (
                <p className="text-xs text-clay-500 mt-1">
                  {errors.location.message}
                </p>
              )}
            </div>

            <div>
              <label className="label" htmlFor="password">
                Password
              </label>
              <input
                id="password"
                type="password"
                className="input-field"
                placeholder="At least 8 characters"
                {...register("password", {
                  required: "Password is required",
                  minLength: { value: 8, message: "Use at least 8 characters" },
                })}
              />
              {errors.password && (
                <p className="text-xs text-clay-500 mt-1">
                  {errors.password.message}
                </p>
              )}
            </div>

            <div>
              <label className="label" htmlFor="confirmPassword">
                Confirm password
              </label>
              <input
                id="confirmPassword"
                type="password"
                className="input-field"
                placeholder="Re-enter your password"
                {...register("confirmPassword", {
                  required: "Please confirm your password",
                  validate: (value) =>
                    value === password || "Passwords do not match",
                })}
              />
              {errors.confirmPassword && (
                <p className="text-xs text-clay-500 mt-1">
                  {errors.confirmPassword.message}
                </p>
              )}
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="btn-primary w-full"
            >
              {isSubmitting ? "Creating account…" : "Create account"}
            </button>
          </form>
        </div>

        <p className="text-center text-sm text-ink-faint mt-6">
          Already have an account?{" "}
          <Link
            to="/login"
            className="text-canopy-700 font-medium hover:underline"
          >
            Log in
          </Link>
        </p>
      </div>
    </div>
  );
}
