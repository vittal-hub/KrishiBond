import React, { useState } from "react";
import { Link } from "react-router-dom";
import { useForm } from "react-hook-form";
import { Sprout, MailCheck } from "lucide-react";
import toast from "react-hot-toast";
import { authApi } from "../api/authApi";
import { getErrorMessage } from "../utils/errorMessage";

export default function ForgotPassword() {
  const [sent, setSent] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm();

  const onSubmit = async ({ email }) => {
    try {
      const data = await authApi.forgotPassword(email);
      setSent(true);
      if (data.devResetToken) {
        // Dev-only convenience: no SMTP configured, so the link is surfaced here.
        toast.success(`Dev mode - reset link: /reset-password/${data.devResetToken}`, { duration: 8000 });
      }
    } catch (error) {
      toast.error(getErrorMessage(error, "Something went wrong"));
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
          {sent ? (
            <div className="text-center">
              <MailCheck className="w-10 h-10 text-canopy-600 mx-auto" />
              <h1 className="font-display text-2xl font-semibold mt-3">Check your email</h1>
              <p className="text-sm text-ink-faint mt-1">
                If an account exists for that address, a reset link has been sent.
              </p>
            </div>
          ) : (
            <>
              <h1 className="font-display text-2xl font-semibold text-center">Forgot password</h1>
              <p className="text-sm text-ink-faint text-center mt-1">
                Enter your email and we'll send you a reset link
              </p>

              <form onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-4">
                <div>
                  <label className="label" htmlFor="email">Email</label>
                  <input
                    id="email"
                    type="email"
                    className="input-field"
                    placeholder="you@example.com"
                    {...register("email", { required: "Email is required" })}
                  />
                  {errors.email && <p className="text-xs text-clay-500 mt-1">{errors.email.message}</p>}
                </div>

                <button type="submit" disabled={isSubmitting} className="btn-primary w-full">
                  {isSubmitting ? "Sending…" : "Send reset link"}
                </button>
              </form>
            </>
          )}
        </div>

        <p className="text-center text-sm text-ink-faint mt-6">
          Remembered your password? <Link to="/login" className="text-canopy-700 font-medium hover:underline">Log in</Link>
        </p>
      </div>
    </div>
  );
}
