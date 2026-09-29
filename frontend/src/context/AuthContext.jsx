import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
} from "react";
import { useNavigate } from "react-router-dom";
import { jwtDecode } from "jwt-decode";
import toast from "react-hot-toast";
import { authApi } from "../api/authApi";

const AuthContext = createContext(null);

const getStoredUser = () => {
  try {
    const raw = localStorage.getItem("kb_user");
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

const isTokenValid = (token) => {
  if (!token) return false;
  try {
    const { exp } = jwtDecode(token);
    return exp * 1000 > Date.now();
  } catch {
    return false;
  }
};

export function AuthProvider({ children }) {
  const [user, setUser] = useState(getStoredUser);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const persistSession = useCallback((data) => {
    // Refresh token is set as an httpOnly cookie by the server - only the
    // short-lived access token and user profile are kept client-side.
    localStorage.setItem("kb_access_token", data.accessToken);
    localStorage.setItem("kb_user", JSON.stringify(data.user));
    setUser(data.user);
  }, []);

  const clearSession = useCallback(() => {
    localStorage.removeItem("kb_access_token");
    localStorage.removeItem("kb_user");
    setUser(null);
  }, []);

  useEffect(() => {
    const bootstrap = async () => {
      const token = localStorage.getItem("kb_access_token");
      if (token && isTokenValid(token)) {
        try {
          const { user: freshUser } = await authApi.me();
          setUser(freshUser);
          localStorage.setItem("kb_user", JSON.stringify(freshUser));
        } catch (err) {
          // A network/timeout error (e.g. a Render cold start) doesn't mean
          // the session is invalid - only an actual 401 from the server
          // does. Keep the cached user so the app stays usable while the
          // backend wakes up, instead of logging the user out.
          if (err.response?.status === 401) {
            clearSession();
          }
        }
      } else if (token) {
        clearSession();
      }
      setLoading(false);
    };
    bootstrap();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    // Raised by the axios interceptor when a refresh attempt comes back with
    // a genuine 401 (refresh token invalid/expired/reused). Handled here,
    // inside the router, so the redirect is a normal client-side navigation
    // rather than a full-page load that would 404 on a route that only
    // exists client-side.
    const onForceLogout = () => {
      setUser(null);
      toast.error("Your session has expired - please log in again.");
      navigate("/login", { replace: true });
    };
    window.addEventListener("auth:force-logout", onForceLogout);
    return () => window.removeEventListener("auth:force-logout", onForceLogout);
  }, [navigate]);

  const login = async (credentials) => {
    const data = await authApi.login(credentials);
    persistSession(data);
    toast.success(`Welcome back, ${data.user.name.split(" ")[0]}`);
    return data.user;
  };

  // Registration no longer starts a session by itself - the backend creates
  // an unverified account and emails an OTP, and only verifyEmailOtp (below)
  // actually logs the user in. This is what keeps a new user off the
  // authenticated dashboard until they've proven they received the code.
  const register = async (payload) => {
    const data = await authApi.register(payload);
    toast.success("Check your email for a verification code");
    return data; // { email, message, devOtp? }
  };

  const verifyEmailOtp = async ({ email, otp }) => {
    const data = await authApi.verifyEmailOtp({ email, otp });
    persistSession(data);
    toast.success(`Welcome, ${data.user.name.split(" ")[0]}`);
    return data.user;
  };

  const resendEmailOtp = (email) => authApi.resendEmailOtp(email);

  const logout = async () => {
    try {
      await authApi.logout();
    } catch {
      // proceed with local logout regardless of API outcome
    }
    clearSession();
    toast.success("Logged out");
  };

  const updateUser = (partial) => {
    setUser((prev) => {
      const next = { ...prev, ...partial };
      localStorage.setItem("kb_user", JSON.stringify(next));
      return next;
    });
  };

  const value = {
    user,
    role: user?.role ?? null,
    isAuthenticated: !!user,
    loading,
    login,
    register,
    verifyEmailOtp,
    resendEmailOtp,
    logout,
    updateUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
};
