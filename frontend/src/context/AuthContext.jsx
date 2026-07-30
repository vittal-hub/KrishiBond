import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
} from "react";
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
        } catch {
          clearSession();
        }
      } else if (token) {
        clearSession();
      }
      setLoading(false);
    };
    bootstrap();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const login = async (credentials) => {
    const data = await authApi.login(credentials);
    persistSession(data);
    toast.success(`Welcome back, ${data.user.name.split(" ")[0]}`);
    return data.user;
  };

  const register = async (payload) => {
    const data = await authApi.register(payload);
    persistSession(data);
    toast.success("Account created — check your email to verify your address");
    return data.user;
  };

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
