import React, { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { CheckCircle2, XCircle, Loader2, Sprout } from "lucide-react";
import { authApi } from "../api/authApi";
import { getErrorMessage } from "../utils/errorMessage";

export default function VerifyEmail() {
  const { token } = useParams();
  const [status, setStatus] = useState("loading"); // loading | success | error
  const [message, setMessage] = useState("");

  useEffect(() => {
    let cancelled = false;
    authApi
      .verifyEmail(token)
      .then(() => {
        if (!cancelled) setStatus("success");
      })
      .catch((error) => {
        if (!cancelled) {
          setStatus("error");
          setMessage(getErrorMessage(error, "This verification link is invalid or has expired"));
        }
      });
    return () => {
      cancelled = true;
    };
  }, [token]);

  return (
    <div className="min-h-screen bg-paper flex items-center justify-center px-4">
      <div className="w-full max-w-md text-center">
        <div className="flex items-center justify-center gap-2 mb-8">
          <div className="w-9 h-9 rounded-stub bg-canopy-600 flex items-center justify-center">
            <Sprout className="w-5 h-5 text-paper" />
          </div>
          <span className="font-display text-xl font-semibold">KrishiBond</span>
        </div>

        <div className="stub-card p-8">
          {status === "loading" && (
            <>
              <Loader2 className="w-10 h-10 text-canopy-600 mx-auto animate-spin" />
              <p className="text-sm text-ink-faint mt-3">Verifying your email…</p>
            </>
          )}
          {status === "success" && (
            <>
              <CheckCircle2 className="w-10 h-10 text-canopy-600 mx-auto" />
              <h1 className="font-display text-2xl font-semibold mt-3">Email verified</h1>
              <p className="text-sm text-ink-faint mt-1">Your account is now fully active.</p>
              <Link to="/dashboard" className="btn-primary mt-6 inline-flex">Go to dashboard</Link>
            </>
          )}
          {status === "error" && (
            <>
              <XCircle className="w-10 h-10 text-clay-500 mx-auto" />
              <h1 className="font-display text-2xl font-semibold mt-3">Verification failed</h1>
              <p className="text-sm text-ink-faint mt-1">{message}</p>
              <Link to="/profile" className="btn-primary mt-6 inline-flex">Resend from your profile</Link>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
