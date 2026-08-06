import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { Alert, Platform } from "react-native";
import axios from "axios";

/* ── Secure storage abstraction ──────────────────────────────────── */
// expo-secure-store is not available on web; fall back to a no-op for dev.
let SecureStore;
try {
  SecureStore = require("expo-secure-store");
} catch {
  SecureStore = null;
}

const TOKEN_KEY = "quickstudio_jwt";

const saveToken = async (token) => {
  if (SecureStore) {
    await SecureStore.setItemAsync(TOKEN_KEY, token);
  }
};

const getToken = async () => {
  if (SecureStore) {
    return SecureStore.getItemAsync(TOKEN_KEY);
  }
  return null;
};

const deleteToken = async () => {
  if (SecureStore) {
    await SecureStore.deleteItemAsync(TOKEN_KEY);
  }
};

/* ── API client ────────────────────────────────────────────── */
const API_BASE =
  process.env.EXPO_PUBLIC_API_URL || "http://192.168.29.149:5000";

const api = axios.create({
  baseURL: `${API_BASE}/api`,
  timeout: 20000,
  headers: { "Content-Type": "application/json" },
});

/* ── Context ─────────────────────────────────────────────────────── */
const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [isLoading, setIsLoading] = useState(true); // true until initial session check completes

  /* ── Attach token to every outgoing request ──────────────────── */
  useEffect(() => {
    const interceptor = api.interceptors.request.use((config) => {
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    });
    return () => api.interceptors.request.eject(interceptor);
  }, [token]);

  /* ── Session revalidation on cold-start ──────────────────────── */
  useEffect(() => {
    (async () => {
      try {
        const stored = await getToken();
        if (!stored) {
          setIsLoading(false);
          return;
        }

        // Verify with backend & get fresh user data (incl. current tier)
        const { data } = await api.get("/auth/me", {
          headers: { Authorization: `Bearer ${stored}` },
        });

        setToken(stored);
        setUser(data.user);
      } catch {
        // Token is expired / invalid → clear it silently
        await deleteToken();
        setToken(null);
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  /* ── Register ────────────────────────────────────────────────── */
  const register = useCallback(async (name, email, password) => {
    try {
      const { data } = await api.post("/auth/register", {
        name,
        email,
        password,
      });
      await saveToken(data.token);
      setToken(data.token);
      setUser(data.user);
      return { success: true };
    } catch (error) {
      const msg =
        error.response?.data?.message || "Registration failed. Please try again.";
      return { success: false, message: msg };
    }
  }, []);

  /* ── Login ───────────────────────────────────────────────────── */
  const login = useCallback(async (email, password) => {
    try {
      const { data } = await api.post("/auth/login", { email, password });
      await saveToken(data.token);
      setToken(data.token);
      setUser(data.user);
      return { success: true };
    } catch (error) {
      const msg =
        error.response?.data?.message || "Login failed. Please try again.";
      return { success: false, message: msg };
    }
  }, []);

  /* ── Logout ──────────────────────────────────────────────────── */
  const logout = useCallback(async () => {
    await deleteToken();
    setToken(null);
    setUser(null);
  }, []);

  /* ── Pro access check (client-side UX convenience) ───────────── */
  const checkProAccess = useCallback(
    (featureName) => {
      if (!user) return { allowed: false, reason: "not_authenticated" };
      if (user.subscriptionTier === "pro") return { allowed: true };
      return {
        allowed: false,
        reason: "pro_required",
        feature: featureName,
      };
    },
    [user]
  );

  /* ── Memoised context value ──────────────────────────────────── */
  const value = useMemo(
    () => ({
      user,
      token,
      isLoading,
      isAuthenticated: !!user && !!token,
      register,
      login,
      logout,
      checkProAccess,
      api, // expose the configured axios instance for other modules
    }),
    [user, token, isLoading, register, login, logout, checkProAccess]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

/* ── Hook ────────────────────────────────────────────────────────── */
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used inside an <AuthProvider>.");
  }
  return ctx;
}

export default AuthContext;
