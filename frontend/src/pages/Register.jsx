import React, { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import { Sprout, Wheat, Building2, Eye, EyeOff } from "lucide-react";
import toast from "react-hot-toast";
import { useAuth } from "../context/AuthContext.jsx";
import { getErrorMessage } from "../utils/errorMessage";
import LocationFields from "../components/LocationFields.jsx";

// Same 10-digit Indian mobile format the backend enforces
// (backend/src/validators/commonSchemas.js) - kept in sync deliberately so a
// user gets the same rejection instantly instead of waiting on a round trip,
// while the backend remains the authoritative check.
const PHONE_PATTERN = /^[6-9]\d{9}$/;
// Rejects "123456"/"@@@@@@" while still allowing a buyer's business name
// (numbers/periods/&, e.g. "Amber Foods Pvt. Ltd.") - see the backend's
// nameSchema for the same reasoning.
const NAME_PATTERN = /[A-Za-z]/;

export default function Register() {
  const { register: registerUser } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm({ defaultValues: { role: "farmer" } });

  const role = watch("role");
  const password = watch("password");

  // Lets landing-page CTAs like "Register as Buyer" (/register?role=buyer)
  // preselect the role toggle below instead of always defaulting to farmer.
  useEffect(() => {
    const requested = searchParams.get("role");
    if (requested === "farmer" || requested === "buyer") {
      setValue("role", requested);
    }
  }, [searchParams, setValue]);

  const onSubmit = async (values) => {
    try {
      const { district, state, confirmPassword, ...rest } = values;
      await registerUser({ ...rest, location: { district, state } });
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
                  {role === "farmer" ? "Full name" : "Business name"}
                </label>
                <input
                  id="name"
                  className="input-field"
                  placeholder={
                    role === "farmer" ? "Ramesh Meena" : "Amber Foods Pvt. Ltd."
                  }
                  {...register("name", {
                    required: "Name is required",
                    minLength: { value: 2, message: "Name must be at least 2 characters" },
                    maxLength: { value: 100, message: "Name is too long" },
                    pattern: { value: NAME_PATTERN, message: "Name must contain at least one letter" },
                  })}
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
                  type="tel"
                  inputMode="numeric"
                  maxLength={10}
                  className="input-field"
                  placeholder="9876543210"
                  {...register("phone", {
                    required: "Phone number is required",
                    pattern: { value: PHONE_PATTERN, message: "Enter a valid 10-digit Indian mobile number" },
                  })}
                />
                {errors.phone && (
                  <p className="text-xs text-clay-500 mt-1">
                    {errors.phone.message}
                  </p>
                )}
              </div>

              <LocationFields register={register} watch={watch} setValue={setValue} errors={errors} />

              <div>
                <label className="label" htmlFor="password">
                  Password
                </label>
                <div className="relative">
                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    className="input-field pr-10"
                    placeholder="At least 8 characters"
                    {...register("password", {
                      required: "Password is required",
                      minLength: { value: 8, message: "Use at least 8 characters" },
                    })}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-faint"
                    tabIndex={-1}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
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
                <div className="relative">
                  <input
                    id="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    className="input-field pr-10"
                    placeholder="Re-enter your password"
                    {...register("confirmPassword", {
                      required: "Please confirm your password",
                      validate: (value) =>
                        value === password || "Passwords do not match",
                    })}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-faint"
                    tabIndex={-1}
                    aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                  >
                    {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
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
