import React from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import { Sprout } from "lucide-react";
import toast from "react-hot-toast";
import { authApi } from "../api/authApi";
import { getErrorMessage } from "../utils/errorMessage";

export default function ResetPassword() {
  const { token } = useParams();
  const navigate = useNavigate();
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm();

  const password = watch("password");

  const onSubmit = async ({ password: newPassword }) => {
    try {
      await authApi.resetPassword(token, newPassword);
      toast.success("Password reset — please log in");
      navigate("/login", { replace: true });
    } catch (error) {
      toast.error(getErrorMessage(error, "This reset link is invalid or has expired"));
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
          <h1 className="font-display text-2xl font-semibold text-center">Set a new password</h1>

          <form onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-4">
            <div>
              <label className="label" htmlFor="password">New password</label>
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
              {errors.password && <p className="text-xs text-clay-500 mt-1">{errors.password.message}</p>}
            </div>

            <div>
              <label className="label" htmlFor="confirmPassword">Confirm password</label>
              <input
                id="confirmPassword"
                type="password"
                className="input-field"
                placeholder="Re-enter your password"
                {...register("confirmPassword", {
                  required: "Please confirm your password",
                  validate: (value) => value === password || "Passwords do not match",
                })}
              />
              {errors.confirmPassword && <p className="text-xs text-clay-500 mt-1">{errors.confirmPassword.message}</p>}
            </div>

            <button type="submit" disabled={isSubmitting} className="btn-primary w-full">
              {isSubmitting ? "Resetting…" : "Reset password"}
            </button>
          </form>
        </div>

        <p className="text-center text-sm text-ink-faint mt-6">
          <Link to="/login" className="text-canopy-700 font-medium hover:underline">Back to login</Link>
        </p>
      </div>
    </div>
  );
}
